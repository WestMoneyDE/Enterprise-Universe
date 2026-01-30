import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  db,
  kundenkarten,
  kundenkarteDocuments,
  kundenkarteActivities,
  bauherrenPaesse,
  eq,
  and,
  desc,
  asc,
  like,
  or,
  sql,
  isNull,
} from "@nexus/db";

// =============================================================================
// KUNDENKARTE ROUTER - Customer Card Management System
// =============================================================================

// Zod Schemas for validation
const kundenkarteStatusEnum = z.enum([
  "draft",
  "pending_review",
  "approved",
  "active",
  "on_hold",
  "completed",
  "archived",
]);

const kundenkarteTierEnum = z.enum([
  "bronze",
  "silver",
  "gold",
]);

const pointsHistoryEntrySchema = z.object({
  date: z.string(),
  points: z.number(),
  type: z.enum(["earned", "redeemed", "adjusted", "expired"]),
  description: z.string(),
  balanceAfter: z.number(),
  referenceId: z.string().optional(),
});

const smartHomeFeaturesSchema = z.object({
  lighting: z.boolean().optional(),
  heating: z.boolean().optional(),
  security: z.boolean().optional(),
  shading: z.boolean().optional(),
  audio: z.boolean().optional(),
  energyManagement: z.boolean().optional(),
  budget: z.number().optional(),
}).optional();

const kinderDetailsSchema = z.array(z.object({
  name: z.string(),
  geburtsdatum: z.string(),
  unterhaltspflichtig: z.boolean(),
})).optional();

const schufaSchema = z.object({
  checked: z.boolean(),
  score: z.number().optional(),
  checkedAt: z.string().optional(),
  result: z.string().optional(),
}).optional();

// Create/Update Input Schema
const kundenkarteInputSchema = z.object({
  // Personal Data
  anrede: z.string().optional(),
  titel: z.string().optional(),
  vorname: z.string().min(1, "Vorname ist erforderlich"),
  nachname: z.string().min(1, "Nachname ist erforderlich"),
  geburtsdatum: z.string().optional(),
  geburtsort: z.string().optional(),
  staatsangehoerigkeit: z.string().optional(),
  familienstand: z.string().optional(),

  // Contact
  email: z.string().email("Gültige E-Mail erforderlich"),
  emailSecondary: z.string().email().optional().or(z.literal("")),
  telefon: z.string().optional(),
  telefonMobil: z.string().optional(),
  telefonGeschaeftlich: z.string().optional(),

  // Address
  strasseHausnummer: z.string().optional(),
  plz: z.string().optional(),
  ort: z.string().optional(),
  land: z.string().optional(),

  // Employment
  beruf: z.string().optional(),
  arbeitgeber: z.string().optional(),
  arbeitgeberAdresse: z.string().optional(),
  beschaeftigtSeit: z.string().optional(),
  bruttoEinkommen: z.number().optional(),
  nettoEinkommen: z.number().optional(),
  sonstigeEinkuenfte: z.number().optional(),
  selbststaendig: z.boolean().optional(),

  // Partner
  partnerVorname: z.string().optional(),
  partnerNachname: z.string().optional(),
  partnerGeburtsdatum: z.string().optional(),
  partnerBeruf: z.string().optional(),
  partnerEinkommen: z.number().optional(),

  // Children
  anzahlKinder: z.number().optional(),
  kinderDetails: kinderDetailsSchema,

  // Property
  grundstueckVorhanden: z.boolean().optional(),
  grundstueckAdresse: z.string().optional(),
  grundstueckGroesse: z.number().optional(),
  grundstueckKaufpreis: z.number().optional(),
  grundstueckKaufDatum: z.string().optional(),
  grundbuchEintrag: z.string().optional(),

  // Building Project
  bauvorhabenTyp: z.string().optional(),
  hausTyp: z.string().optional(),
  wohnflaeche: z.number().optional(),
  nutzflaeche: z.number().optional(),
  anzahlZimmer: z.number().optional(),
  anzahlBaeder: z.number().optional(),
  anzahlEtagen: z.number().optional(),
  kellerGeplant: z.boolean().optional(),
  garageCarport: z.string().optional(),

  // Financial
  eigenkapital: z.number().optional(),
  gesamtbudget: z.number().optional(),
  finanzierungsbedarf: z.number().optional(),
  finanzierungGesichert: z.boolean().optional(),
  finanzierungspartner: z.string().optional(),
  kfwFoerderung: z.boolean().optional(),
  kfwProgramm: z.string().optional(),

  // Obligations
  bestehendeKredite: z.number().optional(),
  monatlicheRaten: z.number().optional(),
  mietbelastung: z.number().optional(),
  unterhaltspflichten: z.number().optional(),

  // Smart Home
  smartHomeInteresse: z.boolean().optional(),
  smartHomeFeatures: smartHomeFeaturesSchema,

  // Energy
  energiestandard: z.string().optional(),
  heizungsart: z.string().optional(),
  photovoltaik: z.boolean().optional(),
  photovoltaikKwp: z.number().optional(),
  wallbox: z.boolean().optional(),

  // Communication
  bevorzugteKontaktart: z.string().optional(),
  besteErreichbarkeit: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),

  // Internal
  internalNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  leadSource: z.string().optional(),
});

// Generate unique customer number
function generateKundenNummer(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WMB-${year}${month}-${random}`;
}

// Generate unique card number for loyalty program
function generateCardNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `KK-${year}-${random}`;
}

// Generate QR code data containing card information
function generateQRCodeData(cardNumber: string, kundenkarteId: string): string {
  const payload = {
    type: "KUNDENKARTE",
    cardNumber,
    kundenkarteId,
    issuedAt: new Date().toISOString(),
    version: 1,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// Calculate tier based on points
function calculateTier(points: number): "bronze" | "silver" | "gold" {
  if (points >= 10000) return "gold";
  if (points >= 5000) return "silver";
  return "bronze";
}

// =============================================================================
// ROUTER
// =============================================================================

export const kundenkarteRouter = createTRPCRouter({
  // -------------------------------------------------------------------------
  // LIST - Get all Kundenkarten with pagination and filters
  // -------------------------------------------------------------------------
  list: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: kundenkarteStatusEnum.optional(),
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "nachname", "email", "status"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, status, search, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      // Build conditions
      const conditions = [];

      if (status) {
        conditions.push(eq(kundenkarten.status, status));
      }

      if (search) {
        conditions.push(
          or(
            like(kundenkarten.vorname, `%${search}%`),
            like(kundenkarten.nachname, `%${search}%`),
            like(kundenkarten.email, `%${search}%`),
            like(kundenkarten.kundenNummer, `%${search}%`)
          )
        );
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(kundenkarten)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count ?? 0;

      // Get paginated results
      const sortColumn = {
        createdAt: kundenkarten.createdAt,
        nachname: kundenkarten.nachname,
        email: kundenkarten.email,
        status: kundenkarten.status,
      }[sortBy];

      const results = await db
        .select({
          id: kundenkarten.id,
          kundenNummer: kundenkarten.kundenNummer,
          vorname: kundenkarten.vorname,
          nachname: kundenkarten.nachname,
          email: kundenkarten.email,
          telefon: kundenkarten.telefon,
          status: kundenkarten.status,
          ort: kundenkarten.ort,
          bauvorhabenTyp: kundenkarten.bauvorhabenTyp,
          gesamtbudget: kundenkarten.gesamtbudget,
          createdAt: kundenkarten.createdAt,
        })
        .from(kundenkarten)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn))
        .limit(limit)
        .offset(offset);

      return {
        items: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // -------------------------------------------------------------------------
  // GET BY ID - Get single Kundenkarte with full details
  // -------------------------------------------------------------------------
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(kundenkarten)
        .where(eq(kundenkarten.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      // Get documents
      const documents = await db
        .select()
        .from(kundenkarteDocuments)
        .where(eq(kundenkarteDocuments.kundenkarteId, input.id))
        .orderBy(desc(kundenkarteDocuments.createdAt));

      // Get recent activities
      const activities = await db
        .select()
        .from(kundenkarteActivities)
        .where(eq(kundenkarteActivities.kundenkarteId, input.id))
        .orderBy(desc(kundenkarteActivities.createdAt))
        .limit(20);

      return {
        ...result[0],
        documents,
        activities,
      };
    }),

  // -------------------------------------------------------------------------
  // CREATE - Create new Kundenkarte
  // -------------------------------------------------------------------------
  create: publicProcedure
    .input(kundenkarteInputSchema.extend({
      organizationId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const kundenNummer = generateKundenNummer();

      // Dates are stored as strings (YYYY-MM-DD) in Drizzle
      const insertData = {
        ...input,
        kundenNummer,
        geburtsdatum: input.geburtsdatum || null,
        beschaeftigtSeit: input.beschaeftigtSeit || null,
        partnerGeburtsdatum: input.partnerGeburtsdatum || null,
        grundstueckKaufDatum: input.grundstueckKaufDatum || null,
        status: "draft" as const,
        emailSecondary: input.emailSecondary || null,
      };

      const result = await db
        .insert(kundenkarten)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values(insertData as any)
        .returning();

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: result[0].id,
        activityType: "status_change",
        title: "Kundenkarte erstellt",
        description: `Kundenkarte ${kundenNummer} wurde erstellt`,
        newStatus: "draft",
      });

      return result[0];
    }),

  // -------------------------------------------------------------------------
  // UPDATE - Update existing Kundenkarte
  // -------------------------------------------------------------------------
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: kundenkarteInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, data } = input;

      // Check if exists
      const existing = await db
        .select({ id: kundenkarten.id })
        .from(kundenkarten)
        .where(eq(kundenkarten.id, id))
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      // Dates are stored as strings (YYYY-MM-DD) in Drizzle
      const updateData = {
        ...data,
        geburtsdatum: data.geburtsdatum ?? undefined,
        beschaeftigtSeit: data.beschaeftigtSeit ?? undefined,
        partnerGeburtsdatum: data.partnerGeburtsdatum ?? undefined,
        grundstueckKaufDatum: data.grundstueckKaufDatum ?? undefined,
        updatedAt: new Date(),
      };

      const result = await db
        .update(kundenkarten)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(updateData as any)
        .where(eq(kundenkarten.id, id))
        .returning();

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: id,
        activityType: "note",
        title: "Kundenkarte aktualisiert",
        description: "Daten wurden aktualisiert",
      });

      return result[0];
    }),

  // -------------------------------------------------------------------------
  // UPDATE STATUS - Change Kundenkarte status
  // -------------------------------------------------------------------------
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: kundenkarteStatusEnum,
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, status, note } = input;

      // Get current status
      const current = await db
        .select({ status: kundenkarten.status })
        .from(kundenkarten)
        .where(eq(kundenkarten.id, id))
        .limit(1);

      if (!current[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      const previousStatus = current[0].status;

      // Update status
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      // Set approved timestamp if transitioning to approved
      if (status === "approved" && previousStatus !== "approved") {
        updateData.approvedAt = new Date();
      }

      const result = await db
        .update(kundenkarten)
        .set(updateData)
        .where(eq(kundenkarten.id, id))
        .returning();

      // Log status change activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: id,
        activityType: "status_change",
        title: `Status geändert: ${previousStatus} → ${status}`,
        description: note || `Status wurde von ${previousStatus} auf ${status} geändert`,
        previousStatus: previousStatus,
        newStatus: status,
      });

      return result[0];
    }),

  // -------------------------------------------------------------------------
  // DELETE - Soft delete (archive) Kundenkarte
  // -------------------------------------------------------------------------
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const result = await db
        .update(kundenkarten)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(eq(kundenkarten.id, input.id))
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      // Log deletion
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: input.id,
        activityType: "status_change",
        title: "Kundenkarte archiviert",
        previousStatus: result[0].status,
        newStatus: "archived",
      });

      return { success: true };
    }),

  // -------------------------------------------------------------------------
  // ADD DOCUMENT - Add document to Kundenkarte
  // -------------------------------------------------------------------------
  addDocument: publicProcedure
    .input(
      z.object({
        kundenkarteId: z.string().uuid(),
        documentType: z.string(),
        fileName: z.string(),
        fileUrl: z.string().url(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        expiresAt: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .insert(kundenkarteDocuments)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values({
          ...input,
          expiresAt: input.expiresAt || null,
        } as any)
        .returning();

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: input.kundenkarteId,
        activityType: "note",
        title: "Dokument hinzugefügt",
        description: `${input.documentType}: ${input.fileName}`,
      });

      return result[0];
    }),

  // -------------------------------------------------------------------------
  // VERIFY DOCUMENT - Mark document as verified
  // -------------------------------------------------------------------------
  verifyDocument: publicProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        verified: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(kundenkarteDocuments)
        .set({
          verified: input.verified,
          verifiedAt: input.verified ? new Date() : null,
          notes: input.notes,
        })
        .where(eq(kundenkarteDocuments.id, input.documentId))
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dokument nicht gefunden",
        });
      }

      return result[0];
    }),

  // -------------------------------------------------------------------------
  // ADD ACTIVITY - Log activity/note
  // -------------------------------------------------------------------------
  addActivity: publicProcedure
    .input(
      z.object({
        kundenkarteId: z.string().uuid(),
        activityType: z.enum(["note", "call", "email", "meeting"]),
        title: z.string(),
        description: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .insert(kundenkarteActivities)
        .values(input)
        .returning();

      return result[0];
    }),

  // -------------------------------------------------------------------------
  // STATS - Get dashboard statistics
  // -------------------------------------------------------------------------
  getStats: publicProcedure.query(async () => {
    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        draft: sql<number>`count(*) filter (where status = 'draft')::int`,
        pending: sql<number>`count(*) filter (where status = 'pending_review')::int`,
        approved: sql<number>`count(*) filter (where status = 'approved')::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        totalBudget: sql<number>`coalesce(sum(gesamtbudget), 0)::numeric`,
      })
      .from(kundenkarten)
      .where(sql`status != 'archived'`);

    return stats[0] ?? {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      active: 0,
      totalBudget: 0,
    };
  }),

  // -------------------------------------------------------------------------
  // SEARCH - Quick search across all fields
  // -------------------------------------------------------------------------
  search: publicProcedure
    .input(z.object({ query: z.string().min(2) }))
    .query(async ({ input }) => {
      const searchTerm = `%${input.query}%`;

      const results = await db
        .select({
          id: kundenkarten.id,
          kundenNummer: kundenkarten.kundenNummer,
          vorname: kundenkarten.vorname,
          nachname: kundenkarten.nachname,
          email: kundenkarten.email,
          status: kundenkarten.status,
        })
        .from(kundenkarten)
        .where(
          or(
            like(kundenkarten.vorname, searchTerm),
            like(kundenkarten.nachname, searchTerm),
            like(kundenkarten.email, searchTerm),
            like(kundenkarten.kundenNummer, searchTerm),
            like(kundenkarten.telefon, searchTerm),
            like(kundenkarten.ort, searchTerm)
          )
        )
        .limit(20);

      return results;
    }),

  // =========================================================================
  // BAUHERREN-PASS INTEGRATION
  // =========================================================================

  // -------------------------------------------------------------------------
  // CREATE FROM BAUHERREN-PASS - Create Kundenkarte linked to Bauherren-Pass
  // -------------------------------------------------------------------------
  createFromBauherrenPass: publicProcedure
    .input(
      z.object({
        bauherrenPassId: z.string().uuid(),
        organizationId: z.string().uuid(),
        // Personal Data
        anrede: z.string().optional(),
        titel: z.string().optional(),
        vorname: z.string().min(1, "Vorname ist erforderlich"),
        nachname: z.string().min(1, "Nachname ist erforderlich"),
        email: z.string().email("Gueltige E-Mail erforderlich"),
        telefon: z.string().optional(),
        telefonMobil: z.string().optional(),
        // Address
        strasseHausnummer: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        land: z.string().optional(),
        // Initial tier
        initialTier: kundenkarteTierEnum.optional(),
        initialPoints: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { bauherrenPassId, initialTier, initialPoints, ...customerData } = input;

      // Verify Bauherren-Pass exists
      const bauherrenPass = await db
        .select({
          id: bauherrenPaesse.id,
          passNummer: bauherrenPaesse.passNummer,
          grundstueckAdresse: bauherrenPaesse.grundstueckAdresse,
          grundstueckPlz: bauherrenPaesse.grundstueckPlz,
          grundstueckOrt: bauherrenPaesse.grundstueckOrt,
        })
        .from(bauherrenPaesse)
        .where(eq(bauherrenPaesse.id, bauherrenPassId))
        .limit(1);

      if (!bauherrenPass[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bauherren-Pass nicht gefunden",
        });
      }

      // Generate identifiers
      const kundenNummer = generateKundenNummer();
      const cardNumber = generateCardNumber();
      const points = initialPoints ?? 0;
      const tier = initialTier ?? calculateTier(points);

      // Create initial points history if points provided
      const pointsHistory = points > 0
        ? [{
            date: new Date().toISOString(),
            points,
            type: "earned" as const,
            description: "Initiale Punkte bei Erstellung aus Bauherren-Pass",
            balanceAfter: points,
            referenceId: bauherrenPassId,
          }]
        : [];

      // Create Kundenkarte
      const result = await db
        .insert(kundenkarten)
        .values({
          ...customerData,
          kundenNummer,
          bauherrenPassId,
          cardNumber,
          tier,
          points,
          pointsHistory,
          // Copy property address from Bauherren-Pass if not provided
          grundstueckAdresse: bauherrenPass[0].grundstueckAdresse,
          grundstueckVorhanden: true,
          status: "draft",
        } as any)
        .returning();

      // Generate QR code data
      const qrCodeData = generateQRCodeData(cardNumber, result[0].id);

      // Update with QR code
      await db
        .update(kundenkarten)
        .set({ qrCodeData })
        .where(eq(kundenkarten.id, result[0].id));

      // Update Bauherren-Pass with link back to Kundenkarte
      await db
        .update(bauherrenPaesse)
        .set({
          kundenkarteId: result[0].id,
          updatedAt: new Date(),
        })
        .where(eq(bauherrenPaesse.id, bauherrenPassId));

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: result[0].id,
        activityType: "status_change",
        title: "Kundenkarte aus Bauherren-Pass erstellt",
        description: `Kundenkarte ${kundenNummer} wurde aus Bauherren-Pass ${bauherrenPass[0].passNummer} erstellt`,
        newStatus: "draft",
        metadata: {
          bauherrenPassId,
          bauherrenPassNummer: bauherrenPass[0].passNummer,
          cardNumber,
          initialTier: tier,
          initialPoints: points,
        },
      });

      return {
        ...result[0],
        qrCodeData,
        cardNumber,
      };
    }),

  // -------------------------------------------------------------------------
  // LINK TO BAUHERREN-PASS - Link existing Kundenkarte to Bauherren-Pass
  // -------------------------------------------------------------------------
  linkToBauherrenPass: publicProcedure
    .input(
      z.object({
        kundenkarteId: z.string().uuid(),
        bauherrenPassId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const { kundenkarteId, bauherrenPassId } = input;

      // Verify Kundenkarte exists
      const kundenkarte = await db
        .select({
          id: kundenkarten.id,
          kundenNummer: kundenkarten.kundenNummer,
          bauherrenPassId: kundenkarten.bauherrenPassId,
        })
        .from(kundenkarten)
        .where(eq(kundenkarten.id, kundenkarteId))
        .limit(1);

      if (!kundenkarte[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      if (kundenkarte[0].bauherrenPassId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kundenkarte ist bereits mit einem Bauherren-Pass verknuepft",
        });
      }

      // Verify Bauherren-Pass exists and is not linked to another Kundenkarte
      const bauherrenPass = await db
        .select({
          id: bauherrenPaesse.id,
          passNummer: bauherrenPaesse.passNummer,
          kundenkarteId: bauherrenPaesse.kundenkarteId,
        })
        .from(bauherrenPaesse)
        .where(eq(bauherrenPaesse.id, bauherrenPassId))
        .limit(1);

      if (!bauherrenPass[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bauherren-Pass nicht gefunden",
        });
      }

      if (bauherrenPass[0].kundenkarteId && bauherrenPass[0].kundenkarteId !== kundenkarteId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bauherren-Pass ist bereits mit einer anderen Kundenkarte verknuepft",
        });
      }

      // Update Kundenkarte with Bauherren-Pass link
      const result = await db
        .update(kundenkarten)
        .set({
          bauherrenPassId,
          updatedAt: new Date(),
        })
        .where(eq(kundenkarten.id, kundenkarteId))
        .returning();

      // Update Bauherren-Pass with link back to Kundenkarte
      await db
        .update(bauherrenPaesse)
        .set({
          kundenkarteId,
          updatedAt: new Date(),
        })
        .where(eq(bauherrenPaesse.id, bauherrenPassId));

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId,
        activityType: "note",
        title: "Mit Bauherren-Pass verknuepft",
        description: `Kundenkarte wurde mit Bauherren-Pass ${bauherrenPass[0].passNummer} verknuepft`,
        metadata: {
          bauherrenPassId,
          bauherrenPassNummer: bauherrenPass[0].passNummer,
        },
      });

      return result[0];
    }),

  // =========================================================================
  // LOYALTY POINTS MANAGEMENT
  // =========================================================================

  // -------------------------------------------------------------------------
  // ADD POINTS - Add loyalty points to customer
  // -------------------------------------------------------------------------
  addPoints: publicProcedure
    .input(
      z.object({
        kundenkarteId: z.string().uuid(),
        points: z.number().min(1, "Punkte muessen positiv sein"),
        description: z.string().min(1, "Beschreibung ist erforderlich"),
        referenceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { kundenkarteId, points, description, referenceId } = input;

      // Get current Kundenkarte
      const current = await db
        .select({
          id: kundenkarten.id,
          points: kundenkarten.points,
          pointsHistory: kundenkarten.pointsHistory,
          tier: kundenkarten.tier,
        })
        .from(kundenkarten)
        .where(eq(kundenkarten.id, kundenkarteId))
        .limit(1);

      if (!current[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      const currentPoints = current[0].points ?? 0;
      const newPoints = currentPoints + points;
      const newTier = calculateTier(newPoints);

      // Create history entry
      const historyEntry = {
        date: new Date().toISOString(),
        points,
        type: "earned" as const,
        description,
        balanceAfter: newPoints,
        referenceId,
      };

      const currentHistory = (current[0].pointsHistory as any[]) ?? [];
      const newHistory = [...currentHistory, historyEntry];

      // Update Kundenkarte
      const result = await db
        .update(kundenkarten)
        .set({
          points: newPoints,
          pointsHistory: newHistory,
          tier: newTier,
          updatedAt: new Date(),
        })
        .where(eq(kundenkarten.id, kundenkarteId))
        .returning();

      // Log tier upgrade if applicable
      if (newTier !== current[0].tier) {
        await db.insert(kundenkarteActivities).values({
          kundenkarteId,
          activityType: "note",
          title: `Tier-Upgrade: ${current[0].tier} -> ${newTier}`,
          description: `Kunde wurde auf ${newTier} hochgestuft durch ${points} neue Punkte`,
          metadata: {
            previousTier: current[0].tier,
            newTier,
            pointsAdded: points,
            totalPoints: newPoints,
          },
        });
      }

      // Log points activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId,
        activityType: "note",
        title: `${points} Punkte hinzugefuegt`,
        description,
        metadata: {
          pointsAdded: points,
          totalPoints: newPoints,
          referenceId,
        },
      });

      return {
        ...result[0],
        pointsAdded: points,
        previousPoints: currentPoints,
        newPoints,
        tierChanged: newTier !== current[0].tier,
        previousTier: current[0].tier,
        newTier,
      };
    }),

  // -------------------------------------------------------------------------
  // REDEEM POINTS - Redeem loyalty points
  // -------------------------------------------------------------------------
  redeemPoints: publicProcedure
    .input(
      z.object({
        kundenkarteId: z.string().uuid(),
        points: z.number().min(1, "Punkte muessen positiv sein"),
        description: z.string().min(1, "Beschreibung ist erforderlich"),
        referenceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { kundenkarteId, points, description, referenceId } = input;

      // Get current Kundenkarte
      const current = await db
        .select({
          id: kundenkarten.id,
          points: kundenkarten.points,
          pointsHistory: kundenkarten.pointsHistory,
          tier: kundenkarten.tier,
        })
        .from(kundenkarten)
        .where(eq(kundenkarten.id, kundenkarteId))
        .limit(1);

      if (!current[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      const currentPoints = current[0].points ?? 0;

      if (currentPoints < points) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Nicht genuegend Punkte. Verfuegbar: ${currentPoints}, Angefordert: ${points}`,
        });
      }

      const newPoints = currentPoints - points;
      // Note: Tier does NOT downgrade on redemption, only upgrades on earning

      // Create history entry
      const historyEntry = {
        date: new Date().toISOString(),
        points: -points,
        type: "redeemed" as const,
        description,
        balanceAfter: newPoints,
        referenceId,
      };

      const currentHistory = (current[0].pointsHistory as any[]) ?? [];
      const newHistory = [...currentHistory, historyEntry];

      // Update Kundenkarte
      const result = await db
        .update(kundenkarten)
        .set({
          points: newPoints,
          pointsHistory: newHistory,
          updatedAt: new Date(),
        })
        .where(eq(kundenkarten.id, kundenkarteId))
        .returning();

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId,
        activityType: "note",
        title: `${points} Punkte eingeloest`,
        description,
        metadata: {
          pointsRedeemed: points,
          totalPoints: newPoints,
          referenceId,
        },
      });

      return {
        ...result[0],
        pointsRedeemed: points,
        previousPoints: currentPoints,
        newPoints,
      };
    }),

  // -------------------------------------------------------------------------
  // GENERATE QR CODE - Generate or regenerate QR code for Kundenkarte
  // -------------------------------------------------------------------------
  generateQRCode: publicProcedure
    .input(
      z.object({
        kundenkarteId: z.string().uuid(),
        regenerate: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const { kundenkarteId, regenerate } = input;

      // Get current Kundenkarte
      const current = await db
        .select({
          id: kundenkarten.id,
          cardNumber: kundenkarten.cardNumber,
          qrCodeData: kundenkarten.qrCodeData,
          kundenNummer: kundenkarten.kundenNummer,
        })
        .from(kundenkarten)
        .where(eq(kundenkarten.id, kundenkarteId))
        .limit(1);

      if (!current[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      // Check if QR code exists and regeneration not requested
      if (current[0].qrCodeData && !regenerate) {
        return {
          kundenkarteId,
          cardNumber: current[0].cardNumber,
          qrCodeData: current[0].qrCodeData,
          regenerated: false,
        };
      }

      // Generate card number if not exists
      let cardNumber = current[0].cardNumber;
      if (!cardNumber) {
        cardNumber = generateCardNumber();
      }

      // Generate new QR code data
      const qrCodeData = generateQRCodeData(cardNumber, kundenkarteId);

      // Update Kundenkarte
      await db
        .update(kundenkarten)
        .set({
          cardNumber,
          qrCodeData,
          updatedAt: new Date(),
        })
        .where(eq(kundenkarten.id, kundenkarteId));

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId,
        activityType: "note",
        title: regenerate ? "QR-Code regeneriert" : "QR-Code erstellt",
        description: `QR-Code fuer Kartennummer ${cardNumber} wurde ${regenerate ? "regeneriert" : "erstellt"}`,
        metadata: {
          cardNumber,
          regenerated: regenerate,
        },
      });

      return {
        kundenkarteId,
        cardNumber,
        qrCodeData,
        regenerated: regenerate,
      };
    }),

  // -------------------------------------------------------------------------
  // GET BY CARD NUMBER - Get Kundenkarte by card number (for scanning)
  // -------------------------------------------------------------------------
  getByCardNumber: publicProcedure
    .input(z.object({ cardNumber: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          id: kundenkarten.id,
          kundenNummer: kundenkarten.kundenNummer,
          cardNumber: kundenkarten.cardNumber,
          vorname: kundenkarten.vorname,
          nachname: kundenkarten.nachname,
          email: kundenkarten.email,
          tier: kundenkarten.tier,
          points: kundenkarten.points,
          status: kundenkarten.status,
          bauherrenPassId: kundenkarten.bauherrenPassId,
        })
        .from(kundenkarten)
        .where(eq(kundenkarten.cardNumber, input.cardNumber))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      return result[0];
    }),

  // -------------------------------------------------------------------------
  // UPDATE TIER - Manually update customer tier
  // -------------------------------------------------------------------------
  updateTier: publicProcedure
    .input(
      z.object({
        kundenkarteId: z.string().uuid(),
        tier: kundenkarteTierEnum,
        reason: z.string().min(1, "Begruendung ist erforderlich"),
      })
    )
    .mutation(async ({ input }) => {
      const { kundenkarteId, tier, reason } = input;

      // Get current Kundenkarte
      const current = await db
        .select({
          id: kundenkarten.id,
          tier: kundenkarten.tier,
        })
        .from(kundenkarten)
        .where(eq(kundenkarten.id, kundenkarteId))
        .limit(1);

      if (!current[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      const previousTier = current[0].tier;

      // Update tier
      const result = await db
        .update(kundenkarten)
        .set({
          tier,
          updatedAt: new Date(),
        })
        .where(eq(kundenkarten.id, kundenkarteId))
        .returning();

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId,
        activityType: "note",
        title: `Tier manuell geaendert: ${previousTier} -> ${tier}`,
        description: reason,
        metadata: {
          previousTier,
          newTier: tier,
          manualChange: true,
        },
      });

      return {
        ...result[0],
        previousTier,
        newTier: tier,
      };
    }),

  // -------------------------------------------------------------------------
  // GET POINTS HISTORY - Get detailed points history for Kundenkarte
  // -------------------------------------------------------------------------
  getPointsHistory: publicProcedure
    .input(
      z.object({
        kundenkarteId: z.string().uuid(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const { kundenkarteId, limit, offset } = input;

      const result = await db
        .select({
          id: kundenkarten.id,
          points: kundenkarten.points,
          pointsHistory: kundenkarten.pointsHistory,
          tier: kundenkarten.tier,
        })
        .from(kundenkarten)
        .where(eq(kundenkarten.id, kundenkarteId))
        .limit(1);

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kundenkarte nicht gefunden",
        });
      }

      const history = (result[0].pointsHistory as any[]) ?? [];
      // Sort by date descending (newest first)
      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const paginatedHistory = sortedHistory.slice(offset, offset + limit);

      return {
        currentPoints: result[0].points ?? 0,
        currentTier: result[0].tier,
        history: paginatedHistory,
        total: history.length,
        hasMore: offset + limit < history.length,
      };
    }),
});
