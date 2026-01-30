import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations, users } from "./auth";

// =============================================================================
// AUDIT LOGS
// =============================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Action
    action: varchar("action", { length: 100 }).notNull(), // create, update, delete, view, export, import, login, logout
    category: varchar("category", { length: 50 }).notNull(), // auth, contact, deal, project, campaign, payment, settings

    // Entity
    entityType: varchar("entity_type", { length: 50 }), // contact, deal, project, user, etc.
    entityId: uuid("entity_id"),
    entityName: varchar("entity_name", { length: 255 }), // Human-readable name for context

    // Changes
    previousData: jsonb("previous_data").$type<Record<string, unknown>>(),
    newData: jsonb("new_data").$type<Record<string, unknown>>(),
    changedFields: text("changed_fields").array(),

    // Context
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Request Info
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    requestId: varchar("request_id", { length: 100 }),
    sessionId: varchar("session_id", { length: 255 }),

    // Location (from IP)
    country: varchar("country", { length: 2 }),
    city: varchar("city", { length: 100 }),

    // API Key (if applicable)
    apiKeyId: uuid("api_key_id"),

    // Status
    status: varchar("status", { length: 20 }).default("success"), // success, failure, pending

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("audit_org_idx").on(table.organizationId),
    userIdx: index("audit_user_idx").on(table.userId),
    actionIdx: index("audit_action_idx").on(table.action),
    categoryIdx: index("audit_category_idx").on(table.category),
    entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId),
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
    // Composite for common queries
    orgCreatedAtIdx: index("audit_org_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  })
);

// =============================================================================
// WEBHOOK LOGS
// =============================================================================

export const webhookLogs = pgTable(
  "webhook_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),

    // Source
    provider: varchar("provider", { length: 50 }).notNull(), // stripe, hubspot, ses, resend, whatsapp, zadarma
    eventType: varchar("event_type", { length: 100 }).notNull(),
    eventId: varchar("event_id", { length: 255 }), // Provider's event ID

    // Request
    endpoint: varchar("endpoint", { length: 255 }),
    method: varchar("method", { length: 10 }).default("POST"),
    headers: jsonb("headers").$type<Record<string, string>>(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    signature: varchar("signature", { length: 255 }),

    // Response
    status: varchar("status", { length: 20 }).default("pending"), // pending, success, failed, ignored
    statusCode: integer("status_code"),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),

    // Processing
    processedAt: timestamp("processed_at"),
    processingDuration: integer("processing_duration"), // milliseconds

    // Retry
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    nextRetryAt: timestamp("next_retry_at"),

    // Idempotency
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    isDuplicate: boolean("is_duplicate").default(false),

    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("webhook_org_idx").on(table.organizationId),
    providerIdx: index("webhook_provider_idx").on(table.provider),
    eventTypeIdx: index("webhook_event_type_idx").on(table.eventType),
    statusIdx: index("webhook_status_idx").on(table.status),
    eventIdIdx: index("webhook_event_id_idx").on(table.eventId),
    receivedAtIdx: index("webhook_received_at_idx").on(table.receivedAt),
    idempotencyIdx: index("webhook_idempotency_idx").on(table.idempotencyKey),
  })
);

// =============================================================================
// OUTGOING WEBHOOKS (User-configured)
// =============================================================================

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Endpoint
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 255 }), // For signature verification

  // Events
  events: text("events").array(), // contact.created, deal.won, project.stage_changed, etc.
  allEvents: boolean("all_events").default(false),

  // Status
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),

  // Settings
  headers: jsonb("headers").$type<Record<string, string>>(),
  retryOnFailure: boolean("retry_on_failure").default(true),
  maxRetries: integer("max_retries").default(3),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// OUTGOING WEBHOOK DELIVERIES
// =============================================================================

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Event
    eventType: varchar("event_type", { length: 100 }).notNull(),
    eventData: jsonb("event_data").$type<Record<string, unknown>>(),

    // Request
    requestUrl: text("request_url").notNull(),
    requestHeaders: jsonb("request_headers").$type<Record<string, string>>(),
    requestBody: jsonb("request_body").$type<Record<string, unknown>>(),

    // Response
    status: varchar("status", { length: 20 }).default("pending"), // pending, success, failed
    responseStatusCode: integer("response_status_code"),
    responseHeaders: jsonb("response_headers").$type<Record<string, string>>(),
    responseBody: text("response_body"),
    errorMessage: text("error_message"),

    // Timing
    attemptNumber: integer("attempt_number").default(1),
    duration: integer("duration"), // milliseconds
    deliveredAt: timestamp("delivered_at"),
    nextRetryAt: timestamp("next_retry_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    endpointIdx: index("deliveries_endpoint_idx").on(table.endpointId),
    orgIdx: index("deliveries_org_idx").on(table.organizationId),
    statusIdx: index("deliveries_status_idx").on(table.status),
    createdAtIdx: index("deliveries_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// SYSTEM NOTIFICATIONS
// =============================================================================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),

    // Notification
    type: varchar("type", { length: 50 }).notNull(), // info, warning, error, success, action_required
    category: varchar("category", { length: 50 }), // system, deal, project, campaign, payment
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),

    // Related Entity
    entityType: varchar("entity_type", { length: 50 }),
    entityId: uuid("entity_id"),
    actionUrl: text("action_url"),

    // Status
    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at"),
    isDismissed: boolean("is_dismissed").default(false),
    dismissedAt: timestamp("dismissed_at"),

    // Delivery
    emailSent: boolean("email_sent").default(false),
    emailSentAt: timestamp("email_sent_at"),
    pushSent: boolean("push_sent").default(false),
    pushSentAt: timestamp("push_sent_at"),

    // Priority
    priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent

    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    orgIdx: index("notifications_org_idx").on(table.organizationId),
    typeIdx: index("notifications_type_idx").on(table.type),
    readIdx: index("notifications_read_idx").on(table.isRead),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
    // For fetching unread notifications
    userUnreadIdx: index("notifications_user_unread_idx").on(
      table.userId,
      table.isRead
    ),
  })
);

// =============================================================================
// SCHEDULED JOBS
// =============================================================================

export const scheduledJobs = pgTable(
  "scheduled_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),

    // Job Info
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }).notNull(), // email_campaign, report_generation, data_sync, cleanup
    description: text("description"),

    // Schedule (cron or one-time)
    cronExpression: varchar("cron_expression", { length: 100 }),
    scheduledFor: timestamp("scheduled_for"),
    timezone: varchar("timezone", { length: 50 }).default("Europe/Berlin"),

    // Payload
    payload: jsonb("payload").$type<Record<string, unknown>>(),

    // Status
    status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, running, completed, failed, cancelled
    lastRunAt: timestamp("last_run_at"),
    lastRunDuration: integer("last_run_duration"), // milliseconds
    lastRunResult: jsonb("last_run_result").$type<Record<string, unknown>>(),
    nextRunAt: timestamp("next_run_at"),

    // Error Handling
    failureCount: integer("failure_count").default(0),
    lastError: text("last_error"),
    maxRetries: integer("max_retries").default(3),

    // Settings
    isActive: boolean("is_active").default(true),
    runOnce: boolean("run_once").default(false),

    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("jobs_org_idx").on(table.organizationId),
    typeIdx: index("jobs_type_idx").on(table.type),
    statusIdx: index("jobs_status_idx").on(table.status),
    nextRunIdx: index("jobs_next_run_idx").on(table.nextRunAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [webhookLogs.organizationId],
    references: [organizations.id],
  }),
}));

export const webhookEndpointsRelations = relations(
  webhookEndpoints,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [webhookEndpoints.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [webhookEndpoints.createdBy],
      references: [users.id],
    }),
    deliveries: many(webhookDeliveries),
  })
);

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    endpoint: one(webhookEndpoints, {
      fields: [webhookDeliveries.endpointId],
      references: [webhookEndpoints.id],
    }),
    organization: one(organizations, {
      fields: [webhookDeliveries.organizationId],
      references: [organizations.id],
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const scheduledJobsRelations = relations(scheduledJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [scheduledJobs.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [scheduledJobs.createdBy],
    references: [users.id],
  }),
}));
