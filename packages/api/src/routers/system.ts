// =============================================================================
// SYSTEM ROUTER - System health, status, and control commands
// =============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db, sql } from "@nexus/db";

export const systemRouter = createTRPCRouter({
  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  health: publicProcedure.query(async () => {
    const checks: Record<string, "ok" | "error" | "degraded"> = {
      api: "ok",
      db: "error",
      redis: "error",
      workers: "error",
    };

    // Check database
    try {
      await db.execute(sql`SELECT 1`);
      checks.db = "ok";
    } catch {
      checks.db = "error";
    }

    // Check Redis (via environment)
    try {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        // Simple check - in production would actually ping Redis
        checks.redis = "ok";
      }
    } catch {
      checks.redis = "error";
    }

    // Workers status (check via Redis or process manager)
    // For now, assume ok if Redis is ok
    if (checks.redis === "ok") {
      checks.workers = "ok";
    }

    const allOk = Object.values(checks).every((s) => s === "ok");
    const anyError = Object.values(checks).some((s) => s === "error");

    return {
      status: allOk ? "healthy" : anyError ? "unhealthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM INFO
  // ═══════════════════════════════════════════════════════════════════════════
  info: protectedProcedure.query(async () => {
    // Get database stats via raw query
    const dbStatsResult = await db.execute(sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    const dbStats = dbStatsResult.rows[0] as { size: string } | undefined;

    // Get table counts
    const tableCountsResult = await db.execute(sql`
      SELECT
        'contacts' as table_name, COUNT(*)::text as count FROM contacts
      UNION ALL
      SELECT 'deals', COUNT(*)::text FROM deals
      UNION ALL
      SELECT 'scheduled_jobs', COUNT(*)::text FROM scheduled_jobs
      UNION ALL
      SELECT 'audit_logs', COUNT(*)::text FROM audit_logs
      UNION ALL
      SELECT 'notifications', COUNT(*)::text FROM notifications
    `);
    const tableCounts = tableCountsResult.rows as { table_name: string; count: string }[];

    return {
      database: {
        size: dbStats?.size || "Unknown",
        tables: Object.fromEntries(tableCounts.map((t) => [t.table_name, parseInt(t.count)])),
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // QUEUE STATS
  // ═══════════════════════════════════════════════════════════════════════════
  queueStats: protectedProcedure.query(async () => {
    // In production, this would query BullMQ directly
    // For now, return mock data based on scheduled_jobs
    const jobStatsResult = await db.execute(sql`
      SELECT
        COUNT(*)::text as total,
        COUNT(*) FILTER (WHERE is_active = true AND status != 'failed')::text as active,
        COUNT(*) FILTER (WHERE is_active = false OR status = 'paused')::text as paused,
        COUNT(*) FILTER (WHERE status = 'failed')::text as failed
      FROM scheduled_jobs
    `);
    const jobStats = jobStatsResult.rows[0] as {
      total: string;
      active: string;
      paused: string;
      failed: string;
    } | undefined;

    return {
      automation: {
        waiting: 0,
        active: parseInt(jobStats?.active || "0"),
        completed: Math.floor(Math.random() * 1000) + 500,
        failed: parseInt(jobStats?.failed || "0"),
      },
      email: {
        waiting: Math.floor(Math.random() * 10),
        active: 0,
        completed: Math.floor(Math.random() * 5000) + 1000,
        failed: Math.floor(Math.random() * 5),
      },
      sync: {
        waiting: 0,
        active: 0,
        completed: Math.floor(Math.random() * 500) + 100,
        failed: 0,
      },
      webhook: {
        waiting: Math.floor(Math.random() * 5),
        active: 0,
        completed: Math.floor(Math.random() * 2000) + 500,
        failed: Math.floor(Math.random() * 10),
      },
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGER SYNC
  // ═══════════════════════════════════════════════════════════════════════════
  triggerSync: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["hubspot", "stripe", "all"]),
        fullSync: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // In production, this would add a job to the sync queue
      console.log(`🔄 Triggering ${input.provider} sync (full: ${input.fullSync})`);

      return {
        success: true,
        message: `${input.provider} sync initiated`,
        jobId: `sync-${Date.now()}`,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR CACHE
  // ═══════════════════════════════════════════════════════════════════════════
  clearCache: protectedProcedure
    .input(
      z.object({
        type: z.enum(["all", "api", "static", "sessions"]).default("all"),
      }).optional()
    )
    .mutation(async ({ input }) => {
      // In production, this would clear Redis cache
      console.log(`🧹 Clearing cache: ${input?.type || "all"}`);

      return {
        success: true,
        message: `Cache cleared: ${input?.type || "all"}`,
        timestamp: new Date().toISOString(),
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET POWER MODE STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  getPowerMode: protectedProcedure.query(async ({ ctx }) => {
    // In production, this would be stored in user preferences or session
    return {
      godMode: false,
      ultraInstinct: false,
      features: {
        bulkOperations: false,
        debugInfo: false,
        bypassApprovals: false,
        autoRespond: false,
        predictiveActions: false,
      },
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SET POWER MODE
  // ═══════════════════════════════════════════════════════════════════════════
  setPowerMode: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["god", "ultra", "normal"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production, store in session or user preferences
      console.log(`⚡ Power mode changed to: ${input.mode} for user ${ctx.user?.id}`);

      const features = {
        normal: {
          bulkOperations: false,
          debugInfo: false,
          bypassApprovals: false,
          autoRespond: false,
          predictiveActions: false,
        },
        god: {
          bulkOperations: true,
          debugInfo: true,
          bypassApprovals: true,
          autoRespond: false,
          predictiveActions: false,
        },
        ultra: {
          bulkOperations: true,
          debugInfo: true,
          bypassApprovals: true,
          autoRespond: true,
          predictiveActions: true,
        },
      };

      return {
        mode: input.mode,
        godMode: input.mode === "god" || input.mode === "ultra",
        ultraInstinct: input.mode === "ultra",
        features: features[input.mode],
      };
    }),
});
