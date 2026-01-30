// =============================================================================
// ACTIVITY ROUTER - Real-time activity feed and audit trail
// =============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db, auditLogs, notifications, eq, and, desc, sql, gt } from "@nexus/db";
import {
  ActivityType,
  EntityType,
  logActivity as logActivityToStore,
  getActivityLog,
  getActivitiesByEntity,
  getActivityStats as getActivityStatsFromStore,
  type ActivityLogEntry,
  type LogActivityInput,
} from "../services/activity-log";

// =============================================================================
// CONFIGURATION
// =============================================================================

// Activity type icons and colors
const activityConfig: Record<string, { icon: string; color: string }> = {
  // Auth actions
  login: { icon: "shield", color: "cyan" },
  logout: { icon: "log-out", color: "gray" },

  // CRUD actions
  create: { icon: "plus-circle", color: "green" },
  update: { icon: "edit", color: "cyan" },
  delete: { icon: "trash-2", color: "red" },
  view: { icon: "eye", color: "blue" },
  export: { icon: "download", color: "purple" },

  // Automation
  trigger: { icon: "zap", color: "orange" },
  complete: { icon: "check-circle", color: "green" },
  fail: { icon: "x-circle", color: "red" },

  // Communication
  send: { icon: "send", color: "purple" },
  receive: { icon: "inbox", color: "cyan" },

  // Sync
  sync: { icon: "refresh-cw", color: "cyan" },
  import: { icon: "upload", color: "green" },
};

// Category/Entity labels
const entityLabels: Record<string, string> = {
  contact: "Kontakt",
  deal: "Deal",
  project: "Projekt",
  user: "Benutzer",
  organization: "Organisation",
  campaign: "Kampagne",
  automation: "Automation",
  messaging: "Nachricht",
  payment: "Zahlung",
  settings: "Einstellungen",
  system: "System",
};

// Action labels
const actionLabels: Record<string, string> = {
  create: "erstellt",
  update: "aktualisiert",
  delete: "geloscht",
  view: "angesehen",
  export: "exportiert",
  login: "angemeldet",
  logout: "abgemeldet",
};

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const ActivityTypeEnum = z.enum([
  "create",
  "update",
  "delete",
  "view",
  "export",
  "login",
  "logout",
]);

const EntityTypeEnum = z.enum([
  "contact",
  "deal",
  "project",
  "user",
  "organization",
]);

// =============================================================================
// ROUTER
// =============================================================================

export const activityRouter = createTRPCRouter({
  // ═══════════════════════════════════════════════════════════════════════════
  // LOG ACTIVITY (mutation)
  // Logs a new activity to the audit trail
  // ═══════════════════════════════════════════════════════════════════════════
  log: protectedProcedure
    .input(
      z.object({
        action: ActivityTypeEnum,
        entityType: EntityTypeEnum,
        entityId: z.string(),
        entityName: z.string().optional(),
        changes: z
          .record(
            z.object({
              from: z.unknown().optional(),
              to: z.unknown().optional(),
            })
          )
          .optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Log to in-memory store
      const activity = logActivityToStore({
        userId: ctx.user?.id || "anonymous",
        userName: ctx.user
          ? [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") ||
            ctx.user.email
          : undefined,
        userEmail: ctx.user?.email,
        action: input.action as ActivityType,
        entityType: input.entityType as EntityType,
        entityId: input.entityId,
        entityName: input.entityName,
        changes: input.changes,
        metadata: input.metadata,
        ipAddress: ctx.ipAddress,
        organizationId: ctx.organizationId,
      });

      // Also log to database for persistence (if auditLogs table exists)
      try {
        await db.insert(auditLogs).values({
          organizationId: ctx.organizationId,
          userId: ctx.user?.id,
          action: input.action,
          category: input.entityType,
          entityType: input.entityType,
          entityId: input.entityId,
          entityName: input.entityName,
          description: `${input.entityName || input.entityType} ${actionLabels[input.action] || input.action}`,
          metadata: {
            ...input.metadata,
            changes: input.changes,
          },
          ipAddress: ctx.ipAddress,
          requestId: ctx.requestId,
        });
      } catch (error) {
        // Database logging is optional, don't fail if it errors
        console.warn("[ACTIVITY_LOG] Database logging failed:", error);
      }

      return {
        success: true,
        activity: {
          id: activity.id,
          action: activity.action,
          entityType: activity.entityType,
          entityId: activity.entityId,
          timestamp: activity.timestamp,
        },
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET RECENT ACTIVITIES (query)
  // Returns recent activities with pagination support
  // ═══════════════════════════════════════════════════════════════════════════
  getRecent: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          entityType: EntityTypeEnum.optional(),
          action: ActivityTypeEnum.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const result = getActivityLog({
        organizationId: ctx.organizationId || undefined,
        entityType: input?.entityType as EntityType | undefined,
        action: input?.action as ActivityType | undefined,
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
      });

      return {
        items: result.items.map((activity) => formatActivityResponse(activity)),
        total: result.total,
        hasMore: result.hasMore,
        limit: result.limit,
        offset: result.offset,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ACTIVITIES BY ENTITY (query)
  // Returns all activities for a specific entity
  // ═══════════════════════════════════════════════════════════════════════════
  getByEntity: protectedProcedure
    .input(
      z.object({
        entityType: EntityTypeEnum,
        entityId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const activities = getActivitiesByEntity(
        input.entityType as EntityType,
        input.entityId,
        input.limit
      );

      // Filter by organization if applicable
      const filtered = ctx.organizationId
        ? activities.filter(
            (a) => !a.organizationId || a.organizationId === ctx.organizationId
          )
        : activities;

      return {
        items: filtered.map((activity) => formatActivityResponse(activity)),
        entityType: input.entityType,
        entityId: input.entityId,
        total: filtered.length,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY: GET RECENT ACTIVITY (for backwards compatibility)
  // ═══════════════════════════════════════════════════════════════════════════
  recent: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          category: z.string().optional(),
          action: z.string().optional(),
        })
        .optional()
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
        const config = activityConfig[log.action] || {
          icon: "circle",
          color: "gray",
        };
        return {
          id: log.id,
          icon: config.icon,
          color: config.color,
          action: log.action,
          category: log.category,
          categoryLabel: entityLabels[log.category] || log.category,
          title: formatActivityTitle(log),
          description: log.description || formatActivityDescription(log),
          entityType: log.entityType,
          entityId: log.entityId,
          entityName: log.entityName,
          user: log.user
            ? {
                id: log.user.id,
                name:
                  [log.user.firstName, log.user.lastName]
                    .filter(Boolean)
                    .join(" ") || log.user.email,
              }
            : null,
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
      z
        .object({
          hours: z.number().min(1).max(168).default(24), // Max 7 days
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      // Get stats from in-memory store
      const memoryStats = getActivityStatsFromStore(
        ctx.organizationId || undefined,
        input?.hours ?? 24
      );

      // Also get from database for comparison/fallback
      const hoursAgo = new Date(
        Date.now() - (input?.hours ?? 24) * 60 * 60 * 1000
      );

      const conditions = [gt(auditLogs.createdAt, hoursAgo)];
      if (ctx.organizationId) {
        conditions.push(eq(auditLogs.organizationId, ctx.organizationId));
      }

      // Get counts by category from DB
      const categoryStats = await db
        .select({
          category: auditLogs.category,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(and(...conditions))
        .groupBy(auditLogs.category);

      // Get counts by action from DB
      const actionStats = await db
        .select({
          action: auditLogs.action,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(and(...conditions))
        .groupBy(auditLogs.action);

      // Get total count from DB
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(and(...conditions));

      return {
        total: (totalResult?.count ?? 0) + memoryStats.total,
        byCategory: {
          ...Object.fromEntries(
            categoryStats.map((s) => [s.category, s.count])
          ),
        },
        byAction: {
          ...Object.fromEntries(actionStats.map((s) => [s.action, s.count])),
          ...memoryStats.byAction,
        },
        byEntityType: memoryStats.byEntityType,
        period: `${input?.hours ?? 24}h`,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ACTIVITY TIMELINE (grouped by time)
  // ═══════════════════════════════════════════════════════════════════════════
  timeline: protectedProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(30).default(7),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const daysAgo = new Date(
        Date.now() - (input?.days ?? 7) * 24 * 60 * 60 * 1000
      );

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
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format an activity log entry for API response
 */
function formatActivityResponse(activity: ActivityLogEntry) {
  const config = activityConfig[activity.action] || {
    icon: "circle",
    color: "gray",
  };

  return {
    id: activity.id,
    icon: config.icon,
    color: config.color,
    action: activity.action,
    actionLabel: actionLabels[activity.action] || activity.action,
    entityType: activity.entityType,
    entityTypeLabel: entityLabels[activity.entityType] || activity.entityType,
    entityId: activity.entityId,
    entityName: activity.entityName,
    title: formatTitle(activity),
    description: formatDescription(activity),
    changes: activity.changes,
    metadata: activity.metadata,
    user: activity.userName
      ? {
          id: activity.userId,
          name: activity.userName,
          email: activity.userEmail,
        }
      : {
          id: activity.userId,
          name: activity.userEmail || activity.userId,
        },
    timestamp: activity.timestamp,
    ipAddress: activity.ipAddress,
  };
}

/**
 * Format activity title
 */
function formatTitle(activity: ActivityLogEntry): string {
  const entityName = activity.entityName || activity.entityType;
  const entityLabel = entityLabels[activity.entityType] || activity.entityType;

  switch (activity.action) {
    case ActivityType.CREATE:
      return `${entityLabel} erstellt`;
    case ActivityType.UPDATE:
      return `${entityLabel} aktualisiert`;
    case ActivityType.DELETE:
      return `${entityLabel} geloscht`;
    case ActivityType.VIEW:
      return `${entityLabel} angesehen`;
    case ActivityType.EXPORT:
      return `${entityLabel} exportiert`;
    case ActivityType.LOGIN:
      return "Anmeldung";
    case ActivityType.LOGOUT:
      return "Abmeldung";
    default:
      return `${activity.action}: ${entityLabel}`;
  }
}

/**
 * Format activity description
 */
function formatDescription(activity: ActivityLogEntry): string {
  if (activity.entityName) {
    return activity.entityName;
  }

  if (activity.changes && Object.keys(activity.changes).length > 0) {
    const changedFields = Object.keys(activity.changes);
    return `${changedFields.length} Feld${changedFields.length > 1 ? "er" : ""} geandert`;
  }

  return "";
}

/**
 * Format activity title (for legacy DB logs)
 */
function formatActivityTitle(log: typeof auditLogs.$inferSelect): string {
  const entityName = log.entityName || log.entityType || "Element";

  switch (log.action) {
    case "create":
      return `${entityName} erstellt`;
    case "update":
      return `${entityName} aktualisiert`;
    case "delete":
      return `${entityName} geloscht`;
    case "view":
      return `${entityName} angesehen`;
    case "export":
      return `${entityName} exportiert`;
    case "trigger":
      return `${entityName} ausgelost`;
    case "send":
      return `Nachricht gesendet`;
    case "sync":
      return `Synchronisation durchgefuhrt`;
    case "login":
      return "Anmeldung";
    case "logout":
      return "Abmeldung";
    default:
      return `${log.action}: ${entityName}`;
  }
}

/**
 * Format activity description (for legacy DB logs)
 */
function formatActivityDescription(log: typeof auditLogs.$inferSelect): string {
  if (log.entityType && log.entityName) {
    return `${log.entityType}: ${log.entityName}`;
  }
  return log.entityType || "";
}
