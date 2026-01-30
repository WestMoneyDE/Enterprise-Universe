import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { provisionStatusEnum, provisionPayoutMethodEnum, subsidiaryEnum } from "./enums";
import { organizations, users } from "./auth";
import { contacts } from "./contacts";
import { deals } from "./deals";
import { invoices, payments } from "./payments";

// =============================================================================
// PROVISIONS (COMMISSION TRACKING)
// =============================================================================

/**
 * Provisions table tracks commissions earned on deals.
 *
 * Commission Rate: Fixed at 2.5% (0.025)
 * Payout Methods: Stripe Connect, SEPA
 * Payout Trigger: After customer payment is confirmed
 */
export const provisions = pgTable(
  "provisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Related entities
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    paymentId: uuid("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),

    // Beneficiary (who receives the commission)
    beneficiaryContactId: uuid("beneficiary_contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    beneficiaryUserId: uuid("beneficiary_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    beneficiaryName: varchar("beneficiary_name", { length: 255 }),
    beneficiaryEmail: varchar("beneficiary_email", { length: 255 }),

    // Commission calculation
    dealAmount: decimal("deal_amount", { precision: 15, scale: 2 }).notNull(),
    commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.0250"), // 2.5%
    commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),

    // Status tracking
    status: provisionStatusEnum("status").default("pending_payment"),
    subsidiary: subsidiaryEnum("subsidiary"),

    // Customer payment tracking
    customerPaymentConfirmedAt: timestamp("customer_payment_confirmed_at"),
    customerPaymentReference: varchar("customer_payment_reference", { length: 255 }),

    // Payout details
    payoutMethod: provisionPayoutMethodEnum("payout_method"),
    payoutInitiatedAt: timestamp("payout_initiated_at"),
    payoutCompletedAt: timestamp("payout_completed_at"),
    payoutReference: varchar("payout_reference", { length: 255 }),

    // Stripe Connect details
    stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 255 }),
    stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
    stripePayoutId: varchar("stripe_payout_id", { length: 255 }),

    // SEPA details
    sepaIban: varchar("sepa_iban", { length: 34 }),
    sepaBic: varchar("sepa_bic", { length: 11 }),
    sepaAccountHolder: varchar("sepa_account_holder", { length: 255 }),
    sepaBankName: varchar("sepa_bank_name", { length: 255 }),
    sepaTransferReference: varchar("sepa_transfer_reference", { length: 140 }),

    // Failure tracking
    failureReason: text("failure_reason"),
    failureCode: varchar("failure_code", { length: 100 }),
    retryCount: decimal("retry_count", { precision: 3, scale: 0 }).default("0"),
    lastRetryAt: timestamp("last_retry_at"),

    // Approval workflow
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    approvalNotes: text("approval_notes"),

    // Notes and metadata
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Audit
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("provisions_org_idx").on(table.organizationId),
    dealIdx: index("provisions_deal_idx").on(table.dealId),
    invoiceIdx: index("provisions_invoice_idx").on(table.invoiceId),
    paymentIdx: index("provisions_payment_idx").on(table.paymentId),
    statusIdx: index("provisions_status_idx").on(table.status),
    beneficiaryContactIdx: index("provisions_beneficiary_contact_idx").on(table.beneficiaryContactId),
    beneficiaryUserIdx: index("provisions_beneficiary_user_idx").on(table.beneficiaryUserId),
    payoutMethodIdx: index("provisions_payout_method_idx").on(table.payoutMethod),
    stripeTransferIdx: index("provisions_stripe_transfer_idx").on(table.stripeTransferId),
    createdAtIdx: index("provisions_created_at_idx").on(table.createdAt),
    subsidiaryIdx: index("provisions_subsidiary_idx").on(table.subsidiary),
  })
);

// =============================================================================
// PROVISION ACTIVITIES (Audit Log)
// =============================================================================

export const provisionActivities = pgTable(
  "provision_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provisionId: uuid("provision_id")
      .notNull()
      .references(() => provisions.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Activity details
    type: varchar("type", { length: 50 }).notNull(), // status_change, payout_initiated, payout_completed, payout_failed, note_added
    title: varchar("title", { length: 255 }),
    description: text("description"),

    // Status change details
    fromStatus: provisionStatusEnum("from_status"),
    toStatus: provisionStatusEnum("to_status"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // User
    performedBy: uuid("performed_by").references(() => users.id),

    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => ({
    provisionIdx: index("provision_activities_provision_idx").on(table.provisionId),
    typeIdx: index("provision_activities_type_idx").on(table.type),
    occurredAtIdx: index("provision_activities_occurred_at_idx").on(table.occurredAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const provisionsRelations = relations(provisions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [provisions.organizationId],
    references: [organizations.id],
  }),
  deal: one(deals, {
    fields: [provisions.dealId],
    references: [deals.id],
  }),
  invoice: one(invoices, {
    fields: [provisions.invoiceId],
    references: [invoices.id],
  }),
  payment: one(payments, {
    fields: [provisions.paymentId],
    references: [payments.id],
  }),
  beneficiaryContact: one(contacts, {
    fields: [provisions.beneficiaryContactId],
    references: [contacts.id],
  }),
  beneficiaryUser: one(users, {
    fields: [provisions.beneficiaryUserId],
    references: [users.id],
    relationName: "beneficiary",
  }),
  approvedByUser: one(users, {
    fields: [provisions.approvedBy],
    references: [users.id],
    relationName: "approver",
  }),
  createdByUser: one(users, {
    fields: [provisions.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
  activities: many(provisionActivities),
}));

export const provisionActivitiesRelations = relations(provisionActivities, ({ one }) => ({
  provision: one(provisions, {
    fields: [provisionActivities.provisionId],
    references: [provisions.id],
  }),
  organization: one(organizations, {
    fields: [provisionActivities.organizationId],
    references: [organizations.id],
  }),
  performer: one(users, {
    fields: [provisionActivities.performedBy],
    references: [users.id],
  }),
}));
