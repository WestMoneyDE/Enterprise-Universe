// =============================================================================
// NEXUS INTEGRATIONS PACKAGE
// Unified exports for all external service integrations
// =============================================================================

// Telegram Bot Integration
export {
  TelegramIntegration,
  getTelegramIntegration,
  resetTelegramIntegration,
  type TelegramConfig,
  type TelegramMessage,
  type TelegramNotification,
  type TelegramResponse,
  type TelegramReplyMarkup,
  type TelegramInlineButton,
  type TelegramKeyboardButton,
} from "./telegram";

// Slack Integration
export {
  SlackIntegration,
  getSlackIntegration,
  resetSlackIntegration,
  type SlackConfig,
  type SlackMessage,
  type SlackNotification,
  type SlackResponse,
  type SlackBlock,
  type SlackAttachment,
  type SlackAccessory,
  type SlackElement,
} from "./slack";

// n8n Workflow Integration
export {
  N8nIntegration,
  getN8nIntegration,
  resetN8nIntegration,
  type N8nConfig,
  type N8nWorkflow,
  type N8nNode,
  type N8nExecution,
  type N8nWebhookResponse,
} from "./n8n";

// Webhook Dispatch System
export {
  WebhookDispatcher,
  getWebhookDispatcher,
  resetWebhookDispatcher,
  type WebhookConfig,
  type WebhookPayload,
  type WebhookResult,
  type WebhookLog,
  type WebhookEvent,
} from "./webhooks";

// =============================================================================
// NOTIFICATION HELPER
// =============================================================================

import { getTelegramIntegration, type TelegramNotification } from "./telegram";
import { getSlackIntegration, type SlackNotification } from "./slack";

export type NotificationChannel = "telegram" | "slack" | "all";

export interface UnifiedNotification {
  type: "info" | "success" | "warning" | "error" | "action_required";
  title: string;
  message: string;
  details?: Array<{ label: string; value: string }>;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Send notification to one or all configured channels
 */
export async function sendUnifiedNotification(
  notification: UnifiedNotification,
  channels: NotificationChannel = "all"
): Promise<{ telegram?: boolean; slack?: boolean }> {
  const results: { telegram?: boolean; slack?: boolean } = {};

  if (channels === "telegram" || channels === "all") {
    try {
      const telegram = getTelegramIntegration();
      const telegramNotification: TelegramNotification = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        details: notification.details,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
      };
      const result = await telegram.sendNotification(telegramNotification);
      results.telegram = result.success;
    } catch {
      results.telegram = false;
    }
  }

  if (channels === "slack" || channels === "all") {
    try {
      const slack = getSlackIntegration();
      const slackNotification: SlackNotification = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        fields: notification.details?.map((d) => ({
          name: d.label,
          value: d.value,
          inline: true,
        })),
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
      };
      const result = await slack.sendNotification(slackNotification);
      results.slack = result.success;
    } catch {
      results.slack = false;
    }
  }

  return results;
}

// =============================================================================
// DEAL NOTIFICATION HELPERS
// =============================================================================

export interface DealInfo {
  name: string;
  amount: number;
  contactName: string;
  stage?: string;
}

/**
 * Notify all channels about a new deal
 */
export async function notifyNewDeal(
  deal: DealInfo,
  channels: NotificationChannel = "all"
): Promise<{ telegram?: boolean; slack?: boolean }> {
  const results: { telegram?: boolean; slack?: boolean } = {};

  if (channels === "telegram" || channels === "all") {
    try {
      const telegram = getTelegramIntegration();
      const result = await telegram.notifyNewDeal({
        ...deal,
        stage: deal.stage || "New",
      });
      results.telegram = result.success;
    } catch {
      results.telegram = false;
    }
  }

  if (channels === "slack" || channels === "all") {
    try {
      const slack = getSlackIntegration();
      const result = await slack.notifyNewDeal({
        ...deal,
        stage: deal.stage || "New",
      });
      results.slack = result.success;
    } catch {
      results.slack = false;
    }
  }

  return results;
}

/**
 * Notify all channels about a won deal
 */
export async function notifyDealWon(
  deal: Omit<DealInfo, "stage">,
  channels: NotificationChannel = "all"
): Promise<{ telegram?: boolean; slack?: boolean }> {
  const results: { telegram?: boolean; slack?: boolean } = {};

  if (channels === "telegram" || channels === "all") {
    try {
      const telegram = getTelegramIntegration();
      const result = await telegram.notifyDealWon(deal);
      results.telegram = result.success;
    } catch {
      results.telegram = false;
    }
  }

  if (channels === "slack" || channels === "all") {
    try {
      const slack = getSlackIntegration();
      const result = await slack.notifyDealWon(deal);
      results.slack = result.success;
    } catch {
      results.slack = false;
    }
  }

  return results;
}

// =============================================================================
// WORKFLOW ERROR NOTIFICATION
// =============================================================================

export interface WorkflowError {
  name: string;
  error: string;
  executionId?: string;
}

/**
 * Notify all channels about a workflow error
 */
export async function notifyWorkflowError(
  workflow: WorkflowError,
  channels: NotificationChannel = "all"
): Promise<{ telegram?: boolean; slack?: boolean }> {
  const results: { telegram?: boolean; slack?: boolean } = {};

  if (channels === "telegram" || channels === "all") {
    try {
      const telegram = getTelegramIntegration();
      const result = await telegram.notifyWorkflowError(workflow);
      results.telegram = result.success;
    } catch {
      results.telegram = false;
    }
  }

  if (channels === "slack" || channels === "all") {
    try {
      const slack = getSlackIntegration();
      const result = await slack.notifyWorkflowError(workflow);
      results.slack = result.success;
    } catch {
      results.slack = false;
    }
  }

  return results;
}
