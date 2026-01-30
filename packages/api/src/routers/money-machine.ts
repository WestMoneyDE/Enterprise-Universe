import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, publicProcedure } from "../trpc";
import { db, moneyMachineWorkflows, moneyMachineActivities, presentations, presentationViews, eq, and, desc } from "@nexus/db";
import { getMoneyMachineService } from "../services/money-machine";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const startFromHubSpotSchema = z.object({
  hubspotDealId: z.string(),
});

const startFromDealSchema = z.object({
  dealId: z.string().uuid(),
});

const workflowIdSchema = z.object({
  workflowId: z.string().uuid(),
});

const createKundenkarteSchema = z.object({
  workflowId: z.string().uuid(),
  data: z.object({
    vorname: z.string().optional(),
    nachname: z.string().optional(),
    email: z.string().email().optional(),
    telefon: z.string().optional(),
  }).optional(),
});

const sendEmailSchema = z.object({
  workflowId: z.string().uuid(),
  emailTo: z.string().email().optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
});

const markSoldSchema = z.object({
  workflowId: z.string().uuid(),
  revenue: z.number().optional(), // in cents
});

const recordViewSchema = z.object({
  accessToken: z.string(),
  duration: z.number().optional(),
  deviceType: z.string().optional(),
  slidesViewed: z.array(z.object({
    slideIndex: z.number(),
    viewedAt: z.string(),
    duration: z.number(),
  })).optional(),
  maxSlideReached: z.number().optional(),
  completedViewing: z.boolean().optional(),
  clickedContactButton: z.boolean().optional(),
  clickedBauherrenPass: z.boolean().optional(),
});

const listWorkflowsSchema = z.object({
  stage: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// =============================================================================
// MONEY MACHINE ROUTER
// =============================================================================

export const moneyMachineRouter = createTRPCRouter({
  // ===========================================================================
  // WORKFLOW INITIATION
  // ===========================================================================

  /**
   * Start Money Machine workflow from a HubSpot deal
   */
  startFromHubSpot: orgProcedure
    .input(startFromHubSpotSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const result = await service.startFromHubSpotDeal(input.hubspotDealId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to start workflow",
        });
      }

      return result;
    }),

  /**
   * Start Money Machine workflow from a Nexus deal
   */
  startFromDeal: orgProcedure
    .input(startFromDealSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const result = await service.startFromDeal(input.dealId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to start workflow",
        });
      }

      return result;
    }),

  // ===========================================================================
  // WORKFLOW QUERIES
  // ===========================================================================

  /**
   * Get a single workflow by ID
   */
  getWorkflow: orgProcedure
    .input(workflowIdSchema)
    .query(async ({ ctx, input }) => {
      const workflow = await db.query.moneyMachineWorkflows.findFirst({
        where: and(
          eq(moneyMachineWorkflows.id, input.workflowId),
          eq(moneyMachineWorkflows.organizationId, ctx.organizationId)
        ),
        with: {
          deal: true,
          kundenkarte: true,
          presentation: true,
          contact: true,
          activities: {
            orderBy: [desc(moneyMachineActivities.occurredAt)],
            limit: 20,
          },
        },
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow nicht gefunden",
        });
      }

      return workflow;
    }),

  /**
   * List all workflows
   */
  listWorkflows: orgProcedure
    .input(listWorkflowsSchema)
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        eq(moneyMachineWorkflows.organizationId, ctx.organizationId),
      ];

      if (input.stage) {
        whereConditions.push(
          eq(moneyMachineWorkflows.currentStage, input.stage as any)
        );
      }

      const workflows = await db.query.moneyMachineWorkflows.findMany({
        where: and(...whereConditions),
        with: {
          deal: true,
          kundenkarte: true,
          contact: true,
        },
        orderBy: [desc(moneyMachineWorkflows.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Count total
      const allWorkflows = await db.query.moneyMachineWorkflows.findMany({
        where: and(...whereConditions),
        columns: { id: true },
      });

      return {
        items: workflows,
        total: allWorkflows.length,
        hasMore: input.offset + workflows.length < allWorkflows.length,
      };
    }),

  /**
   * Get workflow statistics for dashboard
   */
  getStats: orgProcedure.query(async ({ ctx }) => {
    const service = await getMoneyMachineService(ctx.organizationId);
    return service.getWorkflowStats();
  }),

  /**
   * Get workflows that need action
   */
  getActionRequired: orgProcedure.query(async ({ ctx }) => {
    const service = await getMoneyMachineService(ctx.organizationId);
    return service.getActionRequired();
  }),

  // ===========================================================================
  // KUNDENKARTE MANAGEMENT
  // ===========================================================================

  /**
   * Create or link Kundenkarte to workflow
   */
  createKundenkarte: orgProcedure
    .input(createKundenkarteSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const result = await service.createKundenkarte(input.workflowId, input.data);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to create Kundenkarte",
        });
      }

      return result;
    }),

  // ===========================================================================
  // DOCUMENT MANAGEMENT
  // ===========================================================================

  /**
   * Check document upload status
   */
  checkDocuments: orgProcedure
    .input(workflowIdSchema)
    .query(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      return service.checkDocuments(input.workflowId);
    }),

  /**
   * Mark documents as pending
   */
  markDocumentsPending: orgProcedure
    .input(workflowIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      return service.markDocumentsPending(input.workflowId);
    }),

  // ===========================================================================
  // PRESENTATION MANAGEMENT
  // ===========================================================================

  /**
   * Generate presentation for workflow
   */
  generatePresentation: orgProcedure
    .input(workflowIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const result = await service.generatePresentation(input.workflowId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to generate presentation",
        });
      }

      return result;
    }),

  /**
   * Get presentation by access token (public endpoint)
   */
  getPresentation: publicProcedure
    .input(z.object({ accessToken: z.string() }))
    .query(async ({ input }) => {
      const presentation = await db.query.presentations.findFirst({
        where: eq(presentations.accessToken, input.accessToken),
        with: {
          deal: true,
          kundenkarte: true,
        },
      });

      if (!presentation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Präsentation nicht gefunden",
        });
      }

      // Check expiry
      if (presentation.expiresAt && new Date() > presentation.expiresAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Präsentation abgelaufen",
        });
      }

      return {
        id: presentation.id,
        title: presentation.title,
        description: presentation.description,
        slides: presentation.slides,
        customerSnapshot: presentation.customerSnapshot,
        includedDocuments: presentation.includedDocuments,
        viewCount: presentation.viewCount,
        bauherrenPassOffered: presentation.bauherrenPassOffered,
      };
    }),

  // ===========================================================================
  // EMAIL SENDING
  // ===========================================================================

  /**
   * Send presentation via email
   */
  sendEmail: orgProcedure
    .input(sendEmailSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const result = await service.sendPresentationEmail(input.workflowId, {
        emailTo: input.emailTo,
        subject: input.subject,
        message: input.message,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to send email",
        });
      }

      return result;
    }),

  // ===========================================================================
  // BAUHERREN-PASS
  // ===========================================================================

  /**
   * Offer Bauherren-Pass to customer
   */
  offerBauherrenPass: orgProcedure
    .input(workflowIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const result = await service.offerBauherrenPass(input.workflowId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to offer Bauherren-Pass",
        });
      }

      return result;
    }),

  /**
   * Mark Bauherren-Pass as sold
   */
  markBauherrenPassSold: orgProcedure
    .input(markSoldSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const result = await service.markBauherrenPassSold(input.workflowId, input.revenue);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to mark Bauherren-Pass as sold",
        });
      }

      return result;
    }),

  // ===========================================================================
  // WORKFLOW COMPLETION
  // ===========================================================================

  /**
   * Complete the workflow
   */
  completeWorkflow: orgProcedure
    .input(workflowIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const result = await service.completeWorkflow(input.workflowId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to complete workflow",
        });
      }

      return result;
    }),

  // ===========================================================================
  // TRACKING
  // ===========================================================================

  /**
   * Record presentation view (public endpoint for tracking)
   */
  recordView: publicProcedure
    .input(recordViewSchema)
    .mutation(async ({ input }) => {
      // Get presentation to find workflow
      const presentation = await db.query.presentations.findFirst({
        where: eq(presentations.accessToken, input.accessToken),
      });

      if (!presentation) {
        return { success: false };
      }

      // Find the workflow for this presentation to get organizationId
      const workflow = await db.query.moneyMachineWorkflows.findFirst({
        where: eq(moneyMachineWorkflows.presentationId, presentation.id),
      });

      if (workflow) {
        const service = await getMoneyMachineService(workflow.organizationId);
        await service.recordPresentationView(input.accessToken, {
          duration: input.duration,
          deviceType: input.deviceType,
          slidesViewed: input.slidesViewed,
          maxSlideReached: input.maxSlideReached,
          completedViewing: input.completedViewing,
          clickedContactButton: input.clickedContactButton,
          clickedBauherrenPass: input.clickedBauherrenPass,
        });
      }

      return { success: true };
    }),

  /**
   * Get presentation views/analytics
   */
  getPresentationAnalytics: orgProcedure
    .input(z.object({ presentationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify presentation belongs to organization
      const presentation = await db.query.presentations.findFirst({
        where: and(
          eq(presentations.id, input.presentationId),
          eq(presentations.organizationId, ctx.organizationId)
        ),
      });

      if (!presentation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Präsentation nicht gefunden",
        });
      }

      const views = await db.query.presentationViews.findMany({
        where: eq(presentationViews.presentationId, input.presentationId),
        orderBy: [desc(presentationViews.viewedAt)],
      });

      // Calculate analytics
      const totalViews = views.length;
      const totalDuration = views.reduce((sum, v) => sum + (v.duration ?? 0), 0);
      const averageDuration = totalViews > 0 ? Math.round(totalDuration / totalViews) : 0;
      const completedViewings = views.filter(v => v.completedViewing).length;
      const contactClicks = views.filter(v => v.clickedContactButton).length;
      const bauherrenPassClicks = views.filter(v => v.clickedBauherrenPass).length;

      // Device breakdown
      const deviceTypes: Record<string, number> = {};
      for (const view of views) {
        const device = view.deviceType ?? "unknown";
        deviceTypes[device] = (deviceTypes[device] ?? 0) + 1;
      }

      return {
        totalViews,
        averageDuration,
        completedViewings,
        completionRate: totalViews > 0 ? (completedViewings / totalViews) * 100 : 0,
        contactClicks,
        bauherrenPassClicks,
        deviceTypes,
        recentViews: views.slice(0, 10).map(v => ({
          viewedAt: v.viewedAt,
          duration: v.duration,
          deviceType: v.deviceType,
          maxSlideReached: v.maxSlideReached,
          completedViewing: v.completedViewing,
        })),
      };
    }),

  // ===========================================================================
  // BULK OPERATIONS
  // ===========================================================================

  /**
   * Start workflows for multiple HubSpot deals
   */
  bulkStartFromHubSpot: orgProcedure
    .input(z.object({
      hubspotDealIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await getMoneyMachineService(ctx.organizationId);
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const dealId of input.hubspotDealIds) {
        const result = await service.startFromHubSpotDeal(dealId);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Deal ${dealId}: ${result.error}`);
        }
      }

      return results;
    }),

  /**
   * Get workflow activity log
   */
  getActivityLog: orgProcedure
    .input(z.object({
      workflowId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Verify workflow belongs to organization
      const workflow = await db.query.moneyMachineWorkflows.findFirst({
        where: and(
          eq(moneyMachineWorkflows.id, input.workflowId),
          eq(moneyMachineWorkflows.organizationId, ctx.organizationId)
        ),
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow nicht gefunden",
        });
      }

      const activities = await db.query.moneyMachineActivities.findMany({
        where: eq(moneyMachineActivities.workflowId, input.workflowId),
        orderBy: [desc(moneyMachineActivities.occurredAt)],
        limit: input.limit,
        with: {
          performer: true,
        },
      });

      return activities;
    }),
});
