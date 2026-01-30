import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookDispatcher, type WebhookConfig, type WebhookEvent } from "./index";

describe("WebhookDispatcher", () => {
  let dispatcher: WebhookDispatcher;

  beforeEach(() => {
    dispatcher = new WebhookDispatcher();
    vi.clearAllMocks();
  });

  describe("registerWebhook", () => {
    it("should register a webhook with default options", () => {
      const config: WebhookConfig = {
        id: "test-webhook",
        url: "https://example.com/webhook",
      };

      dispatcher.registerWebhook(config);

      const webhooks = dispatcher.listWebhooks();
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0]).toMatchObject({
        id: "test-webhook",
        url: "https://example.com/webhook",
        retryAttempts: 3,
        retryDelayMs: 1000,
        timeout: 30000,
      });
    });

    it("should use custom options when provided", () => {
      const config: WebhookConfig = {
        id: "custom-webhook",
        url: "https://example.com/webhook",
        retryAttempts: 5,
        retryDelayMs: 2000,
        timeout: 60000,
        secret: "my-secret",
      };

      dispatcher.registerWebhook(config);

      const webhooks = dispatcher.listWebhooks();
      expect(webhooks[0]).toMatchObject({
        retryAttempts: 5,
        retryDelayMs: 2000,
        timeout: 60000,
        secret: "my-secret",
      });
    });
  });

  describe("unregisterWebhook", () => {
    it("should remove a registered webhook", () => {
      dispatcher.registerWebhook({
        id: "test-webhook",
        url: "https://example.com/webhook",
      });

      const result = dispatcher.unregisterWebhook("test-webhook");

      expect(result).toBe(true);
      expect(dispatcher.listWebhooks()).toHaveLength(0);
    });

    it("should return false for non-existent webhook", () => {
      const result = dispatcher.unregisterWebhook("non-existent");
      expect(result).toBe(false);
    });

    it("should remove webhook from all event subscriptions", async () => {
      dispatcher.registerWebhook({
        id: "test-webhook",
        url: "https://example.com/webhook",
      });

      dispatcher.subscribe("test-webhook", ["deal.created", "deal.won"]);
      dispatcher.unregisterWebhook("test-webhook");

      // Dispatch should not trigger any requests
      const results = await dispatcher.dispatch("deal.created", { test: true });
      expect(results).toEqual([]);
    });
  });

  describe("subscribe/unsubscribe", () => {
    beforeEach(() => {
      dispatcher.registerWebhook({
        id: "test-webhook",
        url: "https://example.com/webhook",
      });
    });

    it("should subscribe webhook to events", async () => {
      dispatcher.subscribe("test-webhook", ["deal.created"]);

      // Mock fetch for the dispatch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const results = await dispatcher.dispatch("deal.created", { id: "123" });
      expect(results).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should not dispatch to unsubscribed events", async () => {
      dispatcher.subscribe("test-webhook", ["deal.created"]);

      global.fetch = vi.fn();

      const results = await dispatcher.dispatch("deal.won", { id: "123" });
      expect(results).toHaveLength(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should unsubscribe from specific events", async () => {
      dispatcher.subscribe("test-webhook", ["deal.created", "deal.won"]);
      dispatcher.unsubscribe("test-webhook", ["deal.created"]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await dispatcher.dispatch("deal.created", {});
      expect(global.fetch).not.toHaveBeenCalled();

      await dispatcher.dispatch("deal.won", {});
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("dispatch", () => {
    beforeEach(() => {
      dispatcher.registerWebhook({
        id: "test-webhook",
        url: "https://example.com/webhook",
        retryAttempts: 1,
      });
      dispatcher.subscribe("test-webhook", ["deal.created"]);
    });

    it("should dispatch event to subscribed webhooks", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ received: true }),
      });

      const results = await dispatcher.dispatch("deal.created", { dealId: "123" });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].statusCode).toBe(200);
    });

    it("should include proper headers in request", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await dispatcher.dispatch("deal.created", { test: true });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Event": "deal.created",
          }),
        })
      );
    });

    it("should handle failed requests", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const results = await dispatcher.dispatch("deal.created", {});

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("500");
    });

    it("should handle network errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const results = await dispatcher.dispatch("deal.created", {});

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Network error");
    });
  });

  describe("getLogs", () => {
    it("should track dispatch logs", async () => {
      dispatcher.registerWebhook({
        id: "test-webhook",
        url: "https://example.com/webhook",
        retryAttempts: 1,
      });
      dispatcher.subscribe("test-webhook", ["deal.created"]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await dispatcher.dispatch("deal.created", { test: true });

      const logs = dispatcher.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        webhookId: "test-webhook",
        event: "deal.created",
        url: "https://example.com/webhook",
      });
    });
  });

  describe("getWebhookStats", () => {
    it("should return stats for a webhook", async () => {
      dispatcher.registerWebhook({
        id: "test-webhook",
        url: "https://example.com/webhook",
        retryAttempts: 1,
      });
      dispatcher.subscribe("test-webhook", ["deal.created"]);

      // Successful dispatch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      await dispatcher.dispatch("deal.created", {});

      // Failed dispatch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Error",
      });
      await dispatcher.dispatch("deal.created", {});

      const stats = dispatcher.getWebhookStats("test-webhook");
      expect(stats.total).toBe(2);
      expect(stats.success).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });
});
