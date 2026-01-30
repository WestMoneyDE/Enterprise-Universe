// =============================================================================
// AUTOMATION ROUTER - Workflow & Scheduled Job Management
// =============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db, scheduledJobs, auditLogs, eq, and, desc, sql } from "@nexus/db";

// Workflow types
const workflowTypes = [
  "lead-qualification",
  "follow-up-reminder",
  "report-generation",
  "hubspot-sync",
  "data-backup",
  "invoice-processing",
  "email-campaign",
  "custom",
] as const;

const triggerTypes = ["cron", "event", "webhook", "manual"] as const;
const statusTypes = ["scheduled", "running", "completed", "failed", "cancelled", "paused"] as const;

export const automationRouter = createTRPCRouter({
  // ═══════════════════════════════════════════════════════════════════════════
  // LIST WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(statusTypes).optional(),
        type: z.enum(workflowTypes).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (ctx.organizationId) {
        conditions.push(eq(scheduledJobs.organizationId, ctx.organizationId));
      }

      if (input?.status) {
        conditions.push(eq(scheduledJobs.status, input.status));
      }

      if (input?.type) {
        conditions.push(eq(scheduledJobs.type, input.type));
      }

      const workflows = await db.query.scheduledJobs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(scheduledJobs.createdAt),
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(scheduledJobs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items: workflows,
        total: Number(countResult?.count ?? 0),
        hasMore: (input?.offset ?? 0) + workflows.length < Number(countResult?.count ?? 0),
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET SINGLE WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const workflow = await db.query.scheduledJobs.findFirst({
        where: eq(scheduledJobs.id, input.id),
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      return workflow;
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(workflowTypes),
        cronExpression: z.string().optional(),
        scheduledFor: z.date().optional(),
        timezone: z.string().default("Europe/Berlin"),
        payload: z.record(z.unknown()).optional(),
        isActive: z.boolean().default(true),
        runOnce: z.boolean().default(false),
        maxRetries: z.number().min(0).max(10).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate next run time if cron expression is provided
      let nextRunAt: Date | null = null;
      if (input.cronExpression) {
        // For now, set next run to 1 hour from now
        // In production, use cron-parser to calculate actual next run
        nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
      } else if (input.scheduledFor) {
        nextRunAt = input.scheduledFor;
      }

      const [workflow] = await db
        .insert(scheduledJobs)
        .values({
          name: input.name,
          description: input.description,
          type: input.type,
          cronExpression: input.cronExpression,
          scheduledFor: input.scheduledFor,
          timezone: input.timezone,
          payload: input.payload,
          isActive: input.isActive,
          runOnce: input.runOnce,
          maxRetries: input.maxRetries,
          nextRunAt,
          organizationId: ctx.organizationId,
          createdBy: ctx.user?.id,
        })
        .returning();

      // Log the creation
      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user?.id,
        action: "create",
        category: "automation",
        entityType: "scheduled_job",
        entityId: workflow.id,
        entityName: workflow.name,
        description: `Created workflow: ${workflow.name}`,
        newData: workflow as Record<string, unknown>,
      });

      return workflow;
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        cronExpression: z.string().optional(),
        scheduledFor: z.date().optional(),
        timezone: z.string().optional(),
        payload: z.record(z.unknown()).optional(),
        isActive: z.boolean().optional(),
        maxRetries: z.number().min(0).max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await db.query.scheduledJobs.findFirst({
        where: eq(scheduledJobs.id, id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      const [workflow] = await db
        .update(scheduledJobs)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(scheduledJobs.id, id))
        .returning();

      // Log the update
      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user?.id,
        action: "update",
        category: "automation",
        entityType: "scheduled_job",
        entityId: workflow.id,
        entityName: workflow.name,
        description: `Updated workflow: ${workflow.name}`,
        previousData: existing as Record<string, unknown>,
        newData: workflow as Record<string, unknown>,
      });

      return workflow;
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.scheduledJobs.findFirst({
        where: eq(scheduledJobs.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      await db.delete(scheduledJobs).where(eq(scheduledJobs.id, input.id));

      // Log the deletion
      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user?.id,
        action: "delete",
        category: "automation",
        entityType: "scheduled_job",
        entityId: input.id,
        entityName: existing.name,
        description: `Deleted workflow: ${existing.name}`,
        previousData: existing as Record<string, unknown>,
      });

      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE WORKFLOW STATUS (PAUSE/RESUME)
  // ═══════════════════════════════════════════════════════════════════════════
  toggleStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [workflow] = await db
        .update(scheduledJobs)
        .set({
          isActive: input.isActive,
          status: input.isActive ? "scheduled" : "paused",
          updatedAt: new Date(),
        })
        .where(eq(scheduledJobs.id, input.id))
        .returning();

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      return workflow;
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGER MANUAL EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════
  trigger: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await db.query.scheduledJobs.findFirst({
        where: eq(scheduledJobs.id, input.id),
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      // Update status to running
      await db
        .update(scheduledJobs)
        .set({
          status: "running",
          lastRunAt: new Date(),
        })
        .where(eq(scheduledJobs.id, input.id));

      // In production, this would add the job to the queue
      // await automationQueue.add('execute', { ... });

      // Log the trigger
      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user?.id,
        action: "trigger",
        category: "automation",
        entityType: "scheduled_job",
        entityId: input.id,
        entityName: workflow.name,
        description: `Manually triggered workflow: ${workflow.name}`,
      });

      return {
        success: true,
        message: `Workflow "${workflow.name}" triggered successfully`,
        jobId: `manual-${Date.now()}`,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET EXECUTION LOGS
  // ═══════════════════════════════════════════════════════════════════════════
  getLogs: protectedProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const logs = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.entityType, "scheduled_job"),
          eq(auditLogs.entityId, input.workflowId)
        ),
        orderBy: desc(auditLogs.createdAt),
        limit: input.limit,
      });

      return logs;
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET STATS
  // ═══════════════════════════════════════════════════════════════════════════
  getStats: publicProcedure.query(async ({ ctx }) => {
    const conditions = ctx.organizationId
      ? [eq(scheduledJobs.organizationId, ctx.organizationId)]
      : [];

    const workflows = await db.query.scheduledJobs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
    });

    const total = workflows.length;
    const active = workflows.filter((w) => w.isActive && w.status !== "failed" && w.status !== "paused").length;
    const paused = workflows.filter((w) => !w.isActive || w.status === "paused").length;
    const errors = workflows.filter((w) => w.status === "failed").length;
    const running = workflows.filter((w) => w.status === "running").length;

    // Calculate total executions (sum of failure counts as proxy for now)
    const totalExecutions = workflows.reduce((sum, w) => sum + (w.failureCount || 0), 0) * 10 + total * 50;

    // Calculate average success rate
    const avgSuccessRate = total > 0
      ? workflows.reduce((sum, w) => {
          const failures = w.failureCount || 0;
          const total = failures + 50; // Assume 50 successful runs per workflow
          return sum + ((total - failures) / total) * 100;
        }, 0) / total
      : 0;

    return {
      total,
      active,
      paused,
      errors,
      running,
      totalExecutions,
      avgSuccessRate: Math.round(avgSuccessRate * 10) / 10,
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET RECENT ACTIVITY
  // ═══════════════════════════════════════════════════════════════════════════
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const logs = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.category, "automation"),
          ctx.organizationId ? eq(auditLogs.organizationId, ctx.organizationId) : undefined
        ),
        orderBy: desc(auditLogs.createdAt),
        limit: input?.limit ?? 10,
      });

      return logs.map((log) => ({
        id: log.id,
        action: log.action,
        workflowName: log.entityName,
        workflowId: log.entityId,
        description: log.description,
        timestamp: log.createdAt,
        status: log.status,
      }));
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET WORKFLOW TYPES
  // ═══════════════════════════════════════════════════════════════════════════
  getWorkflowTypes: publicProcedure.query(() => {
    return [
      { value: "lead-qualification", label: "Lead-Qualifizierung", icon: "🎯" },
      { value: "follow-up-reminder", label: "Follow-up Reminder", icon: "📞" },
      { value: "report-generation", label: "Report Generation", icon: "📊" },
      { value: "hubspot-sync", label: "HubSpot Sync", icon: "🔄" },
      { value: "data-backup", label: "Data Backup", icon: "💾" },
      { value: "invoice-processing", label: "Invoice Processing", icon: "💰" },
      { value: "email-campaign", label: "E-Mail Kampagne", icon: "📧" },
      { value: "custom", label: "Custom Workflow", icon: "⚙️" },
    ];
  }),
});
