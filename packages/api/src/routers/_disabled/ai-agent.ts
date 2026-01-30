import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, adminProcedure } from "../trpc";
import { db, conversations, messages, organizations, eq, and, desc, gte, lte } from "@nexus/db";
import {
  MaxAiAgent,
  createAgentForOrganization,
  handleAutoResponse,
  DEFAULT_AGENT_CONFIGS,
  AgentConfig,
} from "../services/ai-agent";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const processMessageSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(4096),
});

const toggleBotSchema = z.object({
  conversationId: z.string().uuid(),
  active: z.boolean(),
});

const agentConfigSchema = z.object({
  agentName: z.string().max(50).optional(),
  language: z.enum(["de", "en"]).optional(),
  personalityTrait: z.enum(["professional", "friendly", "formal"]).optional(),
  companyName: z.string().max(100).optional(),
  companyDescription: z.string().max(500).optional(),
  capabilities: z.array(z.string()).optional(),
  escalationKeywords: z.array(z.string()).optional(),
  outOfScopeResponse: z.string().max(500).optional(),
});

// =============================================================================
// AI AGENT ROUTER
// =============================================================================

export const aiAgentRouter = createTRPCRouter({
  // ===========================================================================
  // BOT CONTROL
  // ===========================================================================

  /**
   * Toggle bot active status for a conversation
   */
  toggleBot: orgProcedure.input(toggleBotSchema).mutation(async ({ ctx, input }) => {
    // Verify conversation ownership
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, input.conversationId),
        eq(conversations.organizationId, ctx.organizationId)
      ),
    });

    if (!conversation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    // Update bot status
    await db
      .update(conversations)
      .set({
        botActive: input.active,
        automationPaused: false, // Reset pause status when toggling
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, input.conversationId));

    return {
      success: true,
      botActive: input.active,
    };
  }),

  /**
   * Pause/resume automation for a conversation
   */
  toggleAutomation: orgProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        paused: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify conversation ownership
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.organizationId, ctx.organizationId)
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      await db
        .update(conversations)
        .set({
          automationPaused: input.paused,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, input.conversationId));

      return {
        success: true,
        automationPaused: input.paused,
      };
    }),

  // ===========================================================================
  // MESSAGE PROCESSING
  // ===========================================================================

  /**
   * Process a message with the AI agent (manual trigger)
   */
  processMessage: orgProcedure
    .input(processMessageSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify conversation ownership
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.organizationId, ctx.organizationId)
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Create agent
      const agent = createAgentForOrganization(
        ctx.organizationId,
        conversation.subsidiary ?? undefined
      );

      // Process message
      const response = await agent.processMessage(input.conversationId, input.message);

      return {
        response: response.text,
        intent: response.intent,
        confidence: response.confidence,
        shouldEscalate: response.shouldEscalate,
        escalationReason: response.escalationReason,
        extractedData: response.extractedData,
        suggestedActions: response.suggestedActions,
      };
    }),

  /**
   * Generate a response suggestion without sending
   */
  suggestResponse: orgProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify conversation ownership
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.organizationId, ctx.organizationId)
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Get last message
      const lastMessage = await db.query.messages.findFirst({
        where: and(
          eq(messages.conversationId, input.conversationId),
          eq(messages.direction, "inbound")
        ),
        orderBy: [desc(messages.createdAt)],
      });

      if (!lastMessage?.content) {
        return {
          suggestion: null,
          reason: "No incoming message to respond to",
        };
      }

      // Create agent
      const agent = createAgentForOrganization(
        ctx.organizationId,
        conversation.subsidiary ?? undefined
      );

      // Generate response
      const response = await agent.processMessage(input.conversationId, lastMessage.content);

      return {
        suggestion: response.text,
        intent: response.intent,
        confidence: response.confidence,
        shouldEscalate: response.shouldEscalate,
      };
    }),

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Get current agent configuration
   */
  getConfig: orgProcedure.query(async ({ ctx }) => {
    // Get organization settings
    const org = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, ctx.organizationId),
    });

    const settings = org?.settings as Record<string, unknown> | null;
    const aiAgentConfig = settings?.aiAgentConfig as Partial<AgentConfig> | null;

    // Merge with defaults
    const defaultConfig = DEFAULT_AGENT_CONFIGS.enterprise_universe;

    return {
      agentName: aiAgentConfig?.agentName ?? defaultConfig?.agentName ?? "MAX",
      language: aiAgentConfig?.language ?? defaultConfig?.language ?? "en",
      personalityTrait:
        aiAgentConfig?.personalityTrait ?? defaultConfig?.personalityTrait ?? "professional",
      companyName: aiAgentConfig?.companyName ?? defaultConfig?.companyName ?? "",
      companyDescription:
        aiAgentConfig?.companyDescription ?? defaultConfig?.companyDescription ?? "",
      capabilities: aiAgentConfig?.capabilities ?? defaultConfig?.capabilities ?? [],
      escalationKeywords:
        aiAgentConfig?.escalationKeywords ?? defaultConfig?.escalationKeywords ?? [],
      outOfScopeResponse:
        aiAgentConfig?.outOfScopeResponse ?? defaultConfig?.outOfScopeResponse ?? "",
    };
  }),

  /**
   * Update agent configuration
   */
  updateConfig: adminProcedure
    .input(agentConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Get current settings
      const org = await db.query.organizations.findFirst({
        where: (orgs, { eq }) => eq(orgs.id, ctx.organizationId),
      });

      const currentSettings = (org?.settings as Record<string, unknown>) ?? {};
      const currentAiConfig =
        (currentSettings.aiAgentConfig as Record<string, unknown>) ?? {};

      // Merge new config
      const newAiConfig = {
        ...currentAiConfig,
        ...Object.fromEntries(
          Object.entries(input).filter(([_, v]) => v !== undefined)
        ),
      };

      // Update organization settings
      // Type cast needed because settings is a flexible JSON object
      const updatedSettings = {
        ...currentSettings,
        aiAgentConfig: newAiConfig,
      } as typeof currentSettings;

      await db
        .update(organizations)
        .set({
          settings: updatedSettings,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, ctx.organizationId));

      return {
        success: true,
        config: newAiConfig,
      };
    }),

  // ===========================================================================
  // ANALYTICS
  // ===========================================================================

  /**
   * Get AI agent statistics
   */
  getStats: orgProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = input.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = input.endDate ?? new Date();

      // Get bot-generated messages
      const botMessages = await db.query.messages.findMany({
        where: and(
          eq(messages.senderType, "bot"),
          gte(messages.createdAt, startDate),
          lte(messages.createdAt, endDate)
        ),
        with: {
          conversation: true,
        },
      });

      // Filter by organization
      const orgBotMessages = botMessages.filter(
        (m) => m.conversation?.organizationId === ctx.organizationId
      );

      // Calculate stats
      const totalResponses = orgBotMessages.length;
      const successfulResponses = orgBotMessages.filter(
        (m) => m.status === "sent" || m.status === "delivered" || m.status === "read"
      ).length;

      const escalatedResponses = orgBotMessages.filter((m) => {
        const metadata = m.metadata as Record<string, unknown> | null;
        return metadata?.escalated === true;
      }).length;

      // Intent distribution
      const intentCounts: Record<string, number> = {};
      for (const msg of orgBotMessages) {
        const metadata = msg.metadata as Record<string, unknown> | null;
        const intent = (metadata?.intent as string) ?? "unknown";
        intentCounts[intent] = (intentCounts[intent] ?? 0) + 1;
      }

      // Average confidence
      const confidences = orgBotMessages
        .map((m) => {
          const metadata = m.metadata as Record<string, unknown> | null;
          return metadata?.confidence as number | undefined;
        })
        .filter((c): c is number => c !== undefined);

      const avgConfidence =
        confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0;

      return {
        period: {
          start: startDate,
          end: endDate,
        },
        totalResponses,
        successfulResponses,
        successRate: totalResponses > 0 ? successfulResponses / totalResponses : 0,
        escalatedResponses,
        escalationRate: totalResponses > 0 ? escalatedResponses / totalResponses : 0,
        intentDistribution: intentCounts,
        averageConfidence: avgConfidence,
      };
    }),

  /**
   * Get conversations handled by AI
   */
  getAiConversations: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        onlyEscalated: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get conversations with bot active
      const botConversations = await db.query.conversations.findMany({
        where: and(
          eq(conversations.organizationId, ctx.organizationId),
          eq(conversations.botActive, true)
        ),
        orderBy: [desc(conversations.lastMessageAt)],
        limit: input.limit,
        with: {
          contact: true,
        },
      });

      // If filtering for escalated, check for paused automation
      if (input.onlyEscalated) {
        return botConversations.filter((c) => c.automationPaused);
      }

      return botConversations;
    }),
});
