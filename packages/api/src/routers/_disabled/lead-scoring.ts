import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, adminProcedure } from "../trpc";
import { db, contacts, contactActivities, organizations, eq, and, desc, gte, lte, sql } from "@nexus/db";
import {
  LeadScoringService,
  calculateBulkScores,
  getScoreHistory,
  DEFAULT_SCORING_CONFIG,
} from "../services/lead-scoring";
import { syncLeadScoreToHubSpot, getHubSpotService } from "../services/hubspot";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const calculateScoreSchema = z.object({
  contactId: z.string().uuid(),
  syncToHubSpot: z.boolean().optional().default(false),
});

const bulkScoreSchema = z.object({
  limit: z.number().min(1).max(500).default(100),
  recalculateAll: z.boolean().optional().default(false),
  syncToHubSpot: z.boolean().optional().default(false),
});

const scoreHistorySchema = z.object({
  contactId: z.string().uuid(),
  days: z.number().min(1).max(365).default(30),
});

const leaderboardSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  grade: z.enum(["A", "B", "C", "D"]).optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
});

const scoringConfigSchema = z.object({
  weights: z
    .object({
      profileCompleteness: z.number().min(0).max(100).optional(),
      engagementLevel: z.number().min(0).max(100).optional(),
      activityRecency: z.number().min(0).max(100).optional(),
      dealInvolvement: z.number().min(0).max(100).optional(),
      consentStatus: z.number().min(0).max(100).optional(),
      emailEngagement: z.number().min(0).max(100).optional(),
    })
    .optional(),
  thresholds: z
    .object({
      recentActivityDays: z.number().min(1).max(365).optional(),
      highEngagementMessages: z.number().min(1).optional(),
      mediumEngagementMessages: z.number().min(1).optional(),
    })
    .optional(),
});

// =============================================================================
// LEAD SCORING ROUTER
// =============================================================================

export const leadScoringRouter = createTRPCRouter({
  // ===========================================================================
  // SCORE CALCULATION
  // ===========================================================================

  /**
   * Calculate lead score for a single contact
   */
  calculateScore: orgProcedure
    .input(calculateScoreSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify contact belongs to organization
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, ctx.organizationId)
        ),
      });

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      // Get scoring config from organization settings
      const org = await db.query.organizations.findFirst({
        where: (orgs, { eq }) => eq(orgs.id, ctx.organizationId),
      });

      const settings = org?.settings as Record<string, unknown> | null;
      const scoringConfig = settings?.leadScoringConfig as object | undefined;

      // Calculate score
      const scoringService = new LeadScoringService(scoringConfig);
      const result = await scoringService.calculateScore(input.contactId);

      // Update contact with new score
      await db
        .update(contacts)
        .set({
          leadScore: result.score,
          leadScoreGrade: result.grade,
          leadScoreUpdatedAt: result.calculatedAt,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.contactId));

      // Log score update as activity
      await db.insert(contactActivities).values({
        contactId: input.contactId,
        type: "lead_score_updated",
        title: `Lead score updated to ${result.score} (${result.grade})`,
        metadata: {
          score: result.score,
          grade: result.grade,
          breakdown: result.breakdown,
          previousScore: contact.leadScore,
          previousGrade: contact.leadScoreGrade,
        },
      });

      // Sync to HubSpot if requested
      if (input.syncToHubSpot && contact.hubspotContactId) {
        try {
          await syncLeadScoreToHubSpot(ctx.organizationId, input.contactId, result.score, result.grade);
        } catch (error) {
          console.error("[Lead Scoring] Failed to sync to HubSpot:", error);
          // Don't fail the whole operation
        }
      }

      return {
        score: result.score,
        grade: result.grade,
        breakdown: result.breakdown,
        factors: result.factors,
        calculatedAt: result.calculatedAt,
      };
    }),

  /**
   * Bulk calculate scores for organization contacts
   */
  bulkCalculate: adminProcedure.input(bulkScoreSchema).mutation(async ({ ctx, input }) => {
    const result = await calculateBulkScores(ctx.organizationId, {
      limit: input.limit,
      recalculateAll: input.recalculateAll,
    });

    // Optionally sync to HubSpot
    if (input.syncToHubSpot) {
      let syncedCount = 0;
      for (const { contactId, score, grade } of result.results) {
        const contact = await db.query.contacts.findFirst({
          where: eq(contacts.id, contactId),
        });

        if (contact?.hubspotContactId) {
          try {
            await syncLeadScoreToHubSpot(
              ctx.organizationId,
              contactId,
              score,
              grade as "A" | "B" | "C" | "D"
            );
            syncedCount++;
          } catch (error) {
            // Continue with next contact
          }
        }
      }
      return { ...result, syncedToHubSpot: syncedCount };
    }

    return result;
  }),

  // ===========================================================================
  // SCORE QUERIES
  // ===========================================================================

  /**
   * Get current score for a contact
   */
  getScore: orgProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, ctx.organizationId)
        ),
      });

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      return {
        score: contact.leadScore,
        grade: contact.leadScoreGrade,
        updatedAt: contact.leadScoreUpdatedAt,
      };
    }),

  /**
   * Get score history for a contact
   */
  getHistory: orgProcedure.input(scoreHistorySchema).query(async ({ ctx, input }) => {
    // Verify contact belongs to organization
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, input.contactId),
        eq(contacts.organizationId, ctx.organizationId)
      ),
    });

    if (!contact) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Contact not found",
      });
    }

    return getScoreHistory(input.contactId, input.days);
  }),

  /**
   * Get leaderboard of top-scoring contacts
   */
  getLeaderboard: orgProcedure.input(leaderboardSchema).query(async ({ ctx, input }) => {
    // Build query conditions
    const conditions = [eq(contacts.organizationId, ctx.organizationId)];

    if (input.grade) {
      conditions.push(eq(contacts.leadScoreGrade, input.grade));
    }

    if (input.minScore !== undefined) {
      conditions.push(gte(contacts.leadScore, input.minScore));
    }

    if (input.maxScore !== undefined) {
      conditions.push(lte(contacts.leadScore, input.maxScore));
    }

    const topContacts = await db.query.contacts.findMany({
      where: and(...conditions),
      orderBy: [desc(contacts.leadScore)],
      limit: input.limit,
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        leadScore: true,
        leadScoreGrade: true,
        leadScoreUpdatedAt: true,
      },
    });

    return topContacts.map((c, index) => ({
      rank: index + 1,
      ...c,
    }));
  }),

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get score distribution statistics
   */
  getDistribution: orgProcedure.query(async ({ ctx }) => {
    // Get counts by grade
    const [gradeA] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          eq(contacts.leadScoreGrade, "A")
        )
      );

    const [gradeB] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          eq(contacts.leadScoreGrade, "B")
        )
      );

    const [gradeC] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          eq(contacts.leadScoreGrade, "C")
        )
      );

    const [gradeD] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          eq(contacts.leadScoreGrade, "D")
        )
      );

    const [unscored] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          sql`${contacts.leadScore} IS NULL`
        )
      );

    // Get average score
    const [avgResult] = await db
      .select({ avg: sql<number>`avg(${contacts.leadScore})::float` })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          sql`${contacts.leadScore} IS NOT NULL`
        )
      );

    const total =
      (gradeA?.count ?? 0) +
      (gradeB?.count ?? 0) +
      (gradeC?.count ?? 0) +
      (gradeD?.count ?? 0);

    return {
      distribution: {
        A: gradeA?.count ?? 0,
        B: gradeB?.count ?? 0,
        C: gradeC?.count ?? 0,
        D: gradeD?.count ?? 0,
      },
      percentages: {
        A: total > 0 ? ((gradeA?.count ?? 0) / total) * 100 : 0,
        B: total > 0 ? ((gradeB?.count ?? 0) / total) * 100 : 0,
        C: total > 0 ? ((gradeC?.count ?? 0) / total) * 100 : 0,
        D: total > 0 ? ((gradeD?.count ?? 0) / total) * 100 : 0,
      },
      totalScored: total,
      totalUnscored: unscored?.count ?? 0,
      averageScore: Math.round((avgResult?.avg ?? 0) * 10) / 10,
    };
  }),

  /**
   * Get scoring trends over time
   */
  getTrends: orgProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      // Get score update activities grouped by date
      const activities = await db.query.contactActivities.findMany({
        where: and(
          eq(contactActivities.type, "lead_score_updated"),
          gte(contactActivities.createdAt, startDate)
        ),
        with: {
          contact: {
            columns: {
              organizationId: true,
            },
          },
        },
        orderBy: [contactActivities.createdAt],
      });

      // Filter by organization and aggregate by day
      const dailyData: Record<
        string,
        { totalScore: number; count: number; upgrades: number; downgrades: number }
      > = {};

      for (const activity of activities) {
        if (activity.contact?.organizationId !== ctx.organizationId) continue;

        const dateKey = activity.createdAt.toISOString().split("T")[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { totalScore: 0, count: 0, upgrades: 0, downgrades: 0 };
        }

        const metadata = activity.metadata as Record<string, unknown>;
        const newScore = (metadata?.score as number) ?? 0;
        const prevScore = (metadata?.previousScore as number) ?? 0;

        dailyData[dateKey].totalScore += newScore;
        dailyData[dateKey].count++;

        if (newScore > prevScore) dailyData[dateKey].upgrades++;
        else if (newScore < prevScore) dailyData[dateKey].downgrades++;
      }

      return Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          averageScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 10) / 10 : 0,
          scoresCalculated: data.count,
          upgrades: data.upgrades,
          downgrades: data.downgrades,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }),

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Get current scoring configuration
   */
  getConfig: orgProcedure.query(async ({ ctx }) => {
    const org = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, ctx.organizationId),
    });

    const settings = org?.settings as Record<string, unknown> | null;
    const scoringConfig = settings?.leadScoringConfig as object | undefined;

    return {
      ...DEFAULT_SCORING_CONFIG,
      ...(scoringConfig ?? {}),
    };
  }),

  /**
   * Update scoring configuration
   */
  updateConfig: adminProcedure.input(scoringConfigSchema).mutation(async ({ ctx, input }) => {
    // Get current settings
    const org = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, ctx.organizationId),
    });

    const currentSettings = (org?.settings as Record<string, unknown>) ?? {};
    const currentScoringConfig =
      (currentSettings.leadScoringConfig as Record<string, unknown>) ?? {};

    // Merge new config
    const newScoringConfig = {
      ...currentScoringConfig,
      weights: {
        ...(currentScoringConfig.weights as object | undefined),
        ...input.weights,
      },
      thresholds: {
        ...(currentScoringConfig.thresholds as object | undefined),
        ...input.thresholds,
      },
    };

    // Update organization settings
    await db
      .update(organizations)
      .set({
        settings: {
          ...currentSettings,
          leadScoringConfig: newScoringConfig,
        },
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, ctx.organizationId));

    return {
      success: true,
      config: newScoringConfig,
    };
  }),

  // ===========================================================================
  // ALERTS
  // ===========================================================================

  /**
   * Get contacts that recently changed grade
   */
  getGradeChanges: orgProcedure
    .input(
      z.object({
        days: z.number().min(1).max(30).default(7),
        changeType: z.enum(["upgrade", "downgrade", "all"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const activities = await db.query.contactActivities.findMany({
        where: and(
          eq(contactActivities.type, "lead_score_updated"),
          gte(contactActivities.createdAt, startDate)
        ),
        with: {
          contact: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
              organizationId: true,
              leadScore: true,
              leadScoreGrade: true,
            },
          },
        },
        orderBy: [desc(contactActivities.createdAt)],
      });

      // Filter by organization and grade change type
      const results = activities
        .filter((a) => {
          if (a.contact?.organizationId !== ctx.organizationId) return false;

          const metadata = a.metadata as Record<string, unknown>;
          const newGrade = metadata?.grade as string;
          const prevGrade = metadata?.previousGrade as string;

          if (!newGrade || !prevGrade || newGrade === prevGrade) return false;

          const gradeOrder = { A: 4, B: 3, C: 2, D: 1 };
          const isUpgrade = gradeOrder[newGrade as "A" | "B" | "C" | "D"] >
            gradeOrder[prevGrade as "A" | "B" | "C" | "D"];

          if (input.changeType === "upgrade") return isUpgrade;
          if (input.changeType === "downgrade") return !isUpgrade;
          return true;
        })
        .map((a) => {
          const metadata = a.metadata as Record<string, unknown>;
          return {
            contact: a.contact,
            previousScore: metadata?.previousScore as number,
            newScore: metadata?.score as number,
            previousGrade: metadata?.previousGrade as string,
            newGrade: metadata?.grade as string,
            changedAt: a.createdAt,
          };
        });

      return results;
    }),
});
