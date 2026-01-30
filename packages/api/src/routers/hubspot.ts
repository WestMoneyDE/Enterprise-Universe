import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, adminProcedure } from "../trpc";
import { db, contacts, deals, eq, and, desc, isNull, isNotNull } from "@nexus/db";
import {
  getHubSpotService,
  syncContactToHubSpot,
  syncContactFromHubSpot,
  syncDealToHubSpot,
  bulkImportContactsFromHubSpot,
  bulkImportDealsFromHubSpot,
  HubSpotContact,
  HubSpotDeal,
} from "../services/hubspot";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const syncContactSchema = z.object({
  contactId: z.string().uuid(),
});

const syncDealSchema = z.object({
  dealId: z.string().uuid(),
});

const importContactSchema = z.object({
  hubspotContactId: z.string(),
});

const bulkSyncSchema = z.object({
  type: z.enum(["contacts", "deals"]),
  direction: z.enum(["to_hubspot", "from_hubspot"]),
  limit: z.number().min(1).max(100).default(50),
});

// =============================================================================
// HUBSPOT ROUTER
// =============================================================================

export const hubspotRouter = createTRPCRouter({
  // ===========================================================================
  // CONNECTION STATUS
  // ===========================================================================

  /**
   * Check if HubSpot is configured and connected
   */
  getConnectionStatus: orgProcedure.query(async ({ ctx }) => {
    const hubspot = await getHubSpotService(ctx.organizationId);

    if (!hubspot) {
      return {
        connected: false,
        error: "HubSpot access token not configured",
      };
    }

    try {
      // Test connection by getting account info
      const response = await fetch(
        "https://api.hubapi.com/account-info/v3/api-usage/daily/private-apps",
        {
          headers: {
            Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          },
        }
      );

      if (response.ok) {
        return {
          connected: true,
          portalId: process.env.HUBSPOT_PORTAL_ID,
        };
      } else {
        return {
          connected: false,
          error: "Invalid or expired access token",
        };
      }
    } catch (error) {
      return {
        connected: false,
        error: String(error),
      };
    }
  }),

  // ===========================================================================
  // CONTACT SYNC
  // ===========================================================================

  /**
   * Sync a single contact to HubSpot
   */
  syncContactToHubSpot: orgProcedure
    .input(syncContactSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await syncContactToHubSpot(input.contactId, ctx.organizationId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to sync contact to HubSpot",
        });
      }

      return {
        success: true,
        hubspotId: result.hubspotId,
      };
    }),

  /**
   * Import a contact from HubSpot
   */
  importContactFromHubSpot: orgProcedure
    .input(importContactSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await syncContactFromHubSpot(
        input.hubspotContactId,
        ctx.organizationId
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to import contact from HubSpot",
        });
      }

      return {
        success: true,
        contactId: result.contactId,
      };
    }),

  /**
   * Search contacts in HubSpot
   */
  searchHubSpotContacts: orgProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        whatsappNumber: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const hubspot = await getHubSpotService(ctx.organizationId);

      if (!hubspot) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HubSpot not configured for this organization",
        });
      }

      const contacts = await hubspot.searchContacts(input);

      return {
        results: contacts,
        total: contacts.length,
      };
    }),

  /**
   * Get HubSpot contact details
   */
  getHubSpotContact: orgProcedure
    .input(z.object({ hubspotContactId: z.string() }))
    .query(async ({ ctx, input }) => {
      const hubspot = await getHubSpotService(ctx.organizationId);

      if (!hubspot) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HubSpot not configured for this organization",
        });
      }

      const contact = await hubspot.getContact(input.hubspotContactId);

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "HubSpot contact not found",
        });
      }

      return contact;
    }),

  // ===========================================================================
  // DEAL SYNC
  // ===========================================================================

  /**
   * Sync a single deal to HubSpot
   */
  syncDealToHubSpot: orgProcedure
    .input(syncDealSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await syncDealToHubSpot(input.dealId, ctx.organizationId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to sync deal to HubSpot",
        });
      }

      return {
        success: true,
        hubspotId: result.hubspotId,
      };
    }),

  /**
   * Get HubSpot deal details
   */
  getHubSpotDeal: orgProcedure
    .input(z.object({ hubspotDealId: z.string() }))
    .query(async ({ ctx, input }) => {
      const hubspot = await getHubSpotService(ctx.organizationId);

      if (!hubspot) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HubSpot not configured for this organization",
        });
      }

      const deal = await hubspot.getDeal(input.hubspotDealId);

      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "HubSpot deal not found",
        });
      }

      return deal;
    }),

  // ===========================================================================
  // BULK SYNC
  // ===========================================================================

  /**
   * Get sync status - contacts and deals with/without HubSpot IDs
   */
  getSyncStatus: orgProcedure.query(async ({ ctx }) => {
    // Count contacts
    const [contactsWithHubspot] = await db
      .select({ count: db.$count(contacts, isNotNull(contacts.hubspotContactId)) })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          isNotNull(contacts.hubspotContactId)
        )
      );

    const [contactsWithoutHubspot] = await db
      .select({ count: db.$count(contacts, isNull(contacts.hubspotContactId)) })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          isNull(contacts.hubspotContactId)
        )
      );

    // Count deals
    const [dealsWithHubspot] = await db
      .select({ count: db.$count(deals, isNotNull(deals.hubspotDealId)) })
      .from(deals)
      .where(
        and(
          eq(deals.organizationId, ctx.organizationId),
          isNotNull(deals.hubspotDealId)
        )
      );

    const [dealsWithoutHubspot] = await db
      .select({ count: db.$count(deals, isNull(deals.hubspotDealId)) })
      .from(deals)
      .where(
        and(
          eq(deals.organizationId, ctx.organizationId),
          isNull(deals.hubspotDealId)
        )
      );

    return {
      contacts: {
        synced: contactsWithHubspot?.count ?? 0,
        unsynced: contactsWithoutHubspot?.count ?? 0,
      },
      deals: {
        synced: dealsWithHubspot?.count ?? 0,
        unsynced: dealsWithoutHubspot?.count ?? 0,
      },
    };
  }),

  /**
   * Bulk sync records to HubSpot
   */
  bulkSyncToHubSpot: orgProcedure
    .input(bulkSyncSchema)
    .mutation(async ({ ctx, input }) => {
      const results: { success: number; failed: number; errors: string[] } = {
        success: 0,
        failed: 0,
        errors: [],
      };

      if (input.type === "contacts") {
        // Get contacts without HubSpot IDs
        const unsyncedContacts = await db.query.contacts.findMany({
          where: and(
            eq(contacts.organizationId, ctx.organizationId),
            isNull(contacts.hubspotContactId)
          ),
          limit: input.limit,
          orderBy: [desc(contacts.createdAt)],
        });

        for (const contact of unsyncedContacts) {
          const result = await syncContactToHubSpot(contact.id, ctx.organizationId);
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`Contact ${contact.id}: ${result.error}`);
          }
        }
      } else if (input.type === "deals") {
        // Get deals without HubSpot IDs
        const unsyncedDeals = await db.query.deals.findMany({
          where: and(
            eq(deals.organizationId, ctx.organizationId),
            isNull(deals.hubspotDealId)
          ),
          limit: input.limit,
          orderBy: [desc(deals.createdAt)],
        });

        for (const deal of unsyncedDeals) {
          const result = await syncDealToHubSpot(deal.id, ctx.organizationId);
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`Deal ${deal.id}: ${result.error}`);
          }
        }
      }

      return results;
    }),

  // ===========================================================================
  // CONSENT SYNC
  // ===========================================================================

  /**
   * Sync consent status to HubSpot
   */
  syncConsentToHubSpot: orgProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        consentStatus: z.enum(["granted", "revoked", "pending"]),
        consentSource: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hubspot = await getHubSpotService(ctx.organizationId);

      if (!hubspot) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HubSpot not configured for this organization",
        });
      }

      // Get contact with HubSpot ID
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, ctx.organizationId)
        ),
      });

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      if (!contact.hubspotContactId) {
        // First sync the contact to HubSpot
        const syncResult = await syncContactToHubSpot(input.contactId, ctx.organizationId);
        if (!syncResult.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to sync contact to HubSpot before consent update",
          });
        }
      }

      // Get fresh contact with HubSpot ID
      const updatedContact = await db.query.contacts.findFirst({
        where: eq(contacts.id, input.contactId),
      });

      if (!updatedContact?.hubspotContactId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contact HubSpot ID not available",
        });
      }

      // Update consent in HubSpot
      await hubspot.updateContactConsent(updatedContact.hubspotContactId, {
        status: input.consentStatus,
        source: input.consentSource,
        date: new Date(),
      });

      // Update local contact
      await db
        .update(contacts)
        .set({
          consentStatus: input.consentStatus,
          consentSource: input.consentSource,
          consentDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.contactId));

      return { success: true };
    }),

  // ===========================================================================
  // LEAD SCORE SYNC
  // ===========================================================================

  /**
   * Sync lead score to HubSpot
   */
  syncLeadScoreToHubSpot: orgProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        score: z.number().min(0).max(100),
        grade: z.enum(["A", "B", "C", "D"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hubspot = await getHubSpotService(ctx.organizationId);

      if (!hubspot) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HubSpot not configured for this organization",
        });
      }

      // Get contact with HubSpot ID
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, ctx.organizationId)
        ),
      });

      if (!contact?.hubspotContactId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Contact must be synced to HubSpot first",
        });
      }

      // Update lead score in HubSpot
      await hubspot.updateContactLeadScore(
        contact.hubspotContactId,
        input.score,
        input.grade
      );

      // Update local contact
      // Note: leadScoreGrade field not yet in schema, only updating leadScore
      await db
        .update(contacts)
        .set({
          leadScore: input.score,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, input.contactId));

      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK IMPORT FROM HUBSPOT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bulk import all contacts and deals from HubSpot to local database
   */
  bulkImportFromHubSpot: orgProcedure.mutation(async ({ ctx }) => {
    console.log(`[HubSpot] Starting bulk import for org: ${ctx.organizationId}`);

    // Import contacts first
    const contactsResult = await bulkImportContactsFromHubSpot(ctx.organizationId);

    // Then import deals (they may reference contacts)
    const dealsResult = await bulkImportDealsFromHubSpot(ctx.organizationId);

    return {
      success: contactsResult.success && dealsResult.success,
      contacts: {
        imported: contactsResult.imported,
        updated: contactsResult.updated,
        errors: contactsResult.errors,
      },
      deals: {
        imported: dealsResult.imported,
        updated: dealsResult.updated,
        errors: dealsResult.errors,
      },
    };
  }),
});
