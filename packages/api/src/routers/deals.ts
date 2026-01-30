import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc";
import {
  db,
  deals,
  pipelines,
  pipelineStages,
  dealActivities,
  dealProducts,
  eq,
  and,
  desc,
  asc,
  count,
  sum,
  sql
} from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const dealFilterSchema = z.object({
  search: z.string().optional(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  ownerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  closeDateFrom: z.date().optional(),
  closeDateTo: z.date().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createDealSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  contactId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  amount: z.string().optional(), // decimal as string
  currency: z.string().length(3).default("EUR"),
  probability: z.number().min(0).max(100).default(0),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  dealType: z.string().max(50).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  source: z.string().max(100).optional(),
  expectedCloseDate: z.date().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateDealSchema = createDealSchema.partial().extend({
  id: z.string().uuid(),
});

const moveDealSchema = z.object({
  dealId: z.string().uuid(),
  stageId: z.string().uuid(),
});

// =============================================================================
// DEALS ROUTER
// =============================================================================

export const dealsRouter = createTRPCRouter({
  // List deals with filters and pagination
  list: orgProcedure
    .input(z.object({
      filters: dealFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(deals.organizationId, ctx.organizationId)];

      if (filters?.search) {
        conditions.push(
          sql`(
            ${deals.name} ILIKE ${`%${filters.search}%`} OR
            ${deals.description} ILIKE ${`%${filters.search}%`}
          )`
        );
      }

      if (filters?.pipelineId) {
        conditions.push(eq(deals.pipelineId, filters.pipelineId));
      }

      if (filters?.stageId) {
        conditions.push(eq(deals.stageId, filters.stageId));
      }

      if (filters?.stage) {
        conditions.push(eq(deals.stage, filters.stage));
      }

      if (filters?.subsidiary) {
        conditions.push(eq(deals.subsidiary, filters.subsidiary));
      }

      if (filters?.ownerId) {
        conditions.push(eq(deals.ownerId, filters.ownerId));
      }

      if (filters?.contactId) {
        conditions.push(eq(deals.contactId, filters.contactId));
      }

      if (filters?.priority) {
        conditions.push(eq(deals.priority, filters.priority));
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(deals)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const sortField = deals[pagination?.sortBy as keyof typeof deals] ?? deals.createdAt;
      const sortOrder = pagination?.sortOrder === "asc" ? asc : desc;

      const items = await db.query.deals.findMany({
        where: and(...conditions),
        orderBy: sortOrder(sortField as any),
        limit,
        offset,
        with: {
          contact: true,
          owner: true,
          pipeline: true,
          stage: true,
        },
      });

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Get deals grouped by stage (Kanban view)
  kanban: orgProcedure
    .input(z.object({
      pipelineId: z.string().uuid().optional(),
      filters: dealFilterSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get pipeline stages
      const stagesQuery = input.pipelineId
        ? await db.query.pipelineStages.findMany({
            where: eq(pipelineStages.pipelineId, input.pipelineId),
            orderBy: asc(pipelineStages.order),
          })
        : [];

      // Get deals grouped by stage
      const conditions = [eq(deals.organizationId, ctx.organizationId)];

      if (input.pipelineId) {
        conditions.push(eq(deals.pipelineId, input.pipelineId));
      }

      if (input.filters?.ownerId) {
        conditions.push(eq(deals.ownerId, input.filters.ownerId));
      }

      const allDeals = await db.query.deals.findMany({
        where: and(...conditions),
        with: {
          contact: true,
          owner: true,
        },
        orderBy: desc(deals.updatedAt),
      });

      // Group by stage
      const dealsByStage = new Map<string, typeof allDeals>();

      for (const deal of allDeals) {
        const stageKey = deal.stageId ?? deal.stage ?? "unknown";
        if (!dealsByStage.has(stageKey)) {
          dealsByStage.set(stageKey, []);
        }
        dealsByStage.get(stageKey)!.push(deal);
      }

      return {
        stages: stagesQuery,
        dealsByStage: Object.fromEntries(dealsByStage),
      };
    }),

  // Get single deal by ID
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const deal = await db.query.deals.findFirst({
        where: and(
          eq(deals.id, input.id),
          eq(deals.organizationId, ctx.organizationId)
        ),
        with: {
          contact: true,
          owner: true,
          pipeline: true,
          stage: true,
          activities: {
            orderBy: desc(dealActivities.occurredAt),
            limit: 50,
          },
          products: true,
        },
      });

      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      return deal;
    }),

  // Create new deal
  create: orgProcedure
    .input(createDealSchema)
    .mutation(async ({ ctx, input }) => {
      // Calculate weighted value
      const amount = input.amount ? parseFloat(input.amount) : 0;
      const weightedValue = (amount * (input.probability / 100)).toFixed(2);

      const [deal] = await db
        .insert(deals)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          weightedValue,
          ownerId: ctx.user.id,
        })
        .returning();

      // Log activity
      await db.insert(dealActivities).values({
        dealId: deal.id,
        organizationId: ctx.organizationId,
        type: "created",
        title: "Deal created",
        performedBy: ctx.user.id,
      });

      return deal;
    }),

  // Update deal
  update: orgProcedure
    .input(updateDealSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await db.query.deals.findFirst({
        where: and(
          eq(deals.id, id),
          eq(deals.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      // Recalculate weighted value if amount or probability changed
      let weightedValue = existing.weightedValue;
      if (data.amount || data.probability !== undefined) {
        const amount = data.amount ? parseFloat(data.amount) : parseFloat(existing.amount ?? "0");
        const probability = data.probability ?? existing.probability ?? 0;
        weightedValue = (amount * (probability / 100)).toFixed(2);
      }

      const [deal] = await db
        .update(deals)
        .set({
          ...data,
          weightedValue,
          updatedAt: new Date(),
        })
        .where(eq(deals.id, id))
        .returning();

      // Log activity
      await db.insert(dealActivities).values({
        dealId: deal.id,
        organizationId: ctx.organizationId,
        type: "updated",
        title: "Deal updated",
        performedBy: ctx.user.id,
        metadata: { changedFields: Object.keys(data) },
      });

      return deal;
    }),

  // Move deal to different stage
  moveToStage: orgProcedure
    .input(moveDealSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.deals.findFirst({
        where: and(
          eq(deals.id, input.dealId),
          eq(deals.organizationId, ctx.organizationId)
        ),
        with: {
          stage: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      const newStage = await db.query.pipelineStages.findFirst({
        where: eq(pipelineStages.id, input.stageId),
      });

      if (!newStage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stage not found",
        });
      }

      const [deal] = await db
        .update(deals)
        .set({
          stageId: input.stageId,
          probability: newStage.probability ?? existing.probability,
          stageChangedAt: new Date(),
          updatedAt: new Date(),
          // Set close dates for won/lost stages
          ...(newStage.isClosed && newStage.isWon ? { actualCloseDate: new Date() } : {}),
          ...(newStage.isClosed && !newStage.isWon ? { actualCloseDate: new Date() } : {}),
        })
        .where(eq(deals.id, input.dealId))
        .returning();

      // Log stage change activity
      await db.insert(dealActivities).values({
        dealId: deal.id,
        organizationId: ctx.organizationId,
        type: "stage_change",
        title: `Moved to ${newStage.name}`,
        fromStageId: existing.stageId,
        toStageId: input.stageId,
        performedBy: ctx.user.id,
      });

      return deal;
    }),

  // Delete deal
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.deals.findFirst({
        where: and(
          eq(deals.id, input.id),
          eq(deals.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      await db.delete(deals).where(eq(deals.id, input.id));

      return { success: true };
    }),

  // Get deal statistics
  stats: orgProcedure
    .input(z.object({
      pipelineId: z.string().uuid().optional(),
      dateRange: z.object({
        from: z.date().optional(),
        to: z.date().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(deals.organizationId, ctx.organizationId)];

      if (input.pipelineId) {
        conditions.push(eq(deals.pipelineId, input.pipelineId));
      }

      const [totalResult] = await db
        .select({
          count: count(),
          totalValue: sum(deals.amount),
          weightedValue: sum(deals.weightedValue),
        })
        .from(deals)
        .where(and(...conditions));

      const byStage = await db
        .select({
          stage: deals.stage,
          count: count(),
          value: sum(deals.amount),
        })
        .from(deals)
        .where(and(...conditions))
        .groupBy(deals.stage);

      // Won deals this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [wonThisMonth] = await db
        .select({
          count: count(),
          value: sum(deals.amount),
        })
        .from(deals)
        .where(and(
          eq(deals.organizationId, ctx.organizationId),
          eq(deals.stage, "won"),
          sql`${deals.actualCloseDate} >= ${startOfMonth}`
        ));

      return {
        total: totalResult?.count ?? 0,
        totalValue: totalResult?.totalValue ?? "0",
        weightedValue: totalResult?.weightedValue ?? "0",
        byStage: Object.fromEntries(byStage.map((r) => [r.stage, { count: r.count, value: r.value }])),
        wonThisMonth: {
          count: wonThisMonth?.count ?? 0,
          value: wonThisMonth?.value ?? "0",
        },
      };
    }),

  // Add note to deal
  addNote: orgProcedure
    .input(z.object({
      dealId: z.string().uuid(),
      note: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.deals.findFirst({
        where: and(
          eq(deals.id, input.dealId),
          eq(deals.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      const [activity] = await db
        .insert(dealActivities)
        .values({
          dealId: input.dealId,
          organizationId: ctx.organizationId,
          type: "note",
          description: input.note,
          performedBy: ctx.user.id,
        })
        .returning();

      return activity;
    }),
});

// =============================================================================
// PIPELINES ROUTER
// =============================================================================

export const pipelinesRouter = createTRPCRouter({
  // List pipelines
  list: orgProcedure.query(async ({ ctx }) => {
    return db.query.pipelines.findMany({
      where: eq(pipelines.organizationId, ctx.organizationId),
      with: {
        stages: {
          orderBy: asc(pipelineStages.order),
        },
      },
      orderBy: [desc(pipelines.isDefault), asc(pipelines.name)],
    });
  }),

  // Get pipeline with stages
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pipeline = await db.query.pipelines.findFirst({
        where: and(
          eq(pipelines.id, input.id),
          eq(pipelines.organizationId, ctx.organizationId)
        ),
        with: {
          stages: {
            orderBy: asc(pipelineStages.order),
          },
        },
      });

      if (!pipeline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      return pipeline;
    }),

  // Create pipeline with default stages
  create: orgProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [pipeline] = await db
        .insert(pipelines)
        .values({
          ...input,
          organizationId: ctx.organizationId,
        })
        .returning();

      // Create default stages
      const defaultStages = [
        { name: "Lead", probability: 10, order: 0, color: "#6B7280" },
        { name: "Qualified", probability: 25, order: 1, color: "#3B82F6" },
        { name: "Proposal", probability: 50, order: 2, color: "#F59E0B" },
        { name: "Negotiation", probability: 75, order: 3, color: "#8B5CF6" },
        { name: "Won", probability: 100, order: 4, color: "#10B981", isClosed: true, isWon: true },
        { name: "Lost", probability: 0, order: 5, color: "#EF4444", isClosed: true, isWon: false },
      ];

      await db.insert(pipelineStages).values(
        defaultStages.map((stage) => ({
          ...stage,
          pipelineId: pipeline.id,
        }))
      );

      return pipeline;
    }),
});
