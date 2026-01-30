import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc";
import {
  db,
  subcontractors,
  subcontractorDocuments,
  subcontractorRatings,
  projectSubcontractors,
  auditLogs,
  eq, and, desc, asc, ilike, or, sql, gte, lte, isNull,
} from "@nexus/db";

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const insuranceSchema = z.object({
  vorhanden: z.boolean(),
  versicherer: z.string().optional(),
  policeNummer: z.string().optional(),
  deckungssumme: z.number().optional(),
  gueltigBis: z.string().optional(),
  dokumentUrl: z.string().optional(),
});

const certificationSchema = z.object({
  name: z.string(),
  aussteller: z.string(),
  nummer: z.string().optional(),
  gueltigBis: z.string().optional(),
});

const skontoSchema = z.object({
  prozent: z.number(),
  tage: z.number(),
});

const subcontractorCreateSchema = z.object({
  firmenname: z.string().min(1),
  rechtsform: z.string().optional(),
  handelsregisterNummer: z.string().optional(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai"]).optional(),
  status: z.enum(["prospect", "approved", "active", "inactive", "blacklisted"]).optional(),

  // Contact
  strasse: z.string().optional(),
  plz: z.string().optional(),
  ort: z.string().optional(),
  land: z.string().optional(),
  telefon: z.string().optional(),
  telefonMobil: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email(),
  website: z.string().optional(),

  // Primary Contact
  ansprechpartnerName: z.string().optional(),
  ansprechpartnerPosition: z.string().optional(),
  ansprechpartnerTelefon: z.string().optional(),
  ansprechpartnerEmail: z.string().email().optional(),

  // Trade
  hauptgewerk: z.enum([
    "rohbau", "maurerarbeiten", "betonarbeiten", "zimmerei", "dachdeckerei",
    "klempnerei", "sanitaer", "heizung", "lueftung", "elektro", "trockenbau",
    "estrich", "fliesen", "maler", "bodenbelaege", "tischler", "schlosser",
    "metallbau", "fensterbau", "fassade", "waermedaemmung", "garten_landschaft",
    "tiefbau", "abbruch", "geruest", "reinigung", "sicherheitstechnik",
    "smart_home", "photovoltaik", "andere"
  ]),
  nebengewerke: z.array(z.string()).optional(),
  spezialisierungen: z.array(z.string()).optional(),
  zertifizierungen: z.array(certificationSchema).optional(),

  // Capacity
  mitarbeiterAnzahl: z.number().int().optional(),
  kapazitaet: z.string().optional(),
  einsatzradius: z.number().int().optional(),
  verfuegbarkeit: z.string().optional(),

  // Tax
  ustIdNr: z.string().optional(),
  steuernummer: z.string().optional(),
  kleinunternehmer: z.boolean().optional(),

  // Bank
  bankName: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  kontoinhaber: z.string().optional(),

  // Insurance
  betriebshaftpflicht: insuranceSchema.optional(),
  berufshaftpflicht: insuranceSchema.optional(),

  // Qualifications
  handwerkskammer: z.string().optional(),
  meisterbetrieb: z.boolean().optional(),
  handwerksrolleneintrag: z.string().optional(),

  // SOKA-BAU
  sokaBauMitglied: z.boolean().optional(),
  sokaBauNummer: z.string().optional(),
  sokaBauUnbedenklichkeit: z.boolean().optional(),
  sokaBauUnbedenklichkeitBis: z.string().optional(),

  // Pricing
  stundensatz: z.string().optional(),
  stundensatzHelfer: z.string().optional(),
  preislisteUrl: z.string().optional(),
  rabattVereinbarung: z.string().optional(),
  zahlungsziel: z.number().int().optional(),
  skonto: skontoSchema.optional(),

  // Other
  bevorzugteKontaktart: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
  internNotizen: z.string().optional(),
  tags: z.array(z.string()).optional(),
  zustaendigerMitarbeiter: z.string().uuid().optional(),
});

const subcontractorUpdateSchema = subcontractorCreateSchema.partial();

const ratingCreateSchema = z.object({
  subcontractorId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  qualitaet: z.number().int().min(1).max(5),
  termintreue: z.number().int().min(1).max(5),
  kommunikation: z.number().int().min(1).max(5),
  preisLeistung: z.number().int().min(1).max(5),
  sauberkeit: z.number().int().min(1).max(5).optional(),
  zuverlaessigkeit: z.number().int().min(1).max(5).optional(),
  kommentar: z.string().optional(),
  positiv: z.string().optional(),
  negativ: z.string().optional(),
  empfehlung: z.boolean().optional(),
  intern: z.boolean().optional(),
});

const documentCreateSchema = z.object({
  subcontractorId: z.string().uuid(),
  dokumentTyp: z.string(),
  titel: z.string(),
  beschreibung: z.string().optional(),
  dateiName: z.string(),
  dateiUrl: z.string(),
  dateiGroesse: z.number().int().optional(),
  mimeType: z.string().optional(),
  gueltigAb: z.string().optional(),
  gueltigBis: z.string().optional(),
  erinnerungVorAblauf: z.number().int().optional(),
});

const projectAssignmentSchema = z.object({
  projectId: z.string().uuid(),
  subcontractorId: z.string().uuid(),
  gewerk: z.enum([
    "rohbau", "maurerarbeiten", "betonarbeiten", "zimmerei", "dachdeckerei",
    "klempnerei", "sanitaer", "heizung", "lueftung", "elektro", "trockenbau",
    "estrich", "fliesen", "maler", "bodenbelaege", "tischler", "schlosser",
    "metallbau", "fensterbau", "fassade", "waermedaemmung", "garten_landschaft",
    "tiefbau", "abbruch", "geruest", "reinigung", "sicherheitstechnik",
    "smart_home", "photovoltaik", "andere"
  ]),
  leistungsbeschreibung: z.string().optional(),
  auftragsart: z.string().optional(),
  auftragssummeNetto: z.string().optional(),
  auftragssummeBrutto: z.string().optional(),
  geplantStart: z.string().optional(),
  geplantEnde: z.string().optional(),
  vertragUrl: z.string().optional(),
  leistungsverzeichnisUrl: z.string().optional(),
  notizen: z.string().optional(),
});

// =============================================================================
// SUBCONTRACTORS ROUTER
// =============================================================================

export const subcontractorsRouter = createTRPCRouter({
  // List with filtering and pagination
  list: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
        search: z.string().optional(),
        status: z.enum(["prospect", "approved", "active", "inactive", "blacklisted"]).optional(),
        hauptgewerk: z.string().optional(),
        subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai"]).optional(),
        minBewertung: z.number().optional(),
        tags: z.array(z.string()).optional(),
        sokaBauUnbedenklichkeit: z.boolean().optional(),
        meisterbetrieb: z.boolean().optional(),
        sortBy: z.enum(["firmenname", "bewertungDurchschnitt", "createdAt", "projekteGesamt"]).default("firmenname"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { limit = 50, cursor, search, status, hauptgewerk, subsidiary, minBewertung, tags, sokaBauUnbedenklichkeit, meisterbetrieb, sortBy = "firmenname", sortOrder = "asc" } = input ?? {};

      const conditions = [eq(subcontractors.organizationId, ctx.organizationId)];

      if (search) {
        conditions.push(
          or(
            ilike(subcontractors.firmenname, `%${search}%`),
            ilike(subcontractors.email, `%${search}%`),
            ilike(subcontractors.ansprechpartnerName, `%${search}%`),
            ilike(subcontractors.ort, `%${search}%`)
          )!
        );
      }

      if (status) {
        conditions.push(eq(subcontractors.status, status));
      }

      if (hauptgewerk) {
        conditions.push(eq(subcontractors.hauptgewerk, hauptgewerk as any));
      }

      if (subsidiary) {
        conditions.push(eq(subcontractors.subsidiary, subsidiary));
      }

      if (minBewertung !== undefined) {
        conditions.push(gte(subcontractors.bewertungDurchschnitt, String(minBewertung)));
      }

      if (sokaBauUnbedenklichkeit !== undefined) {
        conditions.push(eq(subcontractors.sokaBauUnbedenklichkeit, sokaBauUnbedenklichkeit));
      }

      if (meisterbetrieb !== undefined) {
        conditions.push(eq(subcontractors.meisterbetrieb, meisterbetrieb));
      }

      if (cursor) {
        conditions.push(gte(subcontractors.id, cursor));
      }

      const orderByColumn = {
        firmenname: subcontractors.firmenname,
        bewertungDurchschnitt: subcontractors.bewertungDurchschnitt,
        createdAt: subcontractors.createdAt,
        projekteGesamt: subcontractors.projekteGesamt,
      }[sortBy];

      const items = await db
        .select()
        .from(subcontractors)
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
      const [subcontractor] = await db
        .select()
        .from(subcontractors)
        .where(
          and(
            eq(subcontractors.id, input.id),
            eq(subcontractors.organizationId, ctx.organizationId)
          )
        );

      if (!subcontractor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subcontractor not found" });
      }

      // Fetch related data
      const [documents, ratings, assignments] = await Promise.all([
        db.select().from(subcontractorDocuments).where(eq(subcontractorDocuments.subcontractorId, input.id)),
        db.select().from(subcontractorRatings).where(eq(subcontractorRatings.subcontractorId, input.id)).orderBy(desc(subcontractorRatings.createdAt)),
        db.select().from(projectSubcontractors).where(eq(projectSubcontractors.subcontractorId, input.id)).orderBy(desc(projectSubcontractors.createdAt)),
      ]);

      return { ...subcontractor, documents, ratings, assignments };
    }),

  // Create
  create: orgProcedure
    .input(subcontractorCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(subcontractors)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "create",
        entityType: "subcontractor",
        entityId: created.id,
        newData: created,
      });

      return created;
    }),

  // Update
  update: orgProcedure
    .input(z.object({ id: z.string().uuid(), data: subcontractorUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(subcontractors)
        .where(
          and(
            eq(subcontractors.id, input.id),
            eq(subcontractors.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subcontractor not found" });
      }

      const [updated] = await db
        .update(subcontractors)
        .set({
          ...input.data,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(subcontractors.id, input.id))
        .returning();

      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "update",
        entityType: "subcontractor",
        entityId: input.id,
        previousData: existing,
        newData: updated,
      });

      return updated;
    }),

  // Delete
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(subcontractors)
        .where(
          and(
            eq(subcontractors.id, input.id),
            eq(subcontractors.organizationId, ctx.organizationId)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subcontractor not found" });
      }

      await db.delete(subcontractors).where(eq(subcontractors.id, input.id));

      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "delete",
        entityType: "subcontractor",
        entityId: input.id,
        previousData: existing,
      });

      return { success: true };
    }),

  // Change status
  updateStatus: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["prospect", "approved", "active", "inactive", "blacklisted"]),
      blacklistGrund: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {
        status: input.status,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      };

      if (input.status === "blacklisted") {
        updateData.blacklistGrund = input.blacklistGrund;
        updateData.blacklistDatum = new Date().toISOString().split("T")[0];
      }

      const [updated] = await db
        .update(subcontractors)
        .set(updateData)
        .where(
          and(
            eq(subcontractors.id, input.id),
            eq(subcontractors.organizationId, ctx.organizationId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subcontractor not found" });
      }

      return updated;
    }),

  // Get by Gewerk
  byGewerk: orgProcedure
    .input(z.object({
      gewerk: z.string(),
      statusFilter: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(subcontractors.organizationId, ctx.organizationId),
        eq(subcontractors.hauptgewerk, input.gewerk as any),
      ];

      if (input.statusFilter && input.statusFilter.length > 0) {
        conditions.push(
          sql`${subcontractors.status} = ANY(${input.statusFilter})`
        );
      }

      return db
        .select()
        .from(subcontractors)
        .where(and(...conditions))
        .orderBy(desc(subcontractors.bewertungDurchschnitt));
    }),

  // Expiring documents
  expiringDocuments: orgProcedure
    .input(z.object({ daysAhead: z.number().int().default(30) }))
    .query(async ({ ctx, input }) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.daysAhead);

      return db
        .select({
          document: subcontractorDocuments,
          subcontractor: subcontractors,
        })
        .from(subcontractorDocuments)
        .innerJoin(subcontractors, eq(subcontractorDocuments.subcontractorId, subcontractors.id))
        .where(
          and(
            eq(subcontractors.organizationId, ctx.organizationId),
            lte(subcontractorDocuments.gueltigBis, futureDate.toISOString().split("T")[0])
          )
        )
        .orderBy(asc(subcontractorDocuments.gueltigBis));
    }),

  // Statistics
  stats: orgProcedure.query(async ({ ctx }) => {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${subcontractors.status} = 'active')::int`,
        approved: sql<number>`count(*) filter (where ${subcontractors.status} = 'approved')::int`,
        prospect: sql<number>`count(*) filter (where ${subcontractors.status} = 'prospect')::int`,
        blacklisted: sql<number>`count(*) filter (where ${subcontractors.status} = 'blacklisted')::int`,
        avgBewertung: sql<number>`avg(${subcontractors.bewertungDurchschnitt}::numeric)`,
        meisterbetriebe: sql<number>`count(*) filter (where ${subcontractors.meisterbetrieb} = true)::int`,
        sokaBauValid: sql<number>`count(*) filter (where ${subcontractors.sokaBauUnbedenklichkeit} = true)::int`,
      })
      .from(subcontractors)
      .where(eq(subcontractors.organizationId, ctx.organizationId));

    // Gewerk distribution
    const gewerkStats = await db
      .select({
        gewerk: subcontractors.hauptgewerk,
        count: sql<number>`count(*)::int`,
      })
      .from(subcontractors)
      .where(eq(subcontractors.organizationId, ctx.organizationId))
      .groupBy(subcontractors.hauptgewerk)
      .orderBy(desc(sql`count(*)`));

    return { ...stats, gewerkStats };
  }),
});

// =============================================================================
// SUBCONTRACTOR RATINGS ROUTER
// =============================================================================

export const subcontractorRatingsRouter = createTRPCRouter({
  // Create rating
  create: orgProcedure
    .input(ratingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Calculate overall rating
      const ratingFields = [input.qualitaet, input.termintreue, input.kommunikation, input.preisLeistung];
      if (input.sauberkeit) ratingFields.push(input.sauberkeit);
      if (input.zuverlaessigkeit) ratingFields.push(input.zuverlaessigkeit);

      const gesamtbewertung = (ratingFields.reduce((a, b) => a + b, 0) / ratingFields.length).toFixed(2);

      const [created] = await db
        .insert(subcontractorRatings)
        .values({
          ...input,
          gesamtbewertung,
          createdBy: ctx.user.id,
        })
        .returning();

      // Update average rating on subcontractor
      const [avgResult] = await db
        .select({
          avg: sql<number>`avg(${subcontractorRatings.gesamtbewertung}::numeric)`,
          count: sql<number>`count(*)::int`,
        })
        .from(subcontractorRatings)
        .where(eq(subcontractorRatings.subcontractorId, input.subcontractorId));

      await db
        .update(subcontractors)
        .set({
          bewertungDurchschnitt: String(avgResult.avg?.toFixed(2) ?? "0"),
          bewertungAnzahl: avgResult.count,
          updatedAt: new Date(),
        })
        .where(eq(subcontractors.id, input.subcontractorId));

      return created;
    }),

  // List ratings for subcontractor
  bySubcontractor: orgProcedure
    .input(z.object({ subcontractorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(subcontractorRatings)
        .where(eq(subcontractorRatings.subcontractorId, input.subcontractorId))
        .orderBy(desc(subcontractorRatings.createdAt));
    }),
});

// =============================================================================
// SUBCONTRACTOR DOCUMENTS ROUTER
// =============================================================================

export const subcontractorDocumentsRouter = createTRPCRouter({
  // Upload document
  create: orgProcedure
    .input(documentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(subcontractorDocuments)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      return created;
    }),

  // List documents
  bySubcontractor: orgProcedure
    .input(z.object({ subcontractorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(subcontractorDocuments)
        .where(eq(subcontractorDocuments.subcontractorId, input.subcontractorId))
        .orderBy(desc(subcontractorDocuments.createdAt));
    }),

  // Mark as verified
  verify: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(subcontractorDocuments)
        .set({
          geprueft: true,
          geprueftAm: new Date(),
          geprueftVon: ctx.user.id,
        })
        .where(eq(subcontractorDocuments.id, input.id))
        .returning();

      return updated;
    }),

  // Delete document
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(subcontractorDocuments)
        .where(eq(subcontractorDocuments.id, input.id));

      return { success: true };
    }),
});

// =============================================================================
// PROJECT SUBCONTRACTOR ASSIGNMENTS ROUTER
// =============================================================================

export const projectSubcontractorsRouter = createTRPCRouter({
  // Assign to project
  assign: orgProcedure
    .input(projectAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(projectSubcontractors)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      // Increment project count
      await db
        .update(subcontractors)
        .set({
          projekteGesamt: sql`${subcontractors.projekteGesamt} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(subcontractors.id, input.subcontractorId));

      return created;
    }),

  // Update assignment
  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        status: z.string().optional(),
        fertigstellungsgrad: z.number().int().min(0).max(100).optional(),
        tatsaechlichStart: z.string().optional(),
        tatsaechlichEnde: z.string().optional(),
        abnahmeErfolgt: z.boolean().optional(),
        abnahmeDatum: z.string().optional(),
        gezahlteSumme: z.string().optional(),
        notizen: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(projectSubcontractors)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(projectSubcontractors.id, input.id))
        .returning();

      // If completed, update subcontractor stats
      if (input.data.status === "abgeschlossen") {
        await db
          .update(subcontractors)
          .set({
            projekteAbgeschlossen: sql`${subcontractors.projekteAbgeschlossen} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(subcontractors.id, updated.subcontractorId));
      }

      return updated;
    }),

  // List by project
  byProject: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select({
          assignment: projectSubcontractors,
          subcontractor: subcontractors,
        })
        .from(projectSubcontractors)
        .innerJoin(subcontractors, eq(projectSubcontractors.subcontractorId, subcontractors.id))
        .where(eq(projectSubcontractors.projectId, input.projectId))
        .orderBy(asc(projectSubcontractors.geplantStart));
    }),

  // List by subcontractor
  bySubcontractor: orgProcedure
    .input(z.object({ subcontractorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(projectSubcontractors)
        .where(eq(projectSubcontractors.subcontractorId, input.subcontractorId))
        .orderBy(desc(projectSubcontractors.createdAt));
    }),
});
