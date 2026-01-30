import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db, projects, sql } from "@nexus/db";

// =============================================================================
// CONSTRUCTION STATS ROUTER
// Public API for SciFi Construction Dashboard
// =============================================================================

// Construction phases matching the SciFi dashboard
const CONSTRUCTION_PHASES = [
  { id: "planning", name: "Planung", icon: "◎", color: "cyan", order: 0 },
  { id: "permits", name: "Genehmigung", icon: "◈", color: "cyan", order: 1 },
  { id: "foundation", name: "Fundament", icon: "▣", color: "purple", order: 2 },
  { id: "structure", name: "Rohbau", icon: "◆", color: "purple", order: 3 },
  { id: "exterior", name: "Außenarbeiten", icon: "◇", color: "orange", order: 4 },
  { id: "interior", name: "Innenausbau", icon: "◉", color: "orange", order: 5 },
  { id: "finishing", name: "Fertigstellung", icon: "★", color: "green", order: 6 },
  { id: "handover", name: "Übergabe", icon: "神", color: "god", order: 7 },
] as const;

// Map database stages to construction phases
const STAGE_TO_PHASE: Record<string, string> = {
  lead: "planning",
  erstberatung: "planning",
  angebot: "planning",
  vertrag: "permits",
  planung: "permits",
  vorbereitung: "foundation",
  rohbau: "structure",
  innenausbau: "interior",
  smart_home: "interior",
  finishing: "finishing",
  abnahme: "finishing",
  uebergabe: "handover",
  gewaehrleistung: "handover",
};

// Demo data for when database is not available
const DEMO_PROJECTS = [
  {
    id: "wmb-001",
    name: "Villa Sonnenblick",
    location: "München-Grünwald",
    type: "Einfamilienhaus",
    phase: "structure",
    progress: 68,
    budget: 1850000,
    spent: 1258000,
    startDate: "2024-03-15",
    estimatedEnd: "2025-06-30",
    team: 12,
  },
  {
    id: "wmb-002",
    name: "Residenz am Park",
    location: "Berlin-Charlottenburg",
    type: "Mehrfamilienhaus",
    phase: "exterior",
    progress: 52,
    budget: 4200000,
    spent: 2184000,
    startDate: "2024-01-10",
    estimatedEnd: "2025-09-15",
    team: 24,
  },
  {
    id: "wmb-003",
    name: "Stadthaus Königstein",
    location: "Frankfurt-Königstein",
    type: "Stadthaus",
    phase: "interior",
    progress: 78,
    budget: 980000,
    spent: 764400,
    startDate: "2024-06-01",
    estimatedEnd: "2025-03-31",
    team: 8,
  },
  {
    id: "wmb-004",
    name: "Penthouse Alster",
    location: "Hamburg-Eppendorf",
    type: "Penthouse",
    phase: "foundation",
    progress: 15,
    budget: 2400000,
    spent: 360000,
    startDate: "2024-11-01",
    estimatedEnd: "2026-02-28",
    team: 6,
  },
];

// Check if projects table exists
async function projectsTableExists(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1 FROM projects LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

// Get projects from database or return demo data
async function getProjects() {
  const tableExists = await projectsTableExists();

  if (!tableExists) {
    return {
      source: "demo" as const,
      projects: DEMO_PROJECTS,
    };
  }

  // Query real projects from database
  const dbProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      city: projects.city,
      propertyType: projects.propertyType,
      stage: projects.stage,
      progress: projects.overallProgress,
      budget: projects.totalBudget,
      spent: projects.currentSpent,
      startDate: projects.plannedStartDate,
      estimatedEnd: projects.plannedEndDate,
    })
    .from(projects)
    .where(sql`${projects.isActive} = true`)
    .limit(50);

  if (dbProjects.length === 0) {
    return {
      source: "demo" as const,
      projects: DEMO_PROJECTS,
    };
  }

  return {
    source: "database" as const,
    projects: dbProjects.map((p) => ({
      id: p.id,
      name: p.name,
      location: p.city || "Germany",
      type: p.propertyType || "Bauvorhaben",
      phase: STAGE_TO_PHASE[p.stage || "lead"] || "planning",
      progress: p.progress || 0,
      budget: parseFloat(p.budget || "0"),
      spent: parseFloat(p.spent || "0"),
      startDate: p.startDate || new Date().toISOString().split("T")[0],
      estimatedEnd: p.estimatedEnd || new Date().toISOString().split("T")[0],
      team: 8, // Default team size
    })),
  };
}

export const constructionStatsRouter = createTRPCRouter({
  // ===========================================================================
  // DASHBOARD STATS
  // ===========================================================================

  /**
   * Get construction dashboard stats
   */
  getDashboardStats: publicProcedure.query(async () => {
    try {
      const { source, projects } = await getProjects();

      const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
      const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
      const avgProgress = Math.round(
        projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
      );
      const totalTeam = projects.reduce((sum, p) => sum + p.team, 0);

      // Projects by phase
      const byPhase: Record<string, number> = {};
      for (const project of projects) {
        byPhase[project.phase] = (byPhase[project.phase] || 0) + 1;
      }

      return {
        success: true,
        source,
        data: {
          activeProjects: projects.length,
          totalBudget,
          totalSpent,
          avgProgress,
          totalTeam,
          byPhase,
          phases: CONSTRUCTION_PHASES.map((phase) => ({
            ...phase,
            count: byPhase[phase.id] || 0,
            progress:
              projects
                .filter((p) => p.phase === phase.id)
                .reduce((sum, p) => sum + p.progress, 0) /
                (byPhase[phase.id] || 1) || 0,
          })),
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("[Construction Stats] Error:", error);
      return {
        success: false,
        error: String(error),
        data: null,
      };
    }
  }),

  /**
   * Get active construction projects
   */
  getProjects: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          phase: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const { source, projects } = await getProjects();

        let filtered = projects;
        if (input?.phase) {
          filtered = projects.filter((p) => p.phase === input.phase);
        }

        const limited = filtered.slice(0, input?.limit || 20);

        return {
          success: true,
          source,
          total: filtered.length,
          data: limited,
        };
      } catch (error) {
        console.error("[Construction Stats] Projects error:", error);
        return {
          success: false,
          error: String(error),
          total: 0,
          data: [],
        };
      }
    }),

  /**
   * Get phases with progress
   */
  getPhases: publicProcedure.query(async () => {
    try {
      const { source, projects } = await getProjects();

      // Calculate average progress per phase based on projects in that phase
      const phaseProgress: Record<string, { total: number; count: number }> = {};

      for (const project of projects) {
        if (!phaseProgress[project.phase]) {
          phaseProgress[project.phase] = { total: 0, count: 0 };
        }
        phaseProgress[project.phase].total += project.progress;
        phaseProgress[project.phase].count += 1;
      }

      return {
        success: true,
        source,
        data: CONSTRUCTION_PHASES.map((phase) => {
          const stats = phaseProgress[phase.id];
          const avgProgress = stats ? Math.round(stats.total / stats.count) : 0;
          const projectCount = stats?.count || 0;

          return {
            ...phase,
            progress: avgProgress,
            projectCount,
          };
        }),
      };
    } catch (error) {
      console.error("[Construction Stats] Phases error:", error);
      return {
        success: false,
        error: String(error),
        data: CONSTRUCTION_PHASES.map((p) => ({ ...p, progress: 0, projectCount: 0 })),
      };
    }
  }),

  /**
   * Get connection status
   */
  getConnectionStatus: publicProcedure.query(async () => {
    const tableExists = await projectsTableExists();

    return {
      connected: tableExists,
      source: tableExists ? "database" : "demo",
      message: tableExists
        ? "Connected to projects database"
        : "Using demo data - projects table not found",
    };
  }),
});
