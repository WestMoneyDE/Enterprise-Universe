import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// =============================================================================
// DEAL CONTACTS - Korrekte E-Mail-Adressen für HubSpot Deals
// =============================================================================

/**
 * Deal Contacts Tabelle
 *
 * Speichert verifizierte E-Mail-Adressen für HubSpot Deals,
 * um Spam-Kontakte zu umgehen und korrekte Won-Deal E-Mails zu versenden.
 */
export const dealContacts = pgTable(
  "deal_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // HubSpot Deal Reference
    hubspotDealId: varchar("hubspot_deal_id", { length: 50 }).notNull(),
    dealName: varchar("deal_name", { length: 255 }),
    dealValue: decimal("deal_value", { precision: 15, scale: 2 }),

    // Kontakt-Informationen
    contactEmail: varchar("contact_email", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    contactCompany: varchar("contact_company", { length: 255 }),

    // Status & Tracking
    emailVerified: boolean("email_verified").default(false),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailSentCount: integer("email_sent_count").default(0),
    lastSendStatus: varchar("last_send_status", { length: 50 }), // 'sent', 'failed', 'bounced'
    lastSendError: text("last_send_error"),

    // Quelle der E-Mail
    source: varchar("source", { length: 50 }).default("manual"), // 'manual', 'import', 'hubspot_override'
    notes: text("notes"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    hubspotIdIdx: index("idx_deal_contacts_hubspot_id").on(table.hubspotDealId),
    emailIdx: index("idx_deal_contacts_email").on(table.contactEmail),
    statusIdx: index("idx_deal_contacts_status").on(table.lastSendStatus),
    createdIdx: index("idx_deal_contacts_created").on(table.createdAt),
  })
);

// Type exports
export type DealContact = typeof dealContacts.$inferSelect;
export type NewDealContact = typeof dealContacts.$inferInsert;
