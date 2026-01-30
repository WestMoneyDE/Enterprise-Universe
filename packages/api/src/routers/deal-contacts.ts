// =============================================================================
// Deal Contacts Router - Revenue Attribution Management
// =============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, orgProcedure } from "../trpc";
import { db, dealContacts, deals, contacts, eq, and, desc, sql } from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const contactRoleSchema = z.enum([
  "primary",
  "decision_maker",
  "influencer",
  "billing",
  "technical",
  "other",
]);

const addContactSchema = z.object({
  dealId: z.string().uuid().optional(),
  hubspotDealId: z.string().optional(),
  contactId: z.string().uuid().optional(),
  contactEmail: z.string().email(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactCompany: z.string().optional(),
  role: contactRoleSchema.default("other"),
  isPrimary: z.boolean().default(false),
  revenueShare: z.number().min(0).max(1).default(1),
  source: z.string().optional(),
  sourceDetail: z.string().optional(),
  campaign: z.string().optional(),
  notes: z.string().optional(),
});

const updateAttributionSchema = z.object({
  dealContactId: z.string().uuid(),
  role: contactRoleSchema.optional(),
  isPrimary: z.boolean().optional(),
  revenueShare: z.number().min(0).max(1).optional(),
  commissionShare: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

const calculateCommissionSchema = z.object({
  dealId: z.string().uuid().optional(),
  hubspotDealId: z.string().optional(),
  dealValue: z.number(),
  commissionRate: z.number().default(0.025), // 2.5% default
});

// =============================================================================
// DEAL CONTACTS ROUTER
// =============================================================================

export const dealContactsRouter = createTRPCRouter({
  /**
   * Add a contact to a deal with attribution
   */
  addContact: publicProcedure
    .input(addContactSchema)
    .mutation(async ({ input }) => {
      // Validate that we have at least one deal identifier
      if (!input.dealId && !input.hubspotDealId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either dealId or hubspotDealId is required",
        });
      }

      // Get deal value if we have a local deal
      let dealValue: number | null = null;
      let dealName: string | null = null;

      if (input.dealId) {
        const deal = await db.query.deals.findFirst({
          where: eq(deals.id, input.dealId),
        });
        if (deal) {
          dealValue = deal.amount ? parseFloat(deal.amount) : null;
          dealName = deal.name;
        }
      }

      // Calculate attributed revenue
      const attributedRevenue = dealValue
        ? dealValue * input.revenueShare
        : null;

      const [newContact] = await db
        .insert(dealContacts)
        .values({
          dealId: input.dealId,
          hubspotDealId: input.hubspotDealId,
          dealName: dealName || undefined,
          dealValue: dealValue?.toString(),
          contactId: input.contactId,
          contactEmail: input.contactEmail,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          contactCompany: input.contactCompany,
          role: input.role,
          isPrimary: input.isPrimary,
          revenueShare: input.revenueShare.toString(),
          attributedRevenue: attributedRevenue?.toString(),
          commissionShare: input.revenueShare.toString(), // Default same as revenue
          source: input.source || "manual",
          sourceDetail: input.sourceDetail,
          campaign: input.campaign,
          firstTouchAt: new Date(),
          lastTouchAt: new Date(),
          touchpoints: 1,
          notes: input.notes,
        })
        .returning();

      // If marked as primary, unmark other primaries
      if (input.isPrimary) {
        await db
          .update(dealContacts)
          .set({ isPrimary: false })
          .where(
            and(
              input.dealId
                ? eq(dealContacts.dealId, input.dealId)
                : eq(dealContacts.hubspotDealId, input.hubspotDealId!),
              sql`id != ${newContact.id}`
            )
          );
      }

      return {
        success: true,
        dealContact: newContact,
      };
    }),

  /**
   * Update attribution for a deal contact
   */
  updateAttribution: publicProcedure
    .input(updateAttributionSchema)
    .mutation(async ({ input }) => {
      const existing = await db.query.dealContacts.findFirst({
        where: eq(dealContacts.id, input.dealContactId),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal contact not found",
        });
      }

      // Calculate new attributed values if revenue share changed
      let attributedRevenue = existing.attributedRevenue;
      let attributedCommission = existing.attributedCommission;

      if (input.revenueShare !== undefined && existing.dealValue) {
        const dealValue = parseFloat(existing.dealValue);
        attributedRevenue = (dealValue * input.revenueShare).toString();
      }

      if (input.commissionShare !== undefined && existing.attributedCommission) {
        // Will be recalculated when commission is calculated
      }

      const [updated] = await db
        .update(dealContacts)
        .set({
          role: input.role ?? existing.role,
          isPrimary: input.isPrimary ?? existing.isPrimary,
          revenueShare: input.revenueShare?.toString() ?? existing.revenueShare,
          attributedRevenue,
          commissionShare:
            input.commissionShare?.toString() ?? existing.commissionShare,
          notes: input.notes ?? existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(dealContacts.id, input.dealContactId))
        .returning();

      // If marked as primary, unmark others
      if (input.isPrimary) {
        const dealIdField = existing.dealId || existing.hubspotDealId;
        if (dealIdField) {
          await db
            .update(dealContacts)
            .set({ isPrimary: false })
            .where(
              and(
                existing.dealId
                  ? eq(dealContacts.dealId, existing.dealId)
                  : eq(dealContacts.hubspotDealId, existing.hubspotDealId!),
                sql`id != ${input.dealContactId}`
              )
            );
        }
      }

      return {
        success: true,
        dealContact: updated,
      };
    }),

  /**
   * Get all contacts for a deal with attribution
   */
  getAttribution: publicProcedure
    .input(
      z.object({
        dealId: z.string().uuid().optional(),
        hubspotDealId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.dealId && !input.hubspotDealId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either dealId or hubspotDealId is required",
        });
      }

      const contacts = await db.query.dealContacts.findMany({
        where: input.dealId
          ? eq(dealContacts.dealId, input.dealId)
          : eq(dealContacts.hubspotDealId, input.hubspotDealId!),
        orderBy: [desc(dealContacts.isPrimary), desc(dealContacts.revenueShare)],
      });

      // Calculate totals
      const totalRevenueShare = contacts.reduce(
        (sum, c) => sum + parseFloat(c.revenueShare || "0"),
        0
      );
      const totalAttributedRevenue = contacts.reduce(
        (sum, c) => sum + parseFloat(c.attributedRevenue || "0"),
        0
      );

      return {
        contacts,
        summary: {
          totalContacts: contacts.length,
          totalRevenueShare,
          isNormalized: Math.abs(totalRevenueShare - 1) < 0.01,
          totalAttributedRevenue,
          primaryContact: contacts.find((c) => c.isPrimary),
        },
      };
    }),

  /**
   * Get all deals for a contact
   */
  getContactDeals: publicProcedure
    .input(
      z.object({
        contactId: z.string().uuid().optional(),
        contactEmail: z.string().email().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.contactId && !input.contactEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either contactId or contactEmail is required",
        });
      }

      const deals = await db.query.dealContacts.findMany({
        where: input.contactId
          ? eq(dealContacts.contactId, input.contactId)
          : eq(dealContacts.contactEmail, input.contactEmail!),
        orderBy: [desc(dealContacts.createdAt)],
      });

      // Calculate totals
      const totalAttributedRevenue = deals.reduce(
        (sum, d) => sum + parseFloat(d.attributedRevenue || "0"),
        0
      );
      const totalAttributedCommission = deals.reduce(
        (sum, d) => sum + parseFloat(d.attributedCommission || "0"),
        0
      );

      return {
        deals,
        summary: {
          totalDeals: deals.length,
          totalAttributedRevenue,
          totalAttributedCommission,
          primaryDeals: deals.filter((d) => d.isPrimary).length,
        },
      };
    }),

  /**
   * Calculate and distribute commission across contacts
   */
  calculateCommission: publicProcedure
    .input(calculateCommissionSchema)
    .mutation(async ({ input }) => {
      if (!input.dealId && !input.hubspotDealId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either dealId or hubspotDealId is required",
        });
      }

      // Get all contacts for this deal
      const contacts = await db.query.dealContacts.findMany({
        where: input.dealId
          ? eq(dealContacts.dealId, input.dealId)
          : eq(dealContacts.hubspotDealId, input.hubspotDealId!),
      });

      if (contacts.length === 0) {
        return {
          success: false,
          error: "No contacts found for this deal",
          totalCommission: 0,
          distributions: [],
        };
      }

      const totalCommission = input.dealValue * input.commissionRate;

      // Normalize shares if they don't sum to 1
      const totalShare = contacts.reduce(
        (sum, c) => sum + parseFloat(c.commissionShare || "1"),
        0
      );
      const normalizeFactor = totalShare > 0 ? 1 / totalShare : 1;

      // Update each contact with their commission
      const distributions = [];
      for (const contact of contacts) {
        const share = parseFloat(contact.commissionShare || "1") * normalizeFactor;
        const commission = totalCommission * share;

        await db
          .update(dealContacts)
          .set({
            dealValue: input.dealValue.toString(),
            attributedRevenue: (input.dealValue * share).toString(),
            attributedCommission: commission.toString(),
            updatedAt: new Date(),
          })
          .where(eq(dealContacts.id, contact.id));

        distributions.push({
          contactId: contact.id,
          contactEmail: contact.contactEmail,
          contactName: contact.contactName,
          role: contact.role,
          share,
          attributedRevenue: input.dealValue * share,
          attributedCommission: commission,
        });
      }

      return {
        success: true,
        dealValue: input.dealValue,
        commissionRate: input.commissionRate,
        totalCommission,
        distributions,
      };
    }),

  /**
   * Normalize revenue shares to sum to 100%
   */
  normalizeShares: publicProcedure
    .input(
      z.object({
        dealId: z.string().uuid().optional(),
        hubspotDealId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.dealId && !input.hubspotDealId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either dealId or hubspotDealId is required",
        });
      }

      const contacts = await db.query.dealContacts.findMany({
        where: input.dealId
          ? eq(dealContacts.dealId, input.dealId)
          : eq(dealContacts.hubspotDealId, input.hubspotDealId!),
      });

      if (contacts.length === 0) {
        return { success: false, message: "No contacts found" };
      }

      const totalShare = contacts.reduce(
        (sum, c) => sum + parseFloat(c.revenueShare || "1"),
        0
      );

      if (Math.abs(totalShare - 1) < 0.01) {
        return { success: true, message: "Shares already normalized" };
      }

      // Normalize each contact's share
      for (const contact of contacts) {
        const normalizedShare =
          parseFloat(contact.revenueShare || "1") / totalShare;

        await db
          .update(dealContacts)
          .set({
            revenueShare: normalizedShare.toString(),
            commissionShare: normalizedShare.toString(),
            updatedAt: new Date(),
          })
          .where(eq(dealContacts.id, contact.id));
      }

      return {
        success: true,
        message: `Normalized ${contacts.length} contacts from ${totalShare.toFixed(2)} to 1.00`,
      };
    }),

  /**
   * Remove a contact from a deal
   */
  removeContact: publicProcedure
    .input(z.object({ dealContactId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db
        .delete(dealContacts)
        .where(eq(dealContacts.id, input.dealContactId));

      return { success: true };
    }),

  /**
   * Record a touchpoint for a deal contact
   */
  recordTouchpoint: publicProcedure
    .input(
      z.object({
        dealContactId: z.string().uuid(),
        engagementDelta: z.number().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(dealContacts)
        .set({
          touchpoints: sql`COALESCE(touchpoints, 0) + 1`,
          engagementScore: sql`COALESCE(engagement_score, 0) + ${input.engagementDelta}`,
          lastTouchAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dealContacts.id, input.dealContactId))
        .returning();

      return { success: true, dealContact: updated };
    }),

  /**
   * Get attribution summary across all deals
   */
  getAttributionSummary: publicProcedure
    .input(
      z.object({
        organizationId: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const result = await db.execute(sql`
        SELECT
          COUNT(DISTINCT COALESCE(deal_id::text, hubspot_deal_id)) as total_deals,
          COUNT(*) as total_contacts,
          COUNT(*) FILTER (WHERE is_primary = true) as primary_contacts,
          SUM(CAST(attributed_revenue AS DECIMAL)) as total_attributed_revenue,
          SUM(CAST(attributed_commission AS DECIMAL)) as total_attributed_commission,
          AVG(touchpoints) as avg_touchpoints,
          COUNT(*) FILTER (WHERE role = 'decision_maker') as decision_makers
        FROM deal_contacts
        ${input?.organizationId ? sql`WHERE organization_id = ${input.organizationId}` : sql``}
      `);

      const row = result.rows[0] as Record<string, string | number | null>;

      return {
        totalDeals: parseInt(String(row.total_deals)) || 0,
        totalContacts: parseInt(String(row.total_contacts)) || 0,
        primaryContacts: parseInt(String(row.primary_contacts)) || 0,
        totalAttributedRevenue: parseFloat(String(row.total_attributed_revenue)) || 0,
        totalAttributedCommission: parseFloat(String(row.total_attributed_commission)) || 0,
        avgTouchpoints: parseFloat(String(row.avg_touchpoints)) || 0,
        decisionMakers: parseInt(String(row.decision_makers)) || 0,
      };
    }),
});
