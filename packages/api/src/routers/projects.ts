import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc";
import {
  db,
  projects,
  projectMilestones,
  projectDocuments,
  projectPhotos,
  projectDailyReports,
  projectActivities,
  projectTeamMembers,
  eq,
  and,
  desc,
  asc,
  count,
  sql,
} from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

// German construction project stages - must match database enum
const projectStages = [
  "lead",
  "erstberatung",   // Initial consultation
  "angebot",        // Offer/proposal
  "vertrag",        // Contract
  "planung",        // Planning
  "vorbereitung",   // Preparation
  "rohbau",         // Shell construction
  "innenausbau",    // Interior construction
  "smart_home",     // Smart home installation
  "finishing",      // Final touches
  "abnahme",        // Acceptance/inspection
  "uebergabe",      // Handover
  "gewaehrleistung" // Warranty period
] as const;

const projectFilterSchema = z.object({
  search: z.string().optional(),
  stage: z.enum(projectStages).optional(),
  projectManagerId: z.string().uuid().optional(),
  salesRepId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  hasSmartHome: z.boolean().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createProjectSchema = z.object({
  name: z.string().max(255),
  description: z.string().optional(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),

  // Property Details
  propertyType: z.string().max(50).optional(),
  plotSize: z.number().positive().optional(),
  livingSpace: z.number().positive().optional(),
  floors: z.number().int().positive().optional(),
  rooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().positive().optional(),

  // Location
  street: z.string().max(255).optional(),
  streetNumber: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  state: z.string().max(100).optional(),
  country: z.string().length(2).default("DE"),

  // Value
  totalBudget: z.number().positive().optional(),
  currency: z.string().length(3).default("EUR"),

  // Dates
  plannedStartDate: z.date().optional(),
  plannedEndDate: z.date().optional(),

  // Smart Home
  smartHomeEnabled: z.boolean().default(false),
  smartHomeConfig: z.object({
    provider: z.string().optional(),
    features: z.array(z.string()).optional(),
    devices: z.array(z.object({
      type: z.string(),
      room: z.string(),
      quantity: z.number(),
    })).optional(),
  }).optional(),

  notes: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().uuid(),
});

const moveStageSchema = z.object({
  projectId: z.string().uuid(),
  newStage: z.enum(projectStages),
  notes: z.string().optional(),
});

const dailyReportSchema = z.object({
  projectId: z.string().uuid(),
  reportDate: z.date(),
  weather: z.object({
    condition: z.string(),
    temperatureMin: z.number(),
    temperatureMax: z.number(),
    precipitation: z.boolean(),
    windSpeed: z.number().optional(),
  }).optional(),
  workPerformed: z.string().optional(),
  workersOnSite: z.number().int().optional(),
  workHours: z.number().optional(),
  materialsDelivered: z.array(z.object({
    material: z.string(),
    quantity: z.number(),
    unit: z.string(),
    supplier: z.string().optional(),
  })).optional(),
  equipmentUsed: z.array(z.string()).optional(),
  issues: z.array(z.object({
    description: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    resolved: z.boolean(),
    resolution: z.string().optional(),
  })).optional(),
  delayReason: z.string().optional(),
  delayHours: z.number().optional(),
  notes: z.string().optional(),
  nextDayPlan: z.string().optional(),
});

// =============================================================================
// PROJECTS ROUTER
// =============================================================================

export const projectsRouter = createTRPCRouter({
  // List projects with filters and pagination
  list: orgProcedure
    .input(z.object({
      filters: projectFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(projects.organizationId, ctx.organizationId)];

      if (filters?.search) {
        conditions.push(
          sql`(
            ${projects.name} ILIKE ${`%${filters.search}%`} OR
            ${projects.projectNumber} ILIKE ${`%${filters.search}%`} OR
            ${projects.city} ILIKE ${`%${filters.search}%`}
          )`
        );
      }

      if (filters?.stage) {
        conditions.push(eq(projects.stage, filters.stage));
      }

      if (filters?.projectManagerId) {
        conditions.push(eq(projects.projectManagerId, filters.projectManagerId));
      }

      if (filters?.salesRepId) {
        conditions.push(eq(projects.salesRepId, filters.salesRepId));
      }

      if (filters?.contactId) {
        conditions.push(eq(projects.contactId, filters.contactId));
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(projects.isActive, filters.isActive));
      }

      if (filters?.hasSmartHome !== undefined) {
        conditions.push(eq(projects.smartHomeEnabled, filters.hasSmartHome));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(projects)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      // Get paginated results
      const sortField = projects[pagination?.sortBy as keyof typeof projects] ?? projects.createdAt;
      const sortOrder = pagination?.sortOrder === "asc" ? asc : desc;

      const items = await db
        .select()
        .from(projects)
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

  // Kanban view - projects grouped by stage
  kanban: orgProcedure
    .input(z.object({
      filters: projectFilterSchema.omit({ stage: true }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(projects.organizationId, ctx.organizationId),
        eq(projects.isActive, true),
      ];

      if (input.filters?.projectManagerId) {
        conditions.push(eq(projects.projectManagerId, input.filters.projectManagerId));
      }

      const allProjects = await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.stageChangedAt));

      // Group by stage
      const stageOrder = projectStages;
      const byStage: Record<string, typeof allProjects> = {};

      for (const stage of stageOrder) {
        byStage[stage] = allProjects.filter(p => p.stage === stage);
      }

      return {
        stages: stageOrder.map(stage => ({
          stage,
          projects: byStage[stage] ?? [],
          count: byStage[stage]?.length ?? 0,
        })),
        total: allProjects.length,
      };
    }),

  // Get single project by ID
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
          eq(projects.organizationId, ctx.organizationId)
        ),
        with: {
          contact: true,
          deal: true,
          projectManager: true,
          salesRep: true,
          milestones: {
            orderBy: asc(projectMilestones.order),
          },
          activities: {
            orderBy: desc(projectActivities.occurredAt),
            limit: 20,
          },
          teamMembers: {
            where: eq(projectTeamMembers.isActive, true),
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return project;
    }),

  // Create new project
  create: orgProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate project number
      const year = new Date().getFullYear();
      const [lastProject] = await db
        .select({ projectNumber: projects.projectNumber })
        .from(projects)
        .where(eq(projects.organizationId, ctx.organizationId))
        .orderBy(desc(projects.createdAt))
        .limit(1);

      let sequence = 1;
      if (lastProject?.projectNumber) {
        const match = lastProject.projectNumber.match(/\d+$/);
        if (match) {
          sequence = parseInt(match[0], 10) + 1;
        }
      }

      const projectNumber = `WMB-${year}-${String(sequence).padStart(4, "0")}`;

      const [project] = await db
        .insert(projects)
        .values({
          name: input.name,
          description: input.description,
          contactId: input.contactId,
          dealId: input.dealId,
          propertyType: input.propertyType,
          floors: input.floors,
          rooms: input.rooms,
          bathrooms: input.bathrooms,
          street: input.street,
          streetNumber: input.streetNumber,
          city: input.city,
          postalCode: input.postalCode,
          state: input.state,
          country: input.country,
          currency: input.currency,
          smartHomeEnabled: input.smartHomeEnabled,
          smartHomeConfig: input.smartHomeConfig,
          notes: input.notes,
          organizationId: ctx.organizationId,
          projectNumber,
          subsidiary: "west_money_bau",
          stage: "lead",
          stageChangedAt: new Date(),
          projectManagerId: ctx.user.id,
          plotSize: input.plotSize?.toString(),
          livingSpace: input.livingSpace?.toString(),
          totalBudget: input.totalBudget?.toString(),
          plannedStartDate: input.plannedStartDate?.toISOString().split("T")[0],
          plannedEndDate: input.plannedEndDate?.toISOString().split("T")[0],
        })
        .returning();

      // Create default milestones for each stage
      const defaultMilestones = projectStages.map((stage, index) => ({
        projectId: project.id,
        name: getStageMilestoneName(stage),
        stage,
        order: index,
        isRequired: true,
        status: "pending",
      }));

      await db.insert(projectMilestones).values(defaultMilestones);

      // Log activity
      await db.insert(projectActivities).values({
        projectId: project.id,
        organizationId: ctx.organizationId,
        type: "created",
        title: "Project created",
        performedBy: ctx.user.id,
      });

      return project;
    }),

  // Update project
  update: orgProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, id),
          eq(projects.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const { plannedStartDate, plannedEndDate, ...restData } = data;
      const [project] = await db
        .update(projects)
        .set({
          ...restData,
          plotSize: data.plotSize?.toString(),
          livingSpace: data.livingSpace?.toString(),
          totalBudget: data.totalBudget?.toString(),
          plannedStartDate: plannedStartDate?.toISOString().split("T")[0],
          plannedEndDate: plannedEndDate?.toISOString().split("T")[0],
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      // Log activity
      await db.insert(projectActivities).values({
        projectId: project.id,
        organizationId: ctx.organizationId,
        type: "updated",
        title: "Project updated",
        metadata: { changedFields: Object.keys(data) },
        performedBy: ctx.user.id,
      });

      return project;
    }),

  // Move project to a different stage
  moveToStage: orgProcedure
    .input(moveStageSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const oldStage = existing.stage;

      // Calculate days in previous stage
      const daysInStage = existing.stageChangedAt
        ? Math.floor((Date.now() - existing.stageChangedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const [project] = await db
        .update(projects)
        .set({
          stage: input.newStage,
          stageChangedAt: new Date(),
          stageDuration: daysInStage,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId))
        .returning();

      // Update milestone status
      await db
        .update(projectMilestones)
        .set({
          status: "completed",
          completedAt: new Date(),
          completedBy: ctx.user.id,
        })
        .where(
          and(
            eq(projectMilestones.projectId, input.projectId),
            eq(projectMilestones.stage, oldStage as any)
          )
        );

      // Log activity
      await db.insert(projectActivities).values({
        projectId: project.id,
        organizationId: ctx.organizationId,
        type: "stage_change",
        title: `Stage changed from ${oldStage} to ${input.newStage}`,
        fromStage: oldStage,
        toStage: input.newStage,
        metadata: input.notes ? { notes: input.notes } : undefined,
        performedBy: ctx.user.id,
      });

      return project;
    }),

  // Add daily report (Bautagebuch)
  addDailyReport: orgProcedure
    .input(dailyReportSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const [report] = await db
        .insert(projectDailyReports)
        .values({
          projectId: input.projectId,
          reportDate: input.reportDate.toISOString().split("T")[0],
          weather: input.weather,
          workPerformed: input.workPerformed,
          workersOnSite: input.workersOnSite,
          materialsDelivered: input.materialsDelivered,
          equipmentUsed: input.equipmentUsed,
          issues: input.issues,
          delayReason: input.delayReason,
          notes: input.notes,
          nextDayPlan: input.nextDayPlan,
          stage: existing.stage,
          workHours: input.workHours?.toString(),
          delayHours: input.delayHours?.toString(),
          submittedBy: ctx.user.id,
        })
        .returning();

      // Log activity
      await db.insert(projectActivities).values({
        projectId: input.projectId,
        organizationId: ctx.organizationId,
        type: "daily_report",
        title: `Daily report for ${input.reportDate.toISOString().split("T")[0]}`,
        performedBy: ctx.user.id,
      });

      return report;
    }),

  // Get daily reports for a project
  getDailyReports: orgProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, ctx.organizationId)
        ),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const offset = (input.page - 1) * input.limit;

      const [countResult] = await db
        .select({ count: count() })
        .from(projectDailyReports)
        .where(eq(projectDailyReports.projectId, input.projectId));

      const total = countResult?.count ?? 0;

      const reports = await db.query.projectDailyReports.findMany({
        where: eq(projectDailyReports.projectId, input.projectId),
        orderBy: desc(projectDailyReports.reportDate),
        limit: input.limit,
        offset,
        with: {
          submittedByUser: true,
          approvedByUser: true,
        },
      });

      return {
        items: reports,
        total,
        page: input.page,
        limit: input.limit,
        hasMore: offset + reports.length < total,
      };
    }),

  // Get project statistics
  stats: orgProcedure
    .input(z.object({
      projectManagerId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(projects.organizationId, ctx.organizationId)];

      if (input?.projectManagerId) {
        conditions.push(eq(projects.projectManagerId, input.projectManagerId));
      }

      const [totalResult] = await db
        .select({ count: count() })
        .from(projects)
        .where(and(...conditions));

      const byStage = await db
        .select({
          stage: projects.stage,
          count: count(),
        })
        .from(projects)
        .where(and(...conditions, eq(projects.isActive, true)))
        .groupBy(projects.stage);

      const totalBudgetResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(${projects.totalBudget}), 0)`,
        })
        .from(projects)
        .where(and(...conditions, eq(projects.isActive, true)));

      return {
        total: totalResult?.count ?? 0,
        byStage: Object.fromEntries(byStage.map(r => [r.stage, r.count])),
        totalBudget: parseFloat(totalBudgetResult[0]?.total ?? "0"),
      };
    }),

  // Delete project
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
          eq(projects.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      await db.delete(projects).where(eq(projects.id, input.id));

      return { success: true };
    }),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStageMilestoneName(stage: typeof projectStages[number]): string {
  const names: Record<typeof projectStages[number], string> = {
    lead: "Lead Qualification",
    erstberatung: "Erstberatung abgeschlossen",    // Initial consultation complete
    angebot: "Angebot erstellt",                   // Offer created
    vertrag: "Vertrag unterschrieben",             // Contract signed
    planung: "Planung genehmigt",                  // Planning approved
    vorbereitung: "Vorbereitung abgeschlossen",    // Preparation complete
    rohbau: "Rohbau fertiggestellt",               // Shell construction complete
    innenausbau: "Innenausbau fertiggestellt",     // Interior work complete
    smart_home: "Smart Home installiert",          // Smart home installed
    finishing: "Finishing abgeschlossen",          // Finishing complete
    abnahme: "Abnahme durchgeführt",               // Inspection complete
    uebergabe: "Übergabe erfolgt",                 // Handover complete
    gewaehrleistung: "Gewährleistung abgeschlossen", // Warranty period complete
  };
  return names[stage];
}
