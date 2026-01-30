import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  db,
  kundenkarten,
  kundenkarteDocuments,
  kundenkarteActivities,
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
});
