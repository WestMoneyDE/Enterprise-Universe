import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  subsidiaryEnum,
  contactTypeEnum,
  consentStatusEnum,
  emailStatusEnum,
} from "./enums";
import { organizations, users } from "./auth";

// =============================================================================
// CONTACTS
// =============================================================================

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Identity
    email: varchar("email", { length: 255 }).notNull(),
    emailHash: varchar("email_hash", { length: 64 }), // SHA-256 for deduplication

    // Personal
    salutation: varchar("salutation", { length: 20 }), // Herr, Frau, etc.
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    phone: varchar("phone", { length: 50 }),
    mobile: varchar("mobile", { length: 50 }),
    whatsappNumber: varchar("whatsapp_number", { length: 50 }),

    // Company
    company: varchar("company", { length: 255 }),
    position: varchar("position", { length: 100 }),
    website: varchar("website", { length: 255 }),
    linkedinUrl: varchar("linkedin_url", { length: 255 }),

    // Address
    street: varchar("street", { length: 255 }),
    streetNumber: varchar("street_number", { length: 20 }),
    city: varchar("city", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 2 }).default("DE"),

    // Classification
    type: contactTypeEnum("type").default("lead"),
    subsidiary: subsidiaryEnum("subsidiary"),
    source: varchar("source", { length: 100 }), // Website, HubSpot, Import, etc.
    sourceDetail: varchar("source_detail", { length: 255 }), // Campaign name, form name, etc.
    tags: text("tags").array(),

    // Lead Scoring
    leadScore: integer("lead_score").default(0),
    leadScoreUpdatedAt: timestamp("lead_score_updated_at"),

    // GDPR Consent
    consentStatus: consentStatusEnum("consent_status").default("pending"),
    consentDate: timestamp("consent_date"),
    consentSource: varchar("consent_source", { length: 100 }),
    consentIp: varchar("consent_ip", { length: 45 }),
    consentText: text("consent_text"),
    doubleOptInSentAt: timestamp("double_opt_in_sent_at"),
    doubleOptInConfirmedAt: timestamp("double_opt_in_confirmed_at"),

    // Email Status
    emailStatus: emailStatusEnum("email_status").default("active"),
    bounceType: varchar("bounce_type", { length: 20 }), // hard, soft
    bounceReason: text("bounce_reason"),
    unsubscribedAt: timestamp("unsubscribed_at"),
    unsubscribeReason: text("unsubscribe_reason"),

    // Engagement Metrics
    engagementScore: integer("engagement_score").default(0),
    emailsSent: integer("emails_sent").default(0),
    emailsOpened: integer("emails_opened").default(0),
    emailsClicked: integer("emails_clicked").default(0),
    lastEmailSent: timestamp("last_email_sent"),
    lastEmailOpened: timestamp("last_email_opened"),
    lastEmailClicked: timestamp("last_email_clicked"),
    lastEngagementAt: timestamp("last_engagement_at"),

    // External IDs
    hubspotContactId: varchar("hubspot_contact_id", { length: 50 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),

    // Assignment
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Custom Fields (flexible JSON for additional data)
    customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

    // Notes
    notes: text("notes"),

    // Lifecycle
    lifecycleStage: varchar("lifecycle_stage", { length: 50 }),
    convertedAt: timestamp("converted_at"),
    convertedFromId: uuid("converted_from_id"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("contacts_email_idx").on(table.email),
    emailHashIdx: index("contacts_email_hash_idx").on(table.emailHash),
    orgIdx: index("contacts_org_idx").on(table.organizationId),
    ownerIdx: index("contacts_owner_idx").on(table.ownerId),
    typeIdx: index("contacts_type_idx").on(table.type),
    subsidiaryIdx: index("contacts_subsidiary_idx").on(table.subsidiary),
    hubspotIdx: index("contacts_hubspot_idx").on(table.hubspotContactId),
    consentIdx: index("contacts_consent_idx").on(table.consentStatus),
    emailStatusIdx: index("contacts_email_status_idx").on(table.emailStatus),
    createdAtIdx: index("contacts_created_at_idx").on(table.createdAt),
    // Full-text search index (to be created via migration)
  })
);

// =============================================================================
// CONTACT LISTS (Segments)
// =============================================================================

export const contactLists = pgTable("contact_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).default("static"), // static, dynamic

  // Dynamic list filter
  filterCriteria: jsonb("filter_criteria").$type<{
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    logic: "and" | "or";
  }>(),

  // Stats
  contactCount: integer("contact_count").default(0),
  lastSyncedAt: timestamp("last_synced_at"),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// CONTACT LIST MEMBERS (for static lists)
// =============================================================================

export const contactListMembers = pgTable(
  "contact_list_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => contactLists.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
    addedBy: uuid("added_by").references(() => users.id),
  },
  (table) => ({
    listContactIdx: index("list_contact_idx").on(table.listId, table.contactId),
  })
);

// =============================================================================
// CONTACT ACTIVITIES
// =============================================================================

export const contactActivities = pgTable(
  "contact_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Activity Details
    type: varchar("type", { length: 50 }).notNull(), // email_sent, email_opened, page_view, form_submit, call, meeting, note
    title: varchar("title", { length: 255 }),
    description: text("description"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Association
    associatedEntityType: varchar("associated_entity_type", { length: 50 }), // deal, project, campaign
    associatedEntityId: uuid("associated_entity_id"),

    // User
    performedBy: uuid("performed_by").references(() => users.id),

    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => ({
    contactIdx: index("activities_contact_idx").on(table.contactId),
    typeIdx: index("activities_type_idx").on(table.type),
    occurredAtIdx: index("activities_occurred_at_idx").on(table.occurredAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [contacts.ownerId],
    references: [users.id],
  }),
  activities: many(contactActivities),
  listMemberships: many(contactListMembers),
}));

export const contactListsRelations = relations(contactLists, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contactLists.organizationId],
    references: [organizations.id],
  }),
  members: many(contactListMembers),
  createdByUser: one(users, {
    fields: [contactLists.createdBy],
    references: [users.id],
  }),
}));

export const contactListMembersRelations = relations(
  contactListMembers,
  ({ one }) => ({
    list: one(contactLists, {
      fields: [contactListMembers.listId],
      references: [contactLists.id],
    }),
    contact: one(contacts, {
      fields: [contactListMembers.contactId],
      references: [contacts.id],
    }),
  })
);

export const contactActivitiesRelations = relations(
  contactActivities,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [contactActivities.contactId],
      references: [contacts.id],
    }),
    organization: one(organizations, {
      fields: [contactActivities.organizationId],
      references: [organizations.id],
    }),
    performer: one(users, {
      fields: [contactActivities.performedBy],
      references: [users.id],
    }),
  })
);
