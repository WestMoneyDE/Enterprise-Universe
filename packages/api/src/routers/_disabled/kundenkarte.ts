import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc";
import {
  db,
  eq,
  and,
  desc,
  asc,
  ilike,
  or,
  sql,
  gte,
  kundenkarten,
  kundenkarteDocuments,
  kundenkarteActivities,
  auditLogs,
} from "@nexus/db";

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const childDetailsSchema = z.object({
  name: z.string(),
  geburtsdatum: z.string(),
  unterhaltspflichtig: z.boolean(),
});

const smartHomeFeaturesSchema = z.object({
  lighting: z.boolean().optional(),
  heating: z.boolean().optional(),
  security: z.boolean().optional(),
  shading: z.boolean().optional(),
  audio: z.boolean().optional(),
  energyManagement: z.boolean().optional(),
  budget: z.number().optional(),
});

const schufaSchema = z.object({
  checked: z.boolean(),
  score: z.number().optional(),
  checkedAt: z.string().optional(),
  result: z.string().optional(),
});

const kundenkarteCreateSchema = z.object({
  // Customer Reference
  contactId: z.string().uuid().optional(),
  kundenNummer: z.string(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai"]).optional(),

  // Personal Data
  anrede: z.string().optional(),
  titel: z.string().optional(),
  vorname: z.string().min(1),
  nachname: z.string().min(1),
  geburtsdatum: z.string().optional(),
  geburtsort: z.string().optional(),
  staatsangehoerigkeit: z.string().optional(),
  familienstand: z.string().optional(),

  // Contact
  email: z.string().email(),
  emailSecondary: z.string().email().optional(),
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
  bruttoEinkommen: z.string().optional(),
  nettoEinkommen: z.string().optional(),
  sonstigeEinkuenfte: z.string().optional(),
  selbststaendig: z.boolean().optional(),

  // Partner
  partnerVorname: z.string().optional(),
  partnerNachname: z.string().optional(),
  partnerGeburtsdatum: z.string().optional(),
  partnerBeruf: z.string().optional(),
  partnerEinkommen: z.string().optional(),

  // Children
  anzahlKinder: z.number().int().optional(),
  kinderDetails: z.array(childDetailsSchema).optional(),

  // Property
  grundstueckVorhanden: z.boolean().optional(),
  grundstueckAdresse: z.string().optional(),
  grundstueckGroesse: z.string().optional(),
  grundstueckKaufpreis: z.string().optional(),
  grundstueckKaufDatum: z.string().optional(),
  grundbuchEintrag: z.string().optional(),

  // Building Project
  bauvorhabenTyp: z.string().optional(),
  hausTyp: z.string().optional(),
  wohnflaeche: z.string().optional(),
  nutzflaeche: z.string().optional(),
  anzahlZimmer: z.number().int().optional(),
  anzahlBaeder: z.number().int().optional(),
  anzahlEtagen: z.number().int().optional(),
  kellerGeplant: z.boolean().optional(),
  garageCarport: z.string().optional(),

  // Financial
  eigenkapital: z.string().optional(),
  gesamtbudget: z.string().optional(),
  finanzierungsbedarf: z.string().optional(),
  finanzierungGesichert: z.boolean().optional(),
  finanzierungspartner: z.string().optional(),
  kfwFoerderung: z.boolean().optional(),
  kfwProgramm: z.string().optional(),

  // Obligations
  bestehendeKredite: z.string().optional(),
  monatlicheRaten: z.string().optional(),
  mietbelastung: z.string().optional(),
  unterhaltspflichten: z.string().optional(),

  // Smart Home
  smartHomeInteresse: z.boolean().optional(),
  smartHomeFeatures: smartHomeFeaturesSchema.optional(),

  // Energy
  energiestandard: z.string().optional(),
  heizungsart: z.string().optional(),
  photovoltaik: z.boolean().optional(),
  photovoltaikKwp: z.string().optional(),
  wallbox: z.boolean().optional(),

  // Verification
  ausweisGeprueft: z.boolean().optional(),
  einkommensnachweisGeprueft: z.boolean().optional(),
  schufa: schufaSchema.optional(),

  // Communication
  bevorzugteKontaktart: z.string().optional(),
  besteErreichbarkeit: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),

  // Internal
  internalNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  leadSource: z.string().optional(),
  referredBy: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

const kundenkarteUpdateSchema = kundenkarteCreateSchema.partial();

const documentCreateSchema = z.object({
  kundenkarteId: z.string().uuid(),
  documentType: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number().int().optional(),
  mimeType: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
});

const activityCreateSchema = z.object({
  kundenkarteId: z.string().uuid(),
  activityType: z.enum(["note", "call", "email", "meeting", "status_change", "document", "other"]),
  title: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// KUNDENKARTE ROUTER
// =============================================================================

export const kundenkarteRouter = createTRPCRouter({
  // List with filtering and pagination
  list: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
        search: z.string().optional(),
        status: z.enum(["draft", "pending_review", "approved", "active", "inactive", "archived"]).optional(),
        subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai"]).optional(),
        assignedTo: z.string().uuid().optional(),
        finanzierungGesichert: z.boolean().optional(),
        smartHomeInteresse: z.boolean().optional(),
        kfwFoerderung: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        sortBy: z.enum(["kundenNummer", "nachname", "createdAt", "gesamtbudget"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        limit = 50, cursor, search, status, subsidiary, assignedTo,
        finanzierungGesichert, smartHomeInteresse, kfwFoerderung,
        sortBy = "createdAt", sortOrder = "desc"
      } = input ?? {};

      const conditions = [eq(kundenkarten.organizationId, ctx.organizationId)];

      if (search) {
        conditions.push(
          or(
            ilike(kundenkarten.vorname, `%${search}%`),
            ilike(kundenkarten.nachname, `%${search}%`),
            ilike(kundenkarten.email, `%${search}%`),
            ilike(kundenkarten.kundenNummer, `%${search}%`),
            ilike(kundenkarten.ort, `%${search}%`)
          )!
        );
      }

      if (status) conditions.push(eq(kundenkarten.status, status));
      if (subsidiary) conditions.push(eq(kundenkarten.subsidiary, subsidiary));
      if (assignedTo) conditions.push(eq(kundenkarten.assignedTo, assignedTo));
      if (finanzierungGesichert !== undefined) conditions.push(eq(kundenkarten.finanzierungGesichert, finanzierungGesichert));
      if (smartHomeInteresse !== undefined) conditions.push(eq(kundenkarten.smartHomeInteresse, smartHomeInteresse));
      if (kfwFoerderung !== undefined) conditions.push(eq(kundenkarten.kfwFoerderung, kfwFoerderung));

      if (cursor) conditions.push(gte(kundenkarten.id, cursor));

      const orderByColumn = {
        kundenNummer: kundenkarten.kundenNummer,
        nachname: kundenkarten.nachname,
        createdAt: kundenkarten.createdAt,
        gesamtbudget: kundenkarten.gesamtbudget,
      }[sortBy];

      const items = await db
        .select()
        .from(kundenkarten)
        .where(and(...conditions))
        .orderBy(sortOrder === "desc" ? desc(orderByColumn) : asc(orderByColumn))
        .limit(limit + 1);

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  // Get by ID with relations
  byId: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [kundenkarte] = await db
        .select()
        .from(kundenkarten)
        .where(
          and(
            eq(kundenkarten.id, input.id),
            eq(kundenkarten.organizationId, ctx.organizationId)
          )
        );

      if (!kundenkarte) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kundenkarte not found" });
      }

      const [documents, activities] = await Promise.all([
        db.select().from(kundenkarteDocuments).where(eq(kundenkarteDocuments.kundenkarteId, input.id)),
        db.select().from(kundenkarteActivities).where(eq(kundenkarteActivities.kundenkarteId, input.id)).orderBy(desc(kundenkarteActivities.createdAt)).limit(50),
      ]);

      return { ...kundenkarte, documents, activities };
    }),

  // Get by Kundennummer
  byKundenNummer: orgProcedure
    .input(z.object({ kundenNummer: z.string() }))
    .query(async ({ ctx, input }) => {
      const [kundenkarte] = await db
        .select()
        .from(kundenkarten)
        .where(
          and(
            eq(kundenkarten.kundenNummer, input.kundenNummer),
            eq(kundenkarten.organizationId, ctx.organizationId)
          )
        );

      if (!kundenkarte) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kundenkarte not found" });
      }

      return kundenkarte;
    }),

  // Create
  create: orgProcedure
    .input(kundenkarteCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(kundenkarten)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: created.id,
        activityType: "status_change",
        title: "Kundenkarte erstellt",
        description: `Kundenkarte ${created.kundenNummer} wurde erstellt`,
        newStatus: created.status,
        createdBy: ctx.user.id,
      });

      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "create",
        entityType: "kundenkarte",
        entityId: created.id,
        newData: created,
      });

      return created;
    }),

  // Update
  update: orgProcedure
    .input(z.object({ id: z.string().uuid(), data: kundenkarteUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(kundenkarten)
        .where(
          and(
            eq(kundenkarten.id, input.id),
            eq(kundenkarten.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kundenkarte not found" });
      }

      const [updated] = await db
        .update(kundenkarten)
        .set({
          ...input.data,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(kundenkarten.id, input.id))
        .returning();

      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "update",
        entityType: "kundenkarte",
        entityId: input.id,
        previousData: existing,
        newData: updated,
      });

      return updated;
    }),

  // Update status
  updateStatus: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["draft", "pending_review", "approved", "active", "inactive", "archived"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(kundenkarten)
        .where(
          and(
            eq(kundenkarten.id, input.id),
            eq(kundenkarten.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kundenkarte not found" });
      }

      const updateData: any = {
        status: input.status,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      };

      if (input.status === "approved") {
        updateData.approvedAt = new Date();
        updateData.approvedBy = ctx.user.id;
      }

      const [updated] = await db
        .update(kundenkarten)
        .set(updateData)
        .where(eq(kundenkarten.id, input.id))
        .returning();

      // Log status change activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: input.id,
        activityType: "status_change",
        title: `Status geändert: ${existing.status} → ${input.status}`,
        description: input.notes,
        previousStatus: existing.status,
        newStatus: input.status,
        createdBy: ctx.user.id,
      });

      return updated;
    }),

  // Approve (shortcut for common workflow)
  approve: orgProcedure
    .input(z.object({ id: z.string().uuid(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(kundenkarten)
        .where(
          and(
            eq(kundenkarten.id, input.id),
            eq(kundenkarten.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kundenkarte not found" });
      }

      if (existing.status !== "pending_review") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Kundenkarte must be in pending_review status to approve" });
      }

      const [updated] = await db
        .update(kundenkarten)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: ctx.user.id,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(kundenkarten.id, input.id))
        .returning();

      await db.insert(kundenkarteActivities).values({
        kundenkarteId: input.id,
        activityType: "status_change",
        title: "Kundenkarte genehmigt",
        description: input.notes,
        previousStatus: "pending_review",
        newStatus: "approved",
        createdBy: ctx.user.id,
      });

      return updated;
    }),

  // Delete
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(kundenkarten)
        .where(
          and(
            eq(kundenkarten.id, input.id),
            eq(kundenkarten.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kundenkarte not found" });
      }

      await db.delete(kundenkarten).where(eq(kundenkarten.id, input.id));

      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "delete",
        entityType: "kundenkarte",
        entityId: input.id,
        previousData: existing,
      });

      return { success: true };
    }),

  // Generate next Kundennummer
  generateKundenNummer: orgProcedure.query(async ({ ctx }) => {
    const [lastKundenkarte] = await db
      .select({ kundenNummer: kundenkarten.kundenNummer })
      .from(kundenkarten)
      .where(eq(kundenkarten.organizationId, ctx.organizationId))
      .orderBy(desc(kundenkarten.createdAt))
      .limit(1);

    const year = new Date().getFullYear();
    let nextNumber = 1;

    if (lastKundenkarte?.kundenNummer) {
      const match = lastKundenkarte.kundenNummer.match(/^WMB-(\d{4})-(\d+)$/);
      if (match && match[1] === String(year)) {
        nextNumber = parseInt(match[2], 10) + 1;
      }
    }

    return `WMB-${year}-${String(nextNumber).padStart(5, "0")}`;
  }),

  // Statistics
  stats: orgProcedure.query(async ({ ctx }) => {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        draft: sql<number>`count(*) filter (where ${kundenkarten.status} = 'draft')::int`,
        pendingReview: sql<number>`count(*) filter (where ${kundenkarten.status} = 'pending_review')::int`,
        approved: sql<number>`count(*) filter (where ${kundenkarten.status} = 'approved')::int`,
        active: sql<number>`count(*) filter (where ${kundenkarten.status} = 'active')::int`,
        finanzierungGesichert: sql<number>`count(*) filter (where ${kundenkarten.finanzierungGesichert} = true)::int`,
        smartHomeInteresse: sql<number>`count(*) filter (where ${kundenkarten.smartHomeInteresse} = true)::int`,
        kfwFoerderung: sql<number>`count(*) filter (where ${kundenkarten.kfwFoerderung} = true)::int`,
        avgGesamtbudget: sql<number>`avg(${kundenkarten.gesamtbudget}::numeric)`,
        totalGesamtbudget: sql<number>`sum(${kundenkarten.gesamtbudget}::numeric)`,
      })
      .from(kundenkarten)
      .where(eq(kundenkarten.organizationId, ctx.organizationId));

    // Status distribution by month (last 6 months)
    const monthlyStats = await db
      .select({
        month: sql<string>`to_char(${kundenkarten.createdAt}, 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
      })
      .from(kundenkarten)
      .where(
        and(
          eq(kundenkarten.organizationId, ctx.organizationId),
          gte(kundenkarten.createdAt, sql`now() - interval '6 months'`)
        )
      )
      .groupBy(sql`to_char(${kundenkarten.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${kundenkarten.createdAt}, 'YYYY-MM')`);

    return { ...stats, monthlyStats };
  }),
});

// =============================================================================
// KUNDENKARTE DOCUMENTS ROUTER
// =============================================================================

export const kundenkarteDocumentsRouter = createTRPCRouter({
  // Upload document
  create: orgProcedure
    .input(documentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(kundenkarteDocuments)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      // Log activity
      await db.insert(kundenkarteActivities).values({
        kundenkarteId: input.kundenkarteId,
        activityType: "document",
        title: `Dokument hochgeladen: ${input.documentType}`,
        description: input.fileName,
        createdBy: ctx.user.id,
      });

      return created;
    }),

  // List by Kundenkarte
  byKundenkarte: orgProcedure
    .input(z.object({ kundenkarteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(kundenkarteDocuments)
        .where(eq(kundenkarteDocuments.kundenkarteId, input.kundenkarteId))
        .orderBy(desc(kundenkarteDocuments.createdAt));
    }),

  // Verify document
  verify: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(kundenkarteDocuments)
        .set({
          verified: true,
          verifiedAt: new Date(),
          verifiedBy: ctx.user.id,
        })
        .where(eq(kundenkarteDocuments.id, input.id))
        .returning();

      return updated;
    }),

  // Delete document
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(kundenkarteDocuments).where(eq(kundenkarteDocuments.id, input.id));
      return { success: true };
    }),
});

// =============================================================================
// KUNDENKARTE ACTIVITIES ROUTER
// =============================================================================

export const kundenkarteActivitiesRouter = createTRPCRouter({
  // Add activity
  create: orgProcedure
    .input(activityCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(kundenkarteActivities)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      return created;
    }),

  // List activities
  byKundenkarte: orgProcedure
    .input(z.object({
      kundenkarteId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      activityType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(kundenkarteActivities.kundenkarteId, input.kundenkarteId)];

      if (input.activityType) {
        conditions.push(eq(kundenkarteActivities.activityType, input.activityType));
      }

      return db
        .select()
        .from(kundenkarteActivities)
        .where(and(...conditions))
        .orderBy(desc(kundenkarteActivities.createdAt))
        .limit(input.limit);
    }),
});
