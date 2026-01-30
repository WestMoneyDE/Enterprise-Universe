// =============================================================================
// TELEGRAM INTEGRATION
// Send notifications and alerts via Telegram Bot API
// =============================================================================

export interface TelegramConfig {
  botToken: string;
  defaultChatId?: string;
}

export interface TelegramMessage {
  chatId?: string | number;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
  replyMarkup?: TelegramReplyMarkup;
}

export interface TelegramReplyMarkup {
  inline_keyboard?: TelegramInlineButton[][];
  keyboard?: TelegramKeyboardButton[][];
  remove_keyboard?: boolean;
  one_time_keyboard?: boolean;
  resize_keyboard?: boolean;
}

export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramKeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
}

export interface TelegramResponse {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface TelegramNotification {
  type: "info" | "success" | "warning" | "error" | "action_required";
  title: string;
  message: string;
  details?: Array<{ label: string; value: string }>;
  actionUrl?: string;
  actionText?: string;
}

// =============================================================================
// EMOJI MAPPINGS
// =============================================================================

const NOTIFICATION_EMOJIS: Record<TelegramNotification["type"], string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "❌",
  action_required: "🔔",
};

// =============================================================================
// TELEGRAM INTEGRATION CLASS
// =============================================================================

export class TelegramIntegration {
  private botToken: string;
  private defaultChatId?: string;
  private apiBase: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.defaultChatId = config.defaultChatId;
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  // Send text message
  async sendMessage(message: TelegramMessage): Promise<TelegramResponse> {
    const chatId = message.chatId || this.defaultChatId;
    if (!chatId) {
      return { success: false, error: "No chat ID specified" };
    }

    try {
      const response = await fetch(`${this.apiBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.text,
          parse_mode: message.parseMode || "HTML",
          disable_web_page_preview: message.disableWebPagePreview,
          disable_notification: message.disableNotification,
          reply_to_message_id: message.replyToMessageId,
          reply_markup: message.replyMarkup,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, messageId: data.result.message_id };
      }

      return { success: false, error: data.description };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Send photo with caption
  async sendPhoto(options: {
    chatId?: string | number;
    photo: string; // URL or file_id
    caption?: string;
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  }): Promise<TelegramResponse> {
    const chatId = options.chatId || this.defaultChatId;
    if (!chatId) {
      return { success: false, error: "No chat ID specified" };
    }

    try {
      const response = await fetch(`${this.apiBase}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: options.photo,
          caption: options.caption,
          parse_mode: options.parseMode || "HTML",
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, messageId: data.result.message_id };
      }

      return { success: false, error: data.description };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Send document
  async sendDocument(options: {
    chatId?: string | number;
    document: string; // URL or file_id
    caption?: string;
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  }): Promise<TelegramResponse> {
    const chatId = options.chatId || this.defaultChatId;
    if (!chatId) {
      return { success: false, error: "No chat ID specified" };
    }

    try {
      const response = await fetch(`${this.apiBase}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          document: options.document,
          caption: options.caption,
          parse_mode: options.parseMode || "HTML",
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, messageId: data.result.message_id };
      }

      return { success: false, error: data.description };
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
  async sendNotification(notification: TelegramNotification, chatId?: string | number): Promise<TelegramResponse> {
    const emoji = NOTIFICATION_EMOJIS[notification.type];

    let text = `${emoji} <b>${this.escapeHtml(notification.title)}</b>\n\n`;
    text += this.escapeHtml(notification.message);

    if (notification.details && notification.details.length > 0) {
      text += "\n\n";
      for (const detail of notification.details) {
        text += `<b>${this.escapeHtml(detail.label)}:</b> ${this.escapeHtml(detail.value)}\n`;
      }
    }

    const replyMarkup: TelegramReplyMarkup | undefined = notification.actionUrl
      ? {
          inline_keyboard: [
            [
              {
                text: notification.actionText || "View Details",
                url: notification.actionUrl,
              },
            ],
          ],
        }
      : undefined;

    return this.sendMessage({
      chatId,
      text,
      parseMode: "HTML",
      replyMarkup,
    });
  }

  // Send alert with urgency
  async sendAlert(options: {
    title: string;
    message: string;
    type: TelegramNotification["type"];
    actionUrl?: string;
    actionText?: string;
    chatId?: string | number;
    silent?: boolean;
  }): Promise<TelegramResponse> {
    const emoji = NOTIFICATION_EMOJIS[options.type];

    let text = `${emoji} <b>${this.escapeHtml(options.title)}</b>\n\n`;
    text += this.escapeHtml(options.message);

    const replyMarkup: TelegramReplyMarkup | undefined = options.actionUrl
      ? {
          inline_keyboard: [
            [
              {
                text: options.actionText || "View Details",
                url: options.actionUrl,
              },
            ],
          ],
        }
      : undefined;

    return this.sendMessage({
      chatId: options.chatId,
      text,
      parseMode: "HTML",
      replyMarkup,
      disableNotification: options.silent,
    });
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
  }): Promise<TelegramResponse> {
    return this.sendNotification({
      type: "success",
      title: "New Deal Created",
      message: `A new deal has been created in Nexus CRM.`,
      details: [
        { label: "Deal", value: deal.name },
        { label: "Amount", value: `€${deal.amount.toLocaleString()}` },
        { label: "Contact", value: deal.contactName },
        { label: "Stage", value: deal.stage },
      ],
    });
  }

  // Deal won notification
  async notifyDealWon(deal: {
    name: string;
    amount: number;
    contactName: string;
  }): Promise<TelegramResponse> {
    return this.sendAlert({
      type: "success",
      title: "🎉 Deal Won!",
      message: `${deal.name} has been closed successfully!\n\nAmount: €${deal.amount.toLocaleString()}\nContact: ${deal.contactName}`,
    });
  }

  // New message notification
  async notifyNewMessage(message: {
    from: string;
    preview: string;
    platform: string;
  }): Promise<TelegramResponse> {
    return this.sendNotification({
      type: "info",
      title: "New Message",
      message: `You have a new message from ${message.from}`,
      details: [
        { label: "Platform", value: message.platform },
        { label: "Preview", value: message.preview.slice(0, 100) + (message.preview.length > 100 ? "..." : "") },
      ],
    });
  }

  // Workflow error notification
  async notifyWorkflowError(workflow: {
    name: string;
    error: string;
  }): Promise<TelegramResponse> {
    return this.sendAlert({
      type: "error",
      title: "Workflow Failed",
      message: `The workflow "${workflow.name}" encountered an error:\n\n${workflow.error}`,
    });
  }

  // System health alert
  async notifyHealthIssue(service: string, status: string, details?: string): Promise<TelegramResponse> {
    return this.sendAlert({
      type: status === "error" ? "error" : "warning",
      title: "System Health Alert",
      message: `Service <b>${service}</b> is experiencing issues.\n\nStatus: ${status}${details ? `\nDetails: ${details}` : ""}`,
    });
  }

  // Daily summary
  async sendDailySummary(summary: {
    deals: { new: number; won: number; total: number; value: number };
    messages: { sent: number; received: number };
    tasks: { completed: number; pending: number };
  }): Promise<TelegramResponse> {
    const text = `📊 <b>Daily Summary</b>\n\n` +
      `<b>Deals</b>\n` +
      `  New: ${summary.deals.new}\n` +
      `  Won: ${summary.deals.won} (€${summary.deals.value.toLocaleString()})\n` +
      `  Total Open: ${summary.deals.total}\n\n` +
      `<b>Messages</b>\n` +
      `  Sent: ${summary.messages.sent}\n` +
      `  Received: ${summary.messages.received}\n\n` +
      `<b>Tasks</b>\n` +
      `  Completed: ${summary.tasks.completed}\n` +
      `  Pending: ${summary.tasks.pending}`;

    return this.sendMessage({ text, parseMode: "HTML" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  // Escape HTML special characters
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Get bot info
  async getMe(): Promise<{ id: number; username: string; firstName: string } | null> {
    try {
      const response = await fetch(`${this.apiBase}/getMe`);
      const data = await response.json();

      if (data.ok) {
        return {
          id: data.result.id,
          username: data.result.username,
          firstName: data.result.first_name,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const botInfo = await this.getMe();

    if (botInfo) {
      return {
        success: true,
        message: `Connected as @${botInfo.username}`,
      };
    }

    return { success: false, message: "Failed to connect to Telegram API" };
  }

  // Set webhook (for receiving updates)
  async setWebhook(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.apiBase}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      return {
        success: data.ok,
        message: data.ok ? "Webhook set successfully" : data.description,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Delete webhook
  async deleteWebhook(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.apiBase}/deleteWebhook`);
      const data = await response.json();

      return {
        success: data.ok,
        message: data.ok ? "Webhook deleted" : data.description,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

let instance: TelegramIntegration | null = null;

export function getTelegramIntegration(config?: TelegramConfig): TelegramIntegration {
  if (!instance && config) {
    instance = new TelegramIntegration(config);
  }
  if (!instance) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }
    instance = new TelegramIntegration({
      botToken,
      defaultChatId: process.env.TELEGRAM_CHAT_ID,
    });
  }
  return instance;
}

export function resetTelegramIntegration(): void {
  instance = null;
}
