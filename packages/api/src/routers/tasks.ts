import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc";
import {
  db,
  tasks,
  taskComments,
  taskActivities,
  timeEntries,
  taskTemplates,
  eq,
  and,
  desc,
  asc,
  count,
  sql,
  isNull,
} from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const taskFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"]).optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
  type: z.enum(["feature", "bug", "improvement", "documentation", "construction", "inspection", "delivery", "meeting", "other"]).optional(),
  assigneeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  labels: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
  dueAfter: z.date().optional(),
  dueBefore: z.date().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
});

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  type: z.string(),
  size: z.number().optional(),
  uploadedAt: z.string(),
  uploadedBy: z.string(),
});

const constructionDetailsSchema = z.object({
  gewerk: z.string().optional(),
  bauabschnitt: z.string().optional(),
  raum: z.string().optional(),
  etage: z.string().optional(),
  abnahmeTyp: z.string().optional(),
  maengelNummer: z.string().optional(),
});

const reminderSchema = z.object({
  type: z.enum(["email", "push", "sms"]),
  offsetMinutes: z.number(),
  sent: z.boolean(),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  taskNumber: z.string().max(50).optional(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  type: z.enum(["feature", "bug", "improvement", "documentation", "construction", "inspection", "delivery", "meeting", "other"]).default("feature"),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"]).default("backlog"),
  priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  relatedContactId: z.string().uuid().optional(),
  labels: z.array(z.string()).optional(),
  category: z.string().max(100).optional(),
  milestone: z.string().max(100).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().optional(), // ISO date string
  startDate: z.string().optional(),
  estimatedHours: z.string().optional(), // decimal as string
  storyPoints: z.number().optional(),
  checklist: z.array(checklistItemSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
  constructionDetails: constructionDetailsSchema.optional(),
  blockedBy: z.array(z.string().uuid()).optional(),
  blocks: z.array(z.string().uuid()).optional(),
  blockedReason: z.string().optional(),
  externalId: z.string().max(100).optional(),
  externalUrl: z.string().optional(),
  externalSystem: z.string().max(50).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().max(255).optional(),
  recurrenceEndDate: z.string().optional(),
  reminders: z.array(reminderSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid(),
  progressPercent: z.number().min(0).max(100).optional(),
  actualHours: z.string().optional(),
  completedAt: z.date().optional(),
});

const createCommentSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1),
  contentHtml: z.string().optional(),
  parentCommentId: z.string().uuid().optional(),
  mentions: z.array(z.object({
    userId: z.string(),
    username: z.string(),
    startIndex: z.number(),
    endIndex: z.number(),
  })).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number().optional(),
  })).optional(),
});

const createTimeEntrySchema = z.object({
  taskId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // minutes
  billable: z.boolean().default(true),
  hourlyRate: z.string().optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

// =============================================================================
// TASKS ROUTER
// =============================================================================

export const tasksRouter = createTRPCRouter({
  // List tasks with filters and pagination
  list: orgProcedure
    .input(z.object({
      filters: taskFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(tasks.organizationId, ctx.organizationId)];

      if (filters?.search) {
        conditions.push(
          sql`(
            ${tasks.title} ILIKE ${`%${filters.search}%`} OR
            ${tasks.description} ILIKE ${`%${filters.search}%`} OR
            ${tasks.taskNumber} ILIKE ${`%${filters.search}%`}
          )`
        );
      }

      if (filters?.status) conditions.push(eq(tasks.status, filters.status));
      if (filters?.priority) conditions.push(eq(tasks.priority, filters.priority));
      if (filters?.type) conditions.push(eq(tasks.type, filters.type));
      if (filters?.assigneeId) conditions.push(eq(tasks.assigneeId, filters.assigneeId));
      if (filters?.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
      if (filters?.subsidiary) conditions.push(eq(tasks.subsidiary, filters.subsidiary));
      if (filters?.archived !== undefined) conditions.push(eq(tasks.archived, filters.archived));

      // Handle parentTaskId - null means top-level tasks only
      if (filters?.parentTaskId === null) {
        conditions.push(isNull(tasks.parentTaskId));
      } else if (filters?.parentTaskId) {
        conditions.push(eq(tasks.parentTaskId, filters.parentTaskId));
      }

      if (filters?.dueAfter) {
        conditions.push(sql`${tasks.dueDate} >= ${filters.dueAfter.toISOString().split('T')[0]}`);
      }

      if (filters?.dueBefore) {
        conditions.push(sql`${tasks.dueDate} <= ${filters.dueBefore.toISOString().split('T')[0]}`);
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const sortField = tasks[pagination?.sortBy as keyof typeof tasks] ?? tasks.createdAt;
      const sortOrder = pagination?.sortOrder === "asc" ? asc : desc;

      const items = await db
        .select()
        .from(tasks)
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

  // Get single task by ID with relations
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, input.id),
          eq(tasks.organizationId, ctx.organizationId)
        ),
        with: {
          project: true,
          assignee: true,
          reporter: true,
          parentTask: true,
          subtasks: {
            orderBy: asc(tasks.createdAt),
          },
          comments: {
            orderBy: desc(taskComments.createdAt),
            limit: 50,
            with: {
              createdByUser: true,
            },
          },
          activities: {
            orderBy: desc(taskActivities.createdAt),
            limit: 20,
          },
          timeEntries: {
            orderBy: desc(timeEntries.startTime),
            limit: 20,
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return task;
    }),

  // Create new task
  create: orgProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { dueDate, startDate, recurrenceEndDate, estimatedHours, ...rest } = input;

      const [task] = await db
        .insert(tasks)
        .values({
          ...rest,
          organizationId: ctx.organizationId,
          dueDate: dueDate || null,
          startDate: startDate || null,
          recurrenceEndDate: recurrenceEndDate || null,
          estimatedHours: estimatedHours || null,
          reporterId: ctx.user.id,
          createdBy: ctx.user.id,
        })
        .returning();

      // Log activity
      await db.insert(taskActivities).values({
        taskId: task.id,
        activityType: "created",
        description: "Task created",
        createdBy: ctx.user.id,
      });

      return task;
    }),

  // Update task
  update: orgProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, dueDate, startDate, recurrenceEndDate, estimatedHours, actualHours, ...data } = input;

      const existing = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, id),
          eq(tasks.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Track what changed for activity log
      const changes: Record<string, { from: unknown; to: unknown }> = {};

      if (data.status && data.status !== existing.status) {
        changes.status = { from: existing.status, to: data.status };
      }
      if (data.priority && data.priority !== existing.priority) {
        changes.priority = { from: existing.priority, to: data.priority };
      }
      if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
        changes.assigneeId = { from: existing.assigneeId, to: data.assigneeId };
      }

      const [task] = await db
        .update(tasks)
        .set({
          ...data,
          dueDate: dueDate !== undefined ? dueDate || null : undefined,
          startDate: startDate !== undefined ? startDate || null : undefined,
          recurrenceEndDate: recurrenceEndDate !== undefined ? recurrenceEndDate || null : undefined,
          estimatedHours: estimatedHours !== undefined ? estimatedHours || null : undefined,
          actualHours: actualHours !== undefined ? actualHours || null : undefined,
          completedAt: data.status === "done" && existing.status !== "done" ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();

      // Log activity for status change
      if (changes.status) {
        await db.insert(taskActivities).values({
          taskId: task.id,
          activityType: "status_changed",
          description: `Status changed from ${changes.status.from} to ${changes.status.to}`,
          changedField: "status",
          previousValue: changes.status.from,
          newValue: changes.status.to,
          createdBy: ctx.user.id,
        });
      }

      // Log activity for assignee change
      if (changes.assigneeId) {
        await db.insert(taskActivities).values({
          taskId: task.id,
          activityType: "assignee_changed",
          description: "Assignee changed",
          changedField: "assigneeId",
          previousValue: changes.assigneeId.from,
          newValue: changes.assigneeId.to,
          createdBy: ctx.user.id,
        });
      }

      return task;
    }),

  // Delete task
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, input.id),
          eq(tasks.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      await db.delete(tasks).where(eq(tasks.id, input.id));

      return { success: true };
    }),

  // Archive/unarchive task
  archive: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      archived: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [task] = await db
        .update(tasks)
        .set({
          archived: input.archived,
          archivedAt: input.archived ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tasks.id, input.id),
          eq(tasks.organizationId, ctx.organizationId)
        ))
        .returning();

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return task;
    }),

  // Update checklist item
  updateChecklistItem: orgProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      itemId: z.string(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, input.taskId),
          eq(tasks.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      const checklist = (existing.checklist as any[]) || [];
      const itemIndex = checklist.findIndex(item => item.id === input.itemId);

      if (itemIndex === -1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Checklist item not found",
        });
      }

      checklist[itemIndex] = {
        ...checklist[itemIndex],
        completed: input.completed,
        completedAt: input.completed ? new Date().toISOString() : undefined,
        completedBy: input.completed ? ctx.user.id : undefined,
      };

      const [task] = await db
        .update(tasks)
        .set({
          checklist,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.taskId))
        .returning();

      // Log activity
      await db.insert(taskActivities).values({
        taskId: task.id,
        activityType: "checklist_item_completed",
        description: `Checklist item "${checklist[itemIndex].text}" ${input.completed ? 'completed' : 'uncompleted'}`,
        createdBy: ctx.user.id,
      });

      return task;
    }),

  // Get task statistics
  stats: orgProcedure
    .input(z.object({
      projectId: z.string().uuid().optional(),
      assigneeId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(tasks.organizationId, ctx.organizationId),
        eq(tasks.archived, false),
      ];

      if (input?.projectId) conditions.push(eq(tasks.projectId, input.projectId));
      if (input?.assigneeId) conditions.push(eq(tasks.assigneeId, input.assigneeId));

      const [totalResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(...conditions));

      const byStatus = await db
        .select({
          status: tasks.status,
          count: count(),
        })
        .from(tasks)
        .where(and(...conditions))
        .groupBy(tasks.status);

      const byPriority = await db
        .select({
          priority: tasks.priority,
          count: count(),
        })
        .from(tasks)
        .where(and(...conditions))
        .groupBy(tasks.priority);

      const byType = await db
        .select({
          type: tasks.type,
          count: count(),
        })
        .from(tasks)
        .where(and(...conditions))
        .groupBy(tasks.type);

      // Overdue tasks
      const today = new Date().toISOString().split('T')[0];
      const [overdueResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(
          ...conditions,
          sql`${tasks.dueDate} < ${today}`,
          sql`${tasks.status} NOT IN ('done', 'cancelled')`
        ));

      return {
        total: totalResult?.count ?? 0,
        overdue: overdueResult?.count ?? 0,
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
        byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r.count])),
        byType: Object.fromEntries(byType.map((r) => [r.type, r.count])),
      };
    }),

  // Kanban board data
  kanban: orgProcedure
    .input(z.object({
      projectId: z.string().uuid().optional(),
      assigneeId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(tasks.organizationId, ctx.organizationId),
        eq(tasks.archived, false),
        isNull(tasks.parentTaskId), // Only top-level tasks
      ];

      if (input?.projectId) conditions.push(eq(tasks.projectId, input.projectId));
      if (input?.assigneeId) conditions.push(eq(tasks.assigneeId, input.assigneeId));

      const allTasks = await db.query.tasks.findMany({
        where: and(...conditions),
        with: {
          assignee: true,
          project: true,
          subtasks: true,
        },
        orderBy: [asc(tasks.priority), desc(tasks.createdAt)],
      });

      // Group by status
      const columns: Record<string, typeof allTasks> = {
        backlog: [],
        todo: [],
        in_progress: [],
        in_review: [],
        blocked: [],
        done: [],
      };

      for (const task of allTasks) {
        if (columns[task.status]) {
          columns[task.status].push(task);
        }
      }

      return columns;
    }),
});

// =============================================================================
// TASK COMMENTS ROUTER
// =============================================================================

export const taskCommentsRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Verify task belongs to org
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, input.taskId),
          eq(tasks.organizationId, ctx.organizationId)
        ),
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      const comments = await db.query.taskComments.findMany({
        where: eq(taskComments.taskId, input.taskId),
        with: {
          createdByUser: true,
          replies: {
            with: {
              createdByUser: true,
            },
          },
        },
        orderBy: desc(taskComments.createdAt),
        limit: input.limit,
      });

      return comments;
    }),

  create: orgProcedure
    .input(createCommentSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify task belongs to org
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, input.taskId),
          eq(tasks.organizationId, ctx.organizationId)
        ),
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      const [comment] = await db
        .insert(taskComments)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      // Log activity
      await db.insert(taskActivities).values({
        taskId: input.taskId,
        activityType: "comment_added",
        description: "Comment added",
        relatedCommentId: comment.id,
        createdBy: ctx.user.id,
      });

      return comment;
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      content: z.string().min(1),
      contentHtml: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.taskComments.findFirst({
        where: eq(taskComments.id, input.id),
        with: {
          task: true,
        },
      });

      if (!existing || existing.task.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      if (existing.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own comments",
        });
      }

      const [comment] = await db
        .update(taskComments)
        .set({
          content: input.content,
          contentHtml: input.contentHtml,
          edited: true,
          editedAt: new Date(),
        })
        .where(eq(taskComments.id, input.id))
        .returning();

      return comment;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.taskComments.findFirst({
        where: eq(taskComments.id, input.id),
        with: {
          task: true,
        },
      });

      if (!existing || existing.task.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      if (existing.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      await db.delete(taskComments).where(eq(taskComments.id, input.id));

      return { success: true };
    }),
});

// =============================================================================
// TIME ENTRIES ROUTER
// =============================================================================

export const timeEntriesRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      taskId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      startAfter: z.date().optional(),
      startBefore: z.date().optional(),
      billable: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(timeEntries.organizationId, ctx.organizationId)];

      if (input.taskId) conditions.push(eq(timeEntries.taskId, input.taskId));
      if (input.projectId) conditions.push(eq(timeEntries.projectId, input.projectId));
      if (input.userId) conditions.push(eq(timeEntries.userId, input.userId));
      if (input.billable !== undefined) conditions.push(eq(timeEntries.billable, input.billable));

      const entries = await db.query.timeEntries.findMany({
        where: and(...conditions),
        with: {
          task: true,
          project: true,
          user: true,
        },
        orderBy: desc(timeEntries.startTime),
        limit: input.limit,
      });

      return entries;
    }),

  create: orgProcedure
    .input(createTimeEntrySchema)
    .mutation(async ({ ctx, input }) => {
      // Calculate duration if endTime is provided
      let duration = input.duration;
      let durationDecimal: string | undefined;

      if (input.endTime && !duration) {
        duration = Math.round((input.endTime.getTime() - input.startTime.getTime()) / 60000);
      }

      if (duration) {
        durationDecimal = (duration / 60).toFixed(2);
      }

      const [entry] = await db
        .insert(timeEntries)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          duration,
          durationDecimal,
          running: !input.endTime,
        })
        .returning();

      // Update task actual hours if task is specified
      if (input.taskId && duration) {
        const task = await db.query.tasks.findFirst({
          where: eq(tasks.id, input.taskId),
        });

        if (task) {
          const currentHours = parseFloat(task.actualHours || "0");
          const additionalHours = duration / 60;

          await db
            .update(tasks)
            .set({
              actualHours: (currentHours + additionalHours).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, input.taskId));

          // Log activity
          await db.insert(taskActivities).values({
            taskId: input.taskId,
            activityType: "time_logged",
            description: `Logged ${(duration / 60).toFixed(1)} hours`,
            createdBy: ctx.user.id,
          });
        }
      }

      return entry;
    }),

  stop: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.id, input.id),
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.userId, ctx.user.id),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found",
        });
      }

      if (!existing.running) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Time entry is not running",
        });
      }

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - existing.startTime.getTime()) / 60000);
      const durationDecimal = (duration / 60).toFixed(2);

      const [entry] = await db
        .update(timeEntries)
        .set({
          endTime,
          duration,
          durationDecimal,
          running: false,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, input.id))
        .returning();

      return entry;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.id, input.id),
          eq(timeEntries.organizationId, ctx.organizationId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found",
        });
      }

      // Only owner or admin can delete
      if (existing.userId !== ctx.user.id && !["admin", "super_admin"].includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own time entries",
        });
      }

      await db.delete(timeEntries).where(eq(timeEntries.id, input.id));

      return { success: true };
    }),

  // Get running timer for current user
  getRunning: orgProcedure.query(async ({ ctx }) => {
    const entry = await db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.organizationId, ctx.organizationId),
        eq(timeEntries.userId, ctx.user.id),
        eq(timeEntries.running, true),
      ),
      with: {
        task: true,
        project: true,
      },
    });

    return entry ?? null;
  }),

  // Summary for a user
  summary: orgProcedure
    .input(z.object({
      userId: z.string().uuid().optional(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user.id;

      const entries = await db.query.timeEntries.findMany({
        where: and(
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.userId, userId),
          sql`${timeEntries.startTime} >= ${input.startDate}`,
          sql`${timeEntries.startTime} <= ${input.endDate}`,
        ),
      });

      const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
      const billableMinutes = entries
        .filter(e => e.billable)
        .reduce((sum, e) => sum + (e.duration || 0), 0);

      return {
        totalHours: (totalMinutes / 60).toFixed(2),
        billableHours: (billableMinutes / 60).toFixed(2),
        entriesCount: entries.length,
      };
    }),
});
