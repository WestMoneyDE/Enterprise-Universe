// =============================================================================
// Mail Controller Router
// =============================================================================
// Prüft und kontrolliert das Mail-System vor dem Versenden von Deals

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  checkMailEngineHealth,
  sendTestEmail,
  sendWonDealEmail,
  getMailSystemStatus,
} from "../services/mail-controller";

export const mailControllerRouter = createTRPCRouter({
  /**
   * Prüft ob das Mail-System online ist
   */
  checkHealth: publicProcedure.query(async () => {
    const health = await checkMailEngineHealth();
    const status = getMailSystemStatus();

    return {
      ...health,
      consecutiveFailures: status.consecutiveFailures,
      lastSuccessfulSend: status.lastSuccessfulSend,
      averageLatencyMs: status.averageLatencyMs,
    };
  }),

  /**
   * Holt den vollständigen Mail-System Status
   */
  getStatus: publicProcedure.query(async () => {
    // Erst einen Health-Check machen
    const health = await checkMailEngineHealth();
    const status = getMailSystemStatus();

    return {
      isOnline: health.online,
      endpoint: health.endpoint,
      lastCheck: new Date(),
      lastSuccessfulSend: status.lastSuccessfulSend,
      consecutiveFailures: status.consecutiveFailures,
      averageLatencyMs: status.averageLatencyMs,
      recentTestCount: status.recentTests.length,
      recentSuccessRate: status.recentTests.length > 0
        ? Math.round(
            (status.recentTests.filter(t => t.success).length / status.recentTests.length) * 100
          )
        : 0,
    };
  }),

  /**
   * Sendet eine Test-E-Mail zur Verifizierung
   */
  sendTest: publicProcedure
    .input(
      z.object({
        to: z.string().email("Ungültige E-Mail-Adresse"),
        source: z.string().optional().default("manual_test"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendTestEmail(input.to, input.source);

      return {
        success: result.success,
        messageId: result.messageId,
        provider: result.provider,
        error: result.error,
        latencyMs: result.latencyMs,
        timestamp: result.timestamp,
      };
    }),

  /**
   * Sendet eine Won Deal E-Mail (mit vorheriger System-Prüfung)
   */
  sendWonDealNotification: publicProcedure
    .input(
      z.object({
        to: z.string().email("Ungültige E-Mail-Adresse"),
        dealName: z.string().min(1),
        dealValue: z.number().min(0),
        commission: z.number().min(0),
        contactName: z.string().min(1),
        tierName: z.string().default("GOLD ELITE"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendWonDealEmail(input);

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        systemCheckPassed: result.systemCheckPassed,
        dealName: input.dealName,
        commission: input.commission,
      };
    }),

  /**
   * Prüft das System und sendet Test, bevor echte Mails rausgehen
   * Gibt grünes Licht für Won Deal Versand
   */
  verifyBeforeSend: publicProcedure
    .input(
      z.object({
        testEmail: z.string().email("Ungültige E-Mail-Adresse"),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Health Check
      const health = await checkMailEngineHealth();
      if (!health.online) {
        return {
          approved: false,
          reason: "Mail-Engine ist offline",
          health,
          testResult: null,
        };
      }

      // 2. Test-Mail senden
      const testResult = await sendTestEmail(input.testEmail, "pre_send_verification");

      if (!testResult.success) {
        return {
          approved: false,
          reason: `Test-Mail fehlgeschlagen: ${testResult.error}`,
          health,
          testResult,
        };
      }

      // 3. Alles OK - Versand freigeben
      return {
        approved: true,
        reason: "Mail-System verifiziert und bereit",
        health,
        testResult,
      };
    }),

  /**
   * Holt die letzten Test-Ergebnisse
   */
  getRecentTests: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const status = getMailSystemStatus();
      const limit = input?.limit ?? 10;

      return {
        tests: status.recentTests.slice(0, limit),
        totalTests: status.recentTests.length,
        successRate: status.recentTests.length > 0
          ? Math.round(
              (status.recentTests.filter(t => t.success).length / status.recentTests.length) * 100
            )
          : 0,
      };
    }),
});
