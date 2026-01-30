// =============================================================================
// Lead Scoring Router - Stub Implementation
// =============================================================================
// Returns mock data for the SciFi dashboard while full scoring services are pending.
// This allows the dashboard UI to render without requiring the full backend.

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const leadScoringRouter = createTRPCRouter({
  /**
   * Get lead score distribution by grade
   * Returns zeroed distribution for dashboard rendering
   */
  getDistribution: publicProcedure.query(async () => {
    // Return realistic mock data for dashboard display
    return {
      A: 127,
      B: 348,
      C: 512,
      D: 289,
      total: 1276,
      unscored: 43,
      averageScore: 58.7,
      // Indicate this is mock data for demo
      _stub: true,
      _message: "Demo data - Lead Scoring service available",
    };
  }),

  /**
   * Get scoring configuration
   * Returns default config while service is disabled
   */
  getConfig: publicProcedure.query(async () => {
    return {
      weights: {
        engagement: 0.3,
        demographic: 0.2,
        behavioral: 0.3,
        firmographic: 0.2,
      },
      thresholds: {
        A: 80,
        B: 60,
        C: 40,
        D: 0,
      },
      _stub: true,
      _message: "Lead Scoring service pending activation",
    };
  }),

  /**
   * Get leaderboard - top scored contacts
   * Returns empty while service is disabled
   */
  getLeaderboard: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        grade: z.enum(["A", "B", "C", "D"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 10;
      // Return realistic mock leaderboard data with all grade types
      const mockLeaders: Array<{
        contactId: string;
        contactName: string;
        contactEmail: string;
        score: number;
        grade: "A" | "B" | "C" | "D";
        lastCalculated: Date;
      }> = [
        { contactId: "c1", contactName: "Max Mustermann", contactEmail: "max@example.com", score: 95, grade: "A", lastCalculated: new Date() },
        { contactId: "c2", contactName: "Anna Schmidt", contactEmail: "anna@example.com", score: 92, grade: "A", lastCalculated: new Date() },
        { contactId: "c3", contactName: "Thomas Weber", contactEmail: "thomas@example.com", score: 88, grade: "A", lastCalculated: new Date() },
        { contactId: "c4", contactName: "Lisa Müller", contactEmail: "lisa@example.com", score: 78, grade: "B", lastCalculated: new Date() },
        { contactId: "c5", contactName: "Michael Braun", contactEmail: "michael@example.com", score: 72, grade: "B", lastCalculated: new Date() },
        { contactId: "c6", contactName: "Sarah Fischer", contactEmail: "sarah@example.com", score: 68, grade: "B", lastCalculated: new Date() },
        { contactId: "c7", contactName: "Daniel Hoffmann", contactEmail: "daniel@example.com", score: 55, grade: "C", lastCalculated: new Date() },
        { contactId: "c8", contactName: "Julia Koch", contactEmail: "julia@example.com", score: 48, grade: "C", lastCalculated: new Date() },
        { contactId: "c9", contactName: "Christian Becker", contactEmail: "christian@example.com", score: 42, grade: "C", lastCalculated: new Date() },
        { contactId: "c10", contactName: "Laura Wagner", contactEmail: "laura@example.com", score: 28, grade: "D", lastCalculated: new Date() },
        { contactId: "c11", contactName: "Tobias Meyer", contactEmail: "tobias@example.com", score: 22, grade: "D", lastCalculated: new Date() },
        { contactId: "c12", contactName: "Nina Schulz", contactEmail: "nina@example.com", score: 18, grade: "D", lastCalculated: new Date() },
      ];
      const filtered = input?.grade ? mockLeaders.filter(l => l.grade === input.grade) : mockLeaders;
      return filtered.slice(0, limit);
    }),

  /**
   * Get scoring trends over time
   * Returns mock trend data for dashboard display
   */
  getTrends: publicProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      }).optional()
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      // Generate realistic trend data
      const trends: Array<{ date: string; averageScore: number; totalLeads: number }> = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        // Simulate gradual improvement with some variance
        const baseScore = 55 + (30 - i) * 0.15;
        const variance = Math.random() * 5 - 2.5;
        trends.push({
          date: date.toISOString().split('T')[0],
          averageScore: Math.round((baseScore + variance) * 10) / 10,
          totalLeads: Math.floor(35 + Math.random() * 20),
        });
      }
      return trends;
    }),

  /**
   * Get grade changes
   * Returns mock grade change data for dashboard display
   */
  getGradeChanges: publicProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(7),
      }).optional()
    )
    .query(async () => {
      // Return realistic mock grade changes
      return [
        { contactId: "gc1", contactName: "Stefan Richter", previousGrade: "B" as const, newGrade: "A" as const, previousScore: 78, newScore: 85, changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        { contactId: "gc2", contactName: "Petra Neumann", previousGrade: "C" as const, newGrade: "B" as const, previousScore: 55, newScore: 68, changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { contactId: "gc3", contactName: "Frank Zimmermann", previousGrade: "D" as const, newGrade: "C" as const, previousScore: 32, newScore: 48, changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { contactId: "gc4", contactName: "Martina Schäfer", previousGrade: "B" as const, newGrade: "A" as const, previousScore: 74, newScore: 82, changedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { contactId: "gc5", contactName: "Klaus Hartmann", previousGrade: "C" as const, newGrade: "B" as const, previousScore: 52, newScore: 64, changedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      ];
    }),

  /**
   * Calculate score for a contact
   * Stub - returns default score
   */
  calculateScore: publicProcedure
    .input(z.object({ contactId: z.string() }))
    .mutation(async ({ input }) => {
      return {
        contactId: input.contactId,
        score: 0,
        grade: "D" as const,
        breakdown: {
          engagement: 0,
          demographic: 0,
          behavioral: 0,
          firmographic: 0,
        },
        _stub: true,
        _message: "Lead Scoring service pending activation",
      };
    }),

  /**
   * Update scoring configuration
   * Stub - no-op
   */
  updateConfig: publicProcedure
    .input(
      z.object({
        weights: z.object({
          engagement: z.number().optional(),
          demographic: z.number().optional(),
          behavioral: z.number().optional(),
          firmographic: z.number().optional(),
        }).optional(),
        thresholds: z.object({
          A: z.number().optional(),
          B: z.number().optional(),
          C: z.number().optional(),
          D: z.number().optional(),
        }).optional(),
      })
    )
    .mutation(async () => {
      return {
        success: false,
        _stub: true,
        _message: "Lead Scoring service pending activation - config not saved",
      };
    }),
});
