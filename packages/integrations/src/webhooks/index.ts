// =============================================================================
// WEBHOOK DISPATCH SYSTEM
// Unified webhook dispatcher for external integrations with retry logic
// =============================================================================

export interface WebhookConfig {
  id: string;
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeout?: number;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: {
    organizationId?: string;
    userId?: string;
    source?: string;
  };
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  response?: unknown;
  error?: string;
  attempts: number;
  duration: number;
}

export interface WebhookLog {
  webhookId: string;
  event: string;
  url: string;
  payload: WebhookPayload;
  result: WebhookResult;
  timestamp: Date;
}

// Webhook event types
export type WebhookEvent =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "deal.created"
  | "deal.updated"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "message.received"
  | "message.sent"
  | "workflow.triggered"
  | "workflow.completed"
  | "workflow.failed"
  | "payment.received"
  | "payment.failed"
  | "project.milestone_reached"
  | "lead.scored"
  | "system.health_check";

// =============================================================================
// WEBHOOK DISPATCHER CLASS
// =============================================================================

export class WebhookDispatcher {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private eventSubscriptions: Map<WebhookEvent, Set<string>> = new Map();
  private logs: WebhookLog[] = [];
  private maxLogSize = 1000;

  constructor(private options?: { logCallback?: (log: WebhookLog) => void }) {}

  // Register a webhook endpoint
  registerWebhook(config: WebhookConfig): void {
    this.webhooks.set(config.id, {
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeout: 30000,
      ...config,
    });
  }

  // Unregister a webhook
  unregisterWebhook(webhookId: string): boolean {
    // Remove from all event subscriptions
    for (const subscribers of this.eventSubscriptions.values()) {
      subscribers.delete(webhookId);
    }
    return this.webhooks.delete(webhookId);
  }

  // Subscribe webhook to specific events
  subscribe(webhookId: string, events: WebhookEvent[]): void {
    for (const event of events) {
      if (!this.eventSubscriptions.has(event)) {
        this.eventSubscriptions.set(event, new Set());
      }
      this.eventSubscriptions.get(event)!.add(webhookId);
    }
  }

  // Unsubscribe webhook from events
  unsubscribe(webhookId: string, events?: WebhookEvent[]): void {
    if (events) {
      for (const event of events) {
        this.eventSubscriptions.get(event)?.delete(webhookId);
      }
    } else {
      // Unsubscribe from all events
      for (const subscribers of this.eventSubscriptions.values()) {
        subscribers.delete(webhookId);
      }
    }
  }

  // Dispatch event to all subscribed webhooks
  async dispatch(event: WebhookEvent, data: Record<string, unknown>, metadata?: WebhookPayload["metadata"]): Promise<WebhookResult[]> {
    const subscribers = this.eventSubscriptions.get(event);
    if (!subscribers || subscribers.size === 0) {
      return [];
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    const results: WebhookResult[] = [];

    for (const webhookId of subscribers) {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook) continue;

      const result = await this.sendWebhook(webhook, payload);
      results.push(result);

      // Log the dispatch
      const log: WebhookLog = {
        webhookId,
        event,
        url: webhook.url,
        payload,
        result,
        timestamp: new Date(),
      };
      this.addLog(log);
    }

    return results;
  }

  // Send webhook with retry logic
  private async sendWebhook(config: WebhookConfig, payload: WebhookPayload): Promise<WebhookResult> {
    const startTime = Date.now();
    let lastError: string | undefined;
    let attempts = 0;

    for (let i = 0; i < (config.retryAttempts || 3); i++) {
      attempts++;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Webhook-Event": payload.event,
          "X-Webhook-Timestamp": payload.timestamp,
          ...config.headers,
        };

        // Add signature if secret is configured
        if (config.secret) {
          const signature = await this.generateSignature(payload, config.secret);
          headers["X-Webhook-Signature"] = signature;
        }

        const response = await fetch(config.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        if (response.ok) {
          let responseData: unknown;
          try {
            responseData = await response.json();
          } catch {
            responseData = await response.text();
          }

          return {
            success: true,
            statusCode: response.status,
            response: responseData,
            attempts,
            duration,
          };
        }

        // Non-retryable error (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return {
            success: false,
            statusCode: response.status,
            error: `HTTP ${response.status}: ${response.statusText}`,
            attempts,
            duration,
          };
        }

        lastError = `HTTP ${response.status}: ${response.statusText}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      // Wait before retry (exponential backoff)
      if (i < (config.retryAttempts || 3) - 1) {
        await this.delay((config.retryDelayMs || 1000) * Math.pow(2, i));
      }
    }

    return {
      success: false,
      error: lastError || "Unknown error",
      attempts,
      duration: Date.now() - startTime,
    };
  }

  // Generate HMAC signature for webhook payload
  private async generateSignature(payload: WebhookPayload, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, data);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private addLog(log: WebhookLog): void {
    this.logs.push(log);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }
    this.options?.logCallback?.(log);
  }

  // Get recent logs
  getLogs(limit = 100): WebhookLog[] {
    return this.logs.slice(-limit);
  }

  // Get webhook status
  getWebhookStats(webhookId: string): { total: number; success: number; failed: number } {
    const webhookLogs = this.logs.filter((l) => l.webhookId === webhookId);
    return {
      total: webhookLogs.length,
      success: webhookLogs.filter((l) => l.result.success).length,
      failed: webhookLogs.filter((l) => !l.result.success).length,
    };
  }

  // List registered webhooks
  listWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let dispatcher: WebhookDispatcher | null = null;

export function getWebhookDispatcher(options?: { logCallback?: (log: WebhookLog) => void }): WebhookDispatcher {
  if (!dispatcher) {
    dispatcher = new WebhookDispatcher(options);
  }
  return dispatcher;
}

export function resetWebhookDispatcher(): void {
  dispatcher = null;
}
