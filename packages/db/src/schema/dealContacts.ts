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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contacts } from "./contacts";
import { deals } from "./deals";
import { organizations, users } from "./auth";

// =============================================================================
// ENUMS
// =============================================================================

export const contactRoleEnum = pgEnum("contact_role", [
  "primary",
  "decision_maker",
  "influencer",
  "billing",
  "technical",
  "other",
]);

// =============================================================================
// DEAL CONTACTS - Full Revenue Attribution
// =============================================================================

/**
 * Deal Contacts with Revenue Attribution
 *
 * Links contacts to deals with full attribution tracking:
 * - Role in the deal (primary, decision_maker, etc.)
 * - Revenue share percentage
 * - Commission attribution
 * - Source/campaign tracking
 * - Engagement metrics per deal
 */
export const dealContacts = pgTable(
  "deal_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization (for multi-tenancy)
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),

    // Deal Reference (local or HubSpot)
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    hubspotDealId: varchar("hubspot_deal_id", { length: 50 }),
    dealName: varchar("deal_name", { length: 255 }),
    dealValue: decimal("deal_value", { precision: 15, scale: 2 }),

    // Contact Reference (local or by email)
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    contactEmail: varchar("contact_email", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    contactCompany: varchar("contact_company", { length: 255 }),

    // =========================================================================
    // ROLE & ATTRIBUTION
    // =========================================================================

    // Contact role on this deal
    role: contactRoleEnum("role").default("other"),
    isPrimary: boolean("is_primary").default(false),

    // Revenue Attribution (percentage of deal value attributed to this contact)
    revenueShare: decimal("revenue_share", { precision: 5, scale: 4 }).default(
      "1.0000"
    ), // 0.0000 to 1.0000
    attributedRevenue: decimal("attributed_revenue", {
      precision: 15,
      scale: 2,
    }),

    // Commission Attribution (share of commission for this contact)
    commissionShare: decimal("commission_share", {
      precision: 5,
      scale: 4,
    }).default("1.0000"),
    attributedCommission: decimal("attributed_commission", {
      precision: 15,
      scale: 2,
    }),

    // =========================================================================
    // SOURCE TRACKING
    // =========================================================================

    // How this contact was associated with the deal
    source: varchar("source", { length: 100 }).default("manual"),
    // Examples: manual, hubspot_import, web_form, referral, campaign
    sourceDetail: varchar("source_detail", { length: 255 }),

    // Campaign attribution
    campaign: varchar("campaign", { length: 255 }),
    campaignId: varchar("campaign_id", { length: 100 }),

    // Touch tracking
    firstTouchAt: timestamp("first_touch_at", { withTimezone: true }),
    lastTouchAt: timestamp("last_touch_at", { withTimezone: true }),
    touchpoints: integer("touchpoints").default(0),

    // Engagement on this specific deal
    engagementScore: integer("engagement_score").default(0),

    // =========================================================================
    // EMAIL TRACKING (Legacy fields maintained)
    // =========================================================================

    emailVerified: boolean("email_verified").default(false),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailSentCount: integer("email_sent_count").default(0),
    lastSendStatus: varchar("last_send_status", { length: 50 }),
    lastSendError: text("last_send_error"),

    // =========================================================================
    // METADATA
    // =========================================================================

    notes: text("notes"),

    // Who added this contact to the deal
    addedBy: uuid("added_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Indexes
    dealIdIdx: index("idx_deal_contacts_deal_id").on(table.dealId),
    hubspotIdIdx: index("idx_deal_contacts_hubspot_id").on(table.hubspotDealId),
    contactIdIdx: index("idx_deal_contacts_contact_id").on(table.contactId),
    emailIdx: index("idx_deal_contacts_email").on(table.contactEmail),
    roleIdx: index("idx_deal_contacts_role").on(table.role),
    isPrimaryIdx: index("idx_deal_contacts_is_primary").on(table.isPrimary),
    sourceIdx: index("idx_deal_contacts_source").on(table.source),
    campaignIdx: index("idx_deal_contacts_campaign").on(table.campaign),
    statusIdx: index("idx_deal_contacts_status").on(table.lastSendStatus),
    createdIdx: index("idx_deal_contacts_created").on(table.createdAt),
    orgIdx: index("idx_deal_contacts_org").on(table.organizationId),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const dealContactsRelations = relations(dealContacts, ({ one }) => ({
  deal: one(deals, {
    fields: [dealContacts.dealId],
    references: [deals.id],
  }),
  contact: one(contacts, {
    fields: [dealContacts.contactId],
    references: [contacts.id],
  }),
  organization: one(organizations, {
    fields: [dealContacts.organizationId],
    references: [organizations.id],
  }),
  addedByUser: one(users, {
    fields: [dealContacts.addedBy],
    references: [users.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type DealContact = typeof dealContacts.$inferSelect;
export type NewDealContact = typeof dealContacts.$inferInsert;
export type ContactRole =
  | "primary"
  | "decision_maker"
  | "influencer"
  | "billing"
  | "technical"
  | "other";
