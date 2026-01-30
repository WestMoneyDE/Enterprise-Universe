// =============================================================================
// MONEY MACHINE WORKFLOW SERVICE
// Automated workflow: HubSpot Deal → Kundenkarte → Dokumente → Präsentation → Bauherren-Pass
// =============================================================================

import { db } from "@nexus/db";
import {
  deals,
  contacts,
  kundenkarten,
  kundenkarteDocuments,
  kundenkarteActivities,
  presentations,
  presentationViews,
  moneyMachineWorkflows,
  moneyMachineActivities,
  eq,
  and,
  desc,
  sql,
} from "@nexus/db";
import { HubSpotService, getHubSpotService } from "./hubspot";
import crypto from "crypto";

// =============================================================================
// TYPES
// =============================================================================

export type MoneyMachineStage =
  | "deal_received"
  | "kundenkarte_created"
  | "documents_pending"
  | "documents_uploaded"
  | "presentation_ready"
  | "email_sent"
  | "presentation_viewed"
  | "bauherren_pass_offered"
  | "bauherren_pass_sold"
  | "completed";

export interface RequiredDocument {
  type: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  documentId?: string;
}

export interface WorkflowResult {
  success: boolean;
  workflowId?: string;
  stage?: MoneyMachineStage;
  message?: string;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REQUIRED_BAUVORHABEN_DOCUMENTS: RequiredDocument[] = [
  { type: "grundriss", label: "Grundriss / Bauplan", required: true, uploaded: false },
  { type: "skizze", label: "Skizzen / Visualisierungen", required: true, uploaded: false },
  { type: "exposé", label: "Exposé / Projektbeschreibung", required: false, uploaded: false },
  { type: "lageplan", label: "Lageplan", required: false, uploaded: false },
  { type: "ansichten", label: "Ansichten (Fassaden)", required: false, uploaded: false },
  { type: "baubeschreibung", label: "Baubeschreibung", required: false, uploaded: false },
  { type: "finanzierungsplan", label: "Finanzierungsplan", required: false, uploaded: false },
];

// =============================================================================
// MONEY MACHINE SERVICE CLASS
// =============================================================================

export class MoneyMachineService {
  private organizationId: string;
  private hubspot: HubSpotService | null = null;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async initialize(): Promise<void> {
    this.hubspot = await getHubSpotService(this.organizationId);
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW INITIATION
  // ---------------------------------------------------------------------------

  /**
   * Start a new Money Machine workflow from a HubSpot deal
   */
  async startFromHubSpotDeal(hubspotDealId: string): Promise<WorkflowResult> {
    try {
      // Check if workflow already exists
      const existing = await db.query.moneyMachineWorkflows.findFirst({
        where: eq(moneyMachineWorkflows.hubspotDealId, hubspotDealId),
      });

      if (existing) {
        return {
          success: true,
          workflowId: existing.id,
          stage: existing.currentStage as MoneyMachineStage,
          message: "Workflow bereits vorhanden",
        };
      }

      // Get or create deal in Nexus
      let deal = await db.query.deals.findFirst({
        where: and(
          eq(deals.hubspotDealId, hubspotDealId),
          eq(deals.organizationId, this.organizationId)
        ),
        with: { contact: true },
      });

      // If deal doesn't exist, sync from HubSpot
      if (!deal && this.hubspot) {
        const hubspotDeal = await this.hubspot.getDeal(hubspotDealId);
        if (!hubspotDeal) {
          return { success: false, error: "Deal nicht in HubSpot gefunden" };
        }

        // Get associated contact
        let contactId: string | undefined;
        if (hubspotDeal.associations?.contacts?.results?.[0]?.id) {
          const hubspotContactId = hubspotDeal.associations.contacts.results[0].id;
          const hubspotContact = await this.hubspot.getContact(hubspotContactId);

          if (hubspotContact?.properties.email) {
            // Find or create contact in Nexus
            let contact = await db.query.contacts.findFirst({
              where: and(
                eq(contacts.email, hubspotContact.properties.email),
                eq(contacts.organizationId, this.organizationId)
              ),
            });

            if (!contact) {
              const [newContact] = await db.insert(contacts).values({
                organizationId: this.organizationId,
                email: hubspotContact.properties.email,
                firstName: hubspotContact.properties.firstname,
                lastName: hubspotContact.properties.lastname,
                phone: hubspotContact.properties.phone,
                company: hubspotContact.properties.company,
                hubspotContactId: hubspotContactId,
                type: "lead",
              }).returning();
              contact = newContact;
            }
            contactId = contact?.id;
          }
        }

        // Create deal in Nexus
        const [newDeal] = await db.insert(deals).values({
          organizationId: this.organizationId,
          name: hubspotDeal.properties.dealname ?? `Deal ${hubspotDealId}`,
          description: hubspotDeal.properties.description,
          amount: hubspotDeal.properties.amount,
          hubspotDealId: hubspotDealId,
          contactId: contactId,
          subsidiary: "west_money_bau",
        }).returning();

        deal = { ...newDeal, contact: null };
      }

      if (!deal) {
        return { success: false, error: "Deal konnte nicht erstellt werden" };
      }

      // Create workflow
      const [workflow] = await db.insert(moneyMachineWorkflows).values({
        organizationId: this.organizationId,
        dealId: deal.id,
        contactId: deal.contactId,
        hubspotDealId: hubspotDealId,
        currentStage: "deal_received",
        dealAmount: deal.amount ? parseInt(String(deal.amount)) * 100 : undefined,
        requiredDocuments: REQUIRED_BAUVORHABEN_DOCUMENTS,
        customerEmail: (deal as any).contact?.email,
      }).returning();

      // Log activity
      await this.logActivity(workflow.id, {
        activityType: "workflow_started",
        title: "Money Machine Workflow gestartet",
        description: `Workflow für Deal "${deal.name}" gestartet`,
        toStage: "deal_received",
        isAutomated: true,
      });

      return {
        success: true,
        workflowId: workflow.id,
        stage: "deal_received",
        message: "Workflow erfolgreich gestartet",
      };
    } catch (error) {
      console.error("[MoneyMachine] Error starting workflow:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Start workflow from an existing Nexus deal
   */
  async startFromDeal(dealId: string): Promise<WorkflowResult> {
    try {
      const deal = await db.query.deals.findFirst({
        where: and(
          eq(deals.id, dealId),
          eq(deals.organizationId, this.organizationId)
        ),
        with: { contact: true },
      });

      if (!deal) {
        return { success: false, error: "Deal nicht gefunden" };
      }

      // Check if workflow already exists
      const existing = await db.query.moneyMachineWorkflows.findFirst({
        where: eq(moneyMachineWorkflows.dealId, dealId),
      });

      if (existing) {
        return {
          success: true,
          workflowId: existing.id,
          stage: existing.currentStage as MoneyMachineStage,
          message: "Workflow bereits vorhanden",
        };
      }

      const [workflow] = await db.insert(moneyMachineWorkflows).values({
        organizationId: this.organizationId,
        dealId: deal.id,
        contactId: deal.contactId,
        hubspotDealId: deal.hubspotDealId,
        currentStage: "deal_received",
        dealAmount: deal.amount ? parseInt(String(deal.amount)) * 100 : undefined,
        requiredDocuments: REQUIRED_BAUVORHABEN_DOCUMENTS,
        customerEmail: deal.contact?.email,
      }).returning();

      await this.logActivity(workflow.id, {
        activityType: "workflow_started",
        title: "Money Machine Workflow gestartet",
        toStage: "deal_received",
        isAutomated: true,
      });

      return {
        success: true,
        workflowId: workflow.id,
        stage: "deal_received",
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ---------------------------------------------------------------------------
  // KUNDENKARTE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Create or link Kundenkarte to workflow
   */
  async createKundenkarte(workflowId: string, data?: Partial<{
    vorname: string;
    nachname: string;
    email: string;
    telefon: string;
  }>): Promise<WorkflowResult> {
    try {
      const workflow = await db.query.moneyMachineWorkflows.findFirst({
        where: eq(moneyMachineWorkflows.id, workflowId),
        with: { contact: true, deal: true },
      });

      if (!workflow) {
        return { success: false, error: "Workflow nicht gefunden" };
      }

      // Check if Kundenkarte already exists
      if (workflow.kundenkarteId) {
        return {
          success: true,
          workflowId,
          stage: workflow.currentStage as MoneyMachineStage,
          message: "Kundenkarte bereits verknüpft",
        };
      }

      // Try to find existing Kundenkarte by email
      const email = data?.email ?? workflow.customerEmail ?? (workflow.contact as any)?.email;
      if (!email) {
        return { success: false, error: "Keine Email-Adresse vorhanden" };
      }

      let kundenkarte = await db.query.kundenkarten.findFirst({
        where: and(
          eq(kundenkarten.email, email),
          eq(kundenkarten.organizationId, this.organizationId)
        ),
      });

      if (!kundenkarte) {
        // Generate unique customer number
        const kundenNummer = this.generateKundenNummer();

        // Create new Kundenkarte
        const [newKundenkarte] = await db.insert(kundenkarten).values({
          organizationId: this.organizationId,
          contactId: workflow.contactId,
          kundenNummer,
          vorname: data?.vorname ?? (workflow.contact as any)?.firstName ?? "Unbekannt",
          nachname: data?.nachname ?? (workflow.contact as any)?.lastName ?? "Unbekannt",
          email,
          telefon: data?.telefon ?? (workflow.contact as any)?.phone,
          status: "draft",
        }).returning();

        kundenkarte = newKundenkarte;

        // Log Kundenkarte creation
        await db.insert(kundenkarteActivities).values({
          kundenkarteId: kundenkarte.id,
          activityType: "status_change",
          title: "Kundenkarte automatisch erstellt",
          description: "Erstellt durch Money Machine Workflow",
          newStatus: "draft",
        });
      }

      // Update workflow
      await db.update(moneyMachineWorkflows)
        .set({
          kundenkarteId: kundenkarte.id,
          currentStage: "kundenkarte_created",
          previousStage: workflow.currentStage,
          kundenkarteCreatedAt: new Date(),
          customerEmail: email,
          updatedAt: new Date(),
        })
        .where(eq(moneyMachineWorkflows.id, workflowId));

      // Update deal with Kundenkarte ID
      await db.update(deals)
        .set({
          wmbKundenkarteId: kundenkarte.id,
          updatedAt: new Date(),
        })
        .where(eq(deals.id, workflow.dealId));

      await this.logActivity(workflowId, {
        activityType: "kundenkarte_created",
        title: "Kundenkarte erstellt/verknüpft",
        description: `Kundenkarte ${kundenkarte.kundenNummer} verknüpft`,
        fromStage: workflow.currentStage as MoneyMachineStage,
        toStage: "kundenkarte_created",
        isAutomated: true,
        metadata: { kundenkarteId: kundenkarte.id },
      });

      return {
        success: true,
        workflowId,
        stage: "kundenkarte_created",
        message: `Kundenkarte ${kundenkarte.kundenNummer} verknüpft`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ---------------------------------------------------------------------------
  // DOCUMENT MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Check document upload status
   */
  async checkDocuments(workflowId: string): Promise<{
    complete: boolean;
    documents: RequiredDocument[];
    missingRequired: string[];
  }> {
    const workflow = await db.query.moneyMachineWorkflows.findFirst({
      where: eq(moneyMachineWorkflows.id, workflowId),
    });

    if (!workflow || !workflow.kundenkarteId) {
      return { complete: false, documents: [], missingRequired: ["Kundenkarte fehlt"] };
    }

    // Get uploaded documents
    const uploadedDocs = await db.query.kundenkarteDocuments.findMany({
      where: eq(kundenkarteDocuments.kundenkarteId, workflow.kundenkarteId),
    });

    const documents = [...REQUIRED_BAUVORHABEN_DOCUMENTS];
    const uploadedTypes = new Set(uploadedDocs.map(d => d.documentType));

    // Update document status
    for (const doc of documents) {
      doc.uploaded = uploadedTypes.has(doc.type);
      const uploadedDoc = uploadedDocs.find(d => d.documentType === doc.type);
      if (uploadedDoc) {
        doc.documentId = uploadedDoc.id;
      }
    }

    const missingRequired = documents
      .filter(d => d.required && !d.uploaded)
      .map(d => d.label);

    const complete = missingRequired.length === 0;

    // Update workflow if documents are now complete
    if (complete && workflow.currentStage === "documents_pending") {
      await this.transitionStage(workflowId, "documents_uploaded");
    }

    return { complete, documents, missingRequired };
  }

  /**
   * Mark documents as pending (waiting for customer upload)
   */
  async markDocumentsPending(workflowId: string): Promise<WorkflowResult> {
    return this.transitionStage(workflowId, "documents_pending");
  }

  // ---------------------------------------------------------------------------
  // PRESENTATION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Generate presentation for a workflow
   */
  async generatePresentation(workflowId: string): Promise<WorkflowResult> {
    try {
      const workflow = await db.query.moneyMachineWorkflows.findFirst({
        where: eq(moneyMachineWorkflows.id, workflowId),
        with: {
          deal: true,
          kundenkarte: true,
          contact: true,
        },
      });

      if (!workflow) {
        return { success: false, error: "Workflow nicht gefunden" };
      }

      if (!workflow.kundenkarteId) {
        return { success: false, error: "Kundenkarte fehlt" };
      }

      // Check if presentation already exists
      if (workflow.presentationId) {
        return {
          success: true,
          workflowId,
          stage: workflow.currentStage as MoneyMachineStage,
          message: "Präsentation bereits vorhanden",
        };
      }

      const kundenkarte = workflow.kundenkarte as any;

      // Get documents
      const documents = await db.query.kundenkarteDocuments.findMany({
        where: eq(kundenkarteDocuments.kundenkarteId, workflow.kundenkarteId),
      });

      // Generate access token
      const accessToken = crypto.randomBytes(32).toString("hex");

      // Create customer snapshot
      const customerSnapshot = {
        name: `${kundenkarte?.vorname ?? ""} ${kundenkarte?.nachname ?? ""}`.trim(),
        email: kundenkarte?.email ?? workflow.customerEmail ?? "",
        phone: kundenkarte?.telefon,
        address: kundenkarte?.strasseHausnummer
          ? `${kundenkarte.strasseHausnummer}, ${kundenkarte.plz ?? ""} ${kundenkarte.ort ?? ""}`
          : undefined,
        bauvorhabenTyp: kundenkarte?.bauvorhabenTyp,
        hausTyp: kundenkarte?.hausTyp,
        wohnflaeche: kundenkarte?.wohnflaeche ? parseFloat(String(kundenkarte.wohnflaeche)) : undefined,
        grundstueckGroesse: kundenkarte?.grundstueckGroesse ? parseFloat(String(kundenkarte.grundstueckGroesse)) : undefined,
        gesamtbudget: kundenkarte?.gesamtbudget ? parseFloat(String(kundenkarte.gesamtbudget)) : undefined,
        smartHomeInteresse: kundenkarte?.smartHomeInteresse,
      };

      // Generate slides
      const slides = this.generatePresentationSlides(customerSnapshot, documents);

      // Prepare included documents
      const includedDocuments = documents.map(doc => ({
        documentId: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        includedAt: new Date().toISOString(),
      }));

      // Create presentation
      const [presentation] = await db.insert(presentations).values({
        organizationId: this.organizationId,
        dealId: workflow.dealId,
        kundenkarteId: workflow.kundenkarteId,
        contactId: workflow.contactId,
        title: `Bauvorhaben-Präsentation: ${customerSnapshot.name || "Kunde"}`,
        status: "ready",
        accessToken,
        publicUrl: `/p/${accessToken}`,
        customerSnapshot,
        slides,
        includedDocuments,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }).returning();

      // Update workflow
      await db.update(moneyMachineWorkflows)
        .set({
          presentationId: presentation.id,
          currentStage: "presentation_ready",
          previousStage: workflow.currentStage,
          presentationReadyAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(moneyMachineWorkflows.id, workflowId));

      await this.logActivity(workflowId, {
        activityType: "presentation_generated",
        title: "Präsentation generiert",
        description: `Präsentation mit ${slides.length} Folien erstellt`,
        fromStage: workflow.currentStage as MoneyMachineStage,
        toStage: "presentation_ready",
        isAutomated: true,
        metadata: { presentationId: presentation.id, slideCount: slides.length },
      });

      return {
        success: true,
        workflowId,
        stage: "presentation_ready",
        message: "Präsentation erfolgreich generiert",
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Generate presentation slides from customer data and documents
   */
  private generatePresentationSlides(
    customer: Record<string, unknown>,
    documents: Array<{ documentType: string; fileUrl: string; fileName: string }>
  ) {
    const slides: Array<{
      order: number;
      type: "cover" | "overview" | "floor_plan" | "visualization" | "features" | "pricing" | "timeline" | "contact" | "bauherren_pass";
      title: string;
      content: Record<string, unknown>;
      imageUrl?: string;
    }> = [];

    // Cover slide
    slides.push({
      order: 1,
      type: "cover",
      title: "Ihr Bauvorhaben",
      content: {
        customerName: customer.name,
        subtitle: `${customer.bauvorhabenTyp ?? "Neubau"} - ${customer.hausTyp ?? "Einfamilienhaus"}`,
        date: new Date().toLocaleDateString("de-DE"),
      },
    });

    // Overview slide
    slides.push({
      order: 2,
      type: "overview",
      title: "Projektübersicht",
      content: {
        bauvorhabenTyp: customer.bauvorhabenTyp ?? "Neubau",
        hausTyp: customer.hausTyp ?? "Einfamilienhaus",
        wohnflaeche: customer.wohnflaeche ? `${customer.wohnflaeche} m²` : "Nach Vereinbarung",
        grundstueckGroesse: customer.grundstueckGroesse ? `${customer.grundstueckGroesse} m²` : "Nach Vereinbarung",
        budget: customer.gesamtbudget
          ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(customer.gesamtbudget as number)
          : "Auf Anfrage",
      },
    });

    // Add floor plan if available
    const grundriss = documents.find(d => d.documentType === "grundriss");
    if (grundriss) {
      slides.push({
        order: 3,
        type: "floor_plan",
        title: "Grundriss",
        content: { fileName: grundriss.fileName },
        imageUrl: grundriss.fileUrl,
      });
    }

    // Add visualizations if available
    const skizze = documents.find(d => d.documentType === "skizze");
    if (skizze) {
      slides.push({
        order: slides.length + 1,
        type: "visualization",
        title: "Visualisierung",
        content: { fileName: skizze.fileName },
        imageUrl: skizze.fileUrl,
      });
    }

    // Add ansichten if available
    const ansichten = documents.find(d => d.documentType === "ansichten");
    if (ansichten) {
      slides.push({
        order: slides.length + 1,
        type: "visualization",
        title: "Ansichten",
        content: { fileName: ansichten.fileName },
        imageUrl: ansichten.fileUrl,
      });
    }

    // Features slide (Smart Home if interested)
    if (customer.smartHomeInteresse) {
      slides.push({
        order: slides.length + 1,
        type: "features",
        title: "Smart Home Integration",
        content: {
          provider: "LOXONE",
          features: [
            "Intelligente Lichtsteuerung",
            "Heizungsregelung",
            "Sicherheitssystem",
            "Beschattungssteuerung",
            "Energiemanagement",
          ],
        },
      });
    }

    // Timeline slide
    slides.push({
      order: slides.length + 1,
      type: "timeline",
      title: "Projektzeitplan",
      content: {
        phases: [
          { name: "Planung & Genehmigung", duration: "4-8 Wochen" },
          { name: "Bauvorbereitung", duration: "2-4 Wochen" },
          { name: "Rohbau", duration: "8-12 Wochen" },
          { name: "Innenausbau", duration: "12-16 Wochen" },
          { name: "Fertigstellung", duration: "4-6 Wochen" },
        ],
      },
    });

    // Bauherren-Pass slide
    slides.push({
      order: slides.length + 1,
      type: "bauherren_pass",
      title: "Ihr Bauherren-Pass",
      content: {
        benefits: [
          "Exklusive Rabatte bei Partnern",
          "Persönlicher Projektmanager",
          "Regelmäßige Statusupdates",
          "Garantieverlängerung",
          "Smart Home Beratung inklusive",
        ],
        tiers: ["Bronze", "Silber", "Gold", "Platin", "Diamant"],
      },
    });

    // Contact slide
    slides.push({
      order: slides.length + 1,
      type: "contact",
      title: "Nächste Schritte",
      content: {
        company: "West Money Bau",
        email: "info@westmoneybau.de",
        phone: "+49 123 456789",
        website: "www.westmoneybau.de",
        callToAction: "Vereinbaren Sie Ihren persönlichen Beratungstermin!",
      },
    });

    return slides;
  }

  // ---------------------------------------------------------------------------
  // EMAIL SENDING
  // ---------------------------------------------------------------------------

  /**
   * Send presentation via email
   */
  async sendPresentationEmail(workflowId: string, options?: {
    emailTo?: string;
    subject?: string;
    message?: string;
  }): Promise<WorkflowResult> {
    try {
      const workflow = await db.query.moneyMachineWorkflows.findFirst({
        where: eq(moneyMachineWorkflows.id, workflowId),
        with: { presentation: true, kundenkarte: true, deal: true },
      });

      if (!workflow) {
        return { success: false, error: "Workflow nicht gefunden" };
      }

      if (!workflow.presentationId) {
        return { success: false, error: "Keine Präsentation vorhanden" };
      }

      const email = options?.emailTo ?? workflow.customerEmail;
      if (!email) {
        return { success: false, error: "Keine Email-Adresse" };
      }

      const presentation = workflow.presentation as any;
      const kundenkarte = workflow.kundenkarte as any;
      const deal = workflow.deal as any;

      // Prepare email content
      const presentationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://nexus.westmoneybau.de"}/p/${presentation.accessToken}`;
      const customerName = kundenkarte?.vorname ?? "Kunde";

      // TODO: Integrate with actual email service (mail-controller.ts or Resend)
      // For now, we log and update the workflow
      console.log("[MoneyMachine] Sending email:", {
        to: email,
        subject: options?.subject ?? `Ihre Bauvorhaben-Präsentation - ${deal?.name ?? "Projekt"}`,
        presentationUrl,
      });

      // Update presentation email tracking
      await db.update(presentations)
        .set({
          emailSentAt: new Date(),
          emailTo: email,
          status: "sent",
          updatedAt: new Date(),
        })
        .where(eq(presentations.id, workflow.presentationId));

      // Update workflow
      await db.update(moneyMachineWorkflows)
        .set({
          currentStage: "email_sent",
          previousStage: workflow.currentStage,
          emailSentAt: new Date(),
          lastEmailSentAt: new Date(),
          emailSentCount: (workflow.emailSentCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(moneyMachineWorkflows.id, workflowId));

      await this.logActivity(workflowId, {
        activityType: "email_sent",
        title: "Präsentation versendet",
        description: `Email an ${email} gesendet`,
        fromStage: workflow.currentStage as MoneyMachineStage,
        toStage: "email_sent",
        isAutomated: true,
        metadata: { email, presentationUrl },
      });

      return {
        success: true,
        workflowId,
        stage: "email_sent",
        message: `Email an ${email} versendet`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ---------------------------------------------------------------------------
  // BAUHERREN-PASS
  // ---------------------------------------------------------------------------

  /**
   * Offer Bauherren-Pass to customer
   */
  async offerBauherrenPass(workflowId: string): Promise<WorkflowResult> {
    const workflow = await db.query.moneyMachineWorkflows.findFirst({
      where: eq(moneyMachineWorkflows.id, workflowId),
    });

    if (!workflow) {
      return { success: false, error: "Workflow nicht gefunden" };
    }

    await db.update(moneyMachineWorkflows)
      .set({
        currentStage: "bauherren_pass_offered",
        previousStage: workflow.currentStage,
        bauherrenPassOfferedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(moneyMachineWorkflows.id, workflowId));

    if (workflow.presentationId) {
      await db.update(presentations)
        .set({
          bauherrenPassOffered: true,
          bauherrenPassOfferedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(presentations.id, workflow.presentationId));
    }

    await this.logActivity(workflowId, {
      activityType: "bauherren_pass_offered",
      title: "Bauherren-Pass angeboten",
      fromStage: workflow.currentStage as MoneyMachineStage,
      toStage: "bauherren_pass_offered",
      isAutomated: true,
    });

    return {
      success: true,
      workflowId,
      stage: "bauherren_pass_offered",
    };
  }

  /**
   * Mark Bauherren-Pass as sold
   */
  async markBauherrenPassSold(workflowId: string, revenue?: number): Promise<WorkflowResult> {
    const workflow = await db.query.moneyMachineWorkflows.findFirst({
      where: eq(moneyMachineWorkflows.id, workflowId),
    });

    if (!workflow) {
      return { success: false, error: "Workflow nicht gefunden" };
    }

    const bauherrenPassRevenue = revenue ?? 0;
    const totalRevenue = (workflow.dealAmount ?? 0) + bauherrenPassRevenue;

    await db.update(moneyMachineWorkflows)
      .set({
        currentStage: "bauherren_pass_sold",
        previousStage: workflow.currentStage,
        bauherrenPassSoldAt: new Date(),
        bauherrenPassRevenue,
        totalRevenue,
        updatedAt: new Date(),
      })
      .where(eq(moneyMachineWorkflows.id, workflowId));

    if (workflow.presentationId) {
      await db.update(presentations)
        .set({
          bauherrenPassAccepted: true,
          bauherrenPassAcceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(presentations.id, workflow.presentationId));
    }

    // Update deal Bauherren-Pass status
    await db.update(deals)
      .set({
        wmbBauherrenPassStatus: "sold",
        updatedAt: new Date(),
      })
      .where(eq(deals.id, workflow.dealId));

    await this.logActivity(workflowId, {
      activityType: "bauherren_pass_sold",
      title: "Bauherren-Pass verkauft",
      fromStage: workflow.currentStage as MoneyMachineStage,
      toStage: "bauherren_pass_sold",
      metadata: { revenue: bauherrenPassRevenue },
    });

    return {
      success: true,
      workflowId,
      stage: "bauherren_pass_sold",
      message: "Bauherren-Pass erfolgreich verkauft!",
    };
  }

  /**
   * Complete the workflow
   */
  async completeWorkflow(workflowId: string): Promise<WorkflowResult> {
    return this.transitionStage(workflowId, "completed");
  }

  // ---------------------------------------------------------------------------
  // TRACKING
  // ---------------------------------------------------------------------------

  /**
   * Record presentation view
   */
  async recordPresentationView(accessToken: string, viewData: {
    duration?: number;
    deviceType?: string;
    slidesViewed?: Array<{ slideIndex: number; viewedAt: string; duration: number }>;
    maxSlideReached?: number;
    completedViewing?: boolean;
    clickedContactButton?: boolean;
    clickedBauherrenPass?: boolean;
  }): Promise<void> {
    const presentation = await db.query.presentations.findFirst({
      where: eq(presentations.accessToken, accessToken),
    });

    if (!presentation) return;

    // Record view
    await db.insert(presentationViews).values({
      presentationId: presentation.id,
      duration: viewData.duration,
      deviceType: viewData.deviceType,
      slidesViewed: viewData.slidesViewed,
      maxSlideReached: viewData.maxSlideReached,
      completedViewing: viewData.completedViewing,
      clickedContactButton: viewData.clickedContactButton,
      clickedBauherrenPass: viewData.clickedBauherrenPass,
    });

    // Update presentation stats
    const isFirstView = !presentation.firstViewedAt;
    await db.update(presentations)
      .set({
        viewCount: (presentation.viewCount ?? 0) + 1,
        lastViewedAt: new Date(),
        firstViewedAt: isFirstView ? new Date() : presentation.firstViewedAt,
        status: presentation.status === "sent" ? "viewed" : presentation.status,
        updatedAt: new Date(),
      })
      .where(eq(presentations.id, presentation.id));

    // Update workflow if this is first view
    if (isFirstView) {
      const workflow = await db.query.moneyMachineWorkflows.findFirst({
        where: eq(moneyMachineWorkflows.presentationId, presentation.id),
      });

      if (workflow && workflow.currentStage === "email_sent") {
        await this.transitionStage(workflow.id, "presentation_viewed");
      }
    }

    // If clicked Bauherren-Pass, offer it
    if (viewData.clickedBauherrenPass) {
      const workflow = await db.query.moneyMachineWorkflows.findFirst({
        where: eq(moneyMachineWorkflows.presentationId, presentation.id),
      });

      if (workflow && !workflow.bauherrenPassOfferedAt) {
        await this.offerBauherrenPass(workflow.id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------

  private async transitionStage(workflowId: string, newStage: MoneyMachineStage): Promise<WorkflowResult> {
    const workflow = await db.query.moneyMachineWorkflows.findFirst({
      where: eq(moneyMachineWorkflows.id, workflowId),
    });

    if (!workflow) {
      return { success: false, error: "Workflow nicht gefunden" };
    }

    const stageTimestamp: Record<string, Date> = {};
    const stageKey = `${newStage.replace(/_/g, "")}At` as keyof typeof stageTimestamp;
    stageTimestamp[stageKey] = new Date();

    await db.update(moneyMachineWorkflows)
      .set({
        currentStage: newStage,
        previousStage: workflow.currentStage,
        ...stageTimestamp,
        completedAt: newStage === "completed" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(moneyMachineWorkflows.id, workflowId));

    await this.logActivity(workflowId, {
      activityType: "stage_changed",
      title: `Stage: ${newStage}`,
      fromStage: workflow.currentStage as MoneyMachineStage,
      toStage: newStage,
      isAutomated: true,
    });

    return {
      success: true,
      workflowId,
      stage: newStage,
    };
  }

  private async logActivity(workflowId: string, data: {
    activityType: string;
    title: string;
    description?: string;
    fromStage?: MoneyMachineStage;
    toStage?: MoneyMachineStage;
    performedBy?: string;
    isAutomated?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await db.insert(moneyMachineActivities).values({
      workflowId,
      activityType: data.activityType,
      title: data.title,
      description: data.description,
      fromStage: data.fromStage,
      toStage: data.toStage,
      performedBy: data.performedBy,
      isAutomated: data.isAutomated ?? false,
      metadata: data.metadata,
    });
  }

  private generateKundenNummer(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WMB-${year}${month}-${random}`;
  }

  // ---------------------------------------------------------------------------
  // STATISTICS & DASHBOARD
  // ---------------------------------------------------------------------------

  async getWorkflowStats(): Promise<{
    total: number;
    byStage: Record<string, number>;
    completedToday: number;
    revenue: { total: number; bauherrenPass: number };
    conversionRate: number;
  }> {
    const workflows = await db.query.moneyMachineWorkflows.findMany({
      where: eq(moneyMachineWorkflows.organizationId, this.organizationId),
    });

    const byStage: Record<string, number> = {};
    let totalRevenue = 0;
    let bauherrenPassRevenue = 0;
    let completedCount = 0;
    let soldCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let completedToday = 0;

    for (const w of workflows) {
      byStage[w.currentStage] = (byStage[w.currentStage] ?? 0) + 1;
      totalRevenue += w.totalRevenue ?? 0;
      bauherrenPassRevenue += w.bauherrenPassRevenue ?? 0;

      if (w.currentStage === "completed") {
        completedCount++;
        if (w.completedAt && new Date(w.completedAt) >= today) {
          completedToday++;
        }
      }

      if (w.currentStage === "bauherren_pass_sold" || w.bauherrenPassSoldAt) {
        soldCount++;
      }
    }

    return {
      total: workflows.length,
      byStage,
      completedToday,
      revenue: {
        total: totalRevenue / 100, // Convert from cents
        bauherrenPass: bauherrenPassRevenue / 100,
      },
      conversionRate: workflows.length > 0 ? (soldCount / workflows.length) * 100 : 0,
    };
  }

  /**
   * Get workflows that need action
   */
  async getActionRequired(): Promise<Array<{
    workflowId: string;
    dealName: string;
    stage: string;
    action: string;
    customerEmail?: string;
  }>> {
    const workflows = await db.query.moneyMachineWorkflows.findMany({
      where: and(
        eq(moneyMachineWorkflows.organizationId, this.organizationId),
        eq(moneyMachineWorkflows.isActive, true)
      ),
      with: { deal: true },
    });

    return workflows
      .filter(w => w.currentStage !== "completed")
      .map(w => {
        let action = "";
        switch (w.currentStage) {
          case "deal_received":
            action = "Kundenkarte erstellen";
            break;
          case "kundenkarte_created":
          case "documents_pending":
            action = "Dokumente hochladen";
            break;
          case "documents_uploaded":
            action = "Präsentation generieren";
            break;
          case "presentation_ready":
            action = "Email versenden";
            break;
          case "email_sent":
            action = "Auf Ansicht warten";
            break;
          case "presentation_viewed":
            action = "Bauherren-Pass anbieten";
            break;
          case "bauherren_pass_offered":
            action = "Auf Abschluss warten";
            break;
          case "bauherren_pass_sold":
            action = "Workflow abschließen";
            break;
        }

        return {
          workflowId: w.id,
          dealName: (w.deal as any)?.name ?? "Unbekannt",
          stage: w.currentStage,
          action,
          customerEmail: w.customerEmail ?? undefined,
        };
      });
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export async function getMoneyMachineService(organizationId: string): Promise<MoneyMachineService> {
  const service = new MoneyMachineService(organizationId);
  await service.initialize();
  return service;
}
