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
  gewerkeEnum,
  subcontractorStatusEnum,
  subsidiaryEnum,
} from "./enums";
import { organizations, users } from "./auth";
import { projects } from "./projects";

// =============================================================================
// SUBCONTRACTORS (NACHUNTERNEHMER)
// =============================================================================

/**
 * Subcontractors - Nachunternehmer-Verwaltung
 *
 * Comprehensive management of subcontractors including certifications,
 * insurance verification, performance ratings, and compliance tracking.
 */
export const subcontractors = pgTable(
  "subcontractors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Basic Information
    firmenname: varchar("firmenname", { length: 255 }).notNull(),
    rechtsform: varchar("rechtsform", { length: 50 }), // GmbH, GmbH & Co. KG, etc.
    handelsregisterNummer: varchar("handelsregister_nummer", { length: 100 }),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),
    status: subcontractorStatusEnum("status").default("prospect").notNull(),

    // Contact Information
    strasse: varchar("strasse", { length: 255 }),
    plz: varchar("plz", { length: 10 }),
    ort: varchar("ort", { length: 100 }),
    land: varchar("land", { length: 100 }).default("Deutschland"),

    telefon: varchar("telefon", { length: 50 }),
    telefonMobil: varchar("telefon_mobil", { length: 50 }),
    fax: varchar("fax", { length: 50 }),
    email: varchar("email", { length: 255 }).notNull(),
    website: varchar("website", { length: 255 }),

    // Primary Contact Person
    ansprechpartnerName: varchar("ansprechpartner_name", { length: 100 }),
    ansprechpartnerPosition: varchar("ansprechpartner_position", { length: 100 }),
    ansprechpartnerTelefon: varchar("ansprechpartner_telefon", { length: 50 }),
    ansprechpartnerEmail: varchar("ansprechpartner_email", { length: 255 }),

    // Trade/Specialization (Gewerk)
    hauptgewerk: gewerkeEnum("hauptgewerk").notNull(),
    nebengewerke: jsonb("nebengewerke").$type<string[]>(),
    spezialisierungen: jsonb("spezialisierungen").$type<string[]>(),
    zertifizierungen: jsonb("zertifizierungen").$type<Array<{
      name: string;
      aussteller: string;
      nummer?: string;
      gueltigBis?: string;
    }>>(),

    // Capacity & Availability
    mitarbeiterAnzahl: integer("mitarbeiter_anzahl"),
    kapazitaet: varchar("kapazitaet", { length: 100 }), // z.B. "2-3 Baustellen gleichzeitig"
    einsatzradius: integer("einsatzradius"), // km
    verfuegbarkeit: varchar("verfuegbarkeit", { length: 100 }),

    // Tax Information
    ustIdNr: varchar("ust_id_nr", { length: 50 }),
    steuernummer: varchar("steuernummer", { length: 50 }),
    kleinunternehmer: boolean("kleinunternehmer").default(false),

    // Bank Details
    bankName: varchar("bank_name", { length: 100 }),
    iban: varchar("iban", { length: 34 }),
    bic: varchar("bic", { length: 11 }),
    kontoinhaber: varchar("kontoinhaber", { length: 100 }),

    // Insurance (Versicherungen)
    betriebshaftpflicht: jsonb("betriebshaftpflicht").$type<{
      vorhanden: boolean;
      versicherer?: string;
      policeNummer?: string;
      deckungssumme?: number;
      gueltigBis?: string;
      dokumentUrl?: string;
    }>(),
    berufshaftpflicht: jsonb("berufshaftpflicht").$type<{
      vorhanden: boolean;
      versicherer?: string;
      policeNummer?: string;
      deckungssumme?: number;
      gueltigBis?: string;
      dokumentUrl?: string;
    }>(),

    // Qualifications & Compliance
    handwerkskammer: varchar("handwerkskammer", { length: 255 }),
    meisterbetrieb: boolean("meisterbetrieb").default(false),
    handwerksrolleneintrag: varchar("handwerksrolleneintrag", { length: 100 }),

    // SOKA-BAU (Sozialkassen der Bauwirtschaft)
    sokaBauMitglied: boolean("soka_bau_mitglied").default(false),
    sokaBauNummer: varchar("soka_bau_nummer", { length: 50 }),
    sokaBauUnbedenklichkeit: boolean("soka_bau_unbedenklichkeit").default(false),
    sokaBauUnbedenklichkeitBis: date("soka_bau_unbedenklichkeit_bis"),

    // Performance Rating
    bewertungDurchschnitt: decimal("bewertung_durchschnitt", { precision: 3, scale: 2 }),
    bewertungAnzahl: integer("bewertung_anzahl").default(0),
    projekteGesamt: integer("projekte_gesamt").default(0),
    projekteAbgeschlossen: integer("projekte_abgeschlossen").default(0),
    maengelquote: decimal("maengelquote", { precision: 5, scale: 2 }),

    // Pricing
    stundensatz: decimal("stundensatz", { precision: 10, scale: 2 }),
    stundensatzHelfer: decimal("stundensatz_helfer", { precision: 10, scale: 2 }),
    preislisteUrl: text("preisliste_url"),
    rabattVereinbarung: decimal("rabatt_vereinbarung", { precision: 5, scale: 2 }),
    zahlungsziel: integer("zahlungsziel"), // Tage
    skonto: jsonb("skonto").$type<{
      prozent: number;
      tage: number;
    }>(),

    // Documents
    dokumenteVollstaendig: boolean("dokumente_vollstaendig").default(false),
    dokumentePruefungsdatum: date("dokumente_pruefungsdatum"),

    // Communication Preferences
    bevorzugteKontaktart: varchar("bevorzugte_kontaktart", { length: 50 }),
    newsletterOptIn: boolean("newsletter_opt_in").default(false),

    // Internal Notes
    internNotizen: text("intern_notizen"),
    tags: jsonb("tags").$type<string[]>(),

    // Assignment
    zustaendigerMitarbeiter: uuid("zustaendiger_mitarbeiter").references(() => users.id),

    // Blacklist Information
    blacklistGrund: text("blacklist_grund"),
    blacklistDatum: date("blacklist_datum"),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("subcontractors_org_idx").on(table.organizationId),
    statusIdx: index("subcontractors_status_idx").on(table.status),
    hauptgewerkIdx: index("subcontractors_hauptgewerk_idx").on(table.hauptgewerk),
    emailIdx: index("subcontractors_email_idx").on(table.email),
    bewertungIdx: index("subcontractors_bewertung_idx").on(table.bewertungDurchschnitt),
  })
);

// =============================================================================
// SUBCONTRACTOR DOCUMENTS
// =============================================================================

export const subcontractorDocuments = pgTable(
  "subcontractor_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subcontractorId: uuid("subcontractor_id")
      .notNull()
      .references(() => subcontractors.id, { onDelete: "cascade" }),

    dokumentTyp: varchar("dokument_typ", { length: 100 }).notNull(),
    // handelsregisterauszug, gewerbeanmeldung, meisterbrief,
    // versicherungsnachweis, soka_unbedenklichkeit, referenzen, etc.
    titel: varchar("titel", { length: 255 }).notNull(),
    beschreibung: text("beschreibung"),

    dateiName: varchar("datei_name", { length: 255 }).notNull(),
    dateiUrl: text("datei_url").notNull(),
    dateiGroesse: integer("datei_groesse"),
    mimeType: varchar("mime_type", { length: 100 }),

    gueltigAb: date("gueltig_ab"),
    gueltigBis: date("gueltig_bis"),

    geprueft: boolean("geprueft").default(false),
    geprueftAm: timestamp("geprueft_am", { mode: "date" }),
    geprueftVon: uuid("geprueft_von").references(() => users.id),

    erinnerungVorAblauf: integer("erinnerung_vor_ablauf"), // Tage

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    subcontractorIdx: index("sub_docs_subcontractor_idx").on(table.subcontractorId),
    typIdx: index("sub_docs_typ_idx").on(table.dokumentTyp),
    gueltigBisIdx: index("sub_docs_gueltig_bis_idx").on(table.gueltigBis),
  })
);

// =============================================================================
// SUBCONTRACTOR RATINGS/REVIEWS
// =============================================================================

export const subcontractorRatings = pgTable(
  "subcontractor_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subcontractorId: uuid("subcontractor_id")
      .notNull()
      .references(() => subcontractors.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),

    // Individual Ratings (1-5)
    qualitaet: integer("qualitaet").notNull(),
    termintreue: integer("termintreue").notNull(),
    kommunikation: integer("kommunikation").notNull(),
    preisLeistung: integer("preis_leistung").notNull(),
    sauberkeit: integer("sauberkeit"),
    zuverlaessigkeit: integer("zuverlaessigkeit"),

    // Overall Rating (calculated)
    gesamtbewertung: decimal("gesamtbewertung", { precision: 3, scale: 2 }).notNull(),

    // Details
    kommentar: text("kommentar"),
    positiv: text("positiv"),
    negativ: text("negativ"),
    empfehlung: boolean("empfehlung"),

    // Visibility
    intern: boolean("intern").default(true), // Only visible internally
    veroeffentlicht: boolean("veroeffentlicht").default(false),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
  },
  (table) => ({
    subcontractorIdx: index("sub_ratings_subcontractor_idx").on(table.subcontractorId),
    projectIdx: index("sub_ratings_project_idx").on(table.projectId),
  })
);

// =============================================================================
// PROJECT SUBCONTRACTOR ASSIGNMENTS
// =============================================================================

export const projectSubcontractors = pgTable(
  "project_subcontractors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    subcontractorId: uuid("subcontractor_id")
      .notNull()
      .references(() => subcontractors.id, { onDelete: "cascade" }),

    gewerk: gewerkeEnum("gewerk").notNull(),
    leistungsbeschreibung: text("leistungsbeschreibung"),

    // Contract Details
    auftragsart: varchar("auftragsart", { length: 50 }), // pauschal, nach_aufwand, einheitspreis
    auftragssummeNetto: decimal("auftragssumme_netto", { precision: 14, scale: 2 }),
    auftragssummeBrutto: decimal("auftragssumme_brutto", { precision: 14, scale: 2 }),

    // Timeline
    geplantStart: date("geplant_start"),
    geplantEnde: date("geplant_ende"),
    tatsaechlichStart: date("tatsaechlich_start"),
    tatsaechlichEnde: date("tatsaechlich_ende"),

    // Status
    status: varchar("status", { length: 50 }).default("beauftragt"),
    // beauftragt, in_arbeit, unterbrochen, abgeschlossen, storniert

    // Completion
    fertigstellungsgrad: integer("fertigstellungsgrad").default(0),
    abnahmeErfolgt: boolean("abnahme_erfolgt").default(false),
    abnahmeDatum: date("abnahme_datum"),
    maengel: jsonb("maengel").$type<Array<{
      beschreibung: string;
      status: string;
      gemeldetAm: string;
      behobenenAm?: string;
    }>>(),

    // Payments
    gezahlteSumme: decimal("gezahlte_summe", { precision: 14, scale: 2 }).default("0"),
    offeneSumme: decimal("offene_summe", { precision: 14, scale: 2 }),

    // Documents
    vertragUrl: text("vertrag_url"),
    leistungsverzeichnisUrl: text("leistungsverzeichnis_url"),

    notizen: text("notizen"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    projectIdx: index("project_subs_project_idx").on(table.projectId),
    subcontractorIdx: index("project_subs_subcontractor_idx").on(table.subcontractorId),
    gewerkIdx: index("project_subs_gewerk_idx").on(table.gewerk),
    statusIdx: index("project_subs_status_idx").on(table.status),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const subcontractorsRelations = relations(subcontractors, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subcontractors.organizationId],
    references: [organizations.id],
  }),
  zustaendigerMitarbeiterUser: one(users, {
    fields: [subcontractors.zustaendigerMitarbeiter],
    references: [users.id],
  }),
  documents: many(subcontractorDocuments),
  ratings: many(subcontractorRatings),
  projectAssignments: many(projectSubcontractors),
}));

export const subcontractorDocumentsRelations = relations(subcontractorDocuments, ({ one }) => ({
  subcontractor: one(subcontractors, {
    fields: [subcontractorDocuments.subcontractorId],
    references: [subcontractors.id],
  }),
  geprueftVonUser: one(users, {
    fields: [subcontractorDocuments.geprueftVon],
    references: [users.id],
  }),
}));

export const subcontractorRatingsRelations = relations(subcontractorRatings, ({ one }) => ({
  subcontractor: one(subcontractors, {
    fields: [subcontractorRatings.subcontractorId],
    references: [subcontractors.id],
  }),
  project: one(projects, {
    fields: [subcontractorRatings.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [subcontractorRatings.createdBy],
    references: [users.id],
  }),
}));

export const projectSubcontractorsRelations = relations(projectSubcontractors, ({ one }) => ({
  project: one(projects, {
    fields: [projectSubcontractors.projectId],
    references: [projects.id],
  }),
  subcontractor: one(subcontractors, {
    fields: [projectSubcontractors.subcontractorId],
    references: [subcontractors.id],
  }),
}));
