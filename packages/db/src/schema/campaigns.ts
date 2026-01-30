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
import { relations } from "drizzle-orm";
import { subsidiaryEnum, campaignStatusEnum, campaignTypeEnum } from "./enums";
import { organizations, users } from "./auth";
import { contacts } from "./contacts";

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),

  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }),
  category: varchar("category", { length: 50 }),
  subsidiary: subsidiaryEnum("subsidiary"),

  // Content
  subject: varchar("subject", { length: 255 }),
  preheader: varchar("preheader", { length: 255 }),
  htmlContent: text("html_content"),
  textContent: text("text_content"),

  // Design
  designJson: jsonb("design_json"), // For drag-drop editor state

  // Variables
  variables: text("variables").array(), // List of {{variable}} names

  // Preview
  thumbnailUrl: text("thumbnail_url"),

  // Status
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false), // System templates can't be deleted

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// CAMPAIGNS
// =============================================================================

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Basic Info
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: campaignTypeEnum("type").default("one_time"),
    status: campaignStatusEnum("status").default("draft"),

    // Audience
    audienceType: varchar("audience_type", { length: 50 }), // all, segment, list
    audienceListId: uuid("audience_list_id"),
    audienceFilters: jsonb("audience_filters").$type<{
      conditions: Array<{
        field: string;
        operator: string;
        value: unknown;
      }>;
      logic: "and" | "or";
    }>(),
    audienceSize: integer("audience_size"),

    // Sender
    fromName: varchar("from_name", { length: 100 }),
    fromEmail: varchar("from_email", { length: 255 }),
    replyTo: varchar("reply_to", { length: 255 }),

    // A/B Testing
    isAbTest: boolean("is_ab_test").default(false),
    abTestConfig: jsonb("ab_test_config").$type<{
      splitPercentage?: number;
      winnerCriteria?: "opens" | "clicks";
      testDuration?: number; // hours
    }>(),

    // Settings
    trackOpens: boolean("track_opens").default(true),
    trackClicks: boolean("track_clicks").default(true),
    settings: jsonb("settings").$type<{
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      unsubscribeGroupId?: string;
    }>(),

    // Metrics
    emailsQueued: integer("emails_queued").default(0),
    emailsSent: integer("emails_sent").default(0),
    emailsDelivered: integer("emails_delivered").default(0),
    emailsOpened: integer("emails_opened").default(0),
    uniqueOpens: integer("unique_opens").default(0),
    emailsClicked: integer("emails_clicked").default(0),
    uniqueClicks: integer("unique_clicks").default(0),
    emailsBounced: integer("emails_bounced").default(0),
    emailsComplained: integer("emails_complained").default(0),
    emailsUnsubscribed: integer("emails_unsubscribed").default(0),

    // Rates (calculated)
    openRate: integer("open_rate").default(0), // percentage * 100
    clickRate: integer("click_rate").default(0),
    bounceRate: integer("bounce_rate").default(0),

    // Timestamps
    scheduledAt: timestamp("scheduled_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),

    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("campaigns_org_idx").on(table.organizationId),
    statusIdx: index("campaigns_status_idx").on(table.status),
    typeIdx: index("campaigns_type_idx").on(table.type),
    scheduledIdx: index("campaigns_scheduled_idx").on(table.scheduledAt),
  })
);

// =============================================================================
// CAMPAIGN EMAILS (Steps in a sequence)
// =============================================================================

export const campaignEmails = pgTable("campaign_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => emailTemplates.id),

  // Position
  order: integer("order").default(0),
  name: varchar("name", { length: 255 }),

  // Content (can override template)
  subject: varchar("subject", { length: 255 }).notNull(),
  preheader: varchar("preheader", { length: 255 }),
  htmlContent: text("html_content"),
  textContent: text("text_content"),

  // For Sequences
  delayValue: integer("delay_value"),
  delayUnit: varchar("delay_unit", { length: 20 }), // minutes, hours, days

  // Conditions
  sendConditions: jsonb("send_conditions").$type<{
    onlyIf?: Array<{ field: string; operator: string; value: unknown }>;
  }>(),
  skipConditions: jsonb("skip_conditions").$type<{
    skipIf?: Array<{ field: string; operator: string; value: unknown }>;
  }>(),

  // A/B Variant
  isVariant: boolean("is_variant").default(false),
  variantName: varchar("variant_name", { length: 50 }), // A, B, etc.

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// CAMPAIGN RECIPIENTS
// =============================================================================

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    campaignEmailId: uuid("campaign_email_id").references(
      () => campaignEmails.id
    ),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    // Email sent to
    email: varchar("email", { length: 255 }).notNull(),

    // Status
    status: varchar("status", { length: 20 }).default("pending"), // pending, sent, delivered, opened, clicked, bounced, failed
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
    bouncedAt: timestamp("bounced_at"),
    failedAt: timestamp("failed_at"),

    // Error
    errorMessage: text("error_message"),

    // Tracking
    messageId: varchar("message_id", { length: 255 }), // SES Message ID
    openCount: integer("open_count").default(0),
    clickCount: integer("click_count").default(0),

    // Variant (for A/B testing)
    variant: varchar("variant", { length: 50 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    campaignIdx: index("recipients_campaign_idx").on(table.campaignId),
    contactIdx: index("recipients_contact_idx").on(table.contactId),
    statusIdx: index("recipients_status_idx").on(table.status),
    messageIdIdx: index("recipients_message_id_idx").on(table.messageId),
  })
);

// =============================================================================
// EMAIL EVENTS
// =============================================================================

export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // References
    organizationId: uuid("organization_id").references(() => organizations.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    campaignEmailId: uuid("campaign_email_id").references(
      () => campaignEmails.id
    ),
    recipientId: uuid("recipient_id").references(() => campaignRecipients.id),

    // Message
    messageId: varchar("message_id", { length: 255 }),
    provider: varchar("provider", { length: 50 }), // ses, resend, sendgrid

    // Event
    eventType: varchar("event_type", { length: 50 }).notNull(), // send, delivery, open, click, bounce, complaint, reject
    eventData: jsonb("event_data").$type<Record<string, unknown>>(),

    // Tracking Context
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    deviceType: varchar("device_type", { length: 20 }), // desktop, mobile, tablet
    country: varchar("country", { length: 2 }),
    city: varchar("city", { length: 100 }),

    // Link Tracking
    linkUrl: text("link_url"),
    linkId: varchar("link_id", { length: 50 }),
    linkText: varchar("link_text", { length: 255 }),

    // Bounce Details
    bounceType: varchar("bounce_type", { length: 20 }), // hard, soft, undetermined
    bounceSubType: varchar("bounce_sub_type", { length: 50 }),

    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => ({
    messageIdIdx: index("events_message_id_idx").on(table.messageId),
    contactIdx: index("events_contact_idx").on(table.contactId),
    campaignIdx: index("events_campaign_idx").on(table.campaignId),
    eventTypeIdx: index("events_type_idx").on(table.eventType),
    occurredAtIdx: index("events_occurred_at_idx").on(table.occurredAt),
  })
);

// =============================================================================
// SUPPRESSION LIST
// =============================================================================

export const suppressionList = pgTable(
  "suppression_list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id),

    email: varchar("email", { length: 255 }).notNull(),
    emailHash: varchar("email_hash", { length: 64 }),

    reason: varchar("reason", { length: 50 }).notNull(), // bounce, complaint, unsubscribe, manual
    reasonDetail: text("reason_detail"),

    source: varchar("source", { length: 100 }), // campaign_id, manual, import

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("suppression_email_idx").on(table.email),
    emailHashIdx: index("suppression_email_hash_idx").on(table.emailHash),
    orgIdx: index("suppression_org_idx").on(table.organizationId),
  })
);

// =============================================================================
// UNSUBSCRIBE TOKENS
// =============================================================================

export const unsubscribeTokens = pgTable("unsubscribe_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id),

  token: varchar("token", { length: 100 }).notNull().unique(),

  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================

export const emailTemplatesRelations = relations(
  emailTemplates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [emailTemplates.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [emailTemplates.createdBy],
      references: [users.id],
    }),
    campaignEmails: many(campaignEmails),
  })
);

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  emails: many(campaignEmails),
  recipients: many(campaignRecipients),
  events: many(emailEvents),
}));

export const campaignEmailsRelations = relations(
  campaignEmails,
  ({ one, many }) => ({
    campaign: one(campaigns, {
      fields: [campaignEmails.campaignId],
      references: [campaigns.id],
    }),
    template: one(emailTemplates, {
      fields: [campaignEmails.templateId],
      references: [emailTemplates.id],
    }),
    recipients: many(campaignRecipients),
    events: many(emailEvents),
  })
);

export const campaignRecipientsRelations = relations(
  campaignRecipients,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignRecipients.campaignId],
      references: [campaigns.id],
    }),
    campaignEmail: one(campaignEmails, {
      fields: [campaignRecipients.campaignEmailId],
      references: [campaignEmails.id],
    }),
    contact: one(contacts, {
      fields: [campaignRecipients.contactId],
      references: [contacts.id],
    }),
  })
);

export const emailEventsRelations = relations(emailEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [emailEvents.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [emailEvents.contactId],
    references: [contacts.id],
  }),
  campaign: one(campaigns, {
    fields: [emailEvents.campaignId],
    references: [campaigns.id],
  }),
  campaignEmail: one(campaignEmails, {
    fields: [emailEvents.campaignEmailId],
    references: [campaignEmails.id],
  }),
  recipient: one(campaignRecipients, {
    fields: [emailEvents.recipientId],
    references: [campaignRecipients.id],
  }),
}));

export const suppressionListRelations = relations(suppressionList, ({ one }) => ({
  organization: one(organizations, {
    fields: [suppressionList.organizationId],
    references: [organizations.id],
  }),
}));

export const unsubscribeTokensRelations = relations(
  unsubscribeTokens,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [unsubscribeTokens.contactId],
      references: [contacts.id],
    }),
    campaign: one(campaigns, {
      fields: [unsubscribeTokens.campaignId],
      references: [campaigns.id],
    }),
  })
);
