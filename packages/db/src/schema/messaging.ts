import { relations } from "drizzle-orm";
import {
  boolean,
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
  messageChannelEnum,
  messageDirectionEnum,
  messageStatusEnumV2,
  subsidiaryEnum,
} from "./enums";
import { organizations, users } from "./auth";
import { contacts } from "./contacts";

// =============================================================================
// MESSAGING CONVERSATIONS
// =============================================================================

/**
 * Messaging - Multi-Channel Communication System
 *
 * Unified messaging across WhatsApp, SMS, and other channels.
 * Supports two-way communication, templates, and automation.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Participant
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    externalIdentifier: varchar("external_identifier", { length: 100 }).notNull(), // Phone number, WhatsApp ID, etc.

    // Channel Information
    channel: messageChannelEnum("channel").notNull(),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // WhatsApp-specific
    whatsappConversationId: varchar("whatsapp_conversation_id", { length: 100 }),
    whatsappPhoneNumberId: varchar("whatsapp_phone_number_id", { length: 100 }),
    whatsappBusinessAccountId: varchar("whatsapp_business_account_id", { length: 100 }),

    // Conversation State
    status: varchar("status", { length: 50 }).default("active"),
    // active, archived, blocked
    unreadCount: integer("unread_count").default(0),

    // Last Message Info
    lastMessageAt: timestamp("last_message_at", { mode: "date" }),
    lastMessagePreview: varchar("last_message_preview", { length: 255 }),
    lastMessageDirection: messageDirectionEnum("last_message_direction"),

    // Assignment
    assignedTo: uuid("assigned_to").references(() => users.id),
    teamId: uuid("team_id"),

    // Participant Info (cached from contact or external)
    participantName: varchar("participant_name", { length: 255 }),
    participantAvatar: text("participant_avatar"),

    // Labels & Tags
    labels: jsonb("labels").$type<string[]>(),
    priority: varchar("priority", { length: 20 }),

    // Window State (for WhatsApp 24h window)
    customerWindowOpen: boolean("customer_window_open").default(false),
    customerWindowExpiresAt: timestamp("customer_window_expires_at", { mode: "date" }),

    // Automation
    automationPaused: boolean("automation_paused").default(false),
    botActive: boolean("bot_active").default(false),

    // Notes
    internalNotes: text("internal_notes"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("conversations_org_idx").on(table.organizationId),
    contactIdx: index("conversations_contact_idx").on(table.contactId),
    channelIdx: index("conversations_channel_idx").on(table.channel),
    externalIdIdx: index("conversations_external_id_idx").on(table.externalIdentifier),
    assignedToIdx: index("conversations_assigned_to_idx").on(table.assignedTo),
    lastMessageIdx: index("conversations_last_message_idx").on(table.lastMessageAt),
    statusIdx: index("conversations_status_idx").on(table.status),
  })
);

// =============================================================================
// MESSAGES
// =============================================================================

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    // Message Identification
    externalMessageId: varchar("external_message_id", { length: 100 }),
    direction: messageDirectionEnum("direction").notNull(),
    status: messageStatusEnumV2("status").default("pending").notNull(),

    // Content
    messageType: varchar("message_type", { length: 50 }).notNull(),
    // text, image, video, audio, document, location, contacts, template, interactive, reaction
    content: text("content"),
    contentHtml: text("content_html"),

    // Media (for image, video, audio, document)
    media: jsonb("media").$type<{
      url?: string;
      mimeType?: string;
      fileSize?: number;
      fileName?: string;
      caption?: string;
      thumbnail?: string;
      duration?: number; // for audio/video
      width?: number;
      height?: number;
    }>(),

    // Location (for location messages)
    location: jsonb("location").$type<{
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    }>(),

    // Contacts (for contact messages)
    contactsData: jsonb("contacts_data").$type<Array<{
      name: string;
      phone?: string;
      email?: string;
    }>>(),

    // Template (for template messages)
    templateData: jsonb("template_data").$type<{
      name: string;
      language: string;
      components?: Array<{
        type: string;
        parameters: Array<{
          type: string;
          text?: string;
          image?: { link: string };
          document?: { link: string; filename: string };
        }>;
      }>;
    }>(),

    // Interactive (for interactive messages)
    interactiveData: jsonb("interactive_data").$type<{
      type: "button" | "list" | "product" | "product_list";
      header?: { type: string; text?: string; image?: string };
      body?: { text: string };
      footer?: { text: string };
      action?: Record<string, unknown>;
    }>(),

    // Reactions
    reactions: jsonb("reactions").$type<Array<{
      emoji: string;
      from: string;
      timestamp: string;
    }>>(),

    // Reply Context
    replyToMessageId: uuid("reply_to_message_id"),
    replyToExternalId: varchar("reply_to_external_id", { length: 100 }),
    replyContext: jsonb("reply_context").$type<{
      type: string;
      preview: string;
    }>(),

    // Sender Info
    senderType: varchar("sender_type", { length: 20 }), // user, contact, bot, system
    senderId: uuid("sender_id").references(() => users.id),

    // Delivery Tracking
    sentAt: timestamp("sent_at", { mode: "date" }),
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    readAt: timestamp("read_at", { mode: "date" }),
    failedAt: timestamp("failed_at", { mode: "date" }),
    failureReason: text("failure_reason"),

    // Cost tracking (for SMS/WhatsApp)
    cost: jsonb("cost").$type<{
      amount: number;
      currency: string;
      category?: string;
    }>(),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversationId),
    externalIdIdx: index("messages_external_id_idx").on(table.externalMessageId),
    directionIdx: index("messages_direction_idx").on(table.direction),
    statusIdx: index("messages_status_idx").on(table.status),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
    senderIdx: index("messages_sender_idx").on(table.senderId),
  })
);

// =============================================================================
// MESSAGE TEMPLATES (WhatsApp Approved Templates)
// =============================================================================

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template Identification
    name: varchar("name", { length: 100 }).notNull(),
    channel: messageChannelEnum("channel").notNull(),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // WhatsApp-specific
    whatsappTemplateId: varchar("whatsapp_template_id", { length: 100 }),
    whatsappNamespace: varchar("whatsapp_namespace", { length: 100 }),
    whatsappStatus: varchar("whatsapp_status", { length: 50 }),
    // APPROVED, PENDING, REJECTED, PAUSED

    // Template Details
    category: varchar("category", { length: 50 }),
    // AUTHENTICATION, MARKETING, UTILITY
    language: varchar("language", { length: 10 }).default("de"),

    // Content Structure
    header: jsonb("header").$type<{
      type: "none" | "text" | "image" | "video" | "document";
      text?: string;
      example?: string;
    }>(),
    body: text("body").notNull(),
    bodyVariables: jsonb("body_variables").$type<Array<{
      name: string;
      example: string;
    }>>(),
    footer: varchar("footer", { length: 60 }),

    // Buttons
    buttons: jsonb("buttons").$type<Array<{
      type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
      text: string;
      url?: string;
      urlType?: "STATIC" | "DYNAMIC";
      phoneNumber?: string;
      example?: string;
    }>>(),

    // Usage
    usageCount: integer("usage_count").default(0),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),

    // Status
    active: boolean("active").default(true),
    rejectionReason: text("rejection_reason"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("msg_templates_org_idx").on(table.organizationId),
    nameIdx: index("msg_templates_name_idx").on(table.name),
    channelIdx: index("msg_templates_channel_idx").on(table.channel),
    categoryIdx: index("msg_templates_category_idx").on(table.category),
  })
);

// =============================================================================
// WHATSAPP PHONE NUMBERS
// =============================================================================

export const whatsappPhoneNumbers = pgTable(
  "whatsapp_phone_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // WhatsApp Business API
    phoneNumberId: varchar("phone_number_id", { length: 100 }).notNull(),
    businessAccountId: varchar("business_account_id", { length: 100 }).notNull(),

    // Phone Details
    displayPhoneNumber: varchar("display_phone_number", { length: 50 }).notNull(),
    verifiedName: varchar("verified_name", { length: 255 }),
    qualityRating: varchar("quality_rating", { length: 20 }),
    // GREEN, YELLOW, RED

    // Status
    status: varchar("status", { length: 50 }).default("active"),
    codeVerificationStatus: varchar("code_verification_status", { length: 50 }),

    // Limits
    messagingLimit: varchar("messaging_limit", { length: 50 }),
    // TIER_1K, TIER_10K, TIER_100K, UNLIMITED

    // Configuration
    isDefault: boolean("is_default").default(false),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // Webhook
    webhookUrl: text("webhook_url"),
    webhookVerifyToken: varchar("webhook_verify_token", { length: 100 }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("wa_phones_org_idx").on(table.organizationId),
    phoneIdIdx: index("wa_phones_phone_id_idx").on(table.phoneNumberId),
  })
);

// =============================================================================
// BROADCAST CAMPAIGNS (WhatsApp/SMS Bulk Messaging)
// =============================================================================

export const messagingBroadcasts = pgTable(
  "messaging_broadcasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    channel: messageChannelEnum("channel").notNull(),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // Template
    templateId: uuid("template_id").references(() => messageTemplates.id),

    // Recipients
    recipientListId: uuid("recipient_list_id"), // Reference to contact list
    recipientCount: integer("recipient_count").default(0),
    recipientFilter: jsonb("recipient_filter").$type<Record<string, unknown>>(),

    // Content (if not using template)
    content: text("content"),
    mediaUrl: text("media_url"),

    // Scheduling
    status: varchar("status", { length: 50 }).default("draft"),
    // draft, scheduled, sending, completed, cancelled, failed
    scheduledAt: timestamp("scheduled_at", { mode: "date" }),
    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),

    // Results
    sentCount: integer("sent_count").default(0),
    deliveredCount: integer("delivered_count").default(0),
    readCount: integer("read_count").default(0),
    failedCount: integer("failed_count").default(0),
    optOutCount: integer("opt_out_count").default(0),

    // Cost
    estimatedCost: jsonb("estimated_cost").$type<{
      amount: number;
      currency: string;
    }>(),
    actualCost: jsonb("actual_cost").$type<{
      amount: number;
      currency: string;
    }>(),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("msg_broadcasts_org_idx").on(table.organizationId),
    channelIdx: index("msg_broadcasts_channel_idx").on(table.channel),
    statusIdx: index("msg_broadcasts_status_idx").on(table.status),
    scheduledAtIdx: index("msg_broadcasts_scheduled_at_idx").on(table.scheduledAt),
  })
);

// =============================================================================
// MESSAGING WEBHOOKS LOG
// =============================================================================

export const messagingWebhookLogs = pgTable(
  "messaging_webhook_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),

    // Source
    channel: messageChannelEnum("channel").notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),

    // Payload
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    headers: jsonb("headers").$type<Record<string, string>>(),

    // Processing
    processed: boolean("processed").default(false),
    processedAt: timestamp("processed_at", { mode: "date" }),
    processingError: text("processing_error"),
    retryCount: integer("retry_count").default(0),

    // Related records
    conversationId: uuid("conversation_id"),
    messageId: uuid("message_id"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("msg_webhook_logs_org_idx").on(table.organizationId),
    channelIdx: index("msg_webhook_logs_channel_idx").on(table.channel),
    eventTypeIdx: index("msg_webhook_logs_event_type_idx").on(table.eventType),
    processedIdx: index("msg_webhook_logs_processed_idx").on(table.processed),
    createdAtIdx: index("msg_webhook_logs_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [conversations.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
  assignedToUser: one(users, {
    fields: [conversations.assignedTo],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [messageTemplates.organizationId],
    references: [organizations.id],
  }),
}));

export const whatsappPhoneNumbersRelations = relations(whatsappPhoneNumbers, ({ one }) => ({
  organization: one(organizations, {
    fields: [whatsappPhoneNumbers.organizationId],
    references: [organizations.id],
  }),
}));

export const messagingBroadcastsRelations = relations(messagingBroadcasts, ({ one }) => ({
  organization: one(organizations, {
    fields: [messagingBroadcasts.organizationId],
    references: [organizations.id],
  }),
  template: one(messageTemplates, {
    fields: [messagingBroadcasts.templateId],
    references: [messageTemplates.id],
  }),
}));
