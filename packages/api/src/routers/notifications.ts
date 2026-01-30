// =============================================================================
// NOTIFICATIONS ROUTER - Real-time notification management
// =============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db, notifications, eq, and, desc, sql, isNull } from "@nexus/db";

export const notificationsRouter = createTRPCRouter({
  // ═══════════════════════════════════════════════════════════════════════════
  // GET UNREAD NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  unread: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(notifications.isRead, false),
        eq(notifications.isDismissed, false),
      ];

      if (ctx.user?.id) {
        conditions.push(eq(notifications.userId, ctx.user.id));
      }

      const items = await db.query.notifications.findMany({
        where: and(...conditions),
        orderBy: [desc(notifications.priority), desc(notifications.createdAt)],
        limit: input?.limit ?? 10,
      });

      return items.map((n) => ({
        id: n.id,
        type: n.type,
        category: n.category,
        title: n.title,
        message: n.message,
        actionUrl: n.actionUrl,
        priority: n.priority,
        createdAt: n.createdAt,
      }));
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ALL NOTIFICATIONS (paginated)
  // ═══════════════════════════════════════════════════════════════════════════
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (ctx.user?.id) {
        conditions.push(eq(notifications.userId, ctx.user.id));
      }

      if (input?.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      const items = await db.query.notifications.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(notifications.createdAt),
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
      });

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get unread count
      const [unreadResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            ...(ctx.user?.id ? [eq(notifications.userId, ctx.user.id)] : []),
            eq(notifications.isRead, false)
          )
        );

      return {
        items,
        total: countResult?.count ?? 0,
        unreadCount: unreadResult?.count ?? 0,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET UNREAD COUNT
  // ═══════════════════════════════════════════════════════════════════════════
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const conditions = [eq(notifications.isRead, false)];

    if (ctx.user?.id) {
      conditions.push(eq(notifications.userId, ctx.user.id));
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(...conditions));

    return result?.count ?? 0;
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // MARK AS READ
  // ═══════════════════════════════════════════════════════════════════════════
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(notifications.id, input.id));

      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // MARK ALL AS READ
  // ═══════════════════════════════════════════════════════════════════════════
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const conditions = [eq(notifications.isRead, false)];

    if (ctx.user?.id) {
      conditions.push(eq(notifications.userId, ctx.user.id));
    }

    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(...conditions));

    return { success: true };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // DISMISS NOTIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  dismiss: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db
        .update(notifications)
        .set({
          isDismissed: true,
          dismissedAt: new Date(),
        })
        .where(eq(notifications.id, input.id));

      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE NOTIFICATION (internal use)
  // ═══════════════════════════════════════════════════════════════════════════
  create: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        type: z.enum(["info", "warning", "error", "success", "action_required"]),
        category: z.string().optional(),
        title: z.string().max(255),
        message: z.string(),
        entityType: z.string().optional(),
        entityId: z.string().uuid().optional(),
        actionUrl: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [notification] = await db
        .insert(notifications)
        .values({
          organizationId: ctx.organizationId,
          userId: input.userId || ctx.user?.id,
          type: input.type,
          category: input.category,
          title: input.title,
          message: input.message,
          entityType: input.entityType,
          entityId: input.entityId,
          actionUrl: input.actionUrl,
          priority: input.priority,
        })
        .returning();

      return notification;
    }),
});
