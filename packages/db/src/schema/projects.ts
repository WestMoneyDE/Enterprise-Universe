import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  index,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { subsidiaryEnum, projectStageEnum } from "./enums";
import { organizations, users } from "./auth";
import { contacts } from "./contacts";
import { deals } from "./deals";

// =============================================================================
// PROJECTS (West Money Bau Construction Projects)
// =============================================================================

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Relations
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    dealId: uuid("deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),

    // Basic Info
    name: varchar("name", { length: 255 }).notNull(),
    projectNumber: varchar("project_number", { length: 50 }).unique(),
    description: text("description"),
    subsidiary: subsidiaryEnum("subsidiary").default("west_money_bau"),

    // Stage (12-stage pipeline)
    stage: projectStageEnum("stage").default("lead"),
    stageChangedAt: timestamp("stage_changed_at"),
    stageDuration: integer("stage_duration"), // Days in current stage

    // Property Details
    propertyType: varchar("property_type", { length: 50 }), // Einfamilienhaus, Doppelhaus, etc.
    plotSize: decimal("plot_size", { precision: 10, scale: 2 }), // m²
    livingSpace: decimal("living_space", { precision: 10, scale: 2 }), // m²
    floors: integer("floors"),
    rooms: integer("rooms"),
    bathrooms: integer("bathrooms"),

    // Location
    street: varchar("street", { length: 255 }),
    streetNumber: varchar("street_number", { length: 20 }),
    city: varchar("city", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 2 }).default("DE"),
    coordinates: jsonb("coordinates").$type<{
      lat: number;
      lng: number;
    }>(),

    // Value
    totalBudget: decimal("total_budget", { precision: 15, scale: 2 }),
    currentSpent: decimal("current_spent", { precision: 15, scale: 2 }).default("0"),
    currency: varchar("currency", { length: 3 }).default("EUR"),

    // Dates
    plannedStartDate: date("planned_start_date"),
    actualStartDate: date("actual_start_date"),
    plannedEndDate: date("planned_end_date"),
    actualEndDate: date("actual_end_date"),

    // Assignment
    projectManagerId: uuid("project_manager_id").references(() => users.id, {
      onDelete: "set null",
    }),
    salesRepId: uuid("sales_rep_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Smart Home
    smartHomeEnabled: boolean("smart_home_enabled").default(false),
    smartHomeConfig: jsonb("smart_home_config").$type<{
      provider?: string;
      features?: string[];
      devices?: Array<{ type: string; room: string; quantity: number }>;
    }>(),

    // Bauherren-Pass (Construction Owner Pass)
    bauherrenPassId: varchar("bauherren_pass_id", { length: 100 }),
    bauherrenPassStatus: varchar("bauherren_pass_status", { length: 50 }),
    bauherrenPassIssuedAt: timestamp("bauherren_pass_issued_at"),

    // Kundenkarte (Customer Card)
    kundenkarteId: uuid("kundenkarte_id"),
    kundenkarteStatus: varchar("kundenkarte_status", { length: 50 }),

    // Progress
    overallProgress: integer("overall_progress").default(0), // 0-100%
    qualityScore: integer("quality_score"), // 0-100%

    // Documents
    documentsCount: integer("documents_count").default(0),
    photosCount: integer("photos_count").default(0),

    // Custom Fields
    customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

    // Notes
    notes: text("notes"),

    // Status
    isActive: boolean("is_active").default(true),
    isCancelled: boolean("is_cancelled").default(false),
    cancelledAt: timestamp("cancelled_at"),
    cancelReason: text("cancel_reason"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("projects_org_idx").on(table.organizationId),
    contactIdx: index("projects_contact_idx").on(table.contactId),
    dealIdx: index("projects_deal_idx").on(table.dealId),
    stageIdx: index("projects_stage_idx").on(table.stage),
    projectManagerIdx: index("projects_pm_idx").on(table.projectManagerId),
    projectNumberIdx: index("projects_number_idx").on(table.projectNumber),
    createdAtIdx: index("projects_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// PROJECT MILESTONES
// =============================================================================

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Milestone Details
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    stage: projectStageEnum("stage"),
    order: integer("order").default(0),

    // Dates
    plannedDate: date("planned_date"),
    actualDate: date("actual_date"),

    // Status
    status: varchar("status", { length: 20 }).default("pending"), // pending, in_progress, completed, delayed
    isRequired: boolean("is_required").default(true),

    // Completion
    completedBy: uuid("completed_by").references(() => users.id),
    completedAt: timestamp("completed_at"),
    completionNotes: text("completion_notes"),

    // Attachments
    attachments: jsonb("attachments").$type<
      Array<{
        name: string;
        url: string;
        type: string;
        size: number;
      }>
    >(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("milestones_project_idx").on(table.projectId),
    stageIdx: index("milestones_stage_idx").on(table.stage),
  })
);

// =============================================================================
// PROJECT DOCUMENTS
// =============================================================================

export const projectDocuments = pgTable(
  "project_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Document Info
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }), // contract, permit, plan, invoice, photo, report
    stage: projectStageEnum("stage"),

    // File
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 50 }),
    fileSize: integer("file_size"), // bytes
    thumbnailUrl: text("thumbnail_url"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Version Control
    version: integer("version").default(1),
    parentDocumentId: uuid("parent_document_id"),

    // Status
    status: varchar("status", { length: 20 }).default("active"), // active, archived, deleted

    // Upload
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("documents_project_idx").on(table.projectId),
    categoryIdx: index("documents_category_idx").on(table.category),
    stageIdx: index("documents_stage_idx").on(table.stage),
  })
);

// =============================================================================
// PROJECT PHOTOS
// =============================================================================

export const projectPhotos = pgTable(
  "project_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Photo Info
    title: varchar("title", { length: 255 }),
    description: text("description"),
    stage: projectStageEnum("stage"),
    category: varchar("category", { length: 50 }), // progress, issue, quality, final

    // File
    originalUrl: text("original_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    mediumUrl: text("medium_url"),

    // Metadata
    takenAt: timestamp("taken_at"),
    location: varchar("location", { length: 255 }), // Room or area
    coordinates: jsonb("coordinates").$type<{
      lat: number;
      lng: number;
    }>(),

    // EXIF Data
    exifData: jsonb("exif_data").$type<Record<string, unknown>>(),

    // Tags
    tags: text("tags").array(),

    // Visibility
    isPublic: boolean("is_public").default(false),
    showOnBauherrenPass: boolean("show_on_bauherren_pass").default(false),

    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("photos_project_idx").on(table.projectId),
    stageIdx: index("photos_stage_idx").on(table.stage),
    takenAtIdx: index("photos_taken_at_idx").on(table.takenAt),
  })
);

// =============================================================================
// PROJECT DAILY REPORTS (Bautagebuch)
// =============================================================================

export const projectDailyReports = pgTable(
  "project_daily_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Report Date
    reportDate: date("report_date").notNull(),
    stage: projectStageEnum("stage"),

    // Weather
    weather: jsonb("weather").$type<{
      condition: string; // sunny, cloudy, rainy, snowy
      temperatureMin: number;
      temperatureMax: number;
      precipitation: boolean;
      windSpeed?: number;
    }>(),

    // Work Summary
    workPerformed: text("work_performed"),
    workersOnSite: integer("workers_on_site"),
    workHours: decimal("work_hours", { precision: 5, scale: 2 }),

    // Materials
    materialsDelivered: jsonb("materials_delivered").$type<
      Array<{
        material: string;
        quantity: number;
        unit: string;
        supplier?: string;
      }>
    >(),

    // Equipment
    equipmentUsed: text("equipment_used").array(),

    // Issues & Delays
    issues: jsonb("issues").$type<
      Array<{
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        resolved: boolean;
        resolution?: string;
      }>
    >(),
    delayReason: text("delay_reason"),
    delayHours: decimal("delay_hours", { precision: 5, scale: 2 }),

    // Safety
    safetyIncidents: jsonb("safety_incidents").$type<
      Array<{
        description: string;
        severity: string;
        reportedTo?: string;
      }>
    >(),

    // Visitors
    visitors: jsonb("visitors").$type<
      Array<{
        name: string;
        company?: string;
        purpose: string;
        timeIn: string;
        timeOut: string;
      }>
    >(),

    // Notes
    notes: text("notes"),
    nextDayPlan: text("next_day_plan"),

    // Photos linked
    photoIds: uuid("photo_ids").array(),

    // Submission
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),

    // Approval
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("daily_reports_project_idx").on(table.projectId),
    dateIdx: index("daily_reports_date_idx").on(table.reportDate),
    projectDateIdx: index("daily_reports_project_date_idx").on(
      table.projectId,
      table.reportDate
    ),
  })
);

// =============================================================================
// PROJECT ACTIVITIES
// =============================================================================

export const projectActivities = pgTable(
  "project_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Activity Details
    type: varchar("type", { length: 50 }).notNull(), // stage_change, milestone, document, photo, note, issue
    title: varchar("title", { length: 255 }),
    description: text("description"),

    // Stage Change Details
    fromStage: projectStageEnum("from_stage"),
    toStage: projectStageEnum("to_stage"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // User
    performedBy: uuid("performed_by").references(() => users.id),

    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("project_activities_project_idx").on(table.projectId),
    typeIdx: index("project_activities_type_idx").on(table.type),
    occurredAtIdx: index("project_activities_occurred_at_idx").on(
      table.occurredAt
    ),
  })
);

// =============================================================================
// PROJECT TEAM MEMBERS
// =============================================================================

export const projectTeamMembers = pgTable(
  "project_team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),

    // For external team members (contractors, etc.)
    externalName: varchar("external_name", { length: 255 }),
    externalEmail: varchar("external_email", { length: 255 }),
    externalPhone: varchar("external_phone", { length: 50 }),
    externalCompany: varchar("external_company", { length: 255 }),

    // Role
    role: varchar("role", { length: 100 }).notNull(), // project_manager, architect, engineer, contractor, subcontractor
    permissions: text("permissions").array(), // view, edit, upload, approve

    // Dates
    startDate: date("start_date"),
    endDate: date("end_date"),

    isActive: boolean("is_active").default(true),

    addedBy: uuid("added_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("team_members_project_idx").on(table.projectId),
    userIdx: index("team_members_user_idx").on(table.userId),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [projects.contactId],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [projects.dealId],
    references: [deals.id],
  }),
  projectManager: one(users, {
    fields: [projects.projectManagerId],
    references: [users.id],
    relationName: "projectManager",
  }),
  salesRep: one(users, {
    fields: [projects.salesRepId],
    references: [users.id],
    relationName: "salesRep",
  }),
  milestones: many(projectMilestones),
  documents: many(projectDocuments),
  photos: many(projectPhotos),
  dailyReports: many(projectDailyReports),
  activities: many(projectActivities),
  teamMembers: many(projectTeamMembers),
}));

export const projectMilestonesRelations = relations(
  projectMilestones,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectMilestones.projectId],
      references: [projects.id],
    }),
    completedByUser: one(users, {
      fields: [projectMilestones.completedBy],
      references: [users.id],
    }),
  })
);

export const projectDocumentsRelations = relations(
  projectDocuments,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectDocuments.projectId],
      references: [projects.id],
    }),
    uploadedByUser: one(users, {
      fields: [projectDocuments.uploadedBy],
      references: [users.id],
    }),
  })
);

export const projectPhotosRelations = relations(projectPhotos, ({ one }) => ({
  project: one(projects, {
    fields: [projectPhotos.projectId],
    references: [projects.id],
  }),
  uploadedByUser: one(users, {
    fields: [projectPhotos.uploadedBy],
    references: [users.id],
  }),
}));

export const projectDailyReportsRelations = relations(
  projectDailyReports,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectDailyReports.projectId],
      references: [projects.id],
    }),
    submittedByUser: one(users, {
      fields: [projectDailyReports.submittedBy],
      references: [users.id],
    }),
    approvedByUser: one(users, {
      fields: [projectDailyReports.approvedBy],
      references: [users.id],
    }),
  })
);

export const projectActivitiesRelations = relations(
  projectActivities,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectActivities.projectId],
      references: [projects.id],
    }),
    organization: one(organizations, {
      fields: [projectActivities.organizationId],
      references: [organizations.id],
    }),
    performer: one(users, {
      fields: [projectActivities.performedBy],
      references: [users.id],
    }),
  })
);

export const projectTeamMembersRelations = relations(
  projectTeamMembers,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectTeamMembers.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectTeamMembers.userId],
      references: [users.id],
    }),
    addedByUser: one(users, {
      fields: [projectTeamMembers.addedBy],
      references: [users.id],
      relationName: "addedBy",
    }),
  })
);
