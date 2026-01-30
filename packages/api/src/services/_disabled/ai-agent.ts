// =============================================================================
// MAX AI AGENT SERVICE
// Intelligent conversational AI agent for automated WhatsApp communication
// Uses Claude AI for natural language understanding and generation
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";
import {
  db,
  conversations,
  messages,
  contacts,
  messageTemplates,
  eq,
  and,
  desc,
} from "@nexus/db";
import { sendAndRecordMessage } from "./whatsapp";
import { syncContactToHubSpot } from "./hubspot";

// =============================================================================
// CONFIGURATION
// =============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_CONTEXT_MESSAGES = 20;
const MAX_TOKENS = 1024;

// =============================================================================
// AGENT TYPES
// =============================================================================

export interface AgentConfig {
  organizationId: string;
  subsidiary?: string;
  language: "de" | "en";
  personalityTrait: "professional" | "friendly" | "formal";
  agentName: string;
  companyName: string;
  companyDescription: string;
  capabilities: string[];
  escalationKeywords: string[];
  outOfScopeResponse: string;
}

export interface AgentContext {
  conversation: typeof conversations.$inferSelect;
  contact?: typeof contacts.$inferSelect | null;
  recentMessages: Array<typeof messages.$inferSelect>;
  config: AgentConfig;
}

export interface AgentResponse {
  text: string;
  intent?: string;
  confidence?: number;
  shouldEscalate?: boolean;
  escalationReason?: string;
  extractedData?: Record<string, unknown>;
  suggestedActions?: string[];
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
}

// =============================================================================
// DEFAULT AGENT CONFIGURATIONS
// =============================================================================

export const DEFAULT_AGENT_CONFIGS: Record<string, Partial<AgentConfig>> = {
  west_money_bau: {
    agentName: "MAX",
    companyName: "West Money Bau",
    companyDescription: "Professioneller Hausbau und Baufinanzierung in Deutschland",
    language: "de",
    personalityTrait: "professional",
    capabilities: [
      "Beratung zu Hausbau und Baufinanzierung",
      "Terminvereinbarung für Beratungsgespräche",
      "Informationen zu laufenden Projekten",
      "Angebote und Preisanfragen",
      "FAQ zu Bauablauf und Materialien",
    ],
    escalationKeywords: [
      "Beschwerde",
      "Problem",
      "dringend",
      "Anwalt",
      "Rechnung",
      "Verzögerung",
      "Mangel",
      "Schaden",
    ],
    outOfScopeResponse:
      "Das liegt leider außerhalb meines Aufgabenbereichs. Ich verbinde Sie gerne mit einem Mitarbeiter.",
  },
  enterprise_universe: {
    agentName: "MAX",
    companyName: "Enterprise Universe",
    companyDescription: "Enterprise software solutions and digital transformation",
    language: "en",
    personalityTrait: "professional",
    capabilities: [
      "Product information and demos",
      "Technical support inquiries",
      "Pricing and licensing questions",
      "Meeting scheduling",
      "General company information",
    ],
    escalationKeywords: [
      "complaint",
      "urgent",
      "legal",
      "invoice",
      "refund",
      "cancel",
      "security",
      "breach",
    ],
    outOfScopeResponse:
      "I apologize, but that's outside my area of expertise. Let me connect you with a team member.",
  },
};

// =============================================================================
// MAX AI AGENT CLASS
// =============================================================================

export class MaxAiAgent {
  private anthropic: Anthropic;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    this.anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // MAIN PROCESSING
  // ---------------------------------------------------------------------------

  async processMessage(
    conversationId: string,
    incomingMessage: string
  ): Promise<AgentResponse> {
    // Build context
    const context = await this.buildContext(conversationId);

    if (!context) {
      return {
        text: "Es tut mir leid, ich konnte den Gesprächsverlauf nicht laden.",
        shouldEscalate: true,
        escalationReason: "Context loading failed",
      };
    }

    // Check for escalation keywords
    const escalationCheck = this.checkForEscalation(incomingMessage);
    if (escalationCheck.shouldEscalate) {
      return {
        text: this.getEscalationResponse(escalationCheck.reason),
        shouldEscalate: true,
        escalationReason: escalationCheck.reason,
      };
    }

    // Classify intent
    const intent = await this.classifyIntent(incomingMessage, context);

    // Generate response based on intent
    const response = await this.generateResponse(incomingMessage, context, intent);

    // Extract any data from the conversation
    const extractedData = await this.extractData(incomingMessage, context);

    return {
      ...response,
      intent: intent.intent,
      confidence: intent.confidence,
      extractedData,
    };
  }

  // ---------------------------------------------------------------------------
  // CONTEXT BUILDING
  // ---------------------------------------------------------------------------

  private async buildContext(conversationId: string): Promise<AgentContext | null> {
    // Get conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return null;
    }

    // Get contact if linked
    let contact = null;
    if (conversation.contactId) {
      contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, conversation.contactId),
      });
    }

    // Get recent messages
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [desc(messages.createdAt)],
      limit: MAX_CONTEXT_MESSAGES,
    });

    return {
      conversation,
      contact,
      recentMessages: recentMessages.reverse(), // Chronological order
      config: this.config,
    };
  }

  // ---------------------------------------------------------------------------
  // INTENT CLASSIFICATION
  // ---------------------------------------------------------------------------

  private async classifyIntent(
    message: string,
    context: AgentContext
  ): Promise<IntentClassification> {
    const systemPrompt = `You are an intent classifier for ${this.config.companyName}.
Classify the user's message into one of these intents:
- greeting: User is saying hello or starting conversation
- inquiry: User is asking for information about products/services
- appointment: User wants to schedule a meeting or callback
- pricing: User is asking about prices or quotes
- complaint: User has a complaint or issue
- support: User needs help with something
- farewell: User is ending the conversation
- other: Doesn't fit other categories

Also extract any relevant entities (name, email, phone, date, time, location, product).

Respond in JSON format:
{
  "intent": "string",
  "confidence": 0.0-1.0,
  "entities": { "key": "value" }
}`;

    const conversationHistory = context.recentMessages
      .slice(-5)
      .map((m) => `${m.direction === "inbound" ? "User" : "Agent"}: ${m.content}`)
      .join("\n");

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Previous conversation:\n${conversationHistory}\n\nNew message to classify:\n${message}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        const parsed = JSON.parse(content.text);
        return {
          intent: parsed.intent ?? "other",
          confidence: parsed.confidence ?? 0.5,
          entities: parsed.entities ?? {},
        };
      }
    } catch (error) {
      console.error("[MAX Agent] Intent classification error:", error);
    }

    return { intent: "other", confidence: 0.5, entities: {} };
  }

  // ---------------------------------------------------------------------------
  // RESPONSE GENERATION
  // ---------------------------------------------------------------------------

  private async generateResponse(
    message: string,
    context: AgentContext,
    intent: IntentClassification
  ): Promise<AgentResponse> {
    const systemPrompt = this.buildSystemPrompt(context);

    const conversationHistory = context.recentMessages.map((m) => ({
      role: m.direction === "inbound" ? "user" as const : "assistant" as const,
      content: m.content ?? "",
    }));

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          { role: "user", content: message },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        return {
          text: content.text,
          suggestedActions: this.getSuggestedActions(intent.intent),
        };
      }
    } catch (error) {
      console.error("[MAX Agent] Response generation error:", error);
    }

    // Fallback response
    return {
      text: this.config.language === "de"
        ? "Entschuldigung, ich habe Ihre Anfrage nicht verstanden. Können Sie das bitte anders formulieren?"
        : "I apologize, I didn't understand your request. Could you please rephrase that?",
    };
  }

  private buildSystemPrompt(context: AgentContext): string {
    const { config, contact } = context;

    const personalityMap = {
      professional: "professional, knowledgeable, and efficient",
      friendly: "warm, approachable, and helpful",
      formal: "formal, respectful, and precise",
    };

    const basePrompt = config.language === "de"
      ? `Du bist ${config.agentName}, der intelligente AI-Assistent von ${config.companyName}.
${config.companyDescription}

Deine Persönlichkeit: ${personalityMap[config.personalityTrait]}

Deine Fähigkeiten:
${config.capabilities.map((c) => `- ${c}`).join("\n")}

Wichtige Regeln:
1. Antworte immer auf Deutsch, es sei denn, der Kunde schreibt auf Englisch
2. Halte deine Antworten kurz und präzise (max 2-3 Sätze für WhatsApp)
3. Sei höflich und hilfsbereit
4. Wenn du etwas nicht weißt, sag es ehrlich
5. Bei sensiblen Themen (Beschwerden, rechtliche Fragen), eskaliere an einen Mitarbeiter
6. Frage nach Kontaktdaten, wenn es zu einem Beratungsgespräch kommen soll
7. Bestätige immer Terminvereinbarungen und wichtige Details`
      : `You are ${config.agentName}, the intelligent AI assistant for ${config.companyName}.
${config.companyDescription}

Your personality: ${personalityMap[config.personalityTrait]}

Your capabilities:
${config.capabilities.map((c) => `- ${c}`).join("\n")}

Important rules:
1. Always respond in English unless the customer writes in German
2. Keep responses short and concise (max 2-3 sentences for WhatsApp)
3. Be polite and helpful
4. If you don't know something, say so honestly
5. For sensitive topics (complaints, legal questions), escalate to a team member
6. Ask for contact details when scheduling consultations
7. Always confirm appointments and important details`;

    // Add contact context if available
    if (contact) {
      const contactContext = config.language === "de"
        ? `\n\nKundeninformationen:
- Name: ${contact.firstName ?? ""} ${contact.lastName ?? ""}
- Unternehmen: ${contact.company ?? "Nicht angegeben"}
- Typ: ${contact.type}
- Lead Score: ${contact.leadScore ?? "Nicht bewertet"}`
        : `\n\nCustomer information:
- Name: ${contact.firstName ?? ""} ${contact.lastName ?? ""}
- Company: ${contact.company ?? "Not specified"}
- Type: ${contact.type}
- Lead Score: ${contact.leadScore ?? "Not scored"}`;

      return basePrompt + contactContext;
    }

    return basePrompt;
  }

  // ---------------------------------------------------------------------------
  // ESCALATION HANDLING
  // ---------------------------------------------------------------------------

  private checkForEscalation(message: string): {
    shouldEscalate: boolean;
    reason?: string;
  } {
    const lowerMessage = message.toLowerCase();

    for (const keyword of this.config.escalationKeywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          shouldEscalate: true,
          reason: `Keyword detected: ${keyword}`,
        };
      }
    }

    // Check for explicit agent request
    const agentRequestPatterns = [
      "mitarbeiter",
      "mensch",
      "agent",
      "human",
      "real person",
      "echter mensch",
      "sprechen mit",
      "talk to someone",
    ];

    for (const pattern of agentRequestPatterns) {
      if (lowerMessage.includes(pattern)) {
        return {
          shouldEscalate: true,
          reason: "Customer requested human agent",
        };
      }
    }

    return { shouldEscalate: false };
  }

  private getEscalationResponse(reason?: string): string {
    if (this.config.language === "de") {
      if (reason?.includes("Customer requested")) {
        return "Selbstverständlich! Ich verbinde Sie gleich mit einem Mitarbeiter. Bitte haben Sie einen Moment Geduld.";
      }
      return "Ich verstehe, dass dies ein wichtiges Anliegen ist. Ich leite Ihre Anfrage an einen Mitarbeiter weiter, der sich zeitnah bei Ihnen melden wird.";
    }

    if (reason?.includes("Customer requested")) {
      return "Of course! I'll connect you with a team member right away. Please hold for a moment.";
    }
    return "I understand this is an important matter. I'm forwarding your request to a team member who will get back to you shortly.";
  }

  // ---------------------------------------------------------------------------
  // DATA EXTRACTION
  // ---------------------------------------------------------------------------

  private async extractData(
    message: string,
    context: AgentContext
  ): Promise<Record<string, unknown>> {
    const systemPrompt = `Extract any contact information or relevant data from this conversation.
Return JSON with any found fields: name, email, phone, company, appointment_date, appointment_time, location, interest, budget.
Only include fields that are explicitly mentioned. Return empty object {} if nothing found.`;

    const fullConversation = context.recentMessages
      .map((m) => `${m.direction === "inbound" ? "Customer" : "Agent"}: ${m.content}`)
      .join("\n");

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `${fullConversation}\n\nLatest message: ${message}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        return JSON.parse(content.text);
      }
    } catch (error) {
      console.error("[MAX Agent] Data extraction error:", error);
    }

    return {};
  }

  // ---------------------------------------------------------------------------
  // SUGGESTED ACTIONS
  // ---------------------------------------------------------------------------

  private getSuggestedActions(intent: string): string[] {
    const actions: Record<string, string[]> = {
      greeting: ["send_welcome_info", "offer_assistance"],
      inquiry: ["send_brochure", "schedule_callback", "provide_pricing"],
      appointment: ["check_calendar", "send_confirmation", "set_reminder"],
      pricing: ["send_quote", "schedule_consultation", "explain_packages"],
      complaint: ["escalate_to_human", "create_ticket", "apologize"],
      support: ["provide_help", "send_documentation", "schedule_support_call"],
      farewell: ["send_contact_info", "request_feedback"],
    };

    return actions[intent] ?? [];
  }
}

// =============================================================================
// AGENT FACTORY
// =============================================================================

export function createAgentForOrganization(
  organizationId: string,
  subsidiary?: string
): MaxAiAgent {
  // Get default config for subsidiary or use generic
  const defaultConfig = subsidiary
    ? DEFAULT_AGENT_CONFIGS[subsidiary]
    : DEFAULT_AGENT_CONFIGS.enterprise_universe;

  const config: AgentConfig = {
    organizationId,
    subsidiary,
    agentName: defaultConfig?.agentName ?? "MAX",
    companyName: defaultConfig?.companyName ?? "Our Company",
    companyDescription: defaultConfig?.companyDescription ?? "",
    language: (defaultConfig?.language as "de" | "en") ?? "en",
    personalityTrait: defaultConfig?.personalityTrait ?? "professional",
    capabilities: defaultConfig?.capabilities ?? [],
    escalationKeywords: defaultConfig?.escalationKeywords ?? [],
    outOfScopeResponse: defaultConfig?.outOfScopeResponse ?? "Let me connect you with a team member.",
  };

  return new MaxAiAgent(config);
}

// =============================================================================
// AUTO-RESPONSE HANDLER
// =============================================================================

export async function handleAutoResponse(
  conversationId: string,
  incomingMessageId: string,
  organizationId: string,
  subsidiary?: string
): Promise<{
  responded: boolean;
  messageId?: string;
  escalated?: boolean;
  error?: string;
}> {
  try {
    // Check if bot is active for this conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return { responded: false, error: "Conversation not found" };
    }

    if (!conversation.botActive || conversation.automationPaused) {
      return { responded: false, error: "Bot is not active for this conversation" };
    }

    // Get the incoming message
    const incomingMessage = await db.query.messages.findFirst({
      where: eq(messages.id, incomingMessageId),
    });

    if (!incomingMessage?.content) {
      return { responded: false, error: "Message content not available" };
    }

    // Create agent and process message
    const agent = createAgentForOrganization(organizationId, subsidiary ?? undefined);
    const response = await agent.processMessage(conversationId, incomingMessage.content);

    // Handle escalation
    if (response.shouldEscalate) {
      // Pause automation and notify
      await db
        .update(conversations)
        .set({
          automationPaused: true,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // Still send the escalation message
    }

    // Create response message
    const [responseMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        direction: "outbound",
        status: "pending",
        messageType: "text",
        content: response.text,
        senderType: "bot",
        metadata: {
          aiGenerated: true,
          intent: response.intent,
          confidence: response.confidence,
          escalated: response.shouldEscalate,
          escalationReason: response.escalationReason,
        },
      })
      .returning();

    // Send via WhatsApp
    const sendResult = await sendAndRecordMessage(responseMessage.id, conversationId);

    // Update conversation with extracted data if any
    if (response.extractedData && Object.keys(response.extractedData).length > 0) {
      // If we extracted contact info, update the contact
      if (conversation.contactId) {
        const updateData: Record<string, unknown> = {};

        if (response.extractedData.name) {
          const nameParts = String(response.extractedData.name).split(" ");
          updateData.firstName = nameParts[0];
          if (nameParts.length > 1) {
            updateData.lastName = nameParts.slice(1).join(" ");
          }
        }
        if (response.extractedData.email) {
          updateData.email = response.extractedData.email;
        }
        if (response.extractedData.phone) {
          updateData.phone = response.extractedData.phone;
        }
        if (response.extractedData.company) {
          updateData.company = response.extractedData.company;
        }

        if (Object.keys(updateData).length > 0) {
          await db
            .update(contacts)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(contacts.id, conversation.contactId));

          // Sync to HubSpot
          await syncContactToHubSpot(conversation.contactId, organizationId);
        }
      }
    }

    // Update conversation
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: response.text.substring(0, 100),
        lastMessageDirection: "outbound",
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    return {
      responded: true,
      messageId: responseMessage.id,
      escalated: response.shouldEscalate,
    };
  } catch (error) {
    console.error("[MAX Agent] Auto-response error:", error);
    return { responded: false, error: String(error) };
  }
}
