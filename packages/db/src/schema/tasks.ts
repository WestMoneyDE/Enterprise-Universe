import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  taskPriorityEnum,
  taskStatusEnum,
  taskTypeEnum,
  subsidiaryEnum,
} from "./enums";
import { organizations, users } from "./auth";
import { projects } from "./projects";
import { contacts } from "./contacts";

// =============================================================================
// TASKS
// =============================================================================

/**
 * Tasks - Universal Task Management System
 *
 * Supports project tasks, personal tasks, construction activities,
 * inspections, and any other actionable items across all subsidiaries.
 */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Task Identification
    taskNumber: varchar("task_number", { length: 50 }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // Classification
    type: taskTypeEnum("type").default("other").notNull(),
    status: taskStatusEnum("status").default("backlog").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),

    // Relationships
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id").references((): any => tasks.id, { onDelete: "set null" }),
    relatedContactId: uuid("related_contact_id").references(() => contacts.id, { onDelete: "set null" }),

    // Custom Categorization
    labels: jsonb("labels").$type<string[]>(),
    category: varchar("category", { length: 100 }),
    milestone: varchar("milestone", { length: 100 }),

    // Assignment
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    watcherIds: jsonb("watcher_ids").$type<string[]>(),

    // Dates & Scheduling
    dueDate: date("due_date"),
    startDate: date("start_date"),
    completedAt: timestamp("completed_at", { mode: "date" }),

    // Time Tracking
    estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
    actualHours: decimal("actual_hours", { precision: 8, scale: 2 }),

    // Progress
    progressPercent: integer("progress_percent").default(0),
    storyPoints: integer("story_points"),

    // Checklist
    checklist: jsonb("checklist").$type<Array<{
      id: string;
      text: string;
      completed: boolean;
      completedAt?: string;
      completedBy?: string;
    }>>(),

    // Attachments
    attachments: jsonb("attachments").$type<Array<{
      id: string;
      name: string;
      url: string;
      type: string;
      size?: number;
      uploadedAt: string;
      uploadedBy: string;
    }>>(),

    // Construction-specific
    constructionDetails: jsonb("construction_details").$type<{
      gewerk?: string;
      bauabschnitt?: string;
      raum?: string;
      etage?: string;
      abnahmeTyp?: string;
      maengelNummer?: string;
    }>(),

    // Blocking/Dependencies
    blockedBy: jsonb("blocked_by").$type<string[]>(), // Task IDs
    blocks: jsonb("blocks").$type<string[]>(), // Task IDs
    blockedReason: text("blocked_reason"),

    // External References
    externalId: varchar("external_id", { length: 100 }),
    externalUrl: text("external_url"),
    externalSystem: varchar("external_system", { length: 50 }), // jira, asana, hubspot, etc.

    // Recurrence
    isRecurring: boolean("is_recurring").default(false),
    recurrenceRule: varchar("recurrence_rule", { length: 255 }), // RRULE format
    recurrenceEndDate: date("recurrence_end_date"),
    recurrenceParentId: uuid("recurrence_parent_id"),

    // Reminders
    reminders: jsonb("reminders").$type<Array<{
      type: "email" | "push" | "sms";
      offsetMinutes: number;
      sent: boolean;
    }>>(),

    // Archive
    archived: boolean("archived").default(false),
    archivedAt: timestamp("archived_at", { mode: "date" }),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("tasks_org_idx").on(table.organizationId),
    projectIdx: index("tasks_project_idx").on(table.projectId),
    assigneeIdx: index("tasks_assignee_idx").on(table.assigneeId),
    statusIdx: index("tasks_status_idx").on(table.status),
    priorityIdx: index("tasks_priority_idx").on(table.priority),
    dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
    parentIdx: index("tasks_parent_idx").on(table.parentTaskId),
    archivedIdx: index("tasks_archived_idx").on(table.archived),
    taskNumberIdx: index("tasks_task_number_idx").on(table.taskNumber),
  })
);

// =============================================================================
// TASK COMMENTS
// =============================================================================

export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),

    content: text("content").notNull(),
    contentHtml: text("content_html"), // Rich text version

    // Reply threading
    parentCommentId: uuid("parent_comment_id").references((): any => taskComments.id, { onDelete: "set null" }),

    // Mentions
    mentions: jsonb("mentions").$type<Array<{
      userId: string;
      username: string;
      startIndex: number;
      endIndex: number;
    }>>(),

    // Attachments
    attachments: jsonb("attachments").$type<Array<{
      name: string;
      url: string;
      type: string;
      size?: number;
    }>>(),

    // Reactions
    reactions: jsonb("reactions").$type<Record<string, string[]>>(), // emoji -> userIds

    // Edit tracking
    edited: boolean("edited").default(false),
    editedAt: timestamp("edited_at", { mode: "date" }),

    // Pinned comment
    pinned: boolean("pinned").default(false),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
  },
  (table) => ({
    taskIdx: index("task_comments_task_idx").on(table.taskId),
    parentIdx: index("task_comments_parent_idx").on(table.parentCommentId),
    createdAtIdx: index("task_comments_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// TASK ACTIVITY LOG
// =============================================================================

export const taskActivities = pgTable(
  "task_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),

    activityType: varchar("activity_type", { length: 50 }).notNull(),
    // status_changed, assignee_changed, priority_changed, due_date_changed,
    // comment_added, attachment_added, checklist_item_completed, time_logged, etc.

    description: text("description"),

    // Change tracking
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    changedField: varchar("changed_field", { length: 100 }),

    // Related entities
    relatedCommentId: uuid("related_comment_id"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    taskIdx: index("task_activities_task_idx").on(table.taskId),
    typeIdx: index("task_activities_type_idx").on(table.activityType),
    createdAtIdx: index("task_activities_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// TIME ENTRIES (for task time tracking)
// =============================================================================

export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    description: text("description"),

    // Time Data
    startTime: timestamp("start_time", { mode: "date" }).notNull(),
    endTime: timestamp("end_time", { mode: "date" }),
    duration: integer("duration"), // in minutes
    durationDecimal: decimal("duration_decimal", { precision: 8, scale: 2 }), // in hours

    // Billing
    billable: boolean("billable").default(true),
    billed: boolean("billed").default(false),
    billedAt: timestamp("billed_at", { mode: "date" }),
    invoiceId: uuid("invoice_id"),
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),

    // Categorization
    category: varchar("category", { length: 100 }),
    tags: jsonb("tags").$type<string[]>(),

    // Timer state (for running timers)
    running: boolean("running").default(false),

    // Approval workflow
    approved: boolean("approved"),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    approvedBy: uuid("approved_by").references(() => users.id),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("time_entries_org_idx").on(table.organizationId),
    taskIdx: index("time_entries_task_idx").on(table.taskId),
    projectIdx: index("time_entries_project_idx").on(table.projectId),
    userIdx: index("time_entries_user_idx").on(table.userId),
    startTimeIdx: index("time_entries_start_time_idx").on(table.startTime),
    billableIdx: index("time_entries_billable_idx").on(table.billable),
  })
);

// =============================================================================
// TASK TEMPLATES
// =============================================================================

export const taskTemplates = pgTable(
  "task_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),
    category: varchar("category", { length: 100 }),

    // Template Configuration
    taskTemplate: jsonb("task_template").$type<{
      title: string;
      description?: string;
      type: string;
      priority: string;
      estimatedHours?: number;
      checklist?: Array<{ text: string }>;
      labels?: string[];
    }>().notNull(),

    // Subtask templates
    subtaskTemplates: jsonb("subtask_templates").$type<Array<{
      title: string;
      description?: string;
      type?: string;
      priority?: string;
      estimatedHours?: number;
      offsetDays?: number; // days after parent task start
    }>>(),

    // Usage tracking
    usageCount: integer("usage_count").default(0),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),

    active: boolean("active").default(true),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    orgIdx: index("task_templates_org_idx").on(table.organizationId),
    subsidiaryIdx: index("task_templates_subsidiary_idx").on(table.subsidiary),
    categoryIdx: index("task_templates_category_idx").on(table.category),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "parentChild",
  }),
  subtasks: many(tasks, { relationName: "parentChild" }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  reporter: one(users, {
    fields: [tasks.reporterId],
    references: [users.id],
    relationName: "reporter",
  }),
  relatedContact: one(contacts, {
    fields: [tasks.relatedContactId],
    references: [contacts.id],
  }),
  comments: many(taskComments),
  activities: many(taskActivities),
  timeEntries: many(timeEntries),
}));

export const taskCommentsRelations = relations(taskComments, ({ one, many }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  parentComment: one(taskComments, {
    fields: [taskComments.parentCommentId],
    references: [taskComments.id],
    relationName: "replies",
  }),
  replies: many(taskComments, { relationName: "replies" }),
  createdByUser: one(users, {
    fields: [taskComments.createdBy],
    references: [users.id],
  }),
}));

export const taskActivitiesRelations = relations(taskActivities, ({ one }) => ({
  task: one(tasks, {
    fields: [taskActivities.taskId],
    references: [tasks.id],
  }),
  createdByUser: one(users, {
    fields: [taskActivities.createdBy],
    references: [users.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [timeEntries.organizationId],
    references: [organizations.id],
  }),
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [timeEntries.approvedBy],
    references: [users.id],
  }),
}));

export const taskTemplatesRelations = relations(taskTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [taskTemplates.organizationId],
    references: [organizations.id],
  }),
}));
