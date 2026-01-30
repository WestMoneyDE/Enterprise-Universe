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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { subsidiaryEnum, dealStageEnum } from "./enums";
import { organizations, users } from "./auth";
import { contacts } from "./contacts";

// =============================================================================
// PIPELINES
// =============================================================================

export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  subsidiary: subsidiaryEnum("subsidiary"),

  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),

  // Pipeline Settings
  settings: jsonb("settings").$type<{
    autoAssign?: boolean;
    defaultOwnerId?: string;
    rotationEnabled?: boolean;
    rotationUserIds?: string[];
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// PIPELINE STAGES
// =============================================================================

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    order: integer("order").notNull(),

    // Stage Type
    probability: integer("probability").default(0), // 0-100%
    isClosed: boolean("is_closed").default(false),
    isWon: boolean("is_won").default(false),

    // Visual
    color: varchar("color", { length: 7 }).default("#6B7280"),
    icon: varchar("icon", { length: 50 }),

    // Automation
    autoActions: jsonb("auto_actions").$type<
      Array<{
        type: "send_email" | "create_task" | "notify" | "update_field";
        config: Record<string, unknown>;
      }>
    >(),

    // Requirements (optional)
    requiredFields: text("required_fields").array(),
    validationRules: jsonb("validation_rules"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pipelineOrderIdx: index("stages_pipeline_order_idx").on(
      table.pipelineId,
      table.order
    ),
  })
);

// =============================================================================
// DEALS
// =============================================================================

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),

    // Basic Info
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Pipeline
    pipelineId: uuid("pipeline_id").references(() => pipelines.id),
    stageId: uuid("stage_id").references(() => pipelineStages.id),
    stage: dealStageEnum("stage").default("lead"), // Fallback enum stage
    stageChangedAt: timestamp("stage_changed_at"),
    stageDuration: integer("stage_duration"), // Days in current stage

    // Value
    amount: decimal("amount", { precision: 15, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("EUR"),
    probability: integer("probability").default(0), // 0-100%
    weightedValue: decimal("weighted_value", { precision: 15, scale: 2 }),

    // Classification
    subsidiary: subsidiaryEnum("subsidiary"),
    dealType: varchar("deal_type", { length: 50 }), // new_business, upsell, renewal
    priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
    source: varchar("source", { length: 100 }),

    // Dates
    expectedCloseDate: timestamp("expected_close_date"),
    actualCloseDate: timestamp("actual_close_date"),
    nextActivityDate: timestamp("next_activity_date"),
    lastActivityDate: timestamp("last_activity_date"),

    // Loss Reason
    lossReason: varchar("loss_reason", { length: 255 }),
    lossNotes: text("loss_notes"),
    competitorId: uuid("competitor_id"),

    // Assignment
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // External IDs
    hubspotDealId: varchar("hubspot_deal_id", { length: 50 }),

    // West Money Bau Specific
    wmbKundenkarteId: uuid("wmb_kundenkarte_id"),
    wmbBauherrenPassStatus: varchar("wmb_bauherren_pass_status", { length: 50 }),
    wmbProjectId: uuid("wmb_project_id"),

    // Custom Fields
    customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("deals_org_idx").on(table.organizationId),
    contactIdx: index("deals_contact_idx").on(table.contactId),
    pipelineIdx: index("deals_pipeline_idx").on(table.pipelineId),
    stageIdx: index("deals_stage_idx").on(table.stageId),
    ownerIdx: index("deals_owner_idx").on(table.ownerId),
    closeDateIdx: index("deals_close_date_idx").on(table.expectedCloseDate),
    hubspotIdx: index("deals_hubspot_idx").on(table.hubspotDealId),
    createdAtIdx: index("deals_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// DEAL ACTIVITIES (Timeline)
// =============================================================================

export const dealActivities = pgTable(
  "deal_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Activity Details
    type: varchar("type", { length: 50 }).notNull(), // stage_change, note, call, email, meeting, task
    title: varchar("title", { length: 255 }),
    description: text("description"),

    // Stage Change Details
    fromStageId: uuid("from_stage_id"),
    toStageId: uuid("to_stage_id"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // User
    performedBy: uuid("performed_by").references(() => users.id),

    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => ({
    dealIdx: index("deal_activities_deal_idx").on(table.dealId),
    typeIdx: index("deal_activities_type_idx").on(table.type),
  })
);

// =============================================================================
// DEAL PRODUCTS (Line Items)
// =============================================================================

export const dealProducts = pgTable("deal_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),

  // Product Info
  productId: uuid("product_id"), // Reference to products table if exists
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  description: text("description"),

  // Pricing
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  discountType: varchar("discount_type", { length: 20 }).default("percentage"), // percentage, fixed
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),

  // Tax
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("19.00"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [pipelines.organizationId],
    references: [organizations.id],
  }),
  stages: many(pipelineStages),
  deals: many(deals),
}));

export const pipelineStagesRelations = relations(
  pipelineStages,
  ({ one, many }) => ({
    pipeline: one(pipelines, {
      fields: [pipelineStages.pipelineId],
      references: [pipelines.id],
    }),
    deals: many(deals),
  })
);

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  owner: one(users, {
    fields: [deals.ownerId],
    references: [users.id],
  }),
  pipeline: one(pipelines, {
    fields: [deals.pipelineId],
    references: [pipelines.id],
  }),
  stage: one(pipelineStages, {
    fields: [deals.stageId],
    references: [pipelineStages.id],
  }),
  activities: many(dealActivities),
  products: many(dealProducts),
}));

export const dealActivitiesRelations = relations(dealActivities, ({ one }) => ({
  deal: one(deals, {
    fields: [dealActivities.dealId],
    references: [deals.id],
  }),
  organization: one(organizations, {
    fields: [dealActivities.organizationId],
    references: [organizations.id],
  }),
  performer: one(users, {
    fields: [dealActivities.performedBy],
    references: [users.id],
  }),
}));

export const dealProductsRelations = relations(dealProducts, ({ one }) => ({
  deal: one(deals, {
    fields: [dealProducts.dealId],
    references: [deals.id],
  }),
}));
