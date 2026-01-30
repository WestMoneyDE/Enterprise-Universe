import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./auth";
import { contacts } from "./contacts";

// =============================================================================
// CONSENT ENUMS
// =============================================================================

export const consentChannelEnum = pgEnum("consent_channel", [
  "email",
  "whatsapp",
  "phone",
  "post",
  "sms",
  "push",
]);

export const consentStatusDetailEnum = pgEnum("consent_status_detail", [
  "pending",
  "confirmed",
  "revoked",
]);

export const deletionRequestStatusEnum = pgEnum("deletion_request_status", [
  "pending",
  "approved",
  "processing",
  "completed",
  "rejected",
]);

// =============================================================================
// CONSENT RECORDS
// =============================================================================
// Granular consent tracking per channel for GDPR compliance
// Each contact can have multiple consent records (one per channel)

export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    // Channel & Status
    channel: consentChannelEnum("channel").notNull(),
    status: consentStatusDetailEnum("status").default("pending").notNull(),

    // Consent Details
    consentText: text("consent_text"), // The exact text the user agreed to
    consentIp: varchar("consent_ip", { length: 45 }), // IPv6 compatible
    consentUserAgent: text("consent_user_agent"),
    consentSource: varchar("consent_source", { length: 100 }), // form, api, import, etc.

    // Double Opt-In (DOI) - Required for email marketing in Germany
    doubleOptInToken: varchar("double_opt_in_token", { length: 128 }),
    doubleOptInSentAt: timestamp("double_opt_in_sent_at"),
    doubleOptInConfirmedAt: timestamp("double_opt_in_confirmed_at"),
    doubleOptInExpiresAt: timestamp("double_opt_in_expires_at"),

    // Confirmation & Revocation
    confirmedAt: timestamp("confirmed_at"),
    confirmedIp: varchar("confirmed_ip", { length: 45 }),
    revokedAt: timestamp("revoked_at"),
    revokedIp: varchar("revoked_ip", { length: 45 }),
    revokedReason: text("revoked_reason"),

    // Audit trail
    metadata: jsonb("metadata").$type<{
      campaignId?: string;
      formId?: string;
      landingPage?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      consentVersion?: string;
      legalBasis?: string; // consent, legitimate_interest, contract, legal_obligation
    }>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: one consent record per contact per channel
    uniqueContactChannel: unique("consent_contact_channel_unique").on(
      table.contactId,
      table.channel
    ),
    // Indexes
    orgIdx: index("consent_org_idx").on(table.organizationId),
    contactIdx: index("consent_contact_idx").on(table.contactId),
    channelIdx: index("consent_channel_idx").on(table.channel),
    statusIdx: index("consent_status_idx").on(table.status),
    tokenIdx: index("consent_token_idx").on(table.doubleOptInToken),
    createdAtIdx: index("consent_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// CONSENT HISTORY
// =============================================================================
// Audit log of all consent changes for legal compliance

export const consentHistory = pgTable(
  "consent_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    consentRecordId: uuid("consent_record_id")
      .notNull()
      .references(() => consentRecords.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    // Change Details
    action: varchar("action", { length: 50 }).notNull(), // created, confirmed, revoked, expired, renewed
    previousStatus: consentStatusDetailEnum("previous_status"),
    newStatus: consentStatusDetailEnum("new_status").notNull(),
    channel: consentChannelEnum("channel").notNull(),

    // Context
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    reason: text("reason"),

    // Additional data
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("consent_history_org_idx").on(table.organizationId),
    consentIdx: index("consent_history_consent_idx").on(table.consentRecordId),
    contactIdx: index("consent_history_contact_idx").on(table.contactId),
    actionIdx: index("consent_history_action_idx").on(table.action),
    createdAtIdx: index("consent_history_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// GDPR DELETION REQUESTS
// =============================================================================
// Track "Right to be forgotten" requests

export const gdprDeletionRequests = pgTable(
  "gdpr_deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .references(() => contacts.id, { onDelete: "set null" }), // May be null after deletion

    // Request Details
    requestedEmail: varchar("requested_email", { length: 255 }).notNull(), // Store email for audit even after contact deletion
    status: deletionRequestStatusEnum("status").default("pending").notNull(),

    // Request Source
    requestSource: varchar("request_source", { length: 50 }).notNull(), // self_service, email, phone, support_ticket
    requestIp: varchar("request_ip", { length: 45 }),
    requestUserAgent: text("request_user_agent"),

    // Verification (for self-service)
    verificationToken: varchar("verification_token", { length: 128 }),
    verificationSentAt: timestamp("verification_sent_at"),
    verifiedAt: timestamp("verified_at"),

    // Processing
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    approvedAt: timestamp("approved_at"),
    approvedBy: uuid("approved_by"),
    processedAt: timestamp("processed_at"),
    completedAt: timestamp("completed_at"),
    rejectedAt: timestamp("rejected_at"),
    rejectedReason: text("rejected_reason"),

    // Audit Trail
    deletedData: jsonb("deleted_data").$type<{
      contactData?: Record<string, unknown>;
      consentRecords?: number;
      activities?: number;
      deals?: number;
      messages?: number;
      totalRecords?: number;
    }>(),

    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("gdpr_deletion_org_idx").on(table.organizationId),
    contactIdx: index("gdpr_deletion_contact_idx").on(table.contactId),
    statusIdx: index("gdpr_deletion_status_idx").on(table.status),
    emailIdx: index("gdpr_deletion_email_idx").on(table.requestedEmail),
    tokenIdx: index("gdpr_deletion_token_idx").on(table.verificationToken),
    createdAtIdx: index("gdpr_deletion_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// GDPR DATA EXPORT REQUESTS
// =============================================================================
// Track "Right to data portability" requests

export const gdprDataExportRequests = pgTable(
  "gdpr_data_export_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    // Request Details
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, expired, failed
    format: varchar("format", { length: 20 }).default("json").notNull(), // json, csv

    // Request Source
    requestSource: varchar("request_source", { length: 50 }).notNull(),
    requestIp: varchar("request_ip", { length: 45 }),

    // Processing
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    completedAt: timestamp("completed_at"),

    // Download
    downloadToken: varchar("download_token", { length: 128 }),
    downloadUrl: text("download_url"),
    downloadExpiresAt: timestamp("download_expires_at"),
    downloadedAt: timestamp("downloaded_at"),

    // Export Stats
    exportStats: jsonb("export_stats").$type<{
      contactData: boolean;
      consentRecords: number;
      activities: number;
      deals: number;
      messages: number;
      totalSize: number; // bytes
    }>(),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("gdpr_export_org_idx").on(table.organizationId),
    contactIdx: index("gdpr_export_contact_idx").on(table.contactId),
    statusIdx: index("gdpr_export_status_idx").on(table.status),
    tokenIdx: index("gdpr_export_token_idx").on(table.downloadToken),
    createdAtIdx: index("gdpr_export_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const consentRecordsRelations = relations(
  consentRecords,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [consentRecords.organizationId],
      references: [organizations.id],
    }),
    contact: one(contacts, {
      fields: [consentRecords.contactId],
      references: [contacts.id],
    }),
    history: many(consentHistory),
  })
);

export const consentHistoryRelations = relations(consentHistory, ({ one }) => ({
  organization: one(organizations, {
    fields: [consentHistory.organizationId],
    references: [organizations.id],
  }),
  consentRecord: one(consentRecords, {
    fields: [consentHistory.consentRecordId],
    references: [consentRecords.id],
  }),
  contact: one(contacts, {
    fields: [consentHistory.contactId],
    references: [contacts.id],
  }),
}));

export const gdprDeletionRequestsRelations = relations(
  gdprDeletionRequests,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [gdprDeletionRequests.organizationId],
      references: [organizations.id],
    }),
    contact: one(contacts, {
      fields: [gdprDeletionRequests.contactId],
      references: [contacts.id],
    }),
  })
);

export const gdprDataExportRequestsRelations = relations(
  gdprDataExportRequests,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [gdprDataExportRequests.organizationId],
      references: [organizations.id],
    }),
    contact: one(contacts, {
      fields: [gdprDataExportRequests.contactId],
      references: [contacts.id],
    }),
  })
);
