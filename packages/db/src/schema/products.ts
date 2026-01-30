import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
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
  productCategoryEnum,
  productTypeEnum,
  subsidiaryEnum,
} from "./enums";
import { organizations, users } from "./auth";

// =============================================================================
// PRODUCTS & SERVICES CATALOG
// =============================================================================

/**
 * Products - Comprehensive Product/Service Catalog
 *
 * Supports all subsidiaries: construction services, smart home packages,
 * software licenses, consulting services, and maintenance contracts.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Basic Information
    sku: varchar("sku", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }),
    description: text("description"),
    shortDescription: varchar("short_description", { length: 500 }),

    // Classification
    type: productTypeEnum("type").notNull(),
    category: productCategoryEnum("category").notNull(),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),
    subcategory: varchar("subcategory", { length: 100 }),
    tags: jsonb("tags").$type<string[]>(),

    // Pricing
    priceNet: decimal("price_net", { precision: 12, scale: 2 }).notNull(),
    priceGross: decimal("price_gross", { precision: 12, scale: 2 }),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("19.00"), // German MwSt
    currency: varchar("currency", { length: 3 }).default("EUR"),
    unit: varchar("unit", { length: 50 }), // Stück, qm, Stunde, Pauschal, etc.
    minQuantity: decimal("min_quantity", { precision: 10, scale: 2 }).default("1"),
    maxQuantity: decimal("max_quantity", { precision: 10, scale: 2 }),

    // Pricing Tiers (for volume discounts)
    pricingTiers: jsonb("pricing_tiers").$type<Array<{
      minQuantity: number;
      maxQuantity?: number;
      priceNet: number;
      discountPercent?: number;
    }>>(),

    // Cost & Margin
    costPrice: decimal("cost_price", { precision: 12, scale: 2 }),
    marginPercent: decimal("margin_percent", { precision: 5, scale: 2 }),

    // Recurring/Subscription
    isRecurring: boolean("is_recurring").default(false),
    recurringInterval: varchar("recurring_interval", { length: 20 }), // monthly, quarterly, yearly
    recurringIntervalCount: integer("recurring_interval_count"),
    trialDays: integer("trial_days"),

    // Availability
    active: boolean("active").default(true),
    availableFrom: timestamp("available_from", { mode: "date" }),
    availableUntil: timestamp("available_until", { mode: "date" }),
    featured: boolean("featured").default(false),
    displayOrder: integer("display_order").default(0),

    // Inventory (for physical products)
    trackInventory: boolean("track_inventory").default(false),
    stockQuantity: integer("stock_quantity"),
    lowStockThreshold: integer("low_stock_threshold"),
    backorderAllowed: boolean("backorder_allowed").default(false),

    // Media
    images: jsonb("images").$type<Array<{
      url: string;
      alt?: string;
      isPrimary?: boolean;
      sortOrder?: number;
    }>>(),
    documents: jsonb("documents").$type<Array<{
      url: string;
      name: string;
      type: string;
    }>>(),

    // Construction-specific
    constructionDetails: jsonb("construction_details").$type<{
      gewerk?: string;
      leistungsphase?: string;
      materialien?: string[];
      arbeitsaufwand?: number; // Stunden
      qualifikationErforderlich?: string[];
    }>(),

    // Smart Home-specific
    smartHomeDetails: jsonb("smart_home_details").$type<{
      provider?: string;
      compatibility?: string[];
      installationRequired?: boolean;
      installationIncluded?: boolean;
      features?: string[];
    }>(),

    // SEO & Marketing
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: varchar("meta_description", { length: 500 }),
    keywords: jsonb("keywords").$type<string[]>(),

    // External References
    stripeProductId: varchar("stripe_product_id", { length: 100 }),
    stripePriceId: varchar("stripe_price_id", { length: 100 }),
    hubspotProductId: varchar("hubspot_product_id", { length: 100 }),
    externalSku: varchar("external_sku", { length: 100 }),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("products_org_idx").on(table.organizationId),
    skuIdx: index("products_sku_idx").on(table.sku),
    slugIdx: index("products_slug_idx").on(table.slug),
    categoryIdx: index("products_category_idx").on(table.category),
    subsidiaryIdx: index("products_subsidiary_idx").on(table.subsidiary),
    activeIdx: index("products_active_idx").on(table.active),
    stripeProductIdx: index("products_stripe_product_idx").on(table.stripeProductId),
  })
);

// =============================================================================
// PRODUCT VARIANTS
// =============================================================================

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 50 }).notNull(),

    // Variant Options (e.g., Size: L, Color: Blue)
    options: jsonb("options").$type<Record<string, string>>(),

    // Pricing Override
    priceNet: decimal("price_net", { precision: 12, scale: 2 }),
    priceGross: decimal("price_gross", { precision: 12, scale: 2 }),
    costPrice: decimal("cost_price", { precision: 12, scale: 2 }),

    // Inventory
    stockQuantity: integer("stock_quantity"),
    lowStockThreshold: integer("low_stock_threshold"),

    // Status
    active: boolean("active").default(true),
    displayOrder: integer("display_order").default(0),

    // External References
    stripePriceId: varchar("stripe_price_id", { length: 100 }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index("product_variants_product_idx").on(table.productId),
    skuIdx: index("product_variants_sku_idx").on(table.sku),
  })
);

// =============================================================================
// PRODUCT BUNDLES
// =============================================================================

export const productBundles = pgTable(
  "product_bundles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bundleProductId: uuid("bundle_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    itemProductId: uuid("item_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    optional: boolean("optional").default(false),
    sortOrder: integer("sort_order").default(0),

    // Discount within bundle
    discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    bundleIdx: index("product_bundles_bundle_idx").on(table.bundleProductId),
    itemIdx: index("product_bundles_item_idx").on(table.itemProductId),
  })
);

// =============================================================================
// PRODUCT PRICE HISTORY
// =============================================================================

export const productPriceHistory = pgTable(
  "product_price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    previousPriceNet: decimal("previous_price_net", { precision: 12, scale: 2 }),
    newPriceNet: decimal("new_price_net", { precision: 12, scale: 2 }),
    previousPriceGross: decimal("previous_price_gross", { precision: 12, scale: 2 }),
    newPriceGross: decimal("new_price_gross", { precision: 12, scale: 2 }),

    reason: varchar("reason", { length: 255 }),
    effectiveFrom: timestamp("effective_from", { mode: "date" }).notNull(),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    productIdx: index("product_price_history_product_idx").on(table.productId),
    effectiveFromIdx: index("product_price_history_effective_idx").on(table.effectiveFrom),
  })
);

// =============================================================================
// SERVICE PACKAGES (for construction & smart home)
// =============================================================================

export const servicePackages = pgTable(
  "service_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }),
    description: text("description"),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // Package Type
    packageType: varchar("package_type", { length: 50 }).notNull(), // starter, standard, premium, enterprise
    targetAudience: varchar("target_audience", { length: 100 }), // private, commercial

    // Pricing
    basePrice: decimal("base_price", { precision: 14, scale: 2 }).notNull(),
    pricePerSqm: decimal("price_per_sqm", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("EUR"),

    // What's Included
    includedProducts: jsonb("included_products").$type<Array<{
      productId: string;
      quantity: number;
      isOptional?: boolean;
    }>>(),
    includedServices: jsonb("included_services").$type<string[]>(),
    excludedServices: jsonb("excluded_services").$type<string[]>(),

    // Smart Home specific
    smartHomeConfig: jsonb("smart_home_config").$type<{
      provider: string;
      maxDevices?: number;
      includedRooms?: number;
      features?: string[];
    }>(),

    // Construction specific
    constructionConfig: jsonb("construction_config").$type<{
      energiestandard?: string;
      gewerke?: string[];
      garantiejahre?: number;
    }>(),

    // Availability
    active: boolean("active").default(true),
    featured: boolean("featured").default(false),
    displayOrder: integer("display_order").default(0),

    // Media
    image: text("image"),
    brochureUrl: text("brochure_url"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("service_packages_org_idx").on(table.organizationId),
    subsidiaryIdx: index("service_packages_subsidiary_idx").on(table.subsidiary),
    packageTypeIdx: index("service_packages_type_idx").on(table.packageType),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const productsRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  variants: many(productVariants),
  bundleItems: many(productBundles, { relationName: "bundleProduct" }),
  bundledIn: many(productBundles, { relationName: "itemProduct" }),
  priceHistory: many(productPriceHistory),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productBundlesRelations = relations(productBundles, ({ one }) => ({
  bundleProduct: one(products, {
    fields: [productBundles.bundleProductId],
    references: [products.id],
    relationName: "bundleProduct",
  }),
  itemProduct: one(products, {
    fields: [productBundles.itemProductId],
    references: [products.id],
    relationName: "itemProduct",
  }),
}));

export const productPriceHistoryRelations = relations(productPriceHistory, ({ one }) => ({
  product: one(products, {
    fields: [productPriceHistory.productId],
    references: [products.id],
  }),
}));

export const servicePackagesRelations = relations(servicePackages, ({ one }) => ({
  organization: one(organizations, {
    fields: [servicePackages.organizationId],
    references: [organizations.id],
  }),
}));
