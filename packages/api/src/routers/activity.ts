// =============================================================================
// ACTIVITY ROUTER - Real-time activity feed from audit logs
// =============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db, auditLogs, notifications, eq, and, desc, sql, gt } from "@nexus/db";

// Activity type icons and colors
const activityConfig: Record<string, { icon: string; color: string }> = {
  // Auth actions
  login: { icon: "🔐", color: "cyan" },
  logout: { icon: "🚪", color: "gray" },

  // CRUD actions
  create: { icon: "✨", color: "green" },
  update: { icon: "✏️", color: "cyan" },
  delete: { icon: "🗑️", color: "red" },

  // Automation
  trigger: { icon: "⚡", color: "orange" },
  complete: { icon: "✅", color: "green" },
  fail: { icon: "❌", color: "red" },

  // Communication
  send: { icon: "📤", color: "purple" },
  receive: { icon: "📥", color: "cyan" },

  // Sync
  sync: { icon: "🔄", color: "cyan" },
  import: { icon: "📥", color: "green" },
  export: { icon: "📤", color: "purple" },
};

// Category labels
const categoryLabels: Record<string, string> = {
  auth: "Authentifizierung",
  contact: "Kontakte",
  deal: "Deals",
  project: "Projekte",
  campaign: "Kampagnen",
  automation: "Automation",
  messaging: "Messaging",
  payment: "Zahlungen",
  settings: "Einstellungen",
  system: "System",
};

export const activityRouter = createTRPCRouter({
  // ═══════════════════════════════════════════════════════════════════════════
  // GET RECENT ACTIVITY
  // ═══════════════════════════════════════════════════════════════════════════
  recent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        category: z.string().optional(),
        action: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (ctx.organizationId) {
        conditions.push(eq(auditLogs.organizationId, ctx.organizationId));
      }

      if (input?.category) {
        conditions.push(eq(auditLogs.category, input.category));
      }

      if (input?.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }

      const logs = await db.query.auditLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(auditLogs.createdAt),
        limit: input?.limit ?? 20,
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return logs.map((log) => {
        const config = activityConfig[log.action] || { icon: "◉", color: "gray" };
        return {
          id: log.id,
          icon: config.icon,
          color: config.color,
          action: log.action,
          category: log.category,
          categoryLabel: categoryLabels[log.category] || log.category,
          title: formatActivityTitle(log),
          description: log.description || formatActivityDescription(log),
          entityType: log.entityType,
          entityId: log.entityId,
          entityName: log.entityName,
          user: log.user ? {
            id: log.user.id,
            name: [log.user.firstName, log.user.lastName].filter(Boolean).join(" ") || log.user.email,
          } : null,
          timestamp: log.createdAt,
          status: log.status,
        };
      });
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ACTIVITY STATS
  // ═══════════════════════════════════════════════════════════════════════════
  stats: protectedProcedure
    .input(
      z.object({
        hours: z.number().min(1).max(168).default(24), // Max 7 days
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const hoursAgo = new Date(Date.now() - (input?.hours ?? 24) * 60 * 60 * 1000);

      const conditions = [gt(auditLogs.createdAt, hoursAgo)];
      if (ctx.organizationId) {
        conditions.push(eq(auditLogs.organizationId, ctx.organizationId));
      }

      // Get counts by category
      const categoryStats = await db
        .select({
          category: auditLogs.category,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(and(...conditions))
        .groupBy(auditLogs.category);

      // Get counts by action
      const actionStats = await db
        .select({
          action: auditLogs.action,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(and(...conditions))
        .groupBy(auditLogs.action);

      // Get total count
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(and(...conditions));

      return {
        total: totalResult?.count ?? 0,
        byCategory: Object.fromEntries(categoryStats.map((s) => [s.category, s.count])),
        byAction: Object.fromEntries(actionStats.map((s) => [s.action, s.count])),
        period: `${input?.hours ?? 24}h`,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ACTIVITY TIMELINE (grouped by time)
  // ═══════════════════════════════════════════════════════════════════════════
  timeline: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(30).default(7),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const daysAgo = new Date(Date.now() - (input?.days ?? 7) * 24 * 60 * 60 * 1000);

      const conditions = [gt(auditLogs.createdAt, daysAgo)];
      if (ctx.organizationId) {
        conditions.push(eq(auditLogs.organizationId, ctx.organizationId));
      }

      const timeline = await db
        .select({
          date: sql<string>`DATE(${auditLogs.createdAt})`,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(and(...conditions))
        .groupBy(sql`DATE(${auditLogs.createdAt})`)
        .orderBy(sql`DATE(${auditLogs.createdAt})`);

      return timeline;
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LOG ACTIVITY (internal use)
  // ═══════════════════════════════════════════════════════════════════════════
  log: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        category: z.string(),
        entityType: z.string().optional(),
        entityId: z.string().uuid().optional(),
        entityName: z.string().optional(),
        description: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [log] = await db
        .insert(auditLogs)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.user?.id,
          action: input.action,
          category: input.category,
          entityType: input.entityType,
          entityId: input.entityId,
          entityName: input.entityName,
          description: input.description,
          metadata: input.metadata,
          ipAddress: ctx.ipAddress,
          requestId: ctx.requestId,
        })
        .returning();

      return log;
    }),
});

// Helper functions
function formatActivityTitle(log: typeof auditLogs.$inferSelect): string {
  const entityName = log.entityName || log.entityType || "Element";

  switch (log.action) {
    case "create":
      return `${entityName} erstellt`;
    case "update":
      return `${entityName} aktualisiert`;
    case "delete":
      return `${entityName} gelöscht`;
    case "trigger":
      return `${entityName} ausgelöst`;
    case "send":
      return `Nachricht gesendet`;
    case "sync":
      return `Synchronisation durchgeführt`;
    case "login":
      return "Anmeldung";
    case "logout":
      return "Abmeldung";
    default:
      return `${log.action}: ${entityName}`;
  }
}

function formatActivityDescription(log: typeof auditLogs.$inferSelect): string {
  if (log.entityType && log.entityName) {
    return `${log.entityType}: ${log.entityName}`;
  }
  return log.entityType || "";
}
