import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  index,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { paymentStatusEnum, subsidiaryEnum } from "./enums";
import { organizations, users } from "./auth";
import { contacts } from "./contacts";
import { deals } from "./deals";
import { projects } from "./projects";

// =============================================================================
// INVOICES
// =============================================================================

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Relations
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    dealId: uuid("deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),

    // Invoice Info
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    referenceNumber: varchar("reference_number", { length: 100 }),
    subsidiary: subsidiaryEnum("subsidiary"),

    // Type
    type: varchar("type", { length: 20 }).default("invoice"), // invoice, credit_note, proforma, quote
    status: varchar("status", { length: 20 }).default("draft"), // draft, sent, paid, overdue, cancelled, refunded

    // Dates
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    paidDate: date("paid_date"),

    // Amounts
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
    discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default("0"),
    amountDue: decimal("amount_due", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),

    // Tax Details
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("19.00"),
    taxId: varchar("tax_id", { length: 50 }), // USt-IdNr.
    taxExempt: boolean("tax_exempt").default(false),
    taxExemptReason: varchar("tax_exempt_reason", { length: 255 }),

    // Billing Address
    billingName: varchar("billing_name", { length: 255 }),
    billingCompany: varchar("billing_company", { length: 255 }),
    billingStreet: varchar("billing_street", { length: 255 }),
    billingCity: varchar("billing_city", { length: 100 }),
    billingPostalCode: varchar("billing_postal_code", { length: 20 }),
    billingCountry: varchar("billing_country", { length: 2 }).default("DE"),

    // Payment
    paymentTerms: varchar("payment_terms", { length: 100 }), // Net 30, Due on Receipt, etc.
    paymentMethod: varchar("payment_method", { length: 50 }), // bank_transfer, stripe, paypal
    bankDetails: jsonb("bank_details").$type<{
      accountHolder?: string;
      iban?: string;
      bic?: string;
      bankName?: string;
    }>(),

    // Stripe
    stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    stripeHostedInvoiceUrl: text("stripe_hosted_invoice_url"),
    stripePdfUrl: text("stripe_pdf_url"),

    // Notes
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    footer: text("footer"),

    // PDF
    pdfUrl: text("pdf_url"),
    pdfGeneratedAt: timestamp("pdf_generated_at"),

    // Reminders
    remindersSent: integer("reminders_sent").default(0),
    lastReminderAt: timestamp("last_reminder_at"),
    nextReminderAt: timestamp("next_reminder_at"),

    // Commission Tracking
    commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }).default("0"),
    commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).default("0.01"),
    commissionContactEmail: varchar("commission_contact_email", { length: 255 }),
    commissionContactName: varchar("commission_contact_name", { length: 255 }),
    commissionPaid: boolean("commission_paid").default(false),
    commissionPaidAt: timestamp("commission_paid_at"),
    commissionStripePaymentLink: text("commission_stripe_payment_link"),
    commissionEmailSentAt: timestamp("commission_email_sent_at"),

    // Inkasso Tracking
    overdueStatus: varchar("overdue_status", { length: 20 }), // warning, final_notice, inkasso
    inkassoStatus: varchar("inkasso_status", { length: 20 }), // pending, submitted, in_progress, resolved, written_off
    inkassoSubmittedAt: timestamp("inkasso_submitted_at"),
    inkassoReference: varchar("inkasso_reference", { length: 100 }),
    inkassoNotes: text("inkasso_notes"),

    // Created/Sent by
    createdBy: uuid("created_by").references(() => users.id),
    sentAt: timestamp("sent_at"),
    sentBy: uuid("sent_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("invoices_org_idx").on(table.organizationId),
    contactIdx: index("invoices_contact_idx").on(table.contactId),
    dealIdx: index("invoices_deal_idx").on(table.dealId),
    projectIdx: index("invoices_project_idx").on(table.projectId),
    statusIdx: index("invoices_status_idx").on(table.status),
    invoiceNumberIdx: index("invoices_number_idx").on(table.invoiceNumber),
    dueDateIdx: index("invoices_due_date_idx").on(table.dueDate),
    stripeIdx: index("invoices_stripe_idx").on(table.stripeInvoiceId),
    commissionPaidIdx: index("invoices_commission_paid_idx").on(table.commissionPaid),
    overdueStatusIdx: index("invoices_overdue_status_idx").on(table.overdueStatus),
    inkassoStatusIdx: index("invoices_inkasso_status_idx").on(table.inkassoStatus),
  })
);

// =============================================================================
// INVOICE LINE ITEMS
// =============================================================================

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),

  // Item Info
  description: text("description").notNull(),
  sku: varchar("sku", { length: 100 }),
  category: varchar("category", { length: 100 }),

  // Quantity & Price
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }), // Stück, Stunden, m², etc.

  // Discount
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  discountType: varchar("discount_type", { length: 20 }).default("percentage"), // percentage, fixed

  // Tax
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("19.00"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }),

  // Total
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),

  // Order
  order: integer("order").default(0),

  // Stripe
  stripePriceId: varchar("stripe_price_id", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// PAYMENTS
// =============================================================================

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Relations
    invoiceId: uuid("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),

    // Payment Info
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),
    status: paymentStatusEnum("status").default("pending"),

    // Method
    method: varchar("method", { length: 50 }).notNull(), // stripe, bank_transfer, cash, paypal
    methodDetails: jsonb("method_details").$type<Record<string, unknown>>(),

    // Stripe
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
    stripeRefundId: varchar("stripe_refund_id", { length: 255 }),

    // Reference
    reference: varchar("reference", { length: 255 }), // Bank transfer reference
    description: text("description"),

    // Failure
    failureCode: varchar("failure_code", { length: 100 }),
    failureMessage: text("failure_message"),

    // Refund
    refundedAmount: decimal("refunded_amount", { precision: 15, scale: 2 }),
    refundedAt: timestamp("refunded_at"),
    refundReason: text("refund_reason"),

    // Processing
    processedAt: timestamp("processed_at"),
    processedBy: uuid("processed_by").references(() => users.id),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("payments_org_idx").on(table.organizationId),
    invoiceIdx: index("payments_invoice_idx").on(table.invoiceId),
    contactIdx: index("payments_contact_idx").on(table.contactId),
    statusIdx: index("payments_status_idx").on(table.status),
    stripePaymentIdx: index("payments_stripe_payment_idx").on(
      table.stripePaymentIntentId
    ),
    stripeChargeIdx: index("payments_stripe_charge_idx").on(table.stripeChargeId),
    createdAtIdx: index("payments_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// SUBSCRIPTIONS (SaaS)
// =============================================================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),

    // Subscription Info
    plan: varchar("plan", { length: 100 }).notNull(), // starter, professional, enterprise
    status: varchar("status", { length: 50 }).default("active"), // active, past_due, cancelled, trialing, paused

    // Billing
    interval: varchar("interval", { length: 20 }).default("month"), // month, year
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),

    // Trial
    trialStartDate: timestamp("trial_start_date"),
    trialEndDate: timestamp("trial_end_date"),

    // Period
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),

    // Cancellation
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    cancelledAt: timestamp("cancelled_at"),
    cancelReason: text("cancel_reason"),

    // Stripe
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("subscriptions_org_idx").on(table.organizationId),
    contactIdx: index("subscriptions_contact_idx").on(table.contactId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
    stripeIdx: index("subscriptions_stripe_idx").on(table.stripeSubscriptionId),
  })
);

// =============================================================================
// PAYMENT METHODS
// =============================================================================

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "cascade",
  }),

  // Method
  type: varchar("type", { length: 50 }).notNull(), // card, sepa_debit, bank_account
  isDefault: boolean("is_default").default(false),

  // Card Details (masked)
  cardBrand: varchar("card_brand", { length: 20 }), // visa, mastercard, amex
  cardLast4: varchar("card_last4", { length: 4 }),
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),

  // SEPA Details
  sepaLast4: varchar("sepa_last4", { length: 4 }),
  sepaBankCode: varchar("sepa_bank_code", { length: 20 }),
  sepaCountry: varchar("sepa_country", { length: 2 }),

  // Stripe
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }),

  // Status
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [invoices.contactId],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [invoices.dealId],
    references: [deals.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  sentByUser: one(users, {
    fields: [invoices.sentBy],
    references: [users.id],
    relationName: "sentBy",
  }),
  lineItems: many(invoiceLineItems),
  payments: many(payments),
}));

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  contact: one(contacts, {
    fields: [payments.contactId],
    references: [contacts.id],
  }),
  processedByUser: one(users, {
    fields: [payments.processedBy],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [subscriptions.contactId],
    references: [contacts.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentMethods.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [paymentMethods.contactId],
    references: [contacts.id],
  }),
}));
