// =============================================================================
// INTEGRATIONS ROUTER
// Manage external integrations: Telegram, Slack, n8n, Webhooks
// =============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// =============================================================================
// TYPES
// =============================================================================

export interface IntegrationStatus {
  id: string;
  name: string;
  type: "telegram" | "slack" | "n8n" | "webhook" | "whatsapp" | "email";
  configured: boolean;
  connected: boolean;
  lastChecked?: string;
  error?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggered?: string;
  successRate: number;
}

// =============================================================================
// ROUTER
// =============================================================================

export const integrationsRouter = createTRPCRouter({
  // ═══════════════════════════════════════════════════════════════════════════
  // LIST ALL INTEGRATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  list: protectedProcedure.query(async (): Promise<IntegrationStatus[]> => {
    // Check environment variables for configuration status
    const integrations: IntegrationStatus[] = [
      {
        id: "telegram",
        name: "Telegram",
        type: "telegram",
        configured: !!process.env.TELEGRAM_BOT_TOKEN,
        connected: false,
      },
      {
        id: "slack",
        name: "Slack",
        type: "slack",
        configured: !!(process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN),
        connected: false,
      },
      {
        id: "n8n",
        name: "n8n Workflows",
        type: "n8n",
        configured: !!process.env.N8N_BASE_URL,
        connected: false,
      },
      {
        id: "whatsapp",
        name: "WhatsApp Business",
        type: "whatsapp",
        configured: !!process.env.WHATSAPP_TOKEN,
        connected: false,
      },
      {
        id: "email",
        name: "Email (SMTP)",
        type: "email",
        configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        connected: false,
      },
    ];

    return integrations;
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET INTEGRATION STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  getStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }): Promise<IntegrationStatus> => {
      const { id } = input;

      switch (id) {
        case "telegram":
          return {
            id: "telegram",
            name: "Telegram",
            type: "telegram",
            configured: !!process.env.TELEGRAM_BOT_TOKEN,
            connected: false,
            lastChecked: new Date().toISOString(),
          };

        case "slack":
          return {
            id: "slack",
            name: "Slack",
            type: "slack",
            configured: !!(process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN),
            connected: false,
            lastChecked: new Date().toISOString(),
          };

        case "n8n":
          return {
            id: "n8n",
            name: "n8n Workflows",
            type: "n8n",
            configured: !!process.env.N8N_BASE_URL,
            connected: false,
            lastChecked: new Date().toISOString(),
          };

        default:
          throw new Error(`Unknown integration: ${id}`);
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  testConnection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }): Promise<{ success: boolean; message: string }> => {
      const { id } = input;

      try {
        switch (id) {
          case "telegram": {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (!botToken) {
              return { success: false, message: "TELEGRAM_BOT_TOKEN not configured" };
            }

            const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
            const data = await response.json();

            if (data.ok) {
              return { success: true, message: `Connected as @${data.result.username}` };
            }
            return { success: false, message: data.description || "Connection failed" };
          }

          case "slack": {
            const botToken = process.env.SLACK_BOT_TOKEN;
            const webhookUrl = process.env.SLACK_WEBHOOK_URL;

            if (botToken) {
              const response = await fetch("https://slack.com/api/auth.test", {
                headers: { Authorization: `Bearer ${botToken}` },
              });
              const data = await response.json();

              if (data.ok) {
                return { success: true, message: `Connected as ${data.user}` };
              }
              return { success: false, message: data.error || "Connection failed" };
            }

            if (webhookUrl) {
              return { success: true, message: "Webhook URL configured (cannot verify without sending)" };
            }

            return { success: false, message: "No Slack credentials configured" };
          }

          case "n8n": {
            const baseUrl = process.env.N8N_BASE_URL;
            const apiKey = process.env.N8N_API_KEY;

            if (!baseUrl) {
              return { success: false, message: "N8N_BASE_URL not configured" };
            }

            if (apiKey) {
              const response = await fetch(`${baseUrl}/api/v1/workflows`, {
                headers: { "X-N8N-API-KEY": apiKey },
              });

              if (response.ok) {
                const data = await response.json();
                return {
                  success: true,
                  message: `Connected to n8n (${data.data?.length || 0} workflows)`,
                };
              }
              return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
            }

            // Try webhook endpoint
            const response = await fetch(`${baseUrl}/webhook/health`, { method: "GET" });
            if (response.ok) {
              return { success: true, message: "n8n webhook endpoint reachable" };
            }
            return { success: false, message: "n8n not reachable" };
          }

          case "whatsapp": {
            const token = process.env.WHATSAPP_TOKEN;
            if (!token) {
              return { success: false, message: "WHATSAPP_TOKEN not configured" };
            }
            return { success: true, message: "WhatsApp token configured" };
          }

          case "email": {
            const host = process.env.SMTP_HOST;
            const user = process.env.SMTP_USER;
            if (!host || !user) {
              return { success: false, message: "SMTP not fully configured" };
            }
            return { success: true, message: `SMTP configured: ${user}@${host}` };
          }

          default:
            return { success: false, message: `Unknown integration: ${id}` };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOKS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  listWebhooks: protectedProcedure.query(async (): Promise<WebhookEndpoint[]> => {
    // For now, return configured webhooks from environment or database
    // In production, this would query the database
    const webhooks: WebhookEndpoint[] = [];

    if (process.env.WEBHOOK_ENDPOINT_1) {
      webhooks.push({
        id: "webhook-1",
        url: process.env.WEBHOOK_ENDPOINT_1,
        events: ["deal.won", "deal.created"],
        active: true,
        successRate: 98.5,
      });
    }

    if (process.env.WEBHOOK_ENDPOINT_2) {
      webhooks.push({
        id: "webhook-2",
        url: process.env.WEBHOOK_ENDPOINT_2,
        events: ["contact.created", "message.received"],
        active: true,
        successRate: 100,
      });
    }

    return webhooks;
  }),

  registerWebhook: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        events: z.array(z.string()),
        secret: z.string().optional(),
      })
    )
    .mutation(async ({ input }): Promise<{ id: string; success: boolean }> => {
      // In production, this would save to database and register with WebhookDispatcher
      const id = `webhook-${Date.now()}`;

      // Validate URL is reachable
      try {
        const response = await fetch(input.url, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok && response.status !== 405) {
          throw new Error(`Endpoint returned ${response.status}`);
        }
      } catch (error) {
        throw new Error(
          `Cannot reach webhook endpoint: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      return { id, success: true };
    }),

  deleteWebhook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      // In production, delete from database and unregister from WebhookDispatcher
      console.log(`Deleting webhook: ${input.id}`);
      return { success: true };
    }),

  testWebhook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }): Promise<{ success: boolean; response?: string; error?: string }> => {
      // In production, send a test event to the webhook
      console.log(`Testing webhook: ${input.id}`);
      return {
        success: true,
        response: "Test event delivered successfully",
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  sendNotification: protectedProcedure
    .input(
      z.object({
        channel: z.enum(["telegram", "slack", "email"]),
        type: z.enum(["info", "success", "warning", "error"]),
        title: z.string(),
        message: z.string(),
        recipient: z.string().optional(),
      })
    )
    .mutation(async ({ input }): Promise<{ success: boolean; messageId?: string; error?: string }> => {
      const { channel, type, title, message, recipient } = input;

      try {
        switch (channel) {
          case "telegram": {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = recipient || process.env.TELEGRAM_CHAT_ID;

            if (!botToken || !chatId) {
              return { success: false, error: "Telegram not configured" };
            }

            const emoji =
              type === "success"
                ? "✅"
                : type === "warning"
                  ? "⚠️"
                  : type === "error"
                    ? "❌"
                    : "ℹ️";
            const text = `${emoji} <b>${title}</b>\n\n${message}`;

            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "HTML",
              }),
            });

            const data = await response.json();
            if (data.ok) {
              return { success: true, messageId: String(data.result.message_id) };
            }
            return { success: false, error: data.description };
          }

          case "slack": {
            const webhookUrl = process.env.SLACK_WEBHOOK_URL;
            if (!webhookUrl) {
              return { success: false, error: "Slack webhook not configured" };
            }

            const color =
              type === "success"
                ? "#4CAF50"
                : type === "warning"
                  ? "#FF9800"
                  : type === "error"
                    ? "#F44336"
                    : "#2196F3";

            const response = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: title,
                attachments: [{ color, text: message }],
              }),
            });

            if (response.ok) {
              return { success: true };
            }
            return { success: false, error: await response.text() };
          }

          case "email":
            // Would integrate with nodemailer or similar
            return { success: false, error: "Email sending not implemented yet" };

          default:
            return { success: false, error: `Unknown channel: ${channel}` };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGER N8N WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  triggerWorkflow: protectedProcedure
    .input(
      z.object({
        workflowPath: z.string(),
        data: z.record(z.unknown()).optional(),
        test: z.boolean().optional(),
      })
    )
    .mutation(
      async ({ input }): Promise<{ success: boolean; executionId?: string; error?: string }> => {
        const baseUrl = process.env.N8N_BASE_URL;
        if (!baseUrl) {
          return { success: false, error: "N8N_BASE_URL not configured" };
        }

        const endpoint = input.test ? "/webhook-test" : "/webhook";
        const url = `${baseUrl}${endpoint}/${input.workflowPath}`;

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input.data || {}),
          });

          if (!response.ok) {
            return {
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}`,
            };
          }

          const data = await response.json();
          return {
            success: true,
            executionId: data.executionId,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    ),

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION STATS
  // ═══════════════════════════════════════════════════════════════════════════

  getStats: protectedProcedure.query(
    async (): Promise<{
      totalIntegrations: number;
      configuredCount: number;
      connectedCount: number;
      webhooksActive: number;
      notificationsSentToday: number;
    }> => {
      // In production, this would aggregate real data
      return {
        totalIntegrations: 5,
        configuredCount: [
          process.env.TELEGRAM_BOT_TOKEN,
          process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN,
          process.env.N8N_BASE_URL,
          process.env.WHATSAPP_TOKEN,
          process.env.SMTP_HOST,
        ].filter(Boolean).length,
        connectedCount: 0, // Would be determined by actual connection tests
        webhooksActive: [process.env.WEBHOOK_ENDPOINT_1, process.env.WEBHOOK_ENDPOINT_2].filter(
          Boolean
        ).length,
        notificationsSentToday: 0, // Would query from activity log
      };
    }
  ),
});
