import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc";
import {
  db,
  products,
  productVariants,
  productBundles,
  productPriceHistory,
  servicePackages,
  eq,
  and,
  desc,
  asc,
  count,
  sql,
} from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const productFilterSchema = z.object({
  search: z.string().optional(),
  type: z.enum(["physical", "digital", "service", "subscription", "bundle"]).optional(),
  category: z.enum([
    "construction", "smart_home", "software", "consulting",
    "maintenance", "other",
  ]).optional(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const pricingTierSchema = z.object({
  minQuantity: z.number(),
  maxQuantity: z.number().optional(),
  priceNet: z.number(),
  discountPercent: z.number().optional(),
});

const imageSchema = z.object({
  url: z.string(),
  alt: z.string().optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

const documentSchema = z.object({
  url: z.string(),
  name: z.string(),
  type: z.string(),
});

const constructionDetailsSchema = z.object({
  gewerk: z.string().optional(),
  leistungsphase: z.string().optional(),
  materialien: z.array(z.string()).optional(),
  arbeitsaufwand: z.number().optional(),
  qualifikationErforderlich: z.array(z.string()).optional(),
});

const smartHomeDetailsSchema = z.object({
  provider: z.string().optional(),
  compatibility: z.array(z.string()).optional(),
  installationRequired: z.boolean().optional(),
  installationIncluded: z.boolean().optional(),
  features: z.array(z.string()).optional(),
});

const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  type: z.enum(["physical", "digital", "service", "subscription", "bundle"]),
  category: z.enum([
    "construction", "smart_home", "software", "consulting",
    "maintenance", "other",
  ]),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  subcategory: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  priceNet: z.string(), // decimal as string
  priceGross: z.string().optional(),
  taxRate: z.string().default("19.00"),
  currency: z.string().length(3).default("EUR"),
  unit: z.string().max(50).optional(),
  minQuantity: z.string().default("1"),
  maxQuantity: z.string().optional(),
  pricingTiers: z.array(pricingTierSchema).optional(),
  costPrice: z.string().optional(),
  marginPercent: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.string().max(20).optional(),
  recurringIntervalCount: z.number().optional(),
  trialDays: z.number().optional(),
  active: z.boolean().default(true),
  availableFrom: z.date().optional(),
  availableUntil: z.date().optional(),
  featured: z.boolean().default(false),
  displayOrder: z.number().default(0),
  trackInventory: z.boolean().default(false),
  stockQuantity: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  backorderAllowed: z.boolean().default(false),
  images: z.array(imageSchema).optional(),
  documents: z.array(documentSchema).optional(),
  constructionDetails: constructionDetailsSchema.optional(),
  smartHomeDetails: smartHomeDetailsSchema.optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  keywords: z.array(z.string()).optional(),
  stripeProductId: z.string().max(100).optional(),
  stripePriceId: z.string().max(100).optional(),
  hubspotProductId: z.string().max(100).optional(),
  externalSku: z.string().max(100).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid(),
});

const createVariantSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(50),
  options: z.record(z.string()).optional(),
  priceNet: z.string().optional(),
  priceGross: z.string().optional(),
  costPrice: z.string().optional(),
  stockQuantity: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  active: z.boolean().default(true),
  displayOrder: z.number().default(0),
  stripePriceId: z.string().max(100).optional(),
});

// =============================================================================
// PRODUCTS ROUTER
// =============================================================================

export const productsRouter = createTRPCRouter({
  // List products with filters and pagination
  list: orgProcedure
    .input(z.object({
      filters: productFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(products.organizationId, ctx.organizationId)];

      if (filters?.search) {
        conditions.push(
          sql`(
            ${products.name} ILIKE ${`%${filters.search}%`} OR
            ${products.sku} ILIKE ${`%${filters.search}%`} OR
            ${products.description} ILIKE ${`%${filters.search}%`}
          )`
        );
      }

      if (filters?.type) conditions.push(eq(products.type, filters.type));
      if (filters?.category) conditions.push(eq(products.category, filters.category));
      if (filters?.subsidiary) conditions.push(eq(products.subsidiary, filters.subsidiary));
      if (filters?.active !== undefined) conditions.push(eq(products.active, filters.active));
      if (filters?.featured !== undefined) conditions.push(eq(products.featured, filters.featured));
      if (filters?.isRecurring !== undefined) conditions.push(eq(products.isRecurring, filters.isRecurring));

      if (filters?.priceMin !== undefined) {
        conditions.push(sql`${products.priceNet}::numeric >= ${filters.priceMin}`);
      }

      if (filters?.priceMax !== undefined) {
        conditions.push(sql`${products.priceNet}::numeric <= ${filters.priceMax}`);
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(products)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const sortField = products[pagination?.sortBy as keyof typeof products] ?? products.createdAt;
      const sortOrder = pagination?.sortOrder === "asc" ? asc : desc;

      const items = await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(sortOrder(sortField as any))
        .limit(limit)
        .offset(offset);

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Get single product by ID with relations
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const product = await db.query.products.findFirst({
        where: and(
          eq(products.id, input.id),
          eq(products.organizationId, ctx.organizationId)
        ),
        with: {
          variants: {
            orderBy: asc(productVariants.displayOrder),
          },
          bundleItems: {
            with: {
              itemProduct: true,
            },
          },
          priceHistory: {
            orderBy: desc(productPriceHistory.effectiveFrom),
            limit: 10,
          },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return product;
    }),

  // Get product by SKU
  getBySku: orgProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await db.query.products.findFirst({
        where: and(
          eq(products.sku, input.sku),
          eq(products.organizationId, ctx.organizationId)
        ),
        with: {
          variants: true,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return product;
    }),

  // Create new product
  create: orgProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate SKU
      const existing = await db.query.products.findFirst({
        where: and(
          eq(products.sku, input.sku),
          eq(products.organizationId, ctx.organizationId)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A product with this SKU already exists",
        });
      }

      // Generate slug if not provided
      const slug = input.slug ?? input.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const [product] = await db
        .insert(products)
        .values({
          ...input,
          slug,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      return product;
    }),

  // Update product
  update: orgProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await db.query.products.findFirst({
        where: and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Check for duplicate SKU if SKU is being changed
      if (data.sku && data.sku !== existing.sku) {
        const duplicate = await db.query.products.findFirst({
          where: and(
            eq(products.sku, data.sku),
            eq(products.organizationId, ctx.organizationId)
          ),
        });

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A product with this SKU already exists",
          });
        }
      }

      // Track price changes for history
      if (data.priceNet && data.priceNet !== existing.priceNet) {
        await db.insert(productPriceHistory).values({
          productId: id,
          previousPriceNet: existing.priceNet,
          newPriceNet: data.priceNet,
          previousPriceGross: existing.priceGross,
          newPriceGross: data.priceGross ?? null,
          reason: "Price update",
          effectiveFrom: new Date(),
          createdBy: ctx.user.id,
        });
      }

      const [product] = await db
        .update(products)
        .set({
          ...data,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(products.id, id))
        .returning();

      return product;
    }),

  // Delete product
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.products.findFirst({
        where: and(
          eq(products.id, input.id),
          eq(products.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      await db.delete(products).where(eq(products.id, input.id));

      return { success: true };
    }),

  // Toggle active status
  toggleActive: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      active: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [product] = await db
        .update(products)
        .set({
          active: input.active,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(and(
          eq(products.id, input.id),
          eq(products.organizationId, ctx.organizationId)
        ))
        .returning();

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return product;
    }),

  // Update stock quantity
  updateStock: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      stockQuantity: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [product] = await db
        .update(products)
        .set({
          stockQuantity: input.stockQuantity,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(and(
          eq(products.id, input.id),
          eq(products.organizationId, ctx.organizationId)
        ))
        .returning();

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return product;
    }),

  // Get product statistics
  stats: orgProcedure.query(async ({ ctx }) => {
    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.organizationId, ctx.organizationId));

    const [activeResult] = await db
      .select({ count: count() })
      .from(products)
      .where(and(
        eq(products.organizationId, ctx.organizationId),
        eq(products.active, true)
      ));

    const byType = await db
      .select({
        type: products.type,
        count: count(),
      })
      .from(products)
      .where(eq(products.organizationId, ctx.organizationId))
      .groupBy(products.type);

    const byCategory = await db
      .select({
        category: products.category,
        count: count(),
      })
      .from(products)
      .where(eq(products.organizationId, ctx.organizationId))
      .groupBy(products.category);

    // Low stock products
    const [lowStockResult] = await db
      .select({ count: count() })
      .from(products)
      .where(and(
        eq(products.organizationId, ctx.organizationId),
        eq(products.trackInventory, true),
        sql`${products.stockQuantity} <= ${products.lowStockThreshold}`
      ));

    return {
      total: totalResult?.count ?? 0,
      active: activeResult?.count ?? 0,
      lowStock: lowStockResult?.count ?? 0,
      byType: Object.fromEntries(byType.map((r) => [r.type, r.count])),
      byCategory: Object.fromEntries(byCategory.map((r) => [r.category, r.count])),
    };
  }),
});

// =============================================================================
// PRODUCT VARIANTS ROUTER
// =============================================================================

export const productVariantsRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify product belongs to org
      const product = await db.query.products.findFirst({
        where: and(
          eq(products.id, input.productId),
          eq(products.organizationId, ctx.organizationId)
        ),
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const variants = await db.query.productVariants.findMany({
        where: eq(productVariants.productId, input.productId),
        orderBy: asc(productVariants.displayOrder),
      });

      return variants;
    }),

  create: orgProcedure
    .input(createVariantSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify product belongs to org
      const product = await db.query.products.findFirst({
        where: and(
          eq(products.id, input.productId),
          eq(products.organizationId, ctx.organizationId)
        ),
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Check for duplicate SKU
      const existingSku = await db.query.productVariants.findFirst({
        where: and(
          eq(productVariants.productId, input.productId),
          eq(productVariants.sku, input.sku)
        ),
      });

      if (existingSku) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A variant with this SKU already exists",
        });
      }

      const [variant] = await db
        .insert(productVariants)
        .values(input)
        .returning();

      return variant;
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().max(255).optional(),
      sku: z.string().max(50).optional(),
      options: z.record(z.string()).optional(),
      priceNet: z.string().optional(),
      priceGross: z.string().optional(),
      costPrice: z.string().optional(),
      stockQuantity: z.number().optional(),
      lowStockThreshold: z.number().optional(),
      active: z.boolean().optional(),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, id),
        with: {
          product: true,
        },
      });

      if (!existing || existing.product.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found",
        });
      }

      const [variant] = await db
        .update(productVariants)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, id))
        .returning();

      return variant;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, input.id),
        with: {
          product: true,
        },
      });

      if (!existing || existing.product.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found",
        });
      }

      await db.delete(productVariants).where(eq(productVariants.id, input.id));

      return { success: true };
    }),
});

// =============================================================================
// SERVICE PACKAGES ROUTER
// =============================================================================

export const servicePackagesRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
      packageType: z.string().optional(),
      active: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(servicePackages.organizationId, ctx.organizationId)];

      if (input?.subsidiary) conditions.push(eq(servicePackages.subsidiary, input.subsidiary));
      if (input?.packageType) conditions.push(eq(servicePackages.packageType, input.packageType));
      if (input?.active !== undefined) conditions.push(eq(servicePackages.active, input.active));

      const packages = await db.query.servicePackages.findMany({
        where: and(...conditions),
        orderBy: [asc(servicePackages.displayOrder), asc(servicePackages.name)],
      });

      return packages;
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pkg = await db.query.servicePackages.findFirst({
        where: and(
          eq(servicePackages.id, input.id),
          eq(servicePackages.organizationId, ctx.organizationId)
        ),
      });

      if (!pkg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service package not found",
        });
      }

      return pkg;
    }),

  create: orgProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      slug: z.string().max(255).optional(),
      description: z.string().optional(),
      subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
      packageType: z.string().min(1).max(50),
      targetAudience: z.string().max(100).optional(),
      basePrice: z.string(),
      pricePerSqm: z.string().optional(),
      currency: z.string().length(3).default("EUR"),
      includedProducts: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
        isOptional: z.boolean().optional(),
      })).optional(),
      includedServices: z.array(z.string()).optional(),
      excludedServices: z.array(z.string()).optional(),
      smartHomeConfig: z.object({
        provider: z.string(),
        maxDevices: z.number().optional(),
        includedRooms: z.number().optional(),
        features: z.array(z.string()).optional(),
      }).optional(),
      constructionConfig: z.object({
        energiestandard: z.string().optional(),
        gewerke: z.array(z.string()).optional(),
        garantiejahre: z.number().optional(),
      }).optional(),
      active: z.boolean().default(true),
      featured: z.boolean().default(false),
      displayOrder: z.number().default(0),
      image: z.string().optional(),
      brochureUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug ?? input.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const [pkg] = await db
        .insert(servicePackages)
        .values({
          ...input,
          slug,
          organizationId: ctx.organizationId,
        })
        .returning();

      return pkg;
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().max(255).optional(),
      slug: z.string().max(255).optional(),
      description: z.string().optional(),
      packageType: z.string().max(50).optional(),
      targetAudience: z.string().max(100).optional(),
      basePrice: z.string().optional(),
      pricePerSqm: z.string().optional(),
      includedProducts: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
        isOptional: z.boolean().optional(),
      })).optional(),
      includedServices: z.array(z.string()).optional(),
      excludedServices: z.array(z.string()).optional(),
      smartHomeConfig: z.any().optional(),
      constructionConfig: z.any().optional(),
      active: z.boolean().optional(),
      featured: z.boolean().optional(),
      displayOrder: z.number().optional(),
      image: z.string().optional(),
      brochureUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [pkg] = await db
        .update(servicePackages)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(
          eq(servicePackages.id, id),
          eq(servicePackages.organizationId, ctx.organizationId)
        ))
        .returning();

      if (!pkg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service package not found",
        });
      }

      return pkg;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.servicePackages.findFirst({
        where: and(
          eq(servicePackages.id, input.id),
          eq(servicePackages.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service package not found",
        });
      }

      await db.delete(servicePackages).where(eq(servicePackages.id, input.id));

      return { success: true };
    }),
});
