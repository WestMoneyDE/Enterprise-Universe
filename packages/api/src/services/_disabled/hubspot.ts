// =============================================================================
// HUBSPOT CRM INTEGRATION SERVICE
// Handles bi-directional sync between Nexus and HubSpot CRM
// =============================================================================

import { db, contacts, deals, eq, and } from "@nexus/db";

// =============================================================================
// CONFIGURATION
// =============================================================================

const HUBSPOT_API_BASE = "https://api.hubapi.com";

interface HubSpotConfig {
  accessToken: string;
  portalId?: string;
}

// =============================================================================
// HUBSPOT TYPES
// =============================================================================

export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    website?: string;
    hs_whatsapp_phone_number?: string;
    hs_lead_status?: string;
    lifecyclestage?: string;
    // Custom properties for GDPR consent
    consent_status?: string;
    consent_date?: string;
    consent_source?: string;
    // Custom properties for lead scoring
    lead_score?: string;
    lead_score_grade?: string;
    // Custom properties for West Money Bau
    interested_project_types?: string;
    budget_range?: string;
    financing_ready?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    description?: string;
    hs_deal_stage_probability?: string;
    // Custom properties
    deal_type?: string;
    construction_type?: string;
    project_address?: string;
  };
  associations?: {
    contacts?: { results: Array<{ id: string }> };
    companies?: { results: Array<{ id: string }> };
  };
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    industry?: string;
    numberofemployees?: string;
    annualrevenue?: string;
  };
}

interface HubSpotApiResponse<T> {
  results?: T[];
  total?: number;
  paging?: {
    next?: { after: string };
  };
}

interface HubSpotError {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}

// =============================================================================
// HUBSPOT SERVICE CLASS
// =============================================================================

export class HubSpotService {
  private config: HubSpotConfig;

  constructor(config: HubSpotConfig) {
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // CONTACTS
  // ---------------------------------------------------------------------------

  async getContact(contactId: string): Promise<HubSpotContact | null> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,phone,company,jobtitle,address,city,state,zip,country,website,hs_whatsapp_phone_number,hs_lead_status,lifecyclestage,consent_status,consent_date,consent_source,lead_score,lead_score_grade`;

    const response = await this.request<HubSpotContact>(url, "GET");
    return response;
  }

  async searchContacts(query: {
    email?: string;
    phone?: string;
    whatsappNumber?: string;
  }): Promise<HubSpotContact[]> {
    const filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }> = [];

    if (query.email) {
      filters.push({
        propertyName: "email",
        operator: "EQ",
        value: query.email,
      });
    }

    if (query.phone) {
      filters.push({
        propertyName: "phone",
        operator: "CONTAINS_TOKEN",
        value: query.phone,
      });
    }

    if (query.whatsappNumber) {
      filters.push({
        propertyName: "hs_whatsapp_phone_number",
        operator: "EQ",
        value: query.whatsappNumber,
      });
    }

    if (filters.length === 0) {
      return [];
    }

    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`;
    const body = {
      filterGroups: filters.length > 1
        ? [{ filters: [filters[0]] }, ...filters.slice(1).map(f => ({ filters: [f] }))]
        : [{ filters }],
      properties: [
        "email", "firstname", "lastname", "phone", "company", "jobtitle",
        "hs_whatsapp_phone_number", "hs_lead_status", "lifecyclestage",
        "consent_status", "consent_date", "consent_source",
        "lead_score", "lead_score_grade"
      ],
      limit: 10,
    };

    const response = await this.request<HubSpotApiResponse<HubSpotContact>>(
      url,
      "POST",
      body
    );

    return response?.results ?? [];
  }

  async createContact(properties: HubSpotContact["properties"]): Promise<HubSpotContact> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`;

    const response = await this.request<HubSpotContact>(url, "POST", {
      properties,
    });

    if (!response) {
      throw new Error("Failed to create HubSpot contact");
    }

    return response;
  }

  async updateContact(
    contactId: string,
    properties: Partial<HubSpotContact["properties"]>
  ): Promise<HubSpotContact> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`;

    const response = await this.request<HubSpotContact>(url, "PATCH", {
      properties,
    });

    if (!response) {
      throw new Error("Failed to update HubSpot contact");
    }

    return response;
  }

  async deleteContact(contactId: string): Promise<boolean> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`;
    await this.request(url, "DELETE");
    return true;
  }

  // ---------------------------------------------------------------------------
  // DEALS
  // ---------------------------------------------------------------------------

  async getDeal(dealId: string): Promise<HubSpotDeal | null> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,pipeline,closedate,description,deal_type,construction_type,project_address&associations=contacts,companies`;

    const response = await this.request<HubSpotDeal>(url, "GET");
    return response;
  }

  async searchDeals(query: {
    contactId?: string;
    pipeline?: string;
    dealstage?: string;
  }): Promise<HubSpotDeal[]> {
    const filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }> = [];

    if (query.pipeline) {
      filters.push({
        propertyName: "pipeline",
        operator: "EQ",
        value: query.pipeline,
      });
    }

    if (query.dealstage) {
      filters.push({
        propertyName: "dealstage",
        operator: "EQ",
        value: query.dealstage,
      });
    }

    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`;
    const body = {
      filterGroups: filters.length > 0 ? [{ filters }] : [],
      properties: [
        "dealname", "amount", "dealstage", "pipeline", "closedate",
        "description", "deal_type", "construction_type", "project_address"
      ],
      limit: 100,
    };

    const response = await this.request<HubSpotApiResponse<HubSpotDeal>>(
      url,
      "POST",
      body
    );

    return response?.results ?? [];
  }

  async createDeal(
    properties: HubSpotDeal["properties"],
    associations?: { contactId?: string; companyId?: string }
  ): Promise<HubSpotDeal> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals`;

    const body: Record<string, unknown> = { properties };

    if (associations?.contactId || associations?.companyId) {
      body.associations = [];

      if (associations.contactId) {
        (body.associations as Array<unknown>).push({
          to: { id: associations.contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
        });
      }

      if (associations.companyId) {
        (body.associations as Array<unknown>).push({
          to: { id: associations.companyId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 5 }],
        });
      }
    }

    const response = await this.request<HubSpotDeal>(url, "POST", body);

    if (!response) {
      throw new Error("Failed to create HubSpot deal");
    }

    return response;
  }

  async updateDeal(
    dealId: string,
    properties: Partial<HubSpotDeal["properties"]>
  ): Promise<HubSpotDeal> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${dealId}`;

    const response = await this.request<HubSpotDeal>(url, "PATCH", {
      properties,
    });

    if (!response) {
      throw new Error("Failed to update HubSpot deal");
    }

    return response;
  }

  // ---------------------------------------------------------------------------
  // COMPANIES
  // ---------------------------------------------------------------------------

  async getCompany(companyId: string): Promise<HubSpotCompany | null> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}?properties=name,domain,phone,address,city,state,zip,country,industry,numberofemployees,annualrevenue`;

    const response = await this.request<HubSpotCompany>(url, "GET");
    return response;
  }

  async searchCompanies(query: {
    name?: string;
    domain?: string;
  }): Promise<HubSpotCompany[]> {
    const filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }> = [];

    if (query.name) {
      filters.push({
        propertyName: "name",
        operator: "CONTAINS_TOKEN",
        value: query.name,
      });
    }

    if (query.domain) {
      filters.push({
        propertyName: "domain",
        operator: "EQ",
        value: query.domain,
      });
    }

    if (filters.length === 0) {
      return [];
    }

    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies/search`;
    const body = {
      filterGroups: [{ filters }],
      properties: ["name", "domain", "phone", "industry"],
      limit: 10,
    };

    const response = await this.request<HubSpotApiResponse<HubSpotCompany>>(
      url,
      "POST",
      body
    );

    return response?.results ?? [];
  }

  // ---------------------------------------------------------------------------
  // CONSENT MANAGEMENT (GDPR)
  // ---------------------------------------------------------------------------

  async updateContactConsent(
    contactId: string,
    consent: {
      status: "granted" | "revoked" | "pending";
      source: string;
      date: Date;
    }
  ): Promise<HubSpotContact> {
    return this.updateContact(contactId, {
      consent_status: consent.status,
      consent_source: consent.source,
      consent_date: consent.date.toISOString(),
      // Also update HubSpot's built-in legal basis fields
      ...(consent.status === "granted"
        ? {
            hs_legal_basis: "Consent",
          }
        : {}),
    });
  }

  // ---------------------------------------------------------------------------
  // LEAD SCORING
  // ---------------------------------------------------------------------------

  async updateContactLeadScore(
    contactId: string,
    score: number,
    grade: "A" | "B" | "C" | "D"
  ): Promise<HubSpotContact> {
    return this.updateContact(contactId, {
      lead_score: String(score),
      lead_score_grade: grade,
    });
  }

  // ---------------------------------------------------------------------------
  // WEBHOOKS
  // ---------------------------------------------------------------------------

  verifyWebhookSignature(
    payload: string,
    signature: string,
    clientSecret: string
  ): boolean {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", clientSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private async request<T>(
    url: string,
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: unknown
  ): Promise<T | null> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = (await response.json()) as HubSpotError;
        console.error("[HubSpot] API Error:", error);

        if (response.status === 404) {
          return null;
        }

        throw new Error(`HubSpot API error: ${error.message} (${error.category})`);
      }

      if (method === "DELETE") {
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error("[HubSpot] Request failed:", error);
      throw error;
    }
  }
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Get HubSpot service instance for an organization
 */
export async function getHubSpotService(
  organizationId: string
): Promise<HubSpotService | null> {
  // Look up organization's HubSpot credentials
  const org = await db.query.organizations.findFirst({
    where: (orgs, { eq }) => eq(orgs.id, organizationId),
  });

  // Check for HubSpot access token in organization settings or env
  const accessToken =
    (org?.settings as Record<string, unknown>)?.hubspotAccessToken as string ??
    process.env.HUBSPOT_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn(`[HubSpot] No access token for organization: ${organizationId}`);
    return null;
  }

  return new HubSpotService({ accessToken });
}

/**
 * Sync a Nexus contact to HubSpot
 */
export async function syncContactToHubSpot(
  contactId: string,
  organizationId: string
): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
  try {
    const hubspot = await getHubSpotService(organizationId);
    if (!hubspot) {
      return { success: false, error: "HubSpot not configured" };
    }

    // Get Nexus contact
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, contactId),
        eq(contacts.organizationId, organizationId)
      ),
    });

    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    // Map Nexus fields to HubSpot properties
    const properties: HubSpotContact["properties"] = {
      email: contact.email,
      firstname: contact.firstName ?? undefined,
      lastname: contact.lastName ?? undefined,
      phone: contact.phone ?? undefined,
      company: contact.company ?? undefined,
      jobtitle: contact.jobTitle ?? undefined,
      address: contact.street ?? undefined,
      city: contact.city ?? undefined,
      zip: contact.postalCode ?? undefined,
      country: contact.country ?? undefined,
      hs_whatsapp_phone_number: contact.whatsappNumber ?? undefined,
      consent_status: contact.consentStatus ?? undefined,
      consent_source: contact.consentSource ?? undefined,
      consent_date: contact.consentDate?.toISOString() ?? undefined,
      lead_score: contact.leadScore?.toString() ?? undefined,
      lead_score_grade: contact.leadScoreGrade ?? undefined,
    };

    let hubspotContact: HubSpotContact;

    if (contact.hubspotContactId) {
      // Update existing HubSpot contact
      hubspotContact = await hubspot.updateContact(contact.hubspotContactId, properties);
    } else {
      // Check if contact exists by email
      const existingContacts = await hubspot.searchContacts({ email: contact.email });

      if (existingContacts.length > 0) {
        // Link and update existing
        hubspotContact = await hubspot.updateContact(existingContacts[0].id, properties);
      } else {
        // Create new contact
        hubspotContact = await hubspot.createContact(properties);
      }

      // Save HubSpot ID to Nexus
      await db
        .update(contacts)
        .set({
          hubspotContactId: hubspotContact.id,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contactId));
    }

    return { success: true, hubspotId: hubspotContact.id };
  } catch (error) {
    console.error("[HubSpot] Sync contact error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync a HubSpot contact to Nexus
 */
export async function syncContactFromHubSpot(
  hubspotContactId: string,
  organizationId: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const hubspot = await getHubSpotService(organizationId);
    if (!hubspot) {
      return { success: false, error: "HubSpot not configured" };
    }

    // Get HubSpot contact
    const hubspotContact = await hubspot.getContact(hubspotContactId);
    if (!hubspotContact) {
      return { success: false, error: "HubSpot contact not found" };
    }

    const props = hubspotContact.properties;

    // Check if contact already exists in Nexus
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.hubspotContactId, hubspotContactId),
        eq(contacts.organizationId, organizationId)
      ),
    });

    if (!contact && props.email) {
      // Try to find by email
      contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.email, props.email),
          eq(contacts.organizationId, organizationId)
        ),
      });
    }

    const contactData = {
      organizationId,
      email: props.email ?? `hubspot-${hubspotContactId}@placeholder.local`,
      firstName: props.firstname,
      lastName: props.lastname,
      phone: props.phone,
      company: props.company,
      jobTitle: props.jobtitle,
      street: props.address,
      city: props.city,
      postalCode: props.zip,
      country: props.country,
      whatsappNumber: props.hs_whatsapp_phone_number,
      hubspotContactId: hubspotContactId,
      consentStatus: props.consent_status as "granted" | "revoked" | "pending" | null,
      consentSource: props.consent_source,
      consentDate: props.consent_date ? new Date(props.consent_date) : null,
      leadScore: props.lead_score ? parseInt(props.lead_score, 10) : null,
      leadScoreGrade: props.lead_score_grade as "A" | "B" | "C" | "D" | null,
      source: "hubspot" as const,
      updatedAt: new Date(),
    };

    if (contact) {
      // Update existing
      await db
        .update(contacts)
        .set(contactData)
        .where(eq(contacts.id, contact.id));

      return { success: true, contactId: contact.id };
    } else {
      // Create new
      const [newContact] = await db
        .insert(contacts)
        .values({
          ...contactData,
          type: "lead",
        })
        .returning();

      return { success: true, contactId: newContact.id };
    }
  } catch (error) {
    console.error("[HubSpot] Sync from HubSpot error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync a Nexus deal to HubSpot
 */
export async function syncDealToHubSpot(
  dealId: string,
  organizationId: string
): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
  try {
    const hubspot = await getHubSpotService(organizationId);
    if (!hubspot) {
      return { success: false, error: "HubSpot not configured" };
    }

    // Get Nexus deal with contact
    const deal = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealId), eq(deals.organizationId, organizationId)),
      with: { contact: true },
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    // Map Nexus fields to HubSpot properties
    const properties: HubSpotDeal["properties"] = {
      dealname: deal.title,
      amount: deal.value?.toString() ?? undefined,
      closedate: deal.expectedCloseDate?.toISOString() ?? undefined,
      description: deal.description ?? undefined,
    };

    let hubspotDeal: HubSpotDeal;

    if (deal.hubspotDealId) {
      // Update existing
      hubspotDeal = await hubspot.updateDeal(deal.hubspotDealId, properties);
    } else {
      // Create new with contact association if available
      const associations = deal.contact?.hubspotContactId
        ? { contactId: deal.contact.hubspotContactId }
        : undefined;

      hubspotDeal = await hubspot.createDeal(properties, associations);

      // Save HubSpot ID to Nexus
      await db
        .update(deals)
        .set({
          hubspotDealId: hubspotDeal.id,
          updatedAt: new Date(),
        })
        .where(eq(deals.id, dealId));
    }

    return { success: true, hubspotId: hubspotDeal.id };
  } catch (error) {
    console.error("[HubSpot] Sync deal error:", error);
    return { success: false, error: String(error) };
  }
}
