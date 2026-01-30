import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth";
import { contacts } from "./contacts";
import { deals } from "./deals";
import { kundenkarten, kundenkarteDocuments } from "./kundenkarte";

// =============================================================================
// ENUMS
// =============================================================================

export const presentationStatusEnum = pgEnum("presentation_status", [
  "draft",           // Entwurf - Dokumente werden gesammelt
  "documents_ready", // Dokumente vollständig
  "generating",      // Wird generiert
  "ready",           // Bereit zum Versand
  "sent",            // Versendet
  "viewed",          // Angesehen
  "completed",       // Abgeschlossen
  "expired",         // Abgelaufen
]);

export const moneyMachineStageEnum = pgEnum("money_machine_stage", [
  // === PHASE 1: VERKAUF (Alle Projekttypen) ===
  "deal_received",        // Deal aus HubSpot erhalten
  "kundenkarte_created",  // Kundenkarte erstellt
  "documents_pending",    // Warte auf Dokumente
  "documents_uploaded",   // Dokumente hochgeladen
  "presentation_ready",   // Präsentation bereit
  "email_sent",           // Email versendet
  "presentation_viewed",  // Präsentation angesehen
  "bauherren_pass_offered", // Bauherren-Pass angeboten
  "bauherren_pass_sold",  // Bauherren-Pass verkauft

  // === PHASE 2A: PLANUNG & VORBEREITUNG (Bau) ===
  "planning_started",     // Detailplanung gestartet
  "subcontractors_assigned", // Subunternehmen beauftragt
  "materials_ordered",    // Material & Sachen bestellt
  "permits_obtained",     // Genehmigungen erhalten

  // === PHASE 3A: BAUAUSFÜHRUNG ===
  "construction_started", // Bau gestartet
  "foundation_complete",  // Fundament/Rohbau fertig
  "shell_complete",       // Rohbau fertig
  "systems_installed",    // Haustechnik installiert (Elektro, Sanitär, Smart Home)
  "interior_complete",    // Innenausbau fertig

  // === PHASE 2B: SOFTWARE DEVELOPMENT ===
  "requirements_analysis",    // Anforderungsanalyse
  "architecture_design",      // Architektur & Design
  "development_started",      // Entwicklung gestartet
  "development_sprint",       // Aktiver Sprint
  "feature_complete",         // Features fertiggestellt
  "testing_qa",               // Testing & QA
  "staging_deployed",         // Staging Deployment
  "user_acceptance",          // User Acceptance Testing
  "production_deployed",      // Production Deployment
  "app_delivered",            // App übergeben

  // === PHASE 4: ABSCHLUSS (Alle Projekttypen) ===
  "quality_inspection",   // Qualitätsprüfung & Abnahme
  "final_handover",       // Finale Übergabe an Kunden
  "completed",            // Workflow abgeschlossen
]);

// =============================================================================
// PRESENTATIONS - Deal-specific presentations
// =============================================================================

export const presentations = pgTable(
  "presentations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // References
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    kundenkarteId: uuid("kundenkarte_id")
      .references(() => kundenkarten.id, { onDelete: "set null" }),
    contactId: uuid("contact_id")
      .references(() => contacts.id, { onDelete: "set null" }),

    // Presentation Info
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: presentationStatusEnum("status").default("draft").notNull(),

    // Unique Access
    accessToken: varchar("access_token", { length: 64 }).notNull().unique(),
    publicUrl: text("public_url"),

    // Content from Documents
    includedDocuments: jsonb("included_documents").$type<Array<{
      documentId: string;
      documentType: string;
      fileName: string;
      fileUrl: string;
      includedAt: string;
    }>>(),

    // Generated Presentation Data
    slides: jsonb("slides").$type<Array<{
      order: number;
      type: "cover" | "overview" | "floor_plan" | "visualization" | "features" | "pricing" | "timeline" | "contact" | "bauherren_pass";
      title: string;
      content: Record<string, unknown>;
      imageUrl?: string;
    }>>(),

    // Customer Data Snapshot (for presentation generation)
    customerSnapshot: jsonb("customer_snapshot").$type<{
      name: string;
      email: string;
      phone?: string;
      address?: string;
      bauvorhabenTyp?: string;
      hausTyp?: string;
      wohnflaeche?: number;
      grundstueckGroesse?: number;
      gesamtbudget?: number;
      smartHomeInteresse?: boolean;
    }>(),

    // Tracking
    viewCount: integer("view_count").default(0),
    lastViewedAt: timestamp("last_viewed_at", { mode: "date" }),
    firstViewedAt: timestamp("first_viewed_at", { mode: "date" }),
    averageViewDuration: integer("average_view_duration"), // seconds

    // Email Tracking
    emailSentAt: timestamp("email_sent_at", { mode: "date" }),
    emailTo: varchar("email_to", { length: 255 }),
    emailOpenedAt: timestamp("email_opened_at", { mode: "date" }),

    // Bauherren-Pass Offer
    bauherrenPassOffered: boolean("bauherren_pass_offered").default(false),
    bauherrenPassOfferedAt: timestamp("bauherren_pass_offered_at", { mode: "date" }),
    bauherrenPassAccepted: boolean("bauherren_pass_accepted").default(false),
    bauherrenPassAcceptedAt: timestamp("bauherren_pass_accepted_at", { mode: "date" }),

    // Expiry
    expiresAt: timestamp("expires_at", { mode: "date" }),

    // Assignment
    createdBy: uuid("created_by").references(() => users.id),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("presentations_org_idx").on(table.organizationId),
    dealIdx: index("presentations_deal_idx").on(table.dealId),
    kundenkarteIdx: index("presentations_kundenkarte_idx").on(table.kundenkarteId),
    statusIdx: index("presentations_status_idx").on(table.status),
    accessTokenIdx: index("presentations_access_token_idx").on(table.accessToken),
    createdAtIdx: index("presentations_created_at_idx").on(table.createdAt),
  })
);

// =============================================================================
// PRESENTATION VIEWS - Track each view of a presentation
// =============================================================================

export const presentationViews = pgTable(
  "presentation_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    presentationId: uuid("presentation_id")
      .notNull()
      .references(() => presentations.id, { onDelete: "cascade" }),

    // View Details
    viewedAt: timestamp("viewed_at", { mode: "date" }).defaultNow().notNull(),
    duration: integer("duration"), // seconds

    // Viewer Info (anonymous tracking)
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    deviceType: varchar("device_type", { length: 50 }), // mobile, tablet, desktop

    // Engagement
    slidesViewed: jsonb("slides_viewed").$type<Array<{
      slideIndex: number;
      viewedAt: string;
      duration: number;
    }>>(),
    maxSlideReached: integer("max_slide_reached"),
    completedViewing: boolean("completed_viewing").default(false),

    // Actions taken
    downloadedDocuments: boolean("downloaded_documents").default(false),
    clickedContactButton: boolean("clicked_contact_button").default(false),
    clickedBauherrenPass: boolean("clicked_bauherren_pass").default(false),
  },
  (table) => ({
    presentationIdx: index("presentation_views_presentation_idx").on(table.presentationId),
    viewedAtIdx: index("presentation_views_viewed_at_idx").on(table.viewedAt),
  })
);

// =============================================================================
// MONEY MACHINE WORKFLOW - Track the complete workflow for each deal
// =============================================================================

export const moneyMachineWorkflows = pgTable(
  "money_machine_workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // References
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" })
      .unique(), // One workflow per deal
    kundenkarteId: uuid("kundenkarte_id")
      .references(() => kundenkarten.id, { onDelete: "set null" }),
    presentationId: uuid("presentation_id")
      .references(() => presentations.id, { onDelete: "set null" }),
    contactId: uuid("contact_id")
      .references(() => contacts.id, { onDelete: "set null" }),

    // HubSpot Reference
    hubspotDealId: varchar("hubspot_deal_id", { length: 50 }),

    // Current Stage
    currentStage: moneyMachineStageEnum("current_stage").default("deal_received").notNull(),
    previousStage: moneyMachineStageEnum("previous_stage"),

    // Stage Timestamps - Phase 1: Verkauf
    dealReceivedAt: timestamp("deal_received_at", { mode: "date" }).defaultNow(),
    kundenkarteCreatedAt: timestamp("kundenkarte_created_at", { mode: "date" }),
    documentsUploadedAt: timestamp("documents_uploaded_at", { mode: "date" }),
    presentationReadyAt: timestamp("presentation_ready_at", { mode: "date" }),
    emailSentAt: timestamp("email_sent_at", { mode: "date" }),
    presentationViewedAt: timestamp("presentation_viewed_at", { mode: "date" }),
    bauherrenPassOfferedAt: timestamp("bauherren_pass_offered_at", { mode: "date" }),
    bauherrenPassSoldAt: timestamp("bauherren_pass_sold_at", { mode: "date" }),

    // Stage Timestamps - Phase 2: Planung & Vorbereitung
    planningStartedAt: timestamp("planning_started_at", { mode: "date" }),
    subcontractorsAssignedAt: timestamp("subcontractors_assigned_at", { mode: "date" }),
    materialsOrderedAt: timestamp("materials_ordered_at", { mode: "date" }),
    permitsObtainedAt: timestamp("permits_obtained_at", { mode: "date" }),

    // Stage Timestamps - Phase 3: Bauausführung
    constructionStartedAt: timestamp("construction_started_at", { mode: "date" }),
    foundationCompleteAt: timestamp("foundation_complete_at", { mode: "date" }),
    shellCompleteAt: timestamp("shell_complete_at", { mode: "date" }),
    systemsInstalledAt: timestamp("systems_installed_at", { mode: "date" }),
    interiorCompleteAt: timestamp("interior_complete_at", { mode: "date" }),

    // Stage Timestamps - Phase 2B: Software Development
    requirementsAnalysisAt: timestamp("requirements_analysis_at", { mode: "date" }),
    architectureDesignAt: timestamp("architecture_design_at", { mode: "date" }),
    developmentStartedAt: timestamp("development_started_at", { mode: "date" }),
    featureCompleteAt: timestamp("feature_complete_at", { mode: "date" }),
    testingQaAt: timestamp("testing_qa_at", { mode: "date" }),
    stagingDeployedAt: timestamp("staging_deployed_at", { mode: "date" }),
    userAcceptanceAt: timestamp("user_acceptance_at", { mode: "date" }),
    productionDeployedAt: timestamp("production_deployed_at", { mode: "date" }),
    appDeliveredAt: timestamp("app_delivered_at", { mode: "date" }),

    // Stage Timestamps - Phase 4: Abschluss
    qualityInspectionAt: timestamp("quality_inspection_at", { mode: "date" }),
    finalHandoverAt: timestamp("final_handover_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),

    // Document Checklist
    requiredDocuments: jsonb("required_documents").$type<Array<{
      type: string;
      label: string;
      required: boolean;
      uploaded: boolean;
      documentId?: string;
    }>>(),
    documentsComplete: boolean("documents_complete").default(false),

    // Email Info
    customerEmail: varchar("customer_email", { length: 255 }),
    emailSentCount: integer("email_sent_count").default(0),
    lastEmailSentAt: timestamp("last_email_sent_at", { mode: "date" }),

    // Revenue Tracking
    dealAmount: integer("deal_amount"), // in cents
    bauherrenPassRevenue: integer("bauherren_pass_revenue"), // in cents
    totalRevenue: integer("total_revenue"), // in cents

    // === BAUAUSFÜHRUNG TRACKING ===

    // Projekt-Typ (Smart Factory, Smart Home, etc.)
    projectType: varchar("project_type", { length: 100 }), // smart_factory, smart_home, renovation, etc.
    projectName: varchar("project_name", { length: 255 }),

    // Subunternehmen Tracking
    subcontractors: jsonb("subcontractors").$type<Array<{
      id: string;
      name: string;
      trade: string; // Gewerk: Elektro, Sanitär, Rohbau, etc.
      status: "pending" | "contacted" | "quoted" | "assigned" | "working" | "completed";
      contactPerson?: string;
      phone?: string;
      email?: string;
      quotedAmount?: number; // in cents
      assignedAt?: string;
      completedAt?: string;
      notes?: string;
    }>>(),

    // Material & Bestellungen
    materialOrders: jsonb("material_orders").$type<Array<{
      id: string;
      description: string;
      category: string; // Baumaterial, Smart Home, Elektro, Sanitär, etc.
      supplier?: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number; // in cents
      totalPrice?: number; // in cents
      status: "planned" | "ordered" | "shipped" | "delivered" | "installed";
      orderedAt?: string;
      expectedDelivery?: string;
      deliveredAt?: string;
      notes?: string;
    }>>(),

    // Genehmigungen & Permits
    permits: jsonb("permits").$type<Array<{
      id: string;
      type: string; // Baugenehmigung, Stromzuleitung, etc.
      authority: string; // Behörde
      status: "required" | "applied" | "pending" | "approved" | "rejected";
      applicationDate?: string;
      approvalDate?: string;
      expiryDate?: string;
      documentUrl?: string;
      notes?: string;
    }>>(),

    // Bau-Meilensteine & Fortschritt
    constructionMilestones: jsonb("construction_milestones").$type<Array<{
      id: string;
      name: string;
      phase: "planning" | "foundation" | "shell" | "systems" | "interior" | "finishing";
      status: "pending" | "in_progress" | "completed" | "delayed";
      plannedStart?: string;
      plannedEnd?: string;
      actualStart?: string;
      actualEnd?: string;
      completionPercentage: number;
      assignedSubcontractor?: string;
      notes?: string;
      photos?: string[]; // URLs to progress photos
    }>>(),

    // Smart Home / Smart Factory Spezifisch
    smartSystems: jsonb("smart_systems").$type<Array<{
      id: string;
      systemType: string; // lighting, security, hvac, automation, energy, etc.
      brand?: string;
      model?: string;
      status: "planned" | "ordered" | "delivered" | "installed" | "configured" | "tested";
      installedBy?: string;
      configuredAt?: string;
      notes?: string;
    }>>(),

    // Gesamtfortschritt
    overallProgress: integer("overall_progress").default(0), // 0-100%
    currentPhase: varchar("current_phase", { length: 50 }), // planning, foundation, shell, systems, interior, finishing
    estimatedCompletionDate: timestamp("estimated_completion_date", { mode: "date" }),
    actualCompletionDate: timestamp("actual_completion_date", { mode: "date" }),

    // Qualitätssicherung
    qualityChecks: jsonb("quality_checks").$type<Array<{
      id: string;
      checkType: string;
      inspector?: string;
      date: string;
      passed: boolean;
      issues?: string[];
      photos?: string[];
      notes?: string;
    }>>(),

    // === SOFTWARE DEVELOPMENT TRACKING ===

    // Tech Stack & Architecture
    techStack: jsonb("tech_stack").$type<{
      frontend?: string[];    // React, Vue, Next.js, etc.
      backend?: string[];     // Node.js, Python, Go, etc.
      database?: string[];    // PostgreSQL, MongoDB, etc.
      infrastructure?: string[]; // AWS, Azure, Kubernetes, etc.
      languages?: string[];   // TypeScript, Python, etc.
    }>(),

    // Software Requirements
    softwareRequirements: jsonb("software_requirements").$type<Array<{
      id: string;
      title: string;
      description: string;
      type: "functional" | "non_functional" | "technical" | "business";
      priority: "must_have" | "should_have" | "nice_to_have";
      status: "draft" | "approved" | "in_progress" | "completed" | "deferred";
      estimatedHours?: number;
      actualHours?: number;
      assignedTo?: string;
      linkedFeatures?: string[];
      notes?: string;
    }>>(),

    // Development Sprints
    sprints: jsonb("sprints").$type<Array<{
      id: string;
      name: string;
      number: number;
      status: "planned" | "active" | "completed" | "cancelled";
      startDate: string;
      endDate: string;
      goals: string[];
      completedGoals?: string[];
      velocity?: number;
      notes?: string;
    }>>(),
    currentSprintId: varchar("current_sprint_id", { length: 50 }),

    // Features & User Stories
    features: jsonb("features").$type<Array<{
      id: string;
      title: string;
      description: string;
      status: "backlog" | "todo" | "in_progress" | "review" | "testing" | "done";
      priority: number; // 1-5
      storyPoints?: number;
      assignedTo?: string;
      sprintId?: string;
      linkedRequirements?: string[];
      acceptanceCriteria?: string[];
      completedAt?: string;
    }>>(),

    // Bugs & Issues
    bugs: jsonb("bugs").$type<Array<{
      id: string;
      title: string;
      description: string;
      severity: "critical" | "high" | "medium" | "low";
      status: "open" | "in_progress" | "resolved" | "closed" | "wont_fix";
      reportedBy?: string;
      assignedTo?: string;
      reportedAt: string;
      resolvedAt?: string;
      environment?: string;
      stepsToReproduce?: string[];
      resolution?: string;
    }>>(),

    // Deployments
    deployments: jsonb("deployments").$type<Array<{
      id: string;
      environment: "development" | "staging" | "production";
      version: string;
      status: "pending" | "deploying" | "success" | "failed" | "rolled_back";
      deployedAt: string;
      deployedBy?: string;
      commitHash?: string;
      releaseNotes?: string;
      rollbackVersion?: string;
    }>>(),

    // Code Repository
    repositoryUrl: varchar("repository_url", { length: 500 }),
    repositoryBranch: varchar("repository_branch", { length: 100 }),
    lastCommitHash: varchar("last_commit_hash", { length: 50 }),
    lastCommitAt: timestamp("last_commit_at", { mode: "date" }),

    // Testing & QA
    testCoverage: integer("test_coverage"), // 0-100%
    testResults: jsonb("test_results").$type<{
      unit?: { passed: number; failed: number; skipped: number; };
      integration?: { passed: number; failed: number; skipped: number; };
      e2e?: { passed: number; failed: number; skipped: number; };
      lastRunAt?: string;
    }>(),

    // Documentation
    documentationUrls: jsonb("documentation_urls").$type<{
      technicalDocs?: string;
      apiDocs?: string;
      userGuide?: string;
      deploymentGuide?: string;
    }>(),

    // Status Flags
    isActive: boolean("is_active").default(true),
    isPaused: boolean("is_paused").default(false),
    pausedReason: text("paused_reason"),

    // Error Handling
    lastError: text("last_error"),
    errorCount: integer("error_count").default(0),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Assignment
    assignedTo: uuid("assigned_to").references(() => users.id),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("money_machine_org_idx").on(table.organizationId),
    dealIdx: index("money_machine_deal_idx").on(table.dealId),
    stageIdx: index("money_machine_stage_idx").on(table.currentStage),
    hubspotIdx: index("money_machine_hubspot_idx").on(table.hubspotDealId),
    activeIdx: index("money_machine_active_idx").on(table.isActive),
  })
);

// =============================================================================
// MONEY MACHINE ACTIVITY LOG
// =============================================================================

export const moneyMachineActivities = pgTable(
  "money_machine_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => moneyMachineWorkflows.id, { onDelete: "cascade" }),

    // Activity Details
    activityType: varchar("activity_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Stage Change
    fromStage: moneyMachineStageEnum("from_stage"),
    toStage: moneyMachineStageEnum("to_stage"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Performer
    performedBy: uuid("performed_by").references(() => users.id),
    isAutomated: boolean("is_automated").default(false),

    // Timestamp
    occurredAt: timestamp("occurred_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workflowIdx: index("money_machine_activities_workflow_idx").on(table.workflowId),
    typeIdx: index("money_machine_activities_type_idx").on(table.activityType),
    occurredAtIdx: index("money_machine_activities_occurred_at_idx").on(table.occurredAt),
  })
);

// =============================================================================
// RELATIONS
// =============================================================================

export const presentationsRelations = relations(presentations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [presentations.organizationId],
    references: [organizations.id],
  }),
  deal: one(deals, {
    fields: [presentations.dealId],
    references: [deals.id],
  }),
  kundenkarte: one(kundenkarten, {
    fields: [presentations.kundenkarteId],
    references: [kundenkarten.id],
  }),
  contact: one(contacts, {
    fields: [presentations.contactId],
    references: [contacts.id],
  }),
  createdByUser: one(users, {
    fields: [presentations.createdBy],
    references: [users.id],
  }),
  views: many(presentationViews),
}));

export const presentationViewsRelations = relations(presentationViews, ({ one }) => ({
  presentation: one(presentations, {
    fields: [presentationViews.presentationId],
    references: [presentations.id],
  }),
}));

export const moneyMachineWorkflowsRelations = relations(moneyMachineWorkflows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [moneyMachineWorkflows.organizationId],
    references: [organizations.id],
  }),
  deal: one(deals, {
    fields: [moneyMachineWorkflows.dealId],
    references: [deals.id],
  }),
  kundenkarte: one(kundenkarten, {
    fields: [moneyMachineWorkflows.kundenkarteId],
    references: [kundenkarten.id],
  }),
  presentation: one(presentations, {
    fields: [moneyMachineWorkflows.presentationId],
    references: [presentations.id],
  }),
  contact: one(contacts, {
    fields: [moneyMachineWorkflows.contactId],
    references: [contacts.id],
  }),
  assignedToUser: one(users, {
    fields: [moneyMachineWorkflows.assignedTo],
    references: [users.id],
  }),
  activities: many(moneyMachineActivities),
}));

export const moneyMachineActivitiesRelations = relations(moneyMachineActivities, ({ one }) => ({
  workflow: one(moneyMachineWorkflows, {
    fields: [moneyMachineActivities.workflowId],
    references: [moneyMachineWorkflows.id],
  }),
  performer: one(users, {
    fields: [moneyMachineActivities.performedBy],
    references: [users.id],
  }),
}));
