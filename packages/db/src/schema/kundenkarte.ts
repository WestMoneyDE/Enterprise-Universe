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
import { kundenkarteStatusEnum, kundenkarteTierEnum, subsidiaryEnum } from "./enums";
import { organizations, users } from "./auth";
import { contacts } from "./contacts";
import { projects } from "./projects";

// =============================================================================
// KUNDENKARTE (CUSTOMER CARD)
// =============================================================================

/**
 * Kundenkarte - Comprehensive Customer Profile for West Money Bau
 *
 * This is the central customer data card containing all relevant information
 * for construction projects, including personal data, property details,
 * financial information, and preferences.
 */
export const kundenkarten = pgTable(
  "kundenkarten",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Customer Reference
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    kundenNummer: varchar("kunden_nummer", { length: 50 }).notNull(),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // Bauherren-Pass Link
    bauherrenPassId: uuid("bauherren_pass_id"), // FK constraint added via migration, not import (avoids circular dependency)

    // Loyalty Card Fields
    cardNumber: varchar("card_number", { length: 50 }).unique(),
    qrCodeData: text("qr_code_data"),
    tier: kundenkarteTierEnum("tier").default("bronze"),
    points: integer("points").default(0),
    pointsHistory: jsonb("points_history").$type<Array<{
      date: string;
      points: number;
      type: "earned" | "redeemed" | "adjusted" | "expired";
      description: string;
      balanceAfter: number;
      referenceId?: string;
    }>>(),

    // Status & Workflow
    status: kundenkarteStatusEnum("status").default("draft").notNull(),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    approvedBy: uuid("approved_by").references(() => users.id),

    // Personal Data (Persönliche Daten)
    anrede: varchar("anrede", { length: 20 }), // Herr, Frau, Divers
    titel: varchar("titel", { length: 50 }), // Dr., Prof., etc.
    vorname: varchar("vorname", { length: 100 }).notNull(),
    nachname: varchar("nachname", { length: 100 }).notNull(),
    geburtsdatum: date("geburtsdatum"),
    geburtsort: varchar("geburtsort", { length: 100 }),
    staatsangehoerigkeit: varchar("staatsangehoerigkeit", { length: 100 }),
    familienstand: varchar("familienstand", { length: 50 }),

    // Contact Information
    email: varchar("email", { length: 255 }).notNull(),
    emailSecondary: varchar("email_secondary", { length: 255 }),
    telefon: varchar("telefon", { length: 50 }),
    telefonMobil: varchar("telefon_mobil", { length: 50 }),
    telefonGeschaeftlich: varchar("telefon_geschaeftlich", { length: 50 }),

    // Current Address (Aktuelle Anschrift)
    strasseHausnummer: varchar("strasse_hausnummer", { length: 255 }),
    plz: varchar("plz", { length: 10 }),
    ort: varchar("ort", { length: 100 }),
    land: varchar("land", { length: 100 }).default("Deutschland"),

    // Employment & Income (Beruf & Einkommen)
    beruf: varchar("beruf", { length: 100 }),
    arbeitgeber: varchar("arbeitgeber", { length: 200 }),
    arbeitgeberAdresse: text("arbeitgeber_adresse"),
    beschaeftigtSeit: date("beschaeftigt_seit"),
    bruttoEinkommen: decimal("brutto_einkommen", { precision: 12, scale: 2 }),
    nettoEinkommen: decimal("netto_einkommen", { precision: 12, scale: 2 }),
    sonstigeEinkuenfte: decimal("sonstige_einkuenfte", { precision: 12, scale: 2 }),
    selbststaendig: boolean("selbststaendig").default(false),

    // Partner Data (Partner-Daten)
    partnerVorname: varchar("partner_vorname", { length: 100 }),
    partnerNachname: varchar("partner_nachname", { length: 100 }),
    partnerGeburtsdatum: date("partner_geburtsdatum"),
    partnerBeruf: varchar("partner_beruf", { length: 100 }),
    partnerEinkommen: decimal("partner_einkommen", { precision: 12, scale: 2 }),

    // Children (Kinder)
    anzahlKinder: integer("anzahl_kinder").default(0),
    kinderDetails: jsonb("kinder_details").$type<Array<{
      name: string;
      geburtsdatum: string;
      unterhaltspflichtig: boolean;
    }>>(),

    // Property Information (Grundstücksinformationen)
    grundstueckVorhanden: boolean("grundstueck_vorhanden").default(false),
    grundstueckAdresse: text("grundstueck_adresse"),
    grundstueckGroesse: decimal("grundstueck_groesse", { precision: 10, scale: 2 }), // m²
    grundstueckKaufpreis: decimal("grundstueck_kaufpreis", { precision: 12, scale: 2 }),
    grundstueckKaufDatum: date("grundstueck_kauf_datum"),
    grundbuchEintrag: varchar("grundbuch_eintrag", { length: 255 }),

    // Building Project (Bauvorhaben)
    bauvorhabenTyp: varchar("bauvorhaben_typ", { length: 100 }), // Neubau, Anbau, Umbau, Sanierung
    hausTyp: varchar("haus_typ", { length: 100 }), // EFH, DHH, RH, MFH
    wohnflaeche: decimal("wohnflaeche", { precision: 10, scale: 2 }), // m²
    nutzflaeche: decimal("nutzflaeche", { precision: 10, scale: 2 }), // m²
    anzahlZimmer: integer("anzahl_zimmer"),
    anzahlBaeder: integer("anzahl_baeder"),
    anzahlEtagen: integer("anzahl_etagen"),
    kellerGeplant: boolean("keller_geplant").default(false),
    garageCarport: varchar("garage_carport", { length: 100 }),

    // Financial Overview (Finanzübersicht)
    eigenkapital: decimal("eigenkapital", { precision: 12, scale: 2 }),
    gesamtbudget: decimal("gesamtbudget", { precision: 12, scale: 2 }),
    finanzierungsbedarf: decimal("finanzierungsbedarf", { precision: 12, scale: 2 }),
    finanzierungGesichert: boolean("finanzierung_gesichert").default(false),
    finanzierungspartner: varchar("finanzierungspartner", { length: 200 }),
    kfwFoerderung: boolean("kfw_foerderung").default(false),
    kfwProgramm: varchar("kfw_programm", { length: 100 }),

    // Existing Obligations (Bestehende Verpflichtungen)
    bestehendeKredite: decimal("bestehende_kredite", { precision: 12, scale: 2 }),
    monatlicheRaten: decimal("monatliche_raten", { precision: 10, scale: 2 }),
    mietbelastung: decimal("mietbelastung", { precision: 10, scale: 2 }),
    unterhaltspflichten: decimal("unterhaltspflichten", { precision: 10, scale: 2 }),

    // Smart Home Preferences
    smartHomeInteresse: boolean("smart_home_interesse").default(false),
    smartHomeFeatures: jsonb("smart_home_features").$type<{
      lighting?: boolean;
      heating?: boolean;
      security?: boolean;
      shading?: boolean;
      audio?: boolean;
      energyManagement?: boolean;
      budget?: number;
    }>(),

    // Energy & Sustainability
    energiestandard: varchar("energiestandard", { length: 50 }), // KfW 40, 55, 70, etc.
    heizungsart: varchar("heizungsart", { length: 100 }), // Wärmepumpe, Gas, Öl, etc.
    photovoltaik: boolean("photovoltaik").default(false),
    photovoltaikKwp: decimal("photovoltaik_kwp", { precision: 6, scale: 2 }),
    wallbox: boolean("wallbox").default(false),

    // Documents & Verification
    ausweisGeprueft: boolean("ausweis_geprueft").default(false),
    einkommensnachweisGeprueft: boolean("einkommensnachweis_geprueft").default(false),
    schufa: jsonb("schufa").$type<{
      checked: boolean;
      score?: number;
      checkedAt?: string;
      result?: string;
    }>(),

    // Communication Preferences
    bevorzugteKontaktart: varchar("bevorzugte_kontaktart", { length: 50 }),
    besteErreichbarkeit: varchar("beste_erreichbarkeit", { length: 100 }),
    newsletterOptIn: boolean("newsletter_opt_in").default(false),
    whatsappOptIn: boolean("whatsapp_opt_in").default(false),

    // Internal Notes
    internalNotes: text("internal_notes"),
    tags: jsonb("tags").$type<string[]>(),

    // Source & Attribution
    leadSource: varchar("lead_source", { length: 100 }),
    referredBy: uuid("referred_by").references(() => contacts.id),
    assignedTo: uuid("assigned_to").references(() => users.id),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("kundenkarten_org_idx").on(table.organizationId),
    kundenNummerIdx: index("kundenkarten_kunden_nummer_idx").on(table.kundenNummer),
    contactIdx: index("kundenkarten_contact_idx").on(table.contactId),
    statusIdx: index("kundenkarten_status_idx").on(table.status),
    assignedToIdx: index("kundenkarten_assigned_to_idx").on(table.assignedTo),
    emailIdx: index("kundenkarten_email_idx").on(table.email),
    bauherrenPassIdx: index("kundenkarten_bauherren_pass_idx").on(table.bauherrenPassId),
    cardNumberIdx: index("kundenkarten_card_number_idx").on(table.cardNumber),
    tierIdx: index("kundenkarten_tier_idx").on(table.tier),
  })
);

// =============================================================================
// KUNDENKARTE DOCUMENTS
// =============================================================================

export const kundenkarteDocuments = pgTable(
  "kundenkarte_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kundenkarteId: uuid("kundenkarte_id")
      .notNull()
      .references(() => kundenkarten.id, { onDelete: "cascade" }),

    documentType: varchar("document_type", { length: 100 }).notNull(), // Ausweis, Einkommensnachweis, etc.
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),

    verified: boolean("verified").default(false),
    verifiedAt: timestamp("verified_at", { mode: "date" }),
    verifiedBy: uuid("verified_by").references(() => users.id),

    expiresAt: date("expires_at"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    kundenkarteIdx: index("kundenkarte_docs_kundenkarte_idx").on(table.kundenkarteId),
    typeIdx: index("kundenkarte_docs_type_idx").on(table.documentType),
  })
);

// =============================================================================
// KUNDENKARTE NOTES/ACTIVITIES
// =============================================================================

export const kundenkarteActivities = pgTable(
  "kundenkarte_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kundenkarteId: uuid("kundenkarte_id")
      .notNull()
      .references(() => kundenkarten.id, { onDelete: "cascade" }),

    activityType: varchar("activity_type", { length: 50 }).notNull(), // note, call, email, meeting, status_change
    title: varchar("title", { length: 255 }),
    description: text("description"),

    // For status changes
    previousStatus: kundenkarteStatusEnum("previous_status"),
    newStatus: kundenkarteStatusEnum("new_status"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    kundenkarteIdx: index("kundenkarte_activities_kundenkarte_idx").on(table.kundenkarteId),
    typeIdx: index("kundenkarte_activities_type_idx").on(table.activityType),
    createdAtIdx: index("kundenkarte_activities_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const kundenkartenRelations = relations(kundenkarten, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [kundenkarten.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [kundenkarten.contactId],
    references: [contacts.id],
  }),
  // Note: bauherrenPass relation removed to avoid circular dependency with bauherrenPass.ts
  // The link is maintained via bauherrenPassId FK field
  approvedByUser: one(users, {
    fields: [kundenkarten.approvedBy],
    references: [users.id],
    relationName: "approvedBy",
  }),
  assignedToUser: one(users, {
    fields: [kundenkarten.assignedTo],
    references: [users.id],
    relationName: "assignedTo",
  }),
  referredByContact: one(contacts, {
    fields: [kundenkarten.referredBy],
    references: [contacts.id],
    relationName: "referredBy",
  }),
  documents: many(kundenkarteDocuments),
  activities: many(kundenkarteActivities),
}));

export const kundenkarteDocumentsRelations = relations(kundenkarteDocuments, ({ one }) => ({
  kundenkarte: one(kundenkarten, {
    fields: [kundenkarteDocuments.kundenkarteId],
    references: [kundenkarten.id],
  }),
  verifiedByUser: one(users, {
    fields: [kundenkarteDocuments.verifiedBy],
    references: [users.id],
  }),
}));

export const kundenkarteActivitiesRelations = relations(kundenkarteActivities, ({ one }) => ({
  kundenkarte: one(kundenkarten, {
    fields: [kundenkarteActivities.kundenkarteId],
    references: [kundenkarten.id],
  }),
  createdByUser: one(users, {
    fields: [kundenkarteActivities.createdBy],
    references: [users.id],
  }),
}));
