import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

// =============================================================================
// HUBSPOT STATS ROUTER
// Direct HubSpot API queries for SciFi Dashboard real-time stats
// =============================================================================

const HUBSPOT_API_BASE = "https://api.hubapi.com";

interface HubSpotSearchResponse {
  total: number;
  results: Array<{
    id: string;
    properties: Record<string, string | null>;
  }>;
}

interface PipelineStage {
  id: string;
  label: string;
  displayOrder: number;
}

interface Pipeline {
  id: string;
  label: string;
  stages: PipelineStage[];
}

// Rate limiting helper - HubSpot has 10 requests/second limit
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

export const hubspotStatsRouter = createTRPCRouter({
  // ===========================================================================
  // DASHBOARD STATS
  // ===========================================================================

  /**
   * Get overview stats for SciFi dashboard
   * Returns: total deals, total value, deals by stage, contacts count
   */
  getDashboardStats: publicProcedure.query(async () => {
    try {
      // Get total deals count and value
      const dealsSearch = await hubspotRequest<HubSpotSearchResponse>(
        "/crm/v3/objects/deals/search",
        {
          method: "POST",
          body: JSON.stringify({
            limit: 1,
            filterGroups: [],
            properties: ["amount"],
          }),
        }
      );

      await delay(250); // Rate limit protection

      // Get contacts count
      const contactsSearch = await hubspotRequest<HubSpotSearchResponse>(
        "/crm/v3/objects/contacts/search",
        {
          method: "POST",
          body: JSON.stringify({
            limit: 1,
            filterGroups: [],
          }),
        }
      );

      await delay(250); // Rate limit protection

      // Get pipelines and stages
      const pipelines = await hubspotRequest<{ results: Pipeline[] }>(
        "/crm/v3/pipelines/deals"
      );

      await delay(250); // Rate limit protection

      // Get deals by stage (sample to calculate distribution)
      const dealsByStage: Record<string, { count: number; value: number }> = {};

      if (pipelines.results.length > 0) {
        const defaultPipeline = pipelines.results[0];

        for (const stage of defaultPipeline.stages) {
          const stageDeals = await hubspotRequest<HubSpotSearchResponse>(
            "/crm/v3/objects/deals/search",
            {
              method: "POST",
              body: JSON.stringify({
                limit: 1,
                filterGroups: [
                  {
                    filters: [
                      {
                        propertyName: "dealstage",
                        operator: "EQ",
                        value: stage.id,
                      },
                    ],
                  },
                ],
                properties: ["amount"],
              }),
            }
          );

          dealsByStage[stage.id] = {
            count: stageDeals.total,
            value: 0, // Would need aggregation API for accurate values
          };

          await delay(250); // Rate limit protection between stage queries
        }
      }

      // Calculate total value from a sample (HubSpot doesn't have native aggregation)
      // For accurate totals, you'd need to paginate through all deals
      const sampleDeals = await hubspotRequest<HubSpotSearchResponse>(
        "/crm/v3/objects/deals/search",
        {
          method: "POST",
          body: JSON.stringify({
            limit: 100,
            filterGroups: [],
            properties: ["amount", "dealstage"],
          }),
        }
      );

      const sampleValue = sampleDeals.results.reduce((sum, deal) => {
        const amount = parseFloat(deal.properties.amount || "0");
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      // Estimate total value based on sample
      const avgDealValue = sampleDeals.results.length > 0
        ? sampleValue / sampleDeals.results.length
        : 0;
      const estimatedTotalValue = avgDealValue * dealsSearch.total;

      return {
        success: true,
        data: {
          totalDeals: dealsSearch.total,
          totalContacts: contactsSearch.total,
          totalValue: estimatedTotalValue,
          avgDealValue,
          dealsByStage,
          pipelines: pipelines.results.map(p => ({
            id: p.id,
            label: p.label,
            stages: p.stages.map(s => ({
              id: s.id,
              label: s.label,
              order: s.displayOrder,
            })),
          })),
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("[HubSpot Stats] Error:", error);
      return {
        success: false,
        error: String(error),
        data: null,
      };
    }
  }),

  /**
   * Get recent deals for activity feed
   */
  getRecentDeals: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      try {
        const deals = await hubspotRequest<HubSpotSearchResponse>(
          "/crm/v3/objects/deals/search",
          {
            method: "POST",
            body: JSON.stringify({
              limit: input.limit,
              sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
              properties: [
                "dealname",
                "amount",
                "dealstage",
                "pipeline",
                "closedate",
                "createdate",
                "hs_lastmodifieddate",
              ],
            }),
          }
        );

        return {
          success: true,
          data: deals.results.map(deal => ({
            id: deal.id,
            name: deal.properties.dealname || "Untitled Deal",
            amount: parseFloat(deal.properties.amount || "0"),
            stage: deal.properties.dealstage,
            pipeline: deal.properties.pipeline,
            closeDate: deal.properties.closedate,
            createdAt: deal.properties.createdate,
            updatedAt: deal.properties.hs_lastmodifieddate,
          })),
        };
      } catch (error) {
        console.error("[HubSpot Stats] Recent deals error:", error);
        return {
          success: false,
          error: String(error),
          data: [],
        };
      }
    }),

  /**
   * Get recent contacts for activity feed
   */
  getRecentContacts: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      try {
        const contacts = await hubspotRequest<HubSpotSearchResponse>(
          "/crm/v3/objects/contacts/search",
          {
            method: "POST",
            body: JSON.stringify({
              limit: input.limit,
              sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
              properties: [
                "email",
                "firstname",
                "lastname",
                "phone",
                "company",
                "createdate",
                "lastmodifieddate",
                "hs_lead_status",
                "lifecyclestage",
              ],
            }),
          }
        );

        return {
          success: true,
          data: contacts.results.map(contact => ({
            id: contact.id,
            email: contact.properties.email,
            firstName: contact.properties.firstname,
            lastName: contact.properties.lastname,
            phone: contact.properties.phone,
            company: contact.properties.company,
            leadStatus: contact.properties.hs_lead_status,
            lifecycleStage: contact.properties.lifecyclestage,
            createdAt: contact.properties.createdate,
            updatedAt: contact.properties.lastmodifieddate,
          })),
        };
      } catch (error) {
        console.error("[HubSpot Stats] Recent contacts error:", error);
        return {
          success: false,
          error: String(error),
          data: [],
        };
      }
    }),

  /**
   * Get deals for Kanban board
   */
  getKanbanDeals: publicProcedure
    .input(
      z.object({
        pipeline: z.string().default("default"),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      try {
        // Get pipeline stages
        const pipelines = await hubspotRequest<{ results: Pipeline[] }>(
          "/crm/v3/pipelines/deals"
        );

        const pipeline = pipelines.results.find(p => p.id === input.pipeline)
          || pipelines.results[0];

        if (!pipeline) {
          return { success: false, error: "No pipeline found", data: null };
        }

        // Get deals for each stage
        const columns = await Promise.all(
          pipeline.stages.map(async (stage) => {
            const stageDeals = await hubspotRequest<HubSpotSearchResponse>(
              "/crm/v3/objects/deals/search",
              {
                method: "POST",
                body: JSON.stringify({
                  limit: input.limit,
                  filterGroups: [
                    {
                      filters: [
                        {
                          propertyName: "dealstage",
                          operator: "EQ",
                          value: stage.id,
                        },
                        {
                          propertyName: "pipeline",
                          operator: "EQ",
                          value: pipeline.id,
                        },
                      ],
                    },
                  ],
                  sorts: [{ propertyName: "amount", direction: "DESCENDING" }],
                  properties: [
                    "dealname",
                    "amount",
                    "closedate",
                    "createdate",
                  ],
                }),
              }
            );

            return {
              id: stage.id,
              name: stage.label,
              order: stage.displayOrder,
              totalCount: stageDeals.total,
              deals: stageDeals.results.map(deal => ({
                id: deal.id,
                name: deal.properties.dealname || "Untitled",
                amount: parseFloat(deal.properties.amount || "0"),
                closeDate: deal.properties.closedate,
                createdAt: deal.properties.createdate,
              })),
            };
          })
        );

        return {
          success: true,
          data: {
            pipeline: {
              id: pipeline.id,
              name: pipeline.label,
            },
            columns: columns.sort((a, b) => a.order - b.order),
          },
        };
      } catch (error) {
        console.error("[HubSpot Stats] Kanban error:", error);
        return {
          success: false,
          error: String(error),
          data: null,
        };
      }
    }),

  /**
   * Search deals with pagination support
   */
  searchDeals: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        stage: z.string().optional(),
        minAmount: z.number().optional(),
        maxAmount: z.number().optional(),
        limit: z.number().min(1).max(100).default(100),
        after: z.string().optional(), // Pagination cursor
      })
    )
    .query(async ({ input }) => {
      try {
        const filters: Array<{
          propertyName: string;
          operator: string;
          value: string;
        }> = [];

        if (input.stage) {
          filters.push({
            propertyName: "dealstage",
            operator: "EQ",
            value: input.stage,
          });
        }

        if (input.minAmount !== undefined) {
          filters.push({
            propertyName: "amount",
            operator: "GTE",
            value: String(input.minAmount),
          });
        }

        if (input.maxAmount !== undefined) {
          filters.push({
            propertyName: "amount",
            operator: "LTE",
            value: String(input.maxAmount),
          });
        }

        if (input.query) {
          filters.push({
            propertyName: "dealname",
            operator: "CONTAINS_TOKEN",
            value: input.query,
          });
        }

        const requestBody: Record<string, unknown> = {
          limit: input.limit,
          filterGroups: filters.length > 0 ? [{ filters }] : [],
          sorts: [{ propertyName: "amount", direction: "DESCENDING" }],
          properties: [
            "dealname",
            "amount",
            "dealstage",
            "pipeline",
            "closedate",
            "createdate",
          ],
        };

        // Add pagination cursor if provided
        if (input.after) {
          requestBody.after = input.after;
        }

        const deals = await hubspotRequest<HubSpotSearchResponse & { paging?: { next?: { after: string } } }>(
          "/crm/v3/objects/deals/search",
          {
            method: "POST",
            body: JSON.stringify(requestBody),
          }
        );

        return {
          success: true,
          total: deals.total,
          nextCursor: deals.paging?.next?.after || null,
          data: deals.results.map(deal => ({
            id: deal.id,
            name: deal.properties.dealname || "Untitled",
            amount: parseFloat(deal.properties.amount || "0"),
            stage: deal.properties.dealstage,
            pipeline: deal.properties.pipeline,
            closeDate: deal.properties.closedate,
            createdAt: deal.properties.createdate,
          })),
        };
      } catch (error) {
        console.error("[HubSpot Stats] Search error:", error);
        return {
          success: false,
          error: String(error),
          total: 0,
          nextCursor: null,
          data: [],
        };
      }
    }),

  /**
   * Get won deals for Bauherren-Pass
   * Returns deals with closedwon stage including contact info
   * Set calculateTotalRevenue=true to paginate through ALL won deals for accurate total
   */
  getWonDeals: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        since: z.date().optional(), // Only deals closed after this date
        calculateTotalRevenue: z.boolean().default(false), // Paginate to get true total
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const limit = input?.limit ?? 20;
        const calculateTotal = input?.calculateTotalRevenue ?? false;

        const filters: Array<{
          propertyName: string;
          operator: string;
          value: string;
        }> = [
          {
            propertyName: "dealstage",
            operator: "EQ",
            value: "closedwon",
          },
        ];

        if (input?.since) {
          filters.push({
            propertyName: "closedate",
            operator: "GTE",
            value: input.since.getTime().toString(),
          });
        }

        // First request to get total count and initial deals
        const deals = await hubspotRequest<HubSpotSearchResponse & { paging?: { next?: { after: string } } }>(
          "/crm/v3/objects/deals/search",
          {
            method: "POST",
            body: JSON.stringify({
              limit: calculateTotal ? 100 : limit,
              filterGroups: [{ filters }],
              sorts: [{ propertyName: "amount", direction: "DESCENDING" }],
              properties: [
                "dealname",
                "amount",
                "closedate",
                "createdate",
                "hs_lastmodifieddate",
                "hubspot_owner_id",
                "notes_last_updated",
              ],
            }),
          }
        );

        // Calculate commission based on tier (3.5% Gold default)
        const COMMISSION_RATE = 0.035;

        // If calculateTotalRevenue is true, paginate through ALL won deals
        let allTotalValue = 0;
        let allDealsProcessed = 0;

        if (calculateTotal && deals.total > 100) {
          // Sum from first page
          allTotalValue = deals.results.reduce((sum, deal) => {
            return sum + parseFloat(deal.properties.amount || "0");
          }, 0);
          allDealsProcessed = deals.results.length;

          // Paginate through remaining deals
          let cursor = deals.paging?.next?.after;
          const maxPages = 50; // Safety limit
          let pageCount = 0;

          while (cursor && pageCount < maxPages) {
            // Rate limit protection - HubSpot allows ~10 req/sec, use 300ms to be safe
            await delay(300);

            let nextPage: HubSpotSearchResponse & { paging?: { next?: { after: string } } };
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries) {
              try {
                nextPage = await hubspotRequest<HubSpotSearchResponse & { paging?: { next?: { after: string } } }>(
                  "/crm/v3/objects/deals/search",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      limit: 100,
                      after: cursor,
                      filterGroups: [{ filters }],
                      properties: ["amount"],
                    }),
                  }
                );
                break; // Success, exit retry loop
              } catch (error) {
                const errorStr = String(error);
                if (errorStr.includes("429") || errorStr.includes("RATE_LIMIT")) {
                  retries++;
                  if (retries < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    await delay(1000 * Math.pow(2, retries - 1));
                    continue;
                  }
                }
                throw error; // Re-throw non-rate-limit errors
              }
            }

            allTotalValue += nextPage!.results.reduce((sum, deal) => {
              return sum + parseFloat(deal.properties.amount || "0");
            }, 0);
            allDealsProcessed += nextPage!.results.length;

            cursor = nextPage!.paging?.next?.after;
            pageCount++;
          }
        }

        // Map displayed deals
        const wonDeals = deals.results.slice(0, limit).map(deal => {
          const amount = parseFloat(deal.properties.amount || "0");
          return {
            id: deal.id,
            name: deal.properties.dealname || "Untitled Deal",
            value: amount,
            commission: Math.round(amount * COMMISSION_RATE * 100) / 100,
            closeDate: deal.properties.closedate,
            createdAt: deal.properties.createdate,
            ownerId: deal.properties.hubspot_owner_id,
          };
        });

        // Use paginated total if calculated, otherwise sum displayed deals
        const totalValue = calculateTotal && deals.total > 100
          ? allTotalValue
          : wonDeals.reduce((sum, d) => sum + d.value, 0);

        const totalCommission = Math.round(totalValue * COMMISSION_RATE * 100) / 100;

        return {
          success: true,
          data: {
            deals: wonDeals,
            count: deals.total,
            displayedCount: wonDeals.length,
            processedCount: calculateTotal ? allDealsProcessed : wonDeals.length,
            totalValue,
            totalCommission,
            commissionRate: COMMISSION_RATE * 100,
            isAccurateTotal: calculateTotal || deals.total <= 100,
          },
        };
      } catch (error) {
        console.error("[HubSpot Stats] Won deals error:", error);
        return {
          success: false,
          error: String(error),
          data: null,
        };
      }
    }),

  /**
   * Get connection status
   */
  getConnectionStatus: publicProcedure.query(async () => {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    const portalId = process.env.HUBSPOT_PORTAL_ID;

    if (!accessToken) {
      return {
        connected: false,
        error: "HUBSPOT_ACCESS_TOKEN not configured",
      };
    }

    try {
      // Test connection
      await hubspotRequest("/crm/v3/objects/deals?limit=1");

      return {
        connected: true,
        portalId,
        accessToken: `${accessToken.slice(0, 12)}...${accessToken.slice(-4)}`,
      };
    } catch (error) {
      return {
        connected: false,
        error: String(error),
      };
    }
  }),
});
