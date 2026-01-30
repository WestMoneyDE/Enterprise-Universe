import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  checkMailEngineHealth,
  sendWonDealEmail,
  getMailSystemStatus,
} from "../services/mail-controller";
import {
  validateEmail,
  validateEmails,
  shouldBlockEmail,
  type EmailValidationResult,
} from "../services/email-validator";
import { db, dealContacts, bauherrenPaesse, eq, and, desc, sql, isNull, isNotNull } from "@nexus/db";

// Commission rate constant - 2.5%
const COMMISSION_RATE = 0.025;

// =============================================================================
// BAUHERREN PASS ROUTER - VIP Commission & Tier System
// Connected to HubSpot for real deal data
// =============================================================================

const HUBSPOT_API_BASE = "https://api.hubapi.com";

// Tier configuration matching the UI
const TIERS = ["bronze", "silver", "gold", "platinum", "diamond"] as const;
type TierType = (typeof TIERS)[number];

const TIER_CONFIG: Record<TierType, {
  name: string;
  minVolume: number;
  commission: number;
  powerLevel: number;
}> = {
  bronze: { name: "BRONZE OPERATIVE", minVolume: 0, commission: 2.5, powerLevel: 10000 },
  silver: { name: "SILVER AGENT", minVolume: 100000, commission: 3.0, powerLevel: 50000 },
  gold: { name: "GOLD ELITE", minVolume: 500000, commission: 3.5, powerLevel: 250000 },
  platinum: { name: "PLATINUM COMMANDER", minVolume: 1000000, commission: 4.0, powerLevel: 1000000 },
  diamond: { name: "DIAMOND OVERLORD", minVolume: 5000000, commission: 5.0, powerLevel: 9999999 },
};

// =============================================================================
// HUBSPOT HELPERS
// =============================================================================

interface HubSpotSearchResponse {
  total: number;
  results: Array<{
    id: string;
    properties: Record<string, string | null>;
  }>;
}

async function hubspotRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("HUBSPOT_ACCESS_TOKEN not configured");
  }

  const response = await fetch(`${HUBSPOT_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

// Determine tier based on total volume
function calculateTier(totalVolume: number): TierType {
  if (totalVolume >= 5000000) return "diamond";
  if (totalVolume >= 1000000) return "platinum";
  if (totalVolume >= 500000) return "gold";
  if (totalVolume >= 100000) return "silver";
  return "bronze";
}

// Get won deals from HubSpot
async function getWonDealsFromHubSpot(limit: number = 100) {
  try {
    const deals = await hubspotRequest<HubSpotSearchResponse>(
      "/crm/v3/objects/deals/search",
      {
        method: "POST",
        body: JSON.stringify({
          limit,
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "dealstage",
                  operator: "EQ",
                  value: "closedwon",
                },
              ],
            },
          ],
          sorts: [{ propertyName: "closedate", direction: "DESCENDING" }],
          properties: [
            "dealname",
            "amount",
            "closedate",
            "createdate",
            "hubspot_owner_id",
          ],
        }),
      }
    );

    return {
      total: deals.total,
      deals: deals.results.map(deal => ({
        id: deal.id,
        name: deal.properties.dealname || "Untitled Deal",
        value: parseFloat(deal.properties.amount || "0"),
        closeDate: deal.properties.closedate ? new Date(deal.properties.closedate) : null,
        createdAt: deal.properties.createdate ? new Date(deal.properties.createdate) : null,
        ownerId: deal.properties.hubspot_owner_id,
      })),
    };
  } catch (error) {
    console.error("[Bauherren Pass] HubSpot error:", error);
    return null;
  }
}

// =============================================================================
// ROUTER IMPLEMENTATION
// =============================================================================

export const bauherrenPassRouter = createTRPCRouter({
  // Get current tier status and overview - REAL DATA
  getStatus: publicProcedure
    .query(async () => {
      // Try to get real data from HubSpot
      const hubspotData = await getWonDealsFromHubSpot(100);

      if (hubspotData) {
        const totalVolume = hubspotData.deals.reduce((sum, d) => sum + d.value, 0);
        const currentTier = calculateTier(totalVolume);
        const tierConfig = TIER_CONFIG[currentTier];
        const commissionRate = tierConfig.commission / 100;
        const totalCommission = totalVolume * commissionRate;

        const nextTierIndex = TIERS.indexOf(currentTier) + 1;
        const nextTier = nextTierIndex < TIERS.length ? TIERS[nextTierIndex] : null;
        const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null;

        const progressToNextTier = nextTierConfig
          ? Math.min(100, (totalVolume / nextTierConfig.minVolume) * 100)
          : 100;

        // Count active (recent) deals
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeDeals = hubspotData.deals.filter(
          d => d.closeDate && d.closeDate > thirtyDaysAgo
        ).length;

        return {
          source: "hubspot",
          currentTier,
          totalVolume: Math.round(totalVolume),
          totalCommission: Math.round(totalCommission * 100) / 100,
          referrals: hubspotData.total, // Total won deals as referrals
          activeDeals,
          pendingCommission: 0, // Would need separate tracking
          tierConfig,
          tierName: tierConfig.name,
          commissionRate: tierConfig.commission,
          powerLevel: tierConfig.powerLevel,
          nextTier: nextTier ? {
            name: TIER_CONFIG[nextTier].name,
            minVolume: TIER_CONFIG[nextTier].minVolume,
            progress: progressToNextTier,
            remaining: Math.max(0, TIER_CONFIG[nextTier].minVolume - totalVolume),
          } : null,
        };
      }

      // Fallback to demo data if HubSpot unavailable
      const mockData = {
        currentTier: "gold" as TierType,
        totalVolume: 847500,
        totalCommission: 29662.50,
        referrals: 47,
        activeDeals: 12,
        pendingCommission: 15000,
      };

      const tierConfig = TIER_CONFIG[mockData.currentTier];
      const nextTierIndex = TIERS.indexOf(mockData.currentTier) + 1;
      const nextTier = nextTierIndex < TIERS.length ? TIERS[nextTierIndex] : null;

      return {
        source: "demo",
        ...mockData,
        tierConfig,
        tierName: tierConfig.name,
        commissionRate: tierConfig.commission,
        powerLevel: tierConfig.powerLevel,
        nextTier: nextTier ? {
          name: TIER_CONFIG[nextTier].name,
          minVolume: TIER_CONFIG[nextTier].minVolume,
          progress: 84.75,
          remaining: 152500,
        } : null,
        _message: "Demo data - HubSpot nicht erreichbar",
      };
    }),

  // Get monthly performance stats - REAL DATA
  getMonthlyStats: publicProcedure
    .input(z.object({
      months: z.number().min(1).max(12).default(6),
    }).optional())
    .query(async ({ input }) => {
      const monthCount = input?.months ?? 6;
      const hubspotData = await getWonDealsFromHubSpot(100);

      if (hubspotData && hubspotData.deals.length > 0) {
        // Group deals by month
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        const monthlyData: Record<string, { volume: number; count: number }> = {};

        // Initialize last N months
        for (let i = 0; i < monthCount; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          monthlyData[key] = { volume: 0, count: 0 };
        }

        // Aggregate deals
        for (const deal of hubspotData.deals) {
          if (deal.closeDate) {
            const key = `${deal.closeDate.getFullYear()}-${deal.closeDate.getMonth()}`;
            if (monthlyData[key]) {
              monthlyData[key].volume += deal.value;
              monthlyData[key].count++;
            }
          }
        }

        // Convert to array
        const stats = Object.entries(monthlyData)
          .map(([key, data]) => {
            const [year, month] = key.split("-").map(Number);
            return {
              month: monthNames[month],
              year,
              volume: Math.round(data.volume),
              commission: Math.round(data.volume * 0.035), // Gold tier default
              count: data.count,
            };
          })
          .reverse();

        return {
          source: "hubspot",
          stats,
          totalVolume: stats.reduce((sum, s) => sum + s.volume, 0),
          totalCommission: stats.reduce((sum, s) => sum + s.commission, 0),
          averageMonthlyVolume: Math.round(stats.reduce((sum, s) => sum + s.volume, 0) / stats.length),
        };
      }

      // Fallback to demo data
      const months = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
      const currentMonth = new Date().getMonth();

      const stats = [];
      for (let i = monthCount - 1; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const baseVolume = 100000 + Math.random() * 100000;
        stats.push({
          month: months[monthIndex],
          volume: Math.round(baseVolume),
          commission: Math.round(baseVolume * 0.035),
        });
      }

      return {
        source: "demo",
        stats,
        totalVolume: stats.reduce((sum, s) => sum + s.volume, 0),
        totalCommission: stats.reduce((sum, s) => sum + s.commission, 0),
        averageMonthlyVolume: Math.round(stats.reduce((sum, s) => sum + s.volume, 0) / stats.length),
        _message: "Demo data - HubSpot nicht erreichbar",
      };
    }),

  // Get recent deals with commission - REAL DATA
  getRecentDeals: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(5),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 5;
      const hubspotData = await getWonDealsFromHubSpot(limit);

      if (hubspotData && hubspotData.deals.length > 0) {
        const deals = hubspotData.deals.map(deal => ({
          id: deal.id,
          name: deal.name,
          value: deal.value,
          status: "closed" as const,
          commission: Math.round(deal.value * 0.035 * 100) / 100, // Gold tier
          date: deal.closeDate,
        }));

        return {
          source: "hubspot",
          deals,
          totalValue: deals.reduce((sum, d) => sum + d.value, 0),
          totalCommission: deals.reduce((sum, d) => sum + d.commission, 0),
          closedCount: deals.length,
          pendingCount: 0,
        };
      }

      // Fallback demo data
      const mockDeals = [
        { id: "1", name: "Neubau Villa München", value: 450000, status: "closed" as const, commission: 15750, date: new Date("2024-06-15") },
        { id: "2", name: "Sanierung Altbau Berlin", value: 280000, status: "closed" as const, commission: 9800, date: new Date("2024-06-10") },
        { id: "3", name: "Smart Home Integration", value: 85000, status: "closed" as const, commission: 2975, date: new Date("2024-06-05") },
      ];

      return {
        source: "demo",
        deals: mockDeals.slice(0, limit),
        totalValue: mockDeals.reduce((sum, d) => sum + d.value, 0),
        totalCommission: mockDeals.reduce((sum, d) => sum + d.commission, 0),
        closedCount: mockDeals.length,
        pendingCount: 0,
        _message: "Demo data - HubSpot nicht erreichbar",
      };
    }),

  // Get tier progression data
  getTierProgression: publicProcedure
    .query(async () => {
      const hubspotData = await getWonDealsFromHubSpot(100);
      const totalVolume = hubspotData
        ? hubspotData.deals.reduce((sum, d) => sum + d.value, 0)
        : 847500;
      const currentTier = calculateTier(totalVolume);

      return {
        source: hubspotData ? "hubspot" : "demo",
        tiers: TIERS.map((tier) => {
          const config = TIER_CONFIG[tier];
          const isCurrentTier = tier === currentTier;
          const isPastTier = TIERS.indexOf(tier) < TIERS.indexOf(currentTier);
          const isFutureTier = TIERS.indexOf(tier) > TIERS.indexOf(currentTier);

          let progress = 0;
          if (isPastTier || isCurrentTier) {
            progress = 100;
          } else if (isFutureTier) {
            const prevTier = TIERS[TIERS.indexOf(tier) - 1];
            const prevMinVolume = prevTier ? TIER_CONFIG[prevTier].minVolume : 0;
            const range = config.minVolume - prevMinVolume;
            progress = Math.max(0, Math.min(100, ((totalVolume - prevMinVolume) / range) * 100));
          }

          return {
            tier,
            name: config.name,
            minVolume: config.minVolume,
            commission: config.commission,
            powerLevel: config.powerLevel,
            isCurrentTier,
            isPastTier,
            isFutureTier,
            progress,
          };
        }),
        currentTier,
        totalVolume: Math.round(totalVolume),
      };
    }),

  // Get dashboard summary for SciFi command deck - REAL DATA
  getDashboardSummary: publicProcedure
    .query(async () => {
      const hubspotData = await getWonDealsFromHubSpot(100);

      if (hubspotData && hubspotData.deals.length > 0) {
        const totalVolume = hubspotData.deals.reduce((sum, d) => sum + d.value, 0);
        const currentTier = calculateTier(totalVolume);
        const tierConfig = TIER_CONFIG[currentTier];
        const commissionRate = tierConfig.commission / 100;

        // Monthly calculation
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const monthlyDeals = hubspotData.deals.filter(
          d => d.closeDate && d.closeDate > thirtyDaysAgo
        );
        const monthlyVolume = monthlyDeals.reduce((sum, d) => sum + d.value, 0);

        const nextTierIndex = TIERS.indexOf(currentTier) + 1;
        const nextTier = nextTierIndex < TIERS.length ? TIERS[nextTierIndex] : null;

        return {
          source: "hubspot",
          // Current status
          tier: currentTier,
          tierName: tierConfig.name,
          commissionRate: tierConfig.commission,
          powerLevel: tierConfig.powerLevel,

          // Volume metrics
          totalVolume: Math.round(totalVolume),
          monthlyVolume: Math.round(monthlyVolume),

          // Commission metrics
          totalCommission: Math.round(totalVolume * commissionRate * 100) / 100,
          pendingCommission: 0,
          monthlyCommission: Math.round(monthlyVolume * commissionRate * 100) / 100,

          // Activity metrics
          activeDeals: monthlyDeals.length,
          referrals: hubspotData.total,
          projectsInProgress: hubspotData.deals.filter(d => {
            const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            return d.closeDate && d.closeDate > sixtyDaysAgo;
          }).length,

          // Next tier progress
          nextTierProgress: nextTier
            ? Math.min(100, (totalVolume / TIER_CONFIG[nextTier].minVolume) * 100)
            : 100,
          nextTierName: nextTier ? TIER_CONFIG[nextTier].name : null,
          volumeToNextTier: nextTier
            ? Math.max(0, TIER_CONFIG[nextTier].minVolume - totalVolume)
            : 0,

          // Trends (simplified - would need historical data)
          volumeTrend: 0,
          commissionTrend: 0,
        };
      }

      // Fallback demo data
      return {
        source: "demo",
        tier: "gold" as TierType,
        tierName: "GOLD ELITE",
        commissionRate: 3.5,
        powerLevel: 250000,
        totalVolume: 847500,
        monthlyVolume: 134500,
        totalCommission: 29662.50,
        pendingCommission: 15000,
        monthlyCommission: 4707.50,
        activeDeals: 12,
        referrals: 47,
        projectsInProgress: 8,
        nextTierProgress: 84.75,
        nextTierName: "PLATINUM COMMANDER",
        volumeToNextTier: 152500,
        volumeTrend: 12.5,
        commissionTrend: 8.2,
        _message: "Demo data - HubSpot nicht erreichbar",
      };
    }),

  // ==========================================================================
  // MAIL INTEGRATION
  // ==========================================================================

  // Get mail system status for Bauherren Pass
  getMailStatus: publicProcedure.query(async () => {
    const health = await checkMailEngineHealth();
    const status = getMailSystemStatus();

    return {
      isOnline: health.online,
      latencyMs: health.latencyMs,
      lastSuccessfulSend: status.lastSuccessfulSend,
      consecutiveFailures: status.consecutiveFailures,
      canSendWonDeals: health.online && status.consecutiveFailures < 3,
    };
  }),

  // Send won deal notification email
  sendWonDealNotification: publicProcedure
    .input(z.object({
      dealId: z.string(),
      recipientEmail: z.string().email(),
      recipientName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // First check mail system
      const health = await checkMailEngineHealth();
      if (!health.online) {
        return {
          success: false,
          error: "Mail-System ist offline",
          dealId: input.dealId,
        };
      }

      // Get deal from HubSpot
      try {
        const dealResponse = await hubspotRequest<{
          id: string;
          properties: Record<string, string | null>;
        }>(`/crm/v3/objects/deals/${input.dealId}?properties=dealname,amount,closedate`);

        const dealValue = parseFloat(dealResponse.properties.amount || "0");
        const commission = Math.round(dealValue * 0.035 * 100) / 100; // Gold tier

        // Send email
        const result = await sendWonDealEmail({
          to: input.recipientEmail,
          dealName: dealResponse.properties.dealname || "Unbenannter Deal",
          dealValue,
          commission,
          contactName: input.recipientName || "Geschätzter Partner",
          tierName: "GOLD ELITE",
        });

        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          dealId: input.dealId,
          dealName: dealResponse.properties.dealname,
          commission,
        };
      } catch (error) {
        return {
          success: false,
          error: `HubSpot Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
          dealId: input.dealId,
        };
      }
    }),

  // ==========================================================================
  // SPAM DETECTION & EMAIL VALIDATION
  // ==========================================================================

  /**
   * Get won deals with associated contact emails for preview
   * Shows which emails would receive notifications
   */
  getWonDealsWithContacts: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;

      try {
        // Get won deals
        const deals = await hubspotRequest<HubSpotSearchResponse>(
          "/crm/v3/objects/deals/search",
          {
            method: "POST",
            body: JSON.stringify({
              limit,
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: "dealstage",
                      operator: "EQ",
                      value: "closedwon",
                    },
                  ],
                },
              ],
              sorts: [{ propertyName: "closedate", direction: "DESCENDING" }],
              properties: ["dealname", "amount", "closedate"],
            }),
          }
        );

        // Get associated contacts for each deal
        const dealsWithContacts = await Promise.all(
          deals.results.map(async (deal) => {
            try {
              // Get associated contacts
              const associations = await hubspotRequest<{
                results: Array<{ id: string; type: string }>;
              }>(`/crm/v4/objects/deals/${deal.id}/associations/contacts`);

              let contactEmail: string | null = null;
              let contactName: string | null = null;
              let emailValidation: EmailValidationResult | null = null;

              if (associations.results && associations.results.length > 0) {
                const contactId = associations.results[0].id;
                const contact = await hubspotRequest<{
                  id: string;
                  properties: Record<string, string | null>;
                }>(`/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname`);

                contactEmail = contact.properties.email || null;
                contactName = [contact.properties.firstname, contact.properties.lastname]
                  .filter(Boolean)
                  .join(" ") || null;

                if (contactEmail) {
                  emailValidation = validateEmail(contactEmail);
                }
              }

              const dealValue = parseFloat(deal.properties.amount || "0");
              const commission = Math.round(dealValue * 0.035 * 100) / 100;

              return {
                dealId: deal.id,
                dealName: deal.properties.dealname || "Unbenannt",
                dealValue,
                commission,
                closeDate: deal.properties.closedate,
                contactEmail,
                contactName,
                emailValidation,
                canSend: emailValidation ? emailValidation.recommendation !== 'block' : false,
                needsReview: emailValidation ? emailValidation.recommendation === 'review' : true,
              };
            } catch (err) {
              return {
                dealId: deal.id,
                dealName: deal.properties.dealname || "Unbenannt",
                dealValue: parseFloat(deal.properties.amount || "0"),
                commission: 0,
                closeDate: deal.properties.closedate,
                contactEmail: null,
                contactName: null,
                emailValidation: null,
                canSend: false,
                needsReview: true,
                error: "Kontakt nicht gefunden",
              };
            }
          })
        );

        // Summary
        const summary = {
          total: dealsWithContacts.length,
          withEmail: dealsWithContacts.filter(d => d.contactEmail).length,
          canSend: dealsWithContacts.filter(d => d.canSend && !d.needsReview).length,
          needsReview: dealsWithContacts.filter(d => d.needsReview && d.canSend).length,
          blocked: dealsWithContacts.filter(d => !d.canSend).length,
          totalCommission: dealsWithContacts.reduce((sum, d) => sum + d.commission, 0),
        };

        return {
          success: true,
          deals: dealsWithContacts,
          summary,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
          deals: [],
          summary: { total: 0, withEmail: 0, canSend: 0, needsReview: 0, blocked: 0, totalCommission: 0 },
        };
      }
    }),

  /**
   * Identify potential spam contacts in HubSpot
   */
  identifySpamContacts: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(100),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;

      try {
        const contacts = await hubspotRequest<HubSpotSearchResponse>(
          "/crm/v3/objects/contacts/search",
          {
            method: "POST",
            body: JSON.stringify({
              limit,
              sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
              properties: ["email", "firstname", "lastname", "company", "createdate"],
            }),
          }
        );

        const analyzed = contacts.results.map(contact => {
          const email = contact.properties.email || "";
          const validation = email ? validateEmail(email) : null;

          return {
            id: contact.id,
            email,
            name: [contact.properties.firstname, contact.properties.lastname]
              .filter(Boolean)
              .join(" ") || "Unbekannt",
            company: contact.properties.company || null,
            createdAt: contact.properties.createdate,
            validation,
            isSpam: validation?.isSpam || false,
            isSuspicious: validation?.isSuspicious || false,
            spamScore: validation?.spamScore || 0,
            issues: validation?.issues || [],
          };
        });

        // Sort by spam score (highest first)
        analyzed.sort((a, b) => b.spamScore - a.spamScore);

        const spamContacts = analyzed.filter(c => c.isSpam);
        const suspiciousContacts = analyzed.filter(c => c.isSuspicious && !c.isSpam);
        const safeContacts = analyzed.filter(c => !c.isSpam && !c.isSuspicious);

        return {
          success: true,
          spam: spamContacts,
          suspicious: suspiciousContacts,
          safe: safeContacts,
          summary: {
            total: analyzed.length,
            spam: spamContacts.length,
            suspicious: suspiciousContacts.length,
            safe: safeContacts.length,
            spamPercentage: Math.round((spamContacts.length / analyzed.length) * 100),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
          spam: [],
          suspicious: [],
          safe: [],
          summary: { total: 0, spam: 0, suspicious: 0, safe: 0, spamPercentage: 0 },
        };
      }
    }),

  /**
   * Validate a single email address
   */
  validateEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .query(({ input }) => {
      return validateEmail(input.email);
    }),

  /**
   * Send won deal with validation and optional email override
   * SAFE VERSION - blocks spam automatically
   */
  sendWonDealSafe: publicProcedure
    .input(z.object({
      dealId: z.string(),
      overrideEmail: z.string().email().optional(),
      overrideName: z.string().optional(),
      skipValidation: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      // Check mail system
      const health = await checkMailEngineHealth();
      if (!health.online) {
        return {
          success: false,
          error: "Mail-System ist offline",
          dealId: input.dealId,
        };
      }

      try {
        // Get deal
        const deal = await hubspotRequest<{
          id: string;
          properties: Record<string, string | null>;
        }>(`/crm/v3/objects/deals/${input.dealId}?properties=dealname,amount,closedate`);

        let recipientEmail = input.overrideEmail;
        let recipientName = input.overrideName || "Geschätzter Partner";

        // If no override, get from associated contact
        if (!recipientEmail) {
          const associations = await hubspotRequest<{
            results: Array<{ id: string; type: string }>;
          }>(`/crm/v4/objects/deals/${input.dealId}/associations/contacts`);

          if (!associations.results || associations.results.length === 0) {
            return {
              success: false,
              error: "Kein Kontakt mit diesem Deal verknüpft. Bitte E-Mail manuell angeben.",
              dealId: input.dealId,
            };
          }

          const contactId = associations.results[0].id;
          const contact = await hubspotRequest<{
            id: string;
            properties: Record<string, string | null>;
          }>(`/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname`);

          recipientEmail = contact.properties.email || undefined;
          recipientName = [contact.properties.firstname, contact.properties.lastname]
            .filter(Boolean)
            .join(" ") || "Geschätzter Partner";
        }

        if (!recipientEmail) {
          return {
            success: false,
            error: "Keine E-Mail-Adresse gefunden. Bitte manuell angeben.",
            dealId: input.dealId,
          };
        }

        // Validate email unless skipped
        if (!input.skipValidation) {
          const validation = validateEmail(recipientEmail);

          if (validation.isSpam) {
            return {
              success: false,
              error: `Spam-E-Mail blockiert: ${recipientEmail}`,
              validation,
              dealId: input.dealId,
              suggestion: "Verwenden Sie 'overrideEmail' um eine andere Adresse anzugeben.",
            };
          }

          if (validation.isSuspicious) {
            return {
              success: false,
              error: `Verdächtige E-Mail erkannt: ${recipientEmail}`,
              validation,
              dealId: input.dealId,
              suggestion: "Prüfen Sie die Adresse und verwenden Sie 'skipValidation: true' um trotzdem zu senden.",
            };
          }
        }

        // Calculate commission
        const dealValue = parseFloat(deal.properties.amount || "0");
        const commission = Math.round(dealValue * 0.035 * 100) / 100;

        // Send email
        const result = await sendWonDealEmail({
          to: recipientEmail,
          dealName: deal.properties.dealname || "Unbenannter Deal",
          dealValue,
          commission,
          contactName: recipientName,
          tierName: "GOLD ELITE",
        });

        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          dealId: input.dealId,
          dealName: deal.properties.dealname,
          recipientEmail,
          recipientName,
          commission,
          dealValue,
        };
      } catch (error) {
        return {
          success: false,
          error: `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
          dealId: input.dealId,
        };
      }
    }),

  /**
   * Bulk send won deal notifications (only to validated emails)
   */
  bulkSendWonDeals: publicProcedure
    .input(z.object({
      dealIds: z.array(z.string()).min(1).max(20),
      dryRun: z.boolean().default(true), // Safety: default to dry run
    }))
    .mutation(async ({ input }) => {
      const results: Array<{
        dealId: string;
        dealName: string;
        email: string | null;
        status: 'sent' | 'blocked' | 'skipped' | 'error';
        error?: string;
        commission?: number;
      }> = [];

      // Check mail system first
      const health = await checkMailEngineHealth();
      if (!health.online) {
        return {
          success: false,
          error: "Mail-System ist offline",
          results: [],
          summary: { sent: 0, blocked: 0, skipped: 0, errors: 0 },
        };
      }

      for (const dealId of input.dealIds) {
        try {
          // Get deal
          const deal = await hubspotRequest<{
            id: string;
            properties: Record<string, string | null>;
          }>(`/crm/v3/objects/deals/${dealId}?properties=dealname,amount`);

          // Get associated contact
          const associations = await hubspotRequest<{
            results: Array<{ id: string }>;
          }>(`/crm/v4/objects/deals/${dealId}/associations/contacts`);

          if (!associations.results || associations.results.length === 0) {
            results.push({
              dealId,
              dealName: deal.properties.dealname || "Unbekannt",
              email: null,
              status: 'skipped',
              error: 'Kein Kontakt verknüpft',
            });
            continue;
          }

          const contactId = associations.results[0].id;
          const contact = await hubspotRequest<{
            id: string;
            properties: Record<string, string | null>;
          }>(`/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname`);

          const email = contact.properties.email;
          if (!email) {
            results.push({
              dealId,
              dealName: deal.properties.dealname || "Unbekannt",
              email: null,
              status: 'skipped',
              error: 'Keine E-Mail beim Kontakt',
            });
            continue;
          }

          // Validate email
          const validation = validateEmail(email);
          if (validation.isSpam) {
            results.push({
              dealId,
              dealName: deal.properties.dealname || "Unbekannt",
              email,
              status: 'blocked',
              error: `Spam: ${validation.issues.join(', ')}`,
            });
            continue;
          }

          const dealValue = parseFloat(deal.properties.amount || "0");
          const commission = Math.round(dealValue * 0.035 * 100) / 100;
          const contactName = [contact.properties.firstname, contact.properties.lastname]
            .filter(Boolean)
            .join(" ") || "Geschätzter Partner";

          if (input.dryRun) {
            results.push({
              dealId,
              dealName: deal.properties.dealname || "Unbekannt",
              email,
              status: validation.isSuspicious ? 'skipped' : 'sent',
              commission,
              error: validation.isSuspicious ? `Verdächtig: ${validation.issues.join(', ')}` : undefined,
            });
          } else {
            // Actually send
            const sendResult = await sendWonDealEmail({
              to: email,
              dealName: deal.properties.dealname || "Unbenannter Deal",
              dealValue,
              commission,
              contactName,
              tierName: "GOLD ELITE",
            });

            results.push({
              dealId,
              dealName: deal.properties.dealname || "Unbekannt",
              email,
              status: sendResult.success ? 'sent' : 'error',
              error: sendResult.error,
              commission,
            });
          }
        } catch (error) {
          results.push({
            dealId,
            dealName: "Fehler",
            email: null,
            status: 'error',
            error: error instanceof Error ? error.message : "Unbekannt",
          });
        }
      }

      const summary = {
        sent: results.filter(r => r.status === 'sent').length,
        blocked: results.filter(r => r.status === 'blocked').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        errors: results.filter(r => r.status === 'error').length,
        totalCommission: results
          .filter(r => r.status === 'sent' && r.commission)
          .reduce((sum, r) => sum + (r.commission || 0), 0),
      };

      return {
        success: true,
        dryRun: input.dryRun,
        results,
        summary,
      };
    }),

  // ===========================================================================
  // DEAL CONTACTS - Lokale Datenbank für korrekte E-Mails
  // ===========================================================================

  /**
   * E-Mail-Adresse für einen Deal speichern/aktualisieren
   */
  setDealContact: publicProcedure
    .input(
      z.object({
        hubspotDealId: z.string(),
        dealName: z.string().optional(),
        dealValue: z.number().optional(),
        contactEmail: z.string().email(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactCompany: z.string().optional(),
        notes: z.string().optional(),
        source: z.enum(["manual", "import", "hubspot_override"]).default("manual"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Validate email first
        const validation = validateEmail(input.contactEmail);
        if (validation.isSpam) {
          return {
            success: false,
            error: `E-Mail ist Spam: ${validation.issues.join(", ")}`,
          };
        }

        // Check if deal contact already exists
        const existing = await db
          .select()
          .from(dealContacts)
          .where(eq(dealContacts.hubspotDealId, input.hubspotDealId))
          .limit(1);

        if (existing.length > 0) {
          // Update existing
          await db
            .update(dealContacts)
            .set({
              dealName: input.dealName,
              dealValue: input.dealValue?.toString(),
              contactEmail: input.contactEmail,
              contactName: input.contactName,
              contactPhone: input.contactPhone,
              contactCompany: input.contactCompany,
              notes: input.notes,
              source: input.source,
              emailVerified: false, // Reset verification on update
            })
            .where(eq(dealContacts.hubspotDealId, input.hubspotDealId));

          return {
            success: true,
            action: "updated",
            dealId: input.hubspotDealId,
            email: input.contactEmail,
            validation,
          };
        } else {
          // Insert new
          const [newContact] = await db
            .insert(dealContacts)
            .values({
              hubspotDealId: input.hubspotDealId,
              dealName: input.dealName,
              dealValue: input.dealValue?.toString(),
              contactEmail: input.contactEmail,
              contactName: input.contactName,
              contactPhone: input.contactPhone,
              contactCompany: input.contactCompany,
              notes: input.notes,
              source: input.source,
            })
            .returning();

          return {
            success: true,
            action: "created",
            dealId: input.hubspotDealId,
            email: input.contactEmail,
            id: newContact.id,
            validation,
          };
        }
      } catch (error) {
        console.error("[Deal Contacts] Set error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Alle Deal-Kontakte abrufen
   */
  getDealContacts: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        onlyUnsent: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const limit = input?.limit ?? 50;

        let query = db
          .select()
          .from(dealContacts)
          .orderBy(desc(dealContacts.createdAt))
          .limit(limit);

        const contacts = await query;

        // Filter unsent if requested
        const filtered = input?.onlyUnsent
          ? contacts.filter((c) => !c.emailSentAt)
          : contacts;

        return {
          success: true,
          contacts: filtered.map((c) => ({
            id: c.id,
            hubspotDealId: c.hubspotDealId,
            dealName: c.dealName,
            dealValue: c.dealValue ? parseFloat(c.dealValue) : null,
            contactEmail: c.contactEmail,
            contactName: c.contactName,
            contactPhone: c.contactPhone,
            contactCompany: c.contactCompany,
            emailVerified: c.emailVerified,
            emailSentAt: c.emailSentAt,
            emailSentCount: c.emailSentCount,
            lastSendStatus: c.lastSendStatus,
            lastSendError: c.lastSendError,
            source: c.source,
            notes: c.notes,
            createdAt: c.createdAt,
          })),
          total: filtered.length,
          summary: {
            total: filtered.length,
            sent: filtered.filter((c) => c.lastSendStatus === "sent").length,
            pending: filtered.filter((c) => !c.emailSentAt).length,
            failed: filtered.filter((c) => c.lastSendStatus === "failed").length,
          },
        };
      } catch (error) {
        console.error("[Deal Contacts] Get error:", error);
        return {
          success: false,
          error: String(error),
          contacts: [],
          total: 0,
        };
      }
    }),

  /**
   * E-Mail für einen Deal aus lokaler DB abrufen
   */
  getDealContactEmail: publicProcedure
    .input(z.object({ hubspotDealId: z.string() }))
    .query(async ({ input }) => {
      try {
        const [contact] = await db
          .select()
          .from(dealContacts)
          .where(eq(dealContacts.hubspotDealId, input.hubspotDealId))
          .limit(1);

        if (!contact) {
          return {
            success: true,
            found: false,
            email: null,
          };
        }

        return {
          success: true,
          found: true,
          email: contact.contactEmail,
          name: contact.contactName,
          company: contact.contactCompany,
          verified: contact.emailVerified,
          lastSent: contact.emailSentAt,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
          found: false,
          email: null,
        };
      }
    }),

  /**
   * Deal-Kontakt löschen
   */
  deleteDealContact: publicProcedure
    .input(z.object({ hubspotDealId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const result = await db
          .delete(dealContacts)
          .where(eq(dealContacts.hubspotDealId, input.hubspotDealId))
          .returning();

        return {
          success: true,
          deleted: result.length > 0,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Bulk-Import von Deal-Kontakten
   */
  importDealContacts: publicProcedure
    .input(
      z.object({
        contacts: z.array(
          z.object({
            hubspotDealId: z.string(),
            dealName: z.string().optional(),
            dealValue: z.number().optional(),
            contactEmail: z.string().email(),
            contactName: z.string().optional(),
            contactCompany: z.string().optional(),
          })
        ),
        skipDuplicates: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const results: Array<{
        dealId: string;
        email: string;
        status: "created" | "updated" | "skipped" | "spam" | "error";
        error?: string;
      }> = [];

      for (const contact of input.contacts) {
        try {
          // Validate email
          const validation = validateEmail(contact.contactEmail);
          if (validation.isSpam) {
            results.push({
              dealId: contact.hubspotDealId,
              email: contact.contactEmail,
              status: "spam",
              error: validation.issues.join(", "),
            });
            continue;
          }

          // Check existing
          const existing = await db
            .select()
            .from(dealContacts)
            .where(eq(dealContacts.hubspotDealId, contact.hubspotDealId))
            .limit(1);

          if (existing.length > 0) {
            if (input.skipDuplicates) {
              results.push({
                dealId: contact.hubspotDealId,
                email: contact.contactEmail,
                status: "skipped",
              });
            } else {
              // Update
              await db
                .update(dealContacts)
                .set({
                  dealName: contact.dealName,
                  dealValue: contact.dealValue?.toString(),
                  contactEmail: contact.contactEmail,
                  contactName: contact.contactName,
                  contactCompany: contact.contactCompany,
                  source: "import",
                })
                .where(eq(dealContacts.hubspotDealId, contact.hubspotDealId));

              results.push({
                dealId: contact.hubspotDealId,
                email: contact.contactEmail,
                status: "updated",
              });
            }
          } else {
            // Insert
            await db.insert(dealContacts).values({
              hubspotDealId: contact.hubspotDealId,
              dealName: contact.dealName,
              dealValue: contact.dealValue?.toString(),
              contactEmail: contact.contactEmail,
              contactName: contact.contactName,
              contactCompany: contact.contactCompany,
              source: "import",
            });

            results.push({
              dealId: contact.hubspotDealId,
              email: contact.contactEmail,
              status: "created",
            });
          }
        } catch (error) {
          results.push({
            dealId: contact.hubspotDealId,
            email: contact.contactEmail,
            status: "error",
            error: error instanceof Error ? error.message : "Unbekannt",
          });
        }
      }

      return {
        success: true,
        results,
        summary: {
          total: results.length,
          created: results.filter((r) => r.status === "created").length,
          updated: results.filter((r) => r.status === "updated").length,
          skipped: results.filter((r) => r.status === "skipped").length,
          spam: results.filter((r) => r.status === "spam").length,
          errors: results.filter((r) => r.status === "error").length,
        },
      };
    }),

  /**
   * Won Deal E-Mail senden - nutzt lokale DB zuerst
   */
  sendWonDealFromDB: publicProcedure
    .input(
      z.object({
        hubspotDealId: z.string(),
        forceResend: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get contact from local DB
        const [contact] = await db
          .select()
          .from(dealContacts)
          .where(eq(dealContacts.hubspotDealId, input.hubspotDealId))
          .limit(1);

        if (!contact) {
          return {
            success: false,
            error: "Kein Kontakt in lokaler DB gefunden. Bitte erst E-Mail hinzufügen.",
          };
        }

        // Check if already sent
        if (contact.emailSentAt && !input.forceResend) {
          return {
            success: false,
            error: `E-Mail bereits gesendet am ${contact.emailSentAt.toLocaleDateString("de-DE")}`,
            alreadySent: true,
            lastSentAt: contact.emailSentAt,
          };
        }

        // Get deal info from HubSpot
        const deal = await hubspotRequest<{
          id: string;
          properties: Record<string, string | null>;
        }>(
          `/crm/v3/objects/deals/${input.hubspotDealId}?properties=dealname,amount,closedate`
        );

        const dealValue = parseFloat(deal.properties.amount || "0");
        const commission = Math.round(dealValue * 0.035 * 100) / 100;

        // Send email
        const sendResult = await sendWonDealEmail({
          to: contact.contactEmail,
          dealName: contact.dealName || deal.properties.dealname || "Deal",
          dealValue,
          commission,
          contactName: contact.contactName || "Geschätzter Partner",
          tierName: "GOLD ELITE",
        });

        // Update database
        if (sendResult.success) {
          await db
            .update(dealContacts)
            .set({
              emailSentAt: new Date(),
              emailSentCount: (contact.emailSentCount || 0) + 1,
              lastSendStatus: "sent",
              lastSendError: null,
            })
            .where(eq(dealContacts.hubspotDealId, input.hubspotDealId));

          return {
            success: true,
            email: contact.contactEmail,
            dealName: contact.dealName,
            commission,
            messageId: sendResult.messageId,
          };
        } else {
          await db
            .update(dealContacts)
            .set({
              lastSendStatus: "failed",
              lastSendError: sendResult.error,
            })
            .where(eq(dealContacts.hubspotDealId, input.hubspotDealId));

          return {
            success: false,
            error: sendResult.error,
          };
        }
      } catch (error) {
        console.error("[Send Won Deal] Error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Alle ungesendeten Deals aus lokaler DB senden
   */
  sendAllPendingDeals: publicProcedure
    .input(
      z.object({
        dryRun: z.boolean().default(true),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get pending contacts
        const pendingContacts = await db
          .select()
          .from(dealContacts)
          .where(eq(dealContacts.lastSendStatus, null as unknown as string))
          .limit(input.limit);

        if (pendingContacts.length === 0) {
          // Also check for those with no emailSentAt
          const unsentContacts = await db
            .select()
            .from(dealContacts)
            .limit(input.limit);

          const filtered = unsentContacts.filter((c) => !c.emailSentAt);

          if (filtered.length === 0) {
            return {
              success: true,
              message: "Keine ausstehenden E-Mails gefunden",
              results: [],
              summary: { total: 0, sent: 0, failed: 0 },
            };
          }

          // Use filtered list
          pendingContacts.push(...filtered.slice(0, input.limit));
        }

        const results: Array<{
          dealId: string | null;
          dealName: string | null;
          email: string;
          status: "sent" | "would_send" | "failed";
          commission?: number;
          error?: string;
        }> = [];

        for (const contact of pendingContacts) {
          if (input.dryRun) {
            const dealValue = contact.dealValue ? parseFloat(contact.dealValue) : 0;
            results.push({
              dealId: contact.hubspotDealId,
              dealName: contact.dealName,
              email: contact.contactEmail,
              status: "would_send",
              commission: Math.round(dealValue * 0.035 * 100) / 100,
            });
          } else {
            try {
              // Get deal value from HubSpot if not in DB
              let dealValue = contact.dealValue ? parseFloat(contact.dealValue) : 0;

              if (dealValue === 0) {
                const deal = await hubspotRequest<{
                  properties: Record<string, string | null>;
                }>(
                  `/crm/v3/objects/deals/${contact.hubspotDealId}?properties=dealname,amount`
                );
                dealValue = parseFloat(deal.properties.amount || "0");
              }

              const commission = Math.round(dealValue * 0.035 * 100) / 100;

              const sendResult = await sendWonDealEmail({
                to: contact.contactEmail,
                dealName: contact.dealName || "Deal",
                dealValue,
                commission,
                contactName: contact.contactName || "Geschätzter Partner",
                tierName: "GOLD ELITE",
              });

              if (sendResult.success) {
                await db
                  .update(dealContacts)
                  .set({
                    emailSentAt: new Date(),
                    emailSentCount: (contact.emailSentCount || 0) + 1,
                    lastSendStatus: "sent",
                    lastSendError: null,
                  })
                  .where(eq(dealContacts.id, contact.id));

                results.push({
                  dealId: contact.hubspotDealId,
                  dealName: contact.dealName,
                  email: contact.contactEmail,
                  status: "sent",
                  commission,
                });
              } else {
                await db
                  .update(dealContacts)
                  .set({
                    lastSendStatus: "failed",
                    lastSendError: sendResult.error,
                  })
                  .where(eq(dealContacts.id, contact.id));

                results.push({
                  dealId: contact.hubspotDealId,
                  dealName: contact.dealName,
                  email: contact.contactEmail,
                  status: "failed",
                  error: sendResult.error,
                });
              }
            } catch (error) {
              results.push({
                dealId: contact.hubspotDealId,
                dealName: contact.dealName,
                email: contact.contactEmail,
                status: "failed",
                error: error instanceof Error ? error.message : "Unbekannt",
              });
            }
          }
        }

        return {
          success: true,
          dryRun: input.dryRun,
          results,
          summary: {
            total: results.length,
            sent: results.filter((r) => r.status === "sent").length,
            wouldSend: results.filter((r) => r.status === "would_send").length,
            failed: results.filter((r) => r.status === "failed").length,
            totalCommission: results
              .filter((r) => r.commission)
              .reduce((sum, r) => sum + (r.commission || 0), 0),
          },
        };
      } catch (error) {
        console.error("[Send All Pending] Error:", error);
        return {
          success: false,
          error: String(error),
          results: [],
        };
      }
    }),

  // ===========================================================================
  // COMMISSION TRACKING (2.5% of deal revenue)
  // ===========================================================================

  /**
   * Calculate commission for a Bauherren-Pass based on deal value
   * Uses the standard 2.5% commission rate
   */
  calculateCommission: publicProcedure
    .input(
      z.object({
        bauherrenPassId: z.string().uuid(),
        revenue: z.number().positive(),
        isEstimate: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Calculate 2.5% commission
        const commissionAmount = Math.round(input.revenue * COMMISSION_RATE * 100) / 100;

        // Get current record
        const [existing] = await db
          .select()
          .from(bauherrenPaesse)
          .where(eq(bauherrenPaesse.id, input.bauherrenPassId))
          .limit(1);

        if (!existing) {
          return {
            success: false,
            error: "Bauherren-Pass nicht gefunden",
          };
        }

        // Update the record with commission data
        const updateData = input.isEstimate
          ? {
              estimatedRevenue: input.revenue.toString(),
              commissionRate: COMMISSION_RATE.toString(),
              commissionAmount: commissionAmount.toString(),
              commissionStatus: "pending" as const,
              updatedAt: new Date(),
            }
          : {
              actualRevenue: input.revenue.toString(),
              commissionRate: COMMISSION_RATE.toString(),
              commissionAmount: commissionAmount.toString(),
              commissionStatus: "qualified" as const,
              updatedAt: new Date(),
            };

        await db
          .update(bauherrenPaesse)
          .set(updateData)
          .where(eq(bauherrenPaesse.id, input.bauherrenPassId));

        return {
          success: true,
          bauherrenPassId: input.bauherrenPassId,
          revenue: input.revenue,
          commissionRate: COMMISSION_RATE,
          commissionRatePercent: `${COMMISSION_RATE * 100}%`,
          commissionAmount,
          isEstimate: input.isEstimate,
          status: input.isEstimate ? "pending" : "qualified",
        };
      } catch (error) {
        console.error("[Calculate Commission] Error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Update commission status (pending -> qualified -> approved -> paid)
   */
  updateCommissionStatus: publicProcedure
    .input(
      z.object({
        bauherrenPassId: z.string().uuid(),
        status: z.enum(["pending", "qualified", "approved", "paid"]),
        payoutMethod: z.enum(["stripe", "sepa"]).optional(),
        payoutReference: z.string().optional(),
        actualRevenue: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get current record
        const [existing] = await db
          .select()
          .from(bauherrenPaesse)
          .where(eq(bauherrenPaesse.id, input.bauherrenPassId))
          .limit(1);

        if (!existing) {
          return {
            success: false,
            error: "Bauherren-Pass nicht gefunden",
          };
        }

        // Validate status transition
        const validTransitions: Record<string, string[]> = {
          pending: ["qualified"],
          qualified: ["approved", "pending"],
          approved: ["paid", "qualified"],
          paid: [], // Final state
        };

        const currentStatus = existing.commissionStatus || "pending";
        if (!validTransitions[currentStatus]?.includes(input.status) && input.status !== currentStatus) {
          return {
            success: false,
            error: `Ungültiger Statusübergang: ${currentStatus} -> ${input.status}`,
            currentStatus,
            allowedTransitions: validTransitions[currentStatus],
          };
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          commissionStatus: input.status,
          updatedAt: new Date(),
        };

        // If actual revenue provided, recalculate commission
        if (input.actualRevenue) {
          const commissionAmount = Math.round(input.actualRevenue * COMMISSION_RATE * 100) / 100;
          updateData.actualRevenue = input.actualRevenue.toString();
          updateData.commissionAmount = commissionAmount.toString();
        }

        // If marking as paid, record payout details
        if (input.status === "paid") {
          updateData.commissionPaidAt = new Date();
          if (input.payoutMethod) {
            updateData.payoutMethod = input.payoutMethod;
          }
          if (input.payoutReference) {
            updateData.payoutReference = input.payoutReference;
          }
        }

        await db
          .update(bauherrenPaesse)
          .set(updateData)
          .where(eq(bauherrenPaesse.id, input.bauherrenPassId));

        // Calculate final commission amount for response
        const finalRevenue = input.actualRevenue ||
          (existing.actualRevenue ? parseFloat(existing.actualRevenue) : null) ||
          (existing.estimatedRevenue ? parseFloat(existing.estimatedRevenue) : 0);
        const finalCommission = Math.round(finalRevenue * COMMISSION_RATE * 100) / 100;

        return {
          success: true,
          bauherrenPassId: input.bauherrenPassId,
          previousStatus: currentStatus,
          newStatus: input.status,
          commissionAmount: finalCommission,
          payoutMethod: input.payoutMethod,
          payoutReference: input.payoutReference,
          paidAt: input.status === "paid" ? new Date() : null,
        };
      } catch (error) {
        console.error("[Update Commission Status] Error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Get commission summary (total pending, qualified, approved, paid)
   */
  getCommissionSummary: publicProcedure
    .input(
      z.object({
        organizationId: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        // Build base query
        const baseConditions = input?.organizationId
          ? and(
              eq(bauherrenPaesse.organizationId, input.organizationId),
              isNotNull(bauherrenPaesse.commissionAmount)
            )
          : isNotNull(bauherrenPaesse.commissionAmount);

        // Get all records with commission data
        const records = await db
          .select({
            id: bauherrenPaesse.id,
            passNummer: bauherrenPaesse.passNummer,
            bauvorhabenBezeichnung: bauherrenPaesse.bauvorhabenBezeichnung,
            estimatedRevenue: bauherrenPaesse.estimatedRevenue,
            actualRevenue: bauherrenPaesse.actualRevenue,
            commissionRate: bauherrenPaesse.commissionRate,
            commissionAmount: bauherrenPaesse.commissionAmount,
            commissionStatus: bauherrenPaesse.commissionStatus,
            commissionPaidAt: bauherrenPaesse.commissionPaidAt,
            payoutMethod: bauherrenPaesse.payoutMethod,
            payoutReference: bauherrenPaesse.payoutReference,
          })
          .from(bauherrenPaesse)
          .where(baseConditions);

        // Calculate summary by status
        const summary = {
          pending: { count: 0, totalRevenue: 0, totalCommission: 0 },
          qualified: { count: 0, totalRevenue: 0, totalCommission: 0 },
          approved: { count: 0, totalRevenue: 0, totalCommission: 0 },
          paid: { count: 0, totalRevenue: 0, totalCommission: 0 },
        };

        const commissionDetails: Array<{
          id: string;
          passNummer: string;
          bezeichnung: string | null;
          revenue: number;
          commissionAmount: number;
          status: string;
          paidAt: Date | null;
        }> = [];

        for (const record of records) {
          const status = record.commissionStatus || "pending";
          const revenue = record.actualRevenue
            ? parseFloat(record.actualRevenue)
            : record.estimatedRevenue
              ? parseFloat(record.estimatedRevenue)
              : 0;
          const commission = record.commissionAmount
            ? parseFloat(record.commissionAmount)
            : 0;

          if (status in summary) {
            summary[status as keyof typeof summary].count++;
            summary[status as keyof typeof summary].totalRevenue += revenue;
            summary[status as keyof typeof summary].totalCommission += commission;
          }

          commissionDetails.push({
            id: record.id,
            passNummer: record.passNummer,
            bezeichnung: record.bauvorhabenBezeichnung,
            revenue,
            commissionAmount: commission,
            status,
            paidAt: record.commissionPaidAt,
          });
        }

        // Calculate totals
        const totals = {
          totalRecords: records.length,
          totalRevenue: Object.values(summary).reduce((sum, s) => sum + s.totalRevenue, 0),
          totalCommission: Object.values(summary).reduce((sum, s) => sum + s.totalCommission, 0),
          totalPending: summary.pending.totalCommission + summary.qualified.totalCommission,
          totalApproved: summary.approved.totalCommission,
          totalPaid: summary.paid.totalCommission,
        };

        // Round all amounts
        for (const key of Object.keys(summary) as Array<keyof typeof summary>) {
          summary[key].totalRevenue = Math.round(summary[key].totalRevenue * 100) / 100;
          summary[key].totalCommission = Math.round(summary[key].totalCommission * 100) / 100;
        }
        totals.totalRevenue = Math.round(totals.totalRevenue * 100) / 100;
        totals.totalCommission = Math.round(totals.totalCommission * 100) / 100;
        totals.totalPending = Math.round(totals.totalPending * 100) / 100;
        totals.totalApproved = Math.round(totals.totalApproved * 100) / 100;
        totals.totalPaid = Math.round(totals.totalPaid * 100) / 100;

        return {
          success: true,
          commissionRate: COMMISSION_RATE,
          commissionRatePercent: `${COMMISSION_RATE * 100}%`,
          summary,
          totals,
          details: commissionDetails.sort((a, b) => b.commissionAmount - a.commissionAmount),
        };
      } catch (error) {
        console.error("[Get Commission Summary] Error:", error);
        return {
          success: false,
          error: String(error),
          summary: null,
          totals: null,
          details: [],
        };
      }
    }),

  /**
   * Bulk calculate commissions for multiple Bauherren-Pass records
   */
  bulkCalculateCommissions: publicProcedure
    .input(
      z.object({
        bauherrenPassIds: z.array(z.string().uuid()).min(1).max(100),
        useGesamtbaukosten: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const results: Array<{
        id: string;
        passNummer: string;
        revenue: number;
        commission: number;
        status: "calculated" | "skipped" | "error";
        error?: string;
      }> = [];

      for (const id of input.bauherrenPassIds) {
        try {
          const [record] = await db
            .select()
            .from(bauherrenPaesse)
            .where(eq(bauherrenPaesse.id, id))
            .limit(1);

          if (!record) {
            results.push({
              id,
              passNummer: "N/A",
              revenue: 0,
              commission: 0,
              status: "error",
              error: "Nicht gefunden",
            });
            continue;
          }

          // Get revenue from gesamtbaukosten or finanzierungssumme
          let revenue = 0;
          if (input.useGesamtbaukosten && record.gesamtbaukosten) {
            revenue = parseFloat(record.gesamtbaukosten);
          } else if (record.finanzierungssumme) {
            revenue = parseFloat(record.finanzierungssumme);
          }

          if (revenue <= 0) {
            results.push({
              id,
              passNummer: record.passNummer,
              revenue: 0,
              commission: 0,
              status: "skipped",
              error: "Keine Umsatzdaten vorhanden",
            });
            continue;
          }

          const commission = Math.round(revenue * COMMISSION_RATE * 100) / 100;

          await db
            .update(bauherrenPaesse)
            .set({
              estimatedRevenue: revenue.toString(),
              commissionRate: COMMISSION_RATE.toString(),
              commissionAmount: commission.toString(),
              commissionStatus: "pending",
              updatedAt: new Date(),
            })
            .where(eq(bauherrenPaesse.id, id));

          results.push({
            id,
            passNummer: record.passNummer,
            revenue,
            commission,
            status: "calculated",
          });
        } catch (error) {
          results.push({
            id,
            passNummer: "N/A",
            revenue: 0,
            commission: 0,
            status: "error",
            error: error instanceof Error ? error.message : "Unbekannt",
          });
        }
      }

      const summary = {
        total: results.length,
        calculated: results.filter((r) => r.status === "calculated").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        errors: results.filter((r) => r.status === "error").length,
        totalRevenue: results
          .filter((r) => r.status === "calculated")
          .reduce((sum, r) => sum + r.revenue, 0),
        totalCommission: results
          .filter((r) => r.status === "calculated")
          .reduce((sum, r) => sum + r.commission, 0),
      };

      return {
        success: true,
        commissionRate: COMMISSION_RATE,
        commissionRatePercent: `${COMMISSION_RATE * 100}%`,
        results,
        summary,
      };
    }),
});
