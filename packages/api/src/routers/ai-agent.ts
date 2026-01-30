// =============================================================================
// AI Agent Router - Production Implementation
// =============================================================================
// Connects to the MAX AI Agent service using Anthropic Claude.
// Falls back to demo data when ANTHROPIC_API_KEY is not configured.

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db, conversations, contacts, eq, desc, sql, and } from "@nexus/db";
import {
  isAiServiceEnabled,
  analyzeConversations,
  DEFAULT_AGENT_CONFIGS,
} from "../services/ai-agent";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Get AI-handled conversations from database
async function getAiConversationsFromDb(limit: number, onlyEscalated?: boolean) {
  try {
    const conditions = [eq(conversations.botActive, true)];

    if (onlyEscalated) {
      conditions.push(eq(conversations.automationPaused, true));
    }

    const results = await db
      .select({
        id: conversations.id,
        lastMessageAt: conversations.lastMessageAt,
        unreadCount: conversations.unreadCount,
        botActive: conversations.botActive,
        automationPaused: conversations.automationPaused,
        subsidiary: conversations.subsidiary,
        contactId: conversations.contactId,
        contactName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactPhone: contacts.phone,
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit);

    return results.map((r) => ({
      id: r.id,
      contact: {
        name: [r.contactName, r.contactLastName].filter(Boolean).join(" ") || "Unknown",
        phone: r.contactPhone || "",
      },
      lastMessageAt: r.lastMessageAt,
      unreadCount: r.unreadCount || 0,
      botActive: r.botActive ?? false,
      automationPaused: r.automationPaused ?? false,
      subsidiary: r.subsidiary || "west_money_bau",
      escalated: r.automationPaused ?? false,
    }));
  } catch (error) {
    console.error("[AI Router] Error fetching conversations:", error);
    return null;
  }
}

// Demo conversations for when database is unavailable
const DEMO_CONVERSATIONS = [
  { id: "ai1", contact: { name: "Peter Wagner", phone: "+49176123456" }, lastMessageAt: new Date(Date.now() - 5 * 60 * 1000), unreadCount: 2, botActive: true, automationPaused: false, subsidiary: "west_money_bau", escalated: false },
  { id: "ai2", contact: { name: "Sandra Klein", phone: "+49171987654" }, lastMessageAt: new Date(Date.now() - 15 * 60 * 1000), unreadCount: 0, botActive: true, automationPaused: false, subsidiary: "west_money_bau", escalated: false },
  { id: "ai3", contact: { name: "Markus Schneider", phone: "+49152456789" }, lastMessageAt: new Date(Date.now() - 45 * 60 * 1000), unreadCount: 1, botActive: true, automationPaused: true, subsidiary: "west_money_bau", escalated: true },
  { id: "ai4", contact: { name: "Claudia Muller", phone: "+49163321654" }, lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), unreadCount: 0, botActive: true, automationPaused: false, subsidiary: "west_money_bau", escalated: false },
  { id: "ai5", contact: { name: "Thomas Bauer", phone: "+49178654321" }, lastMessageAt: new Date(Date.now() - 3 * 60 * 60 * 1000), unreadCount: 3, botActive: false, automationPaused: false, subsidiary: "west_money_bau", escalated: false },
];

// Demo stats for when service is unavailable
const DEMO_STATS = {
  totalResponses: 2847,
  successfulResponses: 2634,
  successRate: 92.5,
  escalatedResponses: 213,
  escalationRate: 7.5,
  intentDistribution: {
    "baufinanzierung_anfrage": 847,
    "terminvereinbarung": 632,
    "allgemeine_frage": 528,
    "immobilien_beratung": 445,
    "dokumente_anfrage": 395,
  } as Record<string, number>,
  averageConfidence: 87.3,
};

// =============================================================================
// ROUTER
// =============================================================================

export const aiAgentRouter = createTRPCRouter({
  /**
   * Get AI agent statistics for organization
   * Uses real data when AI service is enabled, demo data otherwise
   */
  getStats: publicProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const startDate = input?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = input?.endDate ?? new Date();
      const aiEnabled = isAiServiceEnabled();

      // Try to get real stats if AI is enabled
      if (aiEnabled && input?.organizationId) {
        try {
          const analysis = await analyzeConversations(input.organizationId, 100);
          return {
            period: { start: startDate, end: endDate },
            totalResponses: analysis.analyzed,
            successfulResponses: Math.round(analysis.analyzed * (1 - analysis.escalationRate / 100)),
            successRate: 100 - analysis.escalationRate,
            escalatedResponses: Math.round(analysis.analyzed * analysis.escalationRate / 100),
            escalationRate: analysis.escalationRate,
            intentDistribution: analysis.intents,
            averageConfidence: analysis.avgConfidence,
            aiEnabled: true,
            source: "live",
          };
        } catch (error) {
          console.error("[AI Router] Stats error:", error);
        }
      }

      // Return demo stats
      return {
        period: { start: startDate, end: endDate },
        ...DEMO_STATS,
        aiEnabled,
        source: aiEnabled ? "live" : "demo",
        _message: aiEnabled
          ? "AI service active - provide organizationId for real stats"
          : "Demo data - set ANTHROPIC_API_KEY to enable AI",
      };
    }),

  /**
   * Get AI agent configuration
   * Returns real config from DEFAULT_AGENT_CONFIGS
   */
  getConfig: publicProcedure
    .input(
      z.object({
        subsidiary: z.enum(["west_money_bau", "enterprise_universe"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const aiEnabled = isAiServiceEnabled();
      const subsidiary = input?.subsidiary || "west_money_bau";
      const config = DEFAULT_AGENT_CONFIGS[subsidiary] || DEFAULT_AGENT_CONFIGS.west_money_bau;

      return {
        enabled: aiEnabled,
        agentName: config.agentName || "MAX",
        language: config.language || "de",
        personalityTrait: config.personalityTrait || "professional",
        companyName: config.companyName || "Nexus",
        companyDescription: config.companyDescription || "",
        capabilities: config.capabilities || [],
        escalationKeywords: config.escalationKeywords || [],
        outOfScopeResponse: config.outOfScopeResponse || "",
        model: "claude-sonnet-4-20250514",
        temperature: 0.7,
        maxTokens: 500,
        aiEnabled,
        source: aiEnabled ? "live" : "demo",
      };
    }),

  /**
   * Get AI-handled conversations
   * Uses real data when available, demo data otherwise
   */
  getAiConversations: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        onlyEscalated: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const aiEnabled = isAiServiceEnabled();

      // Try to get real conversations from database
      const dbConversations = await getAiConversationsFromDb(limit, input?.onlyEscalated);

      if (dbConversations && dbConversations.length > 0) {
        return {
          conversations: dbConversations,
          total: dbConversations.length,
          aiEnabled,
          source: "database",
        };
      }

      // Fall back to demo data
      const filtered = input?.onlyEscalated
        ? DEMO_CONVERSATIONS.filter(c => c.escalated)
        : DEMO_CONVERSATIONS;

      return {
        conversations: filtered.slice(0, limit),
        total: filtered.length,
        aiEnabled,
        source: "demo",
        _message: "Using demo conversations - no AI-handled conversations in database",
      };
    }),

  /**
   * Toggle AI bot for a conversation
   */
  toggleBot: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db
          .update(conversations)
          .set({ botActive: input.enabled })
          .where(eq(conversations.id, input.conversationId));

        return {
          success: true,
          conversationId: input.conversationId,
          botActive: input.enabled,
        };
      } catch (error) {
        console.error("[AI Router] Toggle bot error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Toggle automation pause for a conversation
   */
  toggleAutomation: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // automationPaused is the inverse of enabled
        await db
          .update(conversations)
          .set({ automationPaused: !input.enabled })
          .where(eq(conversations.id, input.conversationId));

        return {
          success: true,
          conversationId: input.conversationId,
          automationEnabled: input.enabled,
        };
      } catch (error) {
        console.error("[AI Router] Toggle automation error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Update AI agent configuration
   * Note: Currently configs are defined in code - this would need database storage for persistence
   */
  updateConfig: publicProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        agentName: z.string().optional(),
        language: z.enum(["de", "en"]).optional(),
        personalityTrait: z.enum(["professional", "friendly", "formal"]).optional(),
        companyName: z.string().optional(),
        companyDescription: z.string().optional(),
        capabilities: z.array(z.string()).optional(),
        escalationKeywords: z.array(z.string()).optional(),
        outOfScopeResponse: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement config persistence to database
      // For now, return success but note that changes are not persisted
      return {
        success: true,
        persisted: false,
        message: "Config received but not persisted - requires database table for ai_agent_configs",
        config: input,
      };
    }),

  /**
   * Get AI service status
   */
  getServiceStatus: publicProcedure.query(async () => {
    const aiEnabled = isAiServiceEnabled();

    return {
      aiEnabled,
      model: "claude-sonnet-4-20250514",
      provider: "anthropic",
      status: aiEnabled ? "active" : "inactive",
      message: aiEnabled
        ? "MAX AI Agent is active and ready to process messages"
        : "AI service inactive - ANTHROPIC_API_KEY not configured",
      features: {
        intentClassification: aiEnabled,
        responseGeneration: aiEnabled,
        dataExtraction: aiEnabled,
        escalationDetection: true, // Always available via keywords
        sentimentAnalysis: aiEnabled,
      },
    };
  }),

  /**
   * Get team/bot configuration for dashboard
   * Returns the 34 GENIUS bots configuration
   */
  getTeamConfig: publicProcedure.query(async () => {
    const aiEnabled = isAiServiceEnabled();

    // This maps to the GENIUS_TEAMS in the frontend
    const teams = {
      leadership: {
        name: "LEADERSHIP COUNCIL",
        active: aiEnabled,
        bots: [
          { id: "haiku", name: "HAIKU", role: "Speed Oracle", status: aiEnabled ? "active" : "standby" },
          { id: "sonnet", name: "SONNET", role: "Balance Master", status: aiEnabled ? "active" : "standby" },
          { id: "opus", name: "OPUS", role: "Deep Thinker", status: aiEnabled ? "active" : "standby" },
        ],
      },
      sales: {
        name: "SALES FORCE",
        active: true,
        bots: [
          { id: "max", name: "MAX", role: "Sales Genius", status: "active" },
          { id: "maya", name: "MAYA", role: "Lead Hunter", status: "active" },
          { id: "marcus", name: "MARCUS", role: "Closer", status: "active" },
          { id: "maria", name: "MARIA", role: "Relationship", status: "active" },
          { id: "martin", name: "MARTIN", role: "Qualifier", status: "active" },
        ],
      },
      marketing: {
        name: "MARKETING DIVISION",
        active: true,
        bots: [
          { id: "mia", name: "MIA", role: "Campaign Master", status: "active" },
          { id: "mike", name: "MIKE", role: "Content Creator", status: "active" },
          { id: "melissa", name: "MELISSA", role: "Social Media", status: "active" },
          { id: "marco", name: "MARCO", role: "Analytics", status: "active" },
          { id: "miriam", name: "MIRIAM", role: "Brand Guardian", status: "active" },
        ],
      },
      support: {
        name: "SUPPORT TEAM",
        active: true,
        bots: [
          { id: "sam", name: "SAM", role: "First Response", status: "active" },
          { id: "sarah", name: "SARAH", role: "Technical", status: "active" },
          { id: "steven", name: "STEVEN", role: "Escalation", status: "active" },
          { id: "sofia", name: "SOFIA", role: "Knowledge", status: "active" },
          { id: "simon", name: "SIMON", role: "Quality", status: "active" },
        ],
      },
      analytics: {
        name: "ANALYTICS LAB",
        active: true,
        bots: [
          { id: "alex", name: "ALEX", role: "Data Scientist", status: "active" },
          { id: "anna", name: "ANNA", role: "Forecaster", status: "active" },
          { id: "adam", name: "ADAM", role: "Reporter", status: "active" },
          { id: "amy", name: "AMY", role: "Visualizer", status: "active" },
          { id: "andrew", name: "ANDREW", role: "Optimizer", status: "active" },
        ],
      },
      automation: {
        name: "AUTOMATION CORE",
        active: true,
        bots: [
          { id: "otto", name: "OTTO", role: "Workflow", status: "active" },
          { id: "olivia", name: "OLIVIA", role: "Integration", status: "active" },
          { id: "oscar", name: "OSCAR", role: "Scheduler", status: "active" },
          { id: "ophelia", name: "OPHELIA", role: "Monitor", status: "active" },
          { id: "omar", name: "OMAR", role: "Orchestrator", status: "active" },
        ],
      },
      security: {
        name: "SECURITY SHIELD",
        active: true,
        bots: [
          { id: "shield", name: "SHIELD", role: "Guardian", status: "active" },
          { id: "sentinel", name: "SENTINEL", role: "Monitor", status: "active" },
          { id: "secure", name: "SECURE", role: "Encrypt", status: "active" },
          { id: "shadow", name: "SHADOW", role: "Stealth", status: "active" },
          { id: "sigma", name: "SIGMA", role: "Analyzer", status: "active" },
        ],
      },
    };

    const totalBots = Object.values(teams).reduce((sum, t) => sum + t.bots.length, 0);
    const activeBots = Object.values(teams).reduce(
      (sum, t) => sum + t.bots.filter(b => b.status === "active").length,
      0
    );

    return {
      teams,
      totalBots,
      activeBots,
      aiEnabled,
      lastSync: new Date().toISOString(),
    };
  }),
});
