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
  bauherrenPaesse,
  bauherrenPassDocuments,
  bauherrenPassGenehmigungen,
  bauherrenPassHistory,
  auditLogs,
} from "@nexus/db";

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const smartHomeKonfigurationSchema = z.object({
  features: z.array(z.string()).optional(),
  rooms: z.array(z.object({
    name: z.string(),
    devices: z.array(z.string()),
  })).optional(),
  budget: z.number().optional(),
});

const auflageSchema = z.object({
  text: z.string(),
  erfuellt: z.boolean(),
  erfuelltAm: z.string().optional(),
});

const bauherrenPassCreateSchema = z.object({
  // References
  projectId: z.string().uuid().optional(),
  kundenkarteId: z.string().uuid().optional(),

  // Identification
  passNummer: z.string(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai"]).optional(),

  // Property Details
  grundstueckAdresse: z.string().min(1),
  grundstueckPlz: z.string().min(1),
  grundstueckOrt: z.string().min(1),
  grundstueckFlurstueck: z.string().optional(),
  grundstueckGemarkung: z.string().optional(),
  grundstueckGroesse: z.string().optional(),

  // Building Project
  bauvorhabenBezeichnung: z.string().min(1),
  bauvorhabenTyp: z.string().optional(),
  hausTyp: z.string().optional(),
  wohnflaeche: z.string().optional(),
  bruttoGrundflaeche: z.string().optional(),
  anzahlWohneinheiten: z.number().int().optional(),

  // Authorities
  zustaendigesBauamt: z.string().optional(),
  bauamtAnsprechpartner: z.string().optional(),
  bauamtAktenzeichen: z.string().optional(),

  // Key Dates
  bauantragEingereicht: z.string().optional(),
  baugenehmigungErteilt: z.string().optional(),
  baugenehmigungGueltigBis: z.string().optional(),
  baubeginnanzeige: z.string().optional(),
  rohbaufertigmeldung: z.string().optional(),
  schlussabnahme: z.string().optional(),

  // Insurance
  bauherrenhaftpflicht: z.boolean().optional(),
  bauherrenhaftpflichtPolice: z.string().optional(),
  bauleistungsversicherung: z.boolean().optional(),
  bauleistungsversicherungPolice: z.string().optional(),
  feuerrohbauversicherung: z.boolean().optional(),
  feuerrohbauversicherungPolice: z.string().optional(),

  // Energy
  energiestandard: z.string().optional(),
  primaerenergiebedarf: z.string().optional(),
  endenergiebedarf: z.string().optional(),
  energieausweisNummer: z.string().optional(),

  // Smart Home
  smartHomeGeplant: z.boolean().optional(),
  smartHomeProvider: z.string().optional(),
  smartHomeKonfiguration: smartHomeKonfigurationSchema.optional(),

  // Financial
  gesamtbaukosten: z.string().optional(),
  grundstueckskosten: z.string().optional(),
  nebenkosten: z.string().optional(),
  finanzierungssumme: z.string().optional(),

  // Notes
  bemerkungen: z.string().optional(),
  internNotizen: z.string().optional(),
});

const bauherrenPassUpdateSchema = bauherrenPassCreateSchema.partial();

const checklistUpdateSchema = z.object({
  id: z.string().uuid(),
  checklistBaugenehmigung: z.boolean().optional(),
  checklistStatik: z.boolean().optional(),
  checklistEnergieausweis: z.boolean().optional(),
  checklistWaermebedarfsausweis: z.boolean().optional(),
  checklistBaugrundgutachten: z.boolean().optional(),
  checklistVermessung: z.boolean().optional(),
  checklistLageplan: z.boolean().optional(),
  checklistGrundrisse: z.boolean().optional(),
  checklistSchnitte: z.boolean().optional(),
  checklistAnsichten: z.boolean().optional(),
  checklistBaubeschreibung: z.boolean().optional(),
  checklistBerechnungen: z.boolean().optional(),
  checklistBrandschutznachweis: z.boolean().optional(),
  checklistSchallschutznachweis: z.boolean().optional(),
});

const documentCreateSchema = z.object({
  bauherrenPassId: z.string().uuid(),
  kategorie: z.enum([
    "genehmigungen",
    "plaene",
    "gutachten",
    "nachweise",
    "vertraege",
    "versicherungen",
    "abnahmen",
    "sonstige"
  ]),
  dokumentTyp: z.string(),
  titel: z.string(),
  beschreibung: z.string().optional(),
  dateiName: z.string(),
  dateiUrl: z.string(),
  dateiGroesse: z.number().int().optional(),
  mimeType: z.string().optional(),
  version: z.string().optional(),
  gueltigAb: z.string().optional(),
  gueltigBis: z.string().optional(),
  behoerdlichesAktenzeichen: z.string().optional(),
  ausstellendeBehörde: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const genehmigungCreateSchema = z.object({
  bauherrenPassId: z.string().uuid(),
  genehmigungsTyp: z.string(),
  bezeichnung: z.string(),
  beschreibung: z.string().optional(),
  behoerde: z.string(),
  aktenzeichen: z.string().optional(),
  ansprechpartner: z.string().optional(),
  status: z.enum(["beantragt", "in_pruefung", "genehmigt", "abgelehnt", "auflagen"]),
  beantragtAm: z.string().optional(),
  auflagen: z.array(auflageSchema).optional(),
  gebuehren: z.string().optional(),
  notizen: z.string().optional(),
});

// =============================================================================
// BAUHERREN-PASS ROUTER
// =============================================================================

export const bauherrenPassRouter = createTRPCRouter({
  // List with filtering
  list: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
        search: z.string().optional(),
        status: z.enum([
          "nicht_erstellt", "in_bearbeitung", "vollstaendig",
          "genehmigung_beantragt", "genehmigt", "in_bau", "abgeschlossen"
        ]).optional(),
        projectId: z.string().uuid().optional(),
        kundenkarteId: z.string().uuid().optional(),
        subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai"]).optional(),
        smartHomeGeplant: z.boolean().optional(),
        sortBy: z.enum(["passNummer", "createdAt", "completionPercentage"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        limit = 50, cursor, search, status, projectId, kundenkarteId,
        subsidiary, smartHomeGeplant, sortBy = "createdAt", sortOrder = "desc"
      } = input ?? {};

      const conditions = [eq(bauherrenPaesse.organizationId, ctx.organizationId)];

      if (search) {
        conditions.push(
          or(
            ilike(bauherrenPaesse.passNummer, `%${search}%`),
            ilike(bauherrenPaesse.grundstueckAdresse, `%${search}%`),
            ilike(bauherrenPaesse.grundstueckOrt, `%${search}%`),
            ilike(bauherrenPaesse.bauvorhabenBezeichnung, `%${search}%`)
          )!
        );
      }

      if (status) conditions.push(eq(bauherrenPaesse.status, status));
      if (projectId) conditions.push(eq(bauherrenPaesse.projectId, projectId));
      if (kundenkarteId) conditions.push(eq(bauherrenPaesse.kundenkarteId, kundenkarteId));
      if (subsidiary) conditions.push(eq(bauherrenPaesse.subsidiary, subsidiary));
      if (smartHomeGeplant !== undefined) conditions.push(eq(bauherrenPaesse.smartHomeGeplant, smartHomeGeplant));

      if (cursor) conditions.push(gte(bauherrenPaesse.id, cursor));

      const orderByColumn = {
        passNummer: bauherrenPaesse.passNummer,
        createdAt: bauherrenPaesse.createdAt,
        completionPercentage: bauherrenPaesse.completionPercentage,
      }[sortBy];

      const items = await db
        .select()
        .from(bauherrenPaesse)
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
      const [pass] = await db
        .select()
        .from(bauherrenPaesse)
        .where(
          and(
            eq(bauherrenPaesse.id, input.id),
            eq(bauherrenPaesse.organizationId, ctx.organizationId)
          )
        );

      if (!pass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bauherren-Pass not found" });
      }

      const [documents, genehmigungen, history] = await Promise.all([
        db.select().from(bauherrenPassDocuments)
          .where(eq(bauherrenPassDocuments.bauherrenPassId, input.id))
          .orderBy(desc(bauherrenPassDocuments.createdAt)),
        db.select().from(bauherrenPassGenehmigungen)
          .where(eq(bauherrenPassGenehmigungen.bauherrenPassId, input.id))
          .orderBy(desc(bauherrenPassGenehmigungen.createdAt)),
        db.select().from(bauherrenPassHistory)
          .where(eq(bauherrenPassHistory.bauherrenPassId, input.id))
          .orderBy(desc(bauherrenPassHistory.createdAt))
          .limit(50),
      ]);

      return { ...pass, documents, genehmigungen, history };
    }),

  // Get by PassNummer
  byPassNummer: orgProcedure
    .input(z.object({ passNummer: z.string() }))
    .query(async ({ ctx, input }) => {
      const [pass] = await db
        .select()
        .from(bauherrenPaesse)
        .where(
          and(
            eq(bauherrenPaesse.passNummer, input.passNummer),
            eq(bauherrenPaesse.organizationId, ctx.organizationId)
          )
        );

      if (!pass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bauherren-Pass not found" });
      }

      return pass;
    }),

  // Create
  create: orgProcedure
    .input(bauherrenPassCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(bauherrenPaesse)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          status: "in_bearbeitung",
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Log history
      await db.insert(bauherrenPassHistory).values({
        bauherrenPassId: created.id,
        aktion: "created",
        beschreibung: `Bauherren-Pass ${created.passNummer} erstellt`,
        nachherStatus: "in_bearbeitung",
        createdBy: ctx.user.id,
      });

      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "create",
        entityType: "bauherren_pass",
        entityId: created.id,
        newData: created,
      });

      return created;
    }),

  // Update
  update: orgProcedure
    .input(z.object({ id: z.string().uuid(), data: bauherrenPassUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(bauherrenPaesse)
        .where(
          and(
            eq(bauherrenPaesse.id, input.id),
            eq(bauherrenPaesse.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bauherren-Pass not found" });
      }

      const [updated] = await db
        .update(bauherrenPaesse)
        .set({
          ...input.data,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(bauherrenPaesse.id, input.id))
        .returning();

      await db.insert(bauherrenPassHistory).values({
        bauherrenPassId: input.id,
        aktion: "updated",
        beschreibung: "Bauherren-Pass aktualisiert",
        createdBy: ctx.user.id,
      });

      return updated;
    }),

  // Update checklist
  updateChecklist: orgProcedure
    .input(checklistUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...checklistData } = input;

      const [updated] = await db
        .update(bauherrenPaesse)
        .set({
          ...checklistData,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(bauherrenPaesse.id, id),
            eq(bauherrenPaesse.organizationId, ctx.organizationId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bauherren-Pass not found" });
      }

      // Calculate completion percentage
      const checklistFields = [
        updated.checklistBaugenehmigung,
        updated.checklistStatik,
        updated.checklistEnergieausweis,
        updated.checklistWaermebedarfsausweis,
        updated.checklistBaugrundgutachten,
        updated.checklistVermessung,
        updated.checklistLageplan,
        updated.checklistGrundrisse,
        updated.checklistSchnitte,
        updated.checklistAnsichten,
        updated.checklistBaubeschreibung,
        updated.checklistBerechnungen,
        updated.checklistBrandschutznachweis,
        updated.checklistSchallschutznachweis,
      ];

      const completedCount = checklistFields.filter(Boolean).length;
      const completionPercentage = Math.round((completedCount / checklistFields.length) * 100);

      await db
        .update(bauherrenPaesse)
        .set({ completionPercentage })
        .where(eq(bauherrenPaesse.id, id));

      return { ...updated, completionPercentage };
    }),

  // Update status
  updateStatus: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum([
        "nicht_erstellt", "in_bearbeitung", "vollstaendig",
        "genehmigung_beantragt", "genehmigt", "in_bau", "abgeschlossen"
      ]),
      bemerkung: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(bauherrenPaesse)
        .where(
          and(
            eq(bauherrenPaesse.id, input.id),
            eq(bauherrenPaesse.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bauherren-Pass not found" });
      }

      const [updated] = await db
        .update(bauherrenPaesse)
        .set({
          status: input.status,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(bauherrenPaesse.id, input.id))
        .returning();

      await db.insert(bauherrenPassHistory).values({
        bauherrenPassId: input.id,
        aktion: "status_changed",
        beschreibung: input.bemerkung || `Status geändert: ${existing.status} → ${input.status}`,
        vorherStatus: existing.status,
        nachherStatus: input.status,
        createdBy: ctx.user.id,
      });

      return updated;
    }),

  // Generate next PassNummer
  generatePassNummer: orgProcedure.query(async ({ ctx }) => {
    const [lastPass] = await db
      .select({ passNummer: bauherrenPaesse.passNummer })
      .from(bauherrenPaesse)
      .where(eq(bauherrenPaesse.organizationId, ctx.organizationId))
      .orderBy(desc(bauherrenPaesse.createdAt))
      .limit(1);

    const year = new Date().getFullYear();
    let nextNumber = 1;

    if (lastPass?.passNummer) {
      const match = lastPass.passNummer.match(/^BP-(\d{4})-(\d+)$/);
      if (match && match[1] === String(year)) {
        nextNumber = parseInt(match[2], 10) + 1;
      }
    }

    return `BP-${year}-${String(nextNumber).padStart(5, "0")}`;
  }),

  // Statistics
  stats: orgProcedure.query(async ({ ctx }) => {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        inBearbeitung: sql<number>`count(*) filter (where ${bauherrenPaesse.status} = 'in_bearbeitung')::int`,
        vollstaendig: sql<number>`count(*) filter (where ${bauherrenPaesse.status} = 'vollstaendig')::int`,
        genehmigungBeantragt: sql<number>`count(*) filter (where ${bauherrenPaesse.status} = 'genehmigung_beantragt')::int`,
        genehmigt: sql<number>`count(*) filter (where ${bauherrenPaesse.status} = 'genehmigt')::int`,
        inBau: sql<number>`count(*) filter (where ${bauherrenPaesse.status} = 'in_bau')::int`,
        abgeschlossen: sql<number>`count(*) filter (where ${bauherrenPaesse.status} = 'abgeschlossen')::int`,
        smartHomeGeplant: sql<number>`count(*) filter (where ${bauherrenPaesse.smartHomeGeplant} = true)::int`,
        avgCompletion: sql<number>`avg(${bauherrenPaesse.completionPercentage})`,
        totalBaukosten: sql<number>`sum(${bauherrenPaesse.gesamtbaukosten}::numeric)`,
      })
      .from(bauherrenPaesse)
      .where(eq(bauherrenPaesse.organizationId, ctx.organizationId));

    return stats;
  }),

  // Delete
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(bauherrenPaesse)
        .where(
          and(
            eq(bauherrenPaesse.id, input.id),
            eq(bauherrenPaesse.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bauherren-Pass not found" });
      }

      await db.delete(bauherrenPaesse).where(eq(bauherrenPaesse.id, input.id));

      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "delete",
        entityType: "bauherren_pass",
        entityId: input.id,
        previousData: existing,
      });

      return { success: true };
    }),
});

// =============================================================================
// BAUHERREN-PASS DOCUMENTS ROUTER
// =============================================================================

export const bauherrenPassDocumentsRouter = createTRPCRouter({
  // Create document
  create: orgProcedure
    .input(documentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(bauherrenPassDocuments)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      await db.insert(bauherrenPassHistory).values({
        bauherrenPassId: input.bauherrenPassId,
        aktion: "document_added",
        beschreibung: `Dokument hinzugefügt: ${input.titel}`,
        createdBy: ctx.user.id,
      });

      return created;
    }),

  // List by Bauherren-Pass
  byBauherrenPass: orgProcedure
    .input(z.object({
      bauherrenPassId: z.string().uuid(),
      kategorie: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(bauherrenPassDocuments.bauherrenPassId, input.bauherrenPassId)];

      if (input.kategorie) {
        conditions.push(eq(bauherrenPassDocuments.kategorie, input.kategorie as any));
      }

      return db
        .select()
        .from(bauherrenPassDocuments)
        .where(and(...conditions))
        .orderBy(desc(bauherrenPassDocuments.createdAt));
    }),

  // Verify document
  verify: orgProcedure
    .input(z.object({ id: z.string().uuid(), pruefkommentar: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(bauherrenPassDocuments)
        .set({
          geprueft: true,
          geprueftAm: new Date(),
          geprueftVon: ctx.user.id,
          pruefkommentar: input.pruefkommentar,
        })
        .where(eq(bauherrenPassDocuments.id, input.id))
        .returning();

      return updated;
    }),

  // Delete
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(bauherrenPassDocuments).where(eq(bauherrenPassDocuments.id, input.id));
      return { success: true };
    }),
});

// =============================================================================
// BAUHERREN-PASS GENEHMIGUNGEN ROUTER
// =============================================================================

export const bauherrenPassGenehmigungenRouter = createTRPCRouter({
  // Create
  create: orgProcedure
    .input(genehmigungCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(bauherrenPassGenehmigungen)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      await db.insert(bauherrenPassHistory).values({
        bauherrenPassId: input.bauherrenPassId,
        aktion: "genehmigung_added",
        beschreibung: `Genehmigung hinzugefügt: ${input.bezeichnung}`,
        createdBy: ctx.user.id,
      });

      return created;
    }),

  // List by Bauherren-Pass
  byBauherrenPass: orgProcedure
    .input(z.object({ bauherrenPassId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(bauherrenPassGenehmigungen)
        .where(eq(bauherrenPassGenehmigungen.bauherrenPassId, input.bauherrenPassId))
        .orderBy(desc(bauherrenPassGenehmigungen.createdAt));
    }),

  // Update status
  updateStatus: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["beantragt", "in_pruefung", "genehmigt", "abgelehnt", "auflagen"]),
      genehmigtAm: z.string().optional(),
      gueltigBis: z.string().optional(),
      abgelehntAm: z.string().optional(),
      ablehnungsgrund: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updated] = await db
        .update(bauherrenPassGenehmigungen)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(bauherrenPassGenehmigungen.id, id))
        .returning();

      return updated;
    }),

  // Update Auflagen
  updateAuflagen: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      auflagen: z.array(auflageSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const alleErfuellt = input.auflagen.every(a => a.erfuellt);

      const [updated] = await db
        .update(bauherrenPassGenehmigungen)
        .set({
          auflagen: input.auflagen,
          alleAuflagenErfuellt: alleErfuellt,
          updatedAt: new Date(),
        })
        .where(eq(bauherrenPassGenehmigungen.id, input.id))
        .returning();

      return updated;
    }),

  // Delete
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(bauherrenPassGenehmigungen).where(eq(bauherrenPassGenehmigungen.id, input.id));
      return { success: true };
    }),
});

// =============================================================================
// BAUHERREN-PASS HISTORY ROUTER
// =============================================================================

export const bauherrenPassHistoryRouter = createTRPCRouter({
  // List history
  byBauherrenPass: orgProcedure
    .input(z.object({
      bauherrenPassId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(bauherrenPassHistory)
        .where(eq(bauherrenPassHistory.bauherrenPassId, input.bauherrenPassId))
        .orderBy(desc(bauherrenPassHistory.createdAt))
        .limit(input.limit);
    }),
});
