// =============================================================================
// SLACK INTEGRATION
// Send notifications and messages to Slack channels
// =============================================================================

export interface SlackConfig {
  webhookUrl?: string;
  botToken?: string;
  defaultChannel?: string;
}

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
}

export interface SlackBlock {
  type: "section" | "divider" | "header" | "context" | "actions" | "image";
  text?: {
    type: "plain_text" | "mrkdwn";
    text: string;
    emoji?: boolean;
  };
  block_id?: string;
  accessory?: SlackAccessory;
  elements?: SlackElement[];
  fields?: Array<{ type: "mrkdwn"; text: string }>;
}

export interface SlackAccessory {
  type: "button" | "image" | "overflow" | "datepicker" | "static_select";
  text?: { type: "plain_text"; text: string; emoji?: boolean };
  action_id?: string;
  value?: string;
  url?: string;
  image_url?: string;
  alt_text?: string;
}

export interface SlackElement {
  type: "button" | "image" | "plain_text" | "mrkdwn";
  text?: string | { type: "plain_text" | "mrkdwn"; text: string };
  action_id?: string;
  value?: string;
  url?: string;
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  thumb_url?: string;
  image_url?: string;
}

export interface SlackNotification {
  type: "info" | "success" | "warning" | "error" | "action_required";
  title: string;
  message: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
}

export interface SlackResponse {
  success: boolean;
  ts?: string;
  channel?: string;
  error?: string;
}

// =============================================================================
// COLOR MAPPINGS
// =============================================================================

const NOTIFICATION_COLORS: Record<SlackNotification["type"], string> = {
  info: "#2196F3",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  action_required: "#9C27B0",
};

const NOTIFICATION_ICONS: Record<SlackNotification["type"], string> = {
  info: ":information_source:",
  success: ":white_check_mark:",
  warning: ":warning:",
  error: ":x:",
  action_required: ":bell:",
};

// =============================================================================
// SLACK INTEGRATION CLASS
// =============================================================================

export class SlackIntegration {
  private webhookUrl?: string;
  private botToken?: string;
  private defaultChannel?: string;

  constructor(config: SlackConfig) {
    this.webhookUrl = config.webhookUrl;
    this.botToken = config.botToken;
    this.defaultChannel = config.defaultChannel;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  // Send via webhook (simpler, no bot token needed)
  async sendWebhook(message: SlackMessage): Promise<SlackResponse> {
    if (!this.webhookUrl) {
      return { success: false, error: "Webhook URL not configured" };
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorText = await response.text();
      return { success: false, error: errorText };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Send via Bot API (more features, requires bot token)
  async sendMessage(message: SlackMessage): Promise<SlackResponse> {
    if (!this.botToken) {
      // Fall back to webhook
      return this.sendWebhook(message);
    }

    const channel = message.channel || this.defaultChannel;
    if (!channel) {
      return { success: false, error: "No channel specified" };
    }

    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify({
          channel,
          text: message.text,
          blocks: message.blocks,
          attachments: message.attachments,
          username: message.username,
          icon_emoji: message.icon_emoji,
          icon_url: message.icon_url,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, ts: data.ts, channel: data.channel };
      }

      return { success: false, error: data.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Send formatted notification
  async sendNotification(notification: SlackNotification, channel?: string): Promise<SlackResponse> {
    const color = NOTIFICATION_COLORS[notification.type];
    const icon = NOTIFICATION_ICONS[notification.type];

    const fields = notification.fields?.map((f) => ({
      title: f.name,
      value: f.value,
      short: f.inline ?? true,
    }));

    const message: SlackMessage = {
      channel,
      text: `${icon} ${notification.title}`,
      attachments: [
        {
          color,
          title: notification.title,
          title_link: notification.actionUrl,
          text: notification.message,
          fields,
          footer: "Nexus Command Center",
          footer_icon: "https://example.com/nexus-icon.png",
          ts: Math.floor(Date.now() / 1000),
          image_url: notification.imageUrl,
        },
      ],
    };

    return this.sendMessage(message);
  }

  // Send alert with action button
  async sendAlert(options: {
    title: string;
    message: string;
    type: SlackNotification["type"];
    actionUrl?: string;
    actionText?: string;
    channel?: string;
  }): Promise<SlackResponse> {
    const color = NOTIFICATION_COLORS[options.type];
    const icon = NOTIFICATION_ICONS[options.type];

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${icon} ${options.title}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: options.message,
        },
      },
    ];

    if (options.actionUrl) {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: options.actionText || "View Details",
            },
            url: options.actionUrl,
          },
        ],
      });
    }

    const message: SlackMessage = {
      channel: options.channel,
      text: `${icon} ${options.title}`,
      blocks,
      attachments: [{ color }],
    };

    return this.sendMessage(message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEXUS-SPECIFIC NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // New deal notification
  async notifyNewDeal(deal: {
    name: string;
    amount: number;
    contactName: string;
    stage: string;
  }): Promise<SlackResponse> {
    return this.sendNotification({
      type: "success",
      title: "New Deal Created",
      message: `A new deal "${deal.name}" has been created.`,
      fields: [
        { name: "Amount", value: `€${deal.amount.toLocaleString()}` },
        { name: "Contact", value: deal.contactName },
        { name: "Stage", value: deal.stage },
      ],
    });
  }

  // Deal won notification
  async notifyDealWon(deal: {
    name: string;
    amount: number;
    contactName: string;
  }): Promise<SlackResponse> {
    return this.sendAlert({
      type: "success",
      title: "Deal Won!",
      message: `:tada: *${deal.name}* has been closed successfully!\n\n*Amount:* €${deal.amount.toLocaleString()}\n*Contact:* ${deal.contactName}`,
    });
  }

  // Workflow error notification
  async notifyWorkflowError(workflow: {
    name: string;
    error: string;
    executionId?: string;
  }): Promise<SlackResponse> {
    return this.sendAlert({
      type: "error",
      title: "Workflow Failed",
      message: `The workflow *${workflow.name}* encountered an error:\n\`\`\`${workflow.error}\`\`\``,
      actionUrl: workflow.executionId
        ? `https://your-n8n-instance.com/execution/${workflow.executionId}`
        : undefined,
      actionText: "View Execution",
    });
  }

  // System health alert
  async notifyHealthIssue(service: string, status: string, details?: string): Promise<SlackResponse> {
    return this.sendAlert({
      type: status === "error" ? "error" : "warning",
      title: "System Health Alert",
      message: `Service *${service}* is experiencing issues.\n\n*Status:* ${status}${details ? `\n*Details:* ${details}` : ""}`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.botToken) {
      try {
        const response = await fetch("https://slack.com/api/auth.test", {
          headers: { Authorization: `Bearer ${this.botToken}` },
        });
        const data = await response.json();
        if (data.ok) {
          return { success: true, message: `Connected as ${data.user}` };
        }
        return { success: false, message: data.error };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    if (this.webhookUrl) {
      // Test webhook by sending a test message
      const result = await this.sendWebhook({
        text: "Nexus Command Center connection test",
      });
      return {
        success: result.success,
        message: result.success ? "Webhook is working" : result.error || "Webhook test failed",
      };
    }

    return { success: false, message: "No Slack credentials configured" };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

let instance: SlackIntegration | null = null;

export function getSlackIntegration(config?: SlackConfig): SlackIntegration {
  if (!instance && config) {
    instance = new SlackIntegration(config);
  }
  if (!instance) {
    instance = new SlackIntegration({
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      botToken: process.env.SLACK_BOT_TOKEN,
      defaultChannel: process.env.SLACK_DEFAULT_CHANNEL,
    });
  }
  return instance;
}

export function resetSlackIntegration(): void {
  instance = null;
}
