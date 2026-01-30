import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  bauherrenPassStatusEnum,
  documentCategoryEnum,
  subsidiaryEnum,
} from "./enums";
import { organizations, users } from "./auth";
import { projects } from "./projects";
import { kundenkarten } from "./kundenkarte";

// =============================================================================
// BAUHERREN-PASS (CONSTRUCTION OWNER PASSPORT)
// =============================================================================

/**
 * Bauherren-Pass - Official Construction Documentation Package
 *
 * The Bauherren-Pass is a comprehensive documentation system that tracks
 * all permits, approvals, contracts, and compliance documents required
 * for construction projects in Germany.
 */
export const bauherrenPaesse = pgTable(
  "bauherren_paesse",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // References
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    kundenkarteId: uuid("kundenkarte_id").references(() => kundenkarten.id, { onDelete: "set null" }),

    // Identification
    passNummer: varchar("pass_nummer", { length: 50 }).notNull(),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),
    status: bauherrenPassStatusEnum("status").default("nicht_erstellt").notNull(),

    // Property Details (Grundstück)
    grundstueckAdresse: text("grundstueck_adresse").notNull(),
    grundstueckPlz: varchar("grundstueck_plz", { length: 10 }).notNull(),
    grundstueckOrt: varchar("grundstueck_ort", { length: 100 }).notNull(),
    grundstueckFlurstueck: varchar("grundstueck_flurstueck", { length: 100 }),
    grundstueckGemarkung: varchar("grundstueck_gemarkung", { length: 100 }),
    grundstueckGroesse: decimal("grundstueck_groesse", { precision: 10, scale: 2 }),

    // Building Project Details
    bauvorhabenBezeichnung: varchar("bauvorhaben_bezeichnung", { length: 255 }).notNull(),
    bauvorhabenTyp: varchar("bauvorhaben_typ", { length: 100 }), // Neubau, Umbau, Anbau
    hausTyp: varchar("haus_typ", { length: 100 }),
    wohnflaeche: decimal("wohnflaeche", { precision: 10, scale: 2 }),
    bruttoGrundflaeche: decimal("brutto_grundflaeche", { precision: 10, scale: 2 }),
    anzahlWohneinheiten: integer("anzahl_wohneinheiten").default(1),

    // Authorities & Contacts
    zustaendigesBauamt: varchar("zustaendiges_bauamt", { length: 255 }),
    bauamtAnsprechpartner: varchar("bauamt_ansprechpartner", { length: 100 }),
    bauamtAktenzeichen: varchar("bauamt_aktenzeichen", { length: 100 }),

    // Key Dates (Wichtige Termine)
    bauantragEingereicht: date("bauantrag_eingereicht"),
    baugenehmigungErteilt: date("baugenehmigung_erteilt"),
    baugenehmigungGueltigBis: date("baugenehmigung_gueltig_bis"),
    baubeginnanzeige: date("baubeginnanzeige"),
    rohbaufertigmeldung: date("rohbaufertigmeldung"),
    schlussabnahme: date("schlussabnahme"),

    // Checklist Status (Vollständigkeitsprüfung)
    checklistBaugenehmigung: boolean("checklist_baugenehmigung").default(false),
    checklistStatik: boolean("checklist_statik").default(false),
    checklistEnergieausweis: boolean("checklist_energieausweis").default(false),
    checklistWaermebedarfsausweis: boolean("checklist_waermebedarfsausweis").default(false),
    checklistBaugrundgutachten: boolean("checklist_baugrundgutachten").default(false),
    checklistVermessung: boolean("checklist_vermessung").default(false),
    checklistLageplan: boolean("checklist_lageplan").default(false),
    checklistGrundrisse: boolean("checklist_grundrisse").default(false),
    checklistSchnitte: boolean("checklist_schnitte").default(false),
    checklistAnsichten: boolean("checklist_ansichten").default(false),
    checklistBaubeschreibung: boolean("checklist_baubeschreibung").default(false),
    checklistBerechnungen: boolean("checklist_berechnungen").default(false),
    checklistBrandschutznachweis: boolean("checklist_brandschutznachweis").default(false),
    checklistSchallschutznachweis: boolean("checklist_schallschutznachweis").default(false),

    // Insurance Status (Versicherungen)
    bauherrenhaftpflicht: boolean("bauherrenhaftpflicht").default(false),
    bauherrenhaftpflichtPolice: varchar("bauherrenhaftpflicht_police", { length: 100 }),
    bauleistungsversicherung: boolean("bauleistungsversicherung").default(false),
    bauleistungsversicherungPolice: varchar("bauleistungsversicherung_police", { length: 100 }),
    feuerrohbauversicherung: boolean("feuerrohbauversicherung").default(false),
    feuerrohbauversicherungPolice: varchar("feuerrohbauversicherung_police", { length: 100 }),

    // Energy & Environmental
    energiestandard: varchar("energiestandard", { length: 50 }), // KfW 40, 55, 70, Passivhaus
    primaerenergiebedarf: decimal("primaerenergiebedarf", { precision: 8, scale: 2 }),
    endenergiebedarf: decimal("endenergiebedarf", { precision: 8, scale: 2 }),
    energieausweisNummer: varchar("energieausweis_nummer", { length: 100 }),

    // Smart Home Integration
    smartHomeGeplant: boolean("smart_home_geplant").default(false),
    smartHomeProvider: varchar("smart_home_provider", { length: 50 }),
    smartHomeKonfiguration: jsonb("smart_home_konfiguration").$type<{
      features?: string[];
      rooms?: Array<{ name: string; devices: string[] }>;
      budget?: number;
    }>(),

    // Financial Summary
    gesamtbaukosten: decimal("gesamtbaukosten", { precision: 14, scale: 2 }),
    grundstueckskosten: decimal("grundstueckskosten", { precision: 14, scale: 2 }),
    nebenkosten: decimal("nebenkosten", { precision: 14, scale: 2 }),
    finanzierungssumme: decimal("finanzierungssumme", { precision: 14, scale: 2 }),

    // Notes & Comments
    bemerkungen: text("bemerkungen"),
    internNotizen: text("intern_notizen"),

    // Completion Tracking
    completionPercentage: integer("completion_percentage").default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { mode: "date" }),
    lastReviewedBy: uuid("last_reviewed_by").references(() => users.id),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("bauherren_paesse_org_idx").on(table.organizationId),
    projectIdx: index("bauherren_paesse_project_idx").on(table.projectId),
    passNummerIdx: index("bauherren_paesse_pass_nummer_idx").on(table.passNummer),
    statusIdx: index("bauherren_paesse_status_idx").on(table.status),
    kundenkarteIdx: index("bauherren_paesse_kundenkarte_idx").on(table.kundenkarteId),
  })
);

// =============================================================================
// BAUHERREN-PASS DOCUMENTS
// =============================================================================

export const bauherrenPassDocuments = pgTable(
  "bauherren_pass_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bauherrenPassId: uuid("bauherren_pass_id")
      .notNull()
      .references(() => bauherrenPaesse.id, { onDelete: "cascade" }),

    // Document Information
    kategorie: documentCategoryEnum("kategorie").notNull(),
    dokumentTyp: varchar("dokument_typ", { length: 100 }).notNull(), // Specific type within category
    titel: varchar("titel", { length: 255 }).notNull(),
    beschreibung: text("beschreibung"),

    // File Information
    dateiName: varchar("datei_name", { length: 255 }).notNull(),
    dateiUrl: text("datei_url").notNull(),
    dateiGroesse: integer("datei_groesse"),
    mimeType: varchar("mime_type", { length: 100 }),

    // Validity & Versioning
    version: varchar("version", { length: 20 }),
    gueltigAb: date("gueltig_ab"),
    gueltigBis: date("gueltig_bis"),
    aktuell: boolean("aktuell").default(true),

    // Verification
    geprueft: boolean("geprueft").default(false),
    geprueftAm: timestamp("geprueft_am", { mode: "date" }),
    geprueftVon: uuid("geprueft_von").references(() => users.id),
    pruefkommentar: text("pruefkommentar"),

    // External References
    behoerdlichesAktenzeichen: varchar("behoerdliches_aktenzeichen", { length: 100 }),
    ausstellendeBehörde: varchar("ausstellende_behoerde", { length: 255 }),

    // Metadata
    tags: jsonb("tags").$type<string[]>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    bauherrenPassIdx: index("bp_docs_bauherren_pass_idx").on(table.bauherrenPassId),
    kategorieIdx: index("bp_docs_kategorie_idx").on(table.kategorie),
    dokumentTypIdx: index("bp_docs_dokument_typ_idx").on(table.dokumentTyp),
    aktuellIdx: index("bp_docs_aktuell_idx").on(table.aktuell),
  })
);

// =============================================================================
// BAUHERREN-PASS APPROVALS/GENEHMIGUNGEN
// =============================================================================

export const bauherrenPassGenehmigungen = pgTable(
  "bauherren_pass_genehmigungen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bauherrenPassId: uuid("bauherren_pass_id")
      .notNull()
      .references(() => bauherrenPaesse.id, { onDelete: "cascade" }),

    // Approval Type
    genehmigungsTyp: varchar("genehmigungs_typ", { length: 100 }).notNull(),
    bezeichnung: varchar("bezeichnung", { length: 255 }).notNull(),
    beschreibung: text("beschreibung"),

    // Authority Information
    behoerde: varchar("behoerde", { length: 255 }).notNull(),
    aktenzeichen: varchar("aktenzeichen", { length: 100 }),
    ansprechpartner: varchar("ansprechpartner", { length: 100 }),

    // Status Tracking
    status: varchar("status", { length: 50 }).notNull(), // beantragt, in_pruefung, genehmigt, abgelehnt, auflagen
    beantragtAm: date("beantragt_am"),
    genehmigtAm: date("genehmigt_am"),
    gueltigBis: date("gueltig_bis"),
    abgelehntAm: date("abgelehnt_am"),
    ablehnungsgrund: text("ablehnungsgrund"),

    // Conditions/Auflagen
    auflagen: jsonb("auflagen").$type<Array<{
      text: string;
      erfuellt: boolean;
      erfuelltAm?: string;
    }>>(),
    alleAuflagenErfuellt: boolean("alle_auflagen_erfuellt").default(false),

    // Associated Documents
    dokumentIds: jsonb("dokument_ids").$type<string[]>(),

    // Cost
    gebuehren: decimal("gebuehren", { precision: 10, scale: 2 }),
    gebuehrenBezahlt: boolean("gebuehren_bezahlt").default(false),

    // Reminders
    erinnerungAktiv: boolean("erinnerung_aktiv").default(false),
    erinnerungDatum: date("erinnerung_datum"),

    // Notes
    notizen: text("notizen"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    bauherrenPassIdx: index("bp_genehmigungen_bp_idx").on(table.bauherrenPassId),
    typIdx: index("bp_genehmigungen_typ_idx").on(table.genehmigungsTyp),
    statusIdx: index("bp_genehmigungen_status_idx").on(table.status),
  })
);

// =============================================================================
// BAUHERREN-PASS HISTORY/AUDIT
// =============================================================================

export const bauherrenPassHistory = pgTable(
  "bauherren_pass_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bauherrenPassId: uuid("bauherren_pass_id")
      .notNull()
      .references(() => bauherrenPaesse.id, { onDelete: "cascade" }),

    aktion: varchar("aktion", { length: 100 }).notNull(), // created, updated, status_changed, document_added, etc.
    beschreibung: text("beschreibung"),

    // For status changes
    vorherStatus: bauherrenPassStatusEnum("vorher_status"),
    nachherStatus: bauherrenPassStatusEnum("nachher_status"),

    // Changed fields tracking
    geaenderteFelder: jsonb("geaenderte_felder").$type<Record<string, { alt: unknown; neu: unknown }>>(),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    bauherrenPassIdx: index("bp_history_bp_idx").on(table.bauherrenPassId),
    createdAtIdx: index("bp_history_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const bauherrenPaesseRelations = relations(bauherrenPaesse, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [bauherrenPaesse.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [bauherrenPaesse.projectId],
    references: [projects.id],
  }),
  kundenkarte: one(kundenkarten, {
    fields: [bauherrenPaesse.kundenkarteId],
    references: [kundenkarten.id],
  }),
  lastReviewedByUser: one(users, {
    fields: [bauherrenPaesse.lastReviewedBy],
    references: [users.id],
  }),
  documents: many(bauherrenPassDocuments),
  genehmigungen: many(bauherrenPassGenehmigungen),
  history: many(bauherrenPassHistory),
}));

export const bauherrenPassDocumentsRelations = relations(bauherrenPassDocuments, ({ one }) => ({
  bauherrenPass: one(bauherrenPaesse, {
    fields: [bauherrenPassDocuments.bauherrenPassId],
    references: [bauherrenPaesse.id],
  }),
  geprueftVonUser: one(users, {
    fields: [bauherrenPassDocuments.geprueftVon],
    references: [users.id],
  }),
}));

export const bauherrenPassGenehmigungenRelations = relations(bauherrenPassGenehmigungen, ({ one }) => ({
  bauherrenPass: one(bauherrenPaesse, {
    fields: [bauherrenPassGenehmigungen.bauherrenPassId],
    references: [bauherrenPaesse.id],
  }),
}));

export const bauherrenPassHistoryRelations = relations(bauherrenPassHistory, ({ one }) => ({
  bauherrenPass: one(bauherrenPaesse, {
    fields: [bauherrenPassHistory.bauherrenPassId],
    references: [bauherrenPaesse.id],
  }),
  createdByUser: one(users, {
    fields: [bauherrenPassHistory.createdBy],
    references: [users.id],
  }),
}));
