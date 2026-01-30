import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc";
import {
  db,
  campaigns,
  campaignEmails,
  campaignRecipients,
  emailTemplates,
  emailEvents,
  contacts,
  eq,
  and,
  desc,
  asc,
  count,
  sql,
  inArray,
} from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

// Must match database enums in @nexus/db/schema/enums.ts
const campaignStatuses = ["draft", "scheduled", "running", "paused", "completed", "cancelled"] as const;
const campaignTypes = ["one_time", "sequence", "trigger_based"] as const;

const campaignFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(campaignStatuses).optional(),
  type: z.enum(campaignTypes).optional(),
  createdBy: z.string().uuid().optional(),
  scheduledAfter: z.date().optional(),
  scheduledBefore: z.date().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createCampaignSchema = z.object({
  name: z.string().max(255),
  description: z.string().optional(),
  type: z.enum(campaignTypes).default("one_time"),

  // Sender
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),

  // A/B Testing
  isAbTest: z.boolean().default(false),
  abTestConfig: z.object({
    splitPercentage: z.number().min(1).max(50).optional(),
    winnerCriteria: z.enum(["opens", "clicks"]).optional(),
    testDuration: z.number().positive().optional(),
  }).optional(),

  // Settings
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(true),
  settings: z.object({
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    unsubscribeGroupId: z.string().optional(),
  }).optional(),
});

const updateCampaignSchema = createCampaignSchema.partial().extend({
  id: z.string().uuid(),
});

const addCampaignEmailSchema = z.object({
  campaignId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  name: z.string().max(255).optional(),
  subject: z.string().max(255),
  preheader: z.string().max(255).optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),

  // For sequences
  delayValue: z.number().int().positive().optional(),
  delayUnit: z.enum(["minutes", "hours", "days"]).optional(),

  // A/B Variant
  isVariant: z.boolean().default(false),
  variantName: z.string().max(50).optional(),
});

const setAudienceSchema = z.object({
  campaignId: z.string().uuid(),
  audienceType: z.enum(["all", "segment", "list"]),
  audienceListId: z.string().uuid().optional(),
  audienceFilters: z.object({
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown().refine((v) => v !== undefined, { message: "Value is required" }),
    })),
    logic: z.enum(["and", "or"]),
  }).optional().nullable(),
});

// =============================================================================
// CAMPAIGNS ROUTER
// =============================================================================

export const campaignsRouter = createTRPCRouter({
  // List campaigns with filters and pagination
  list: orgProcedure
    .input(z.object({
      filters: campaignFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(campaigns.organizationId, ctx.organizationId)];

      if (filters?.search) {
        conditions.push(
          sql`${campaigns.name} ILIKE ${`%${filters.search}%`}`
        );
      }

      if (filters?.status) {
        conditions.push(eq(campaigns.status, filters.status));
      }

      if (filters?.type) {
        conditions.push(eq(campaigns.type, filters.type));
      }

      if (filters?.createdBy) {
        conditions.push(eq(campaigns.createdBy, filters.createdBy));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(campaigns)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      // Get paginated results
      const sortField = campaigns[pagination?.sortBy as keyof typeof campaigns] ?? campaigns.createdAt;
      const sortOrder = pagination?.sortOrder === "asc" ? asc : desc;

      const items = await db.query.campaigns.findMany({
        where: and(...conditions),
        orderBy: sortOrder(sortField as any),
        limit,
        offset,
        with: {
          createdByUser: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
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

  // Get single campaign by ID with full details
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.id),
          eq(campaigns.organizationId, ctx.organizationId)
        ),
        with: {
          createdByUser: true,
          emails: {
            orderBy: asc(campaignEmails.order),
            with: {
              template: true,
            },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      return campaign;
    }),

  // Create new campaign
  create: orgProcedure
    .input(createCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await db
        .insert(campaigns)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          status: "draft",
          createdBy: ctx.user.id,
        })
        .returning();

      return campaign;
    }),

  // Update campaign
  update: orgProcedure
    .input(updateCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, id),
          eq(campaigns.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Can't update campaigns that have been completed
      if (existing.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update a completed campaign",
        });
      }

      const [campaign] = await db
        .update(campaigns)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      return campaign;
    }),

  // Add email to campaign
  addEmail: orgProcedure
    .input(addCampaignEmailSchema)
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.campaignId),
          eq(campaigns.organizationId, ctx.organizationId)
        ),
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Get next order
      const [lastEmail] = await db
        .select({ order: campaignEmails.order })
        .from(campaignEmails)
        .where(eq(campaignEmails.campaignId, input.campaignId))
        .orderBy(desc(campaignEmails.order))
        .limit(1);

      const nextOrder = (lastEmail?.order ?? -1) + 1;

      const [email] = await db
        .insert(campaignEmails)
        .values({
          ...input,
          order: nextOrder,
        })
        .returning();

      return email;
    }),

  // Update campaign email
  updateEmail: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      subject: z.string().max(255).optional(),
      preheader: z.string().max(255).optional(),
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const email = await db.query.campaignEmails.findFirst({
        where: eq(campaignEmails.id, id),
        with: {
          campaign: true,
        },
      });

      if (!email || email.campaign.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign email not found",
        });
      }

      const [updated] = await db
        .update(campaignEmails)
        .set(data)
        .where(eq(campaignEmails.id, id))
        .returning();

      return updated;
    }),

  // Set campaign audience
  setAudience: orgProcedure
    .input(setAudienceSchema)
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.campaignId),
          eq(campaigns.organizationId, ctx.organizationId)
        ),
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Calculate audience size
      let audienceSize = 0;

      if (input.audienceType === "all") {
        const [result] = await db
          .select({ count: count() })
          .from(contacts)
          .where(
            and(
              eq(contacts.organizationId, ctx.organizationId),
              eq(contacts.consentStatus, "granted"),
              eq(contacts.emailStatus, "active")
            )
          );
        audienceSize = result?.count ?? 0;
      }
      // TODO: Implement segment/list filtering

      const [updated] = await db
        .update(campaigns)
        .set({
          audienceType: input.audienceType,
          audienceListId: input.audienceListId,
          audienceFilters: input.audienceFilters,
          audienceSize,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, input.campaignId))
        .returning();

      return updated;
    }),

  // Schedule campaign
  schedule: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      scheduledAt: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.id),
          eq(campaigns.organizationId, ctx.organizationId)
        ),
        with: {
          emails: true,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Validate campaign is ready
      if (!campaign.emails.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign must have at least one email",
        });
      }

      if (!campaign.audienceSize || campaign.audienceSize === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign must have an audience",
        });
      }

      if (input.scheduledAt <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Scheduled time must be in the future",
        });
      }

      const [updated] = await db
        .update(campaigns)
        .set({
          status: "scheduled",
          scheduledAt: input.scheduledAt,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, input.id))
        .returning();

      return updated;
    }),

  // Cancel campaign
  cancel: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.id),
          eq(campaigns.organizationId, ctx.organizationId)
        ),
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (!["scheduled", "sending"].includes(campaign.status ?? "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only cancel scheduled or sending campaigns",
        });
      }

      const [updated] = await db
        .update(campaigns)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, input.id))
        .returning();

      return updated;
    }),

  // Get campaign analytics
  analytics: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.id),
          eq(campaigns.organizationId, ctx.organizationId)
        ),
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Get event counts
      const eventCounts = await db
        .select({
          eventType: emailEvents.eventType,
          count: count(),
        })
        .from(emailEvents)
        .where(eq(emailEvents.campaignId, input.id))
        .groupBy(emailEvents.eventType);

      // Get recipient status breakdown
      const recipientStatus = await db
        .select({
          status: campaignRecipients.status,
          count: count(),
        })
        .from(campaignRecipients)
        .where(eq(campaignRecipients.campaignId, input.id))
        .groupBy(campaignRecipients.status);

      // Get hourly opens/clicks for the last 24 hours
      const hourlyActivity = await db
        .select({
          hour: sql<string>`DATE_TRUNC('hour', ${emailEvents.occurredAt})`,
          eventType: emailEvents.eventType,
          count: count(),
        })
        .from(emailEvents)
        .where(
          and(
            eq(emailEvents.campaignId, input.id),
            sql`${emailEvents.occurredAt} > NOW() - INTERVAL '24 hours'`,
            inArray(emailEvents.eventType, ["open", "click"])
          )
        )
        .groupBy(
          sql`DATE_TRUNC('hour', ${emailEvents.occurredAt})`,
          emailEvents.eventType
        );

      return {
        campaign,
        metrics: {
          sent: campaign.emailsSent,
          delivered: campaign.emailsDelivered,
          opened: campaign.emailsOpened,
          uniqueOpens: campaign.uniqueOpens,
          clicked: campaign.emailsClicked,
          uniqueClicks: campaign.uniqueClicks,
          bounced: campaign.emailsBounced,
          complained: campaign.emailsComplained,
          unsubscribed: campaign.emailsUnsubscribed,
          openRate: campaign.openRate,
          clickRate: campaign.clickRate,
          bounceRate: campaign.bounceRate,
        },
        eventCounts: Object.fromEntries(
          eventCounts.map((e) => [e.eventType, e.count])
        ),
        recipientStatus: Object.fromEntries(
          recipientStatus.map((r) => [r.status, r.count])
        ),
        hourlyActivity,
      };
    }),

  // Get campaign statistics
  stats: orgProcedure.query(async ({ ctx }) => {
    const [totalResult] = await db
      .select({ count: count() })
      .from(campaigns)
      .where(eq(campaigns.organizationId, ctx.organizationId));

    const byStatus = await db
      .select({
        status: campaigns.status,
        count: count(),
      })
      .from(campaigns)
      .where(eq(campaigns.organizationId, ctx.organizationId))
      .groupBy(campaigns.status);

    const byType = await db
      .select({
        type: campaigns.type,
        count: count(),
      })
      .from(campaigns)
      .where(eq(campaigns.organizationId, ctx.organizationId))
      .groupBy(campaigns.type);

    // Aggregate metrics
    const [metricsResult] = await db
      .select({
        totalSent: sql<number>`COALESCE(SUM(${campaigns.emailsSent}), 0)`,
        totalOpens: sql<number>`COALESCE(SUM(${campaigns.uniqueOpens}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${campaigns.uniqueClicks}), 0)`,
      })
      .from(campaigns)
      .where(eq(campaigns.organizationId, ctx.organizationId));

    return {
      total: totalResult?.count ?? 0,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
      byType: Object.fromEntries(byType.map((r) => [r.type, r.count])),
      metrics: {
        totalSent: metricsResult?.totalSent ?? 0,
        totalOpens: metricsResult?.totalOpens ?? 0,
        totalClicks: metricsResult?.totalClicks ?? 0,
      },
    };
  }),

  // Delete campaign
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.id),
          eq(campaigns.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      await db.delete(campaigns).where(eq(campaigns.id, input.id));

      return { success: true };
    }),
});

// =============================================================================
// EMAIL TEMPLATES ROUTER
// =============================================================================

export const emailTemplatesRouter = createTRPCRouter({
  // List templates
  list: orgProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const conditions = [
        sql`(${emailTemplates.organizationId} = ${ctx.organizationId} OR ${emailTemplates.organizationId} IS NULL)`,
        eq(emailTemplates.isActive, true),
      ];

      if (input.category) {
        conditions.push(eq(emailTemplates.category, input.category));
      }

      if (input.search) {
        conditions.push(
          sql`${emailTemplates.name} ILIKE ${`%${input.search}%`}`
        );
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(emailTemplates)
        .where(and(...conditions));

      const templates = await db
        .select()
        .from(emailTemplates)
        .where(and(...conditions))
        .orderBy(desc(emailTemplates.updatedAt))
        .limit(input.limit)
        .offset(offset);

      return {
        items: templates,
        total: countResult?.count ?? 0,
        page: input.page,
        limit: input.limit,
        hasMore: offset + templates.length < (countResult?.count ?? 0),
      };
    }),

  // Get template by ID
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await db.query.emailTemplates.findFirst({
        where: and(
          eq(emailTemplates.id, input.id),
          sql`(${emailTemplates.organizationId} = ${ctx.organizationId} OR ${emailTemplates.organizationId} IS NULL)`
        ),
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      return template;
    }),

  // Create template
  create: orgProcedure
    .input(z.object({
      name: z.string().max(255),
      category: z.string().max(50).optional(),
      subject: z.string().max(255).optional(),
      preheader: z.string().max(255).optional(),
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
      designJson: z.unknown().optional(),
      variables: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [template] = await db
        .insert(emailTemplates)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
        })
        .returning();

      return template;
    }),

  // Update template
  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().max(255).optional(),
      category: z.string().max(50).optional(),
      subject: z.string().max(255).optional(),
      preheader: z.string().max(255).optional(),
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
      designJson: z.unknown().optional(),
      variables: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await db.query.emailTemplates.findFirst({
        where: and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      if (existing.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify system templates",
        });
      }

      const [template] = await db
        .update(emailTemplates)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.id, id))
        .returning();

      return template;
    }),

  // Delete template
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.emailTemplates.findFirst({
        where: and(
          eq(emailTemplates.id, input.id),
          eq(emailTemplates.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      if (existing.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system templates",
        });
      }

      await db.delete(emailTemplates).where(eq(emailTemplates.id, input.id));

      return { success: true };
    }),
});
