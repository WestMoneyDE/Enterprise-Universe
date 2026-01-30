// =============================================================================
// HUBSPOT BI-DIRECTIONAL SYNC SERVICE
// Handles two-way synchronization between Nexus and HubSpot CRM
// =============================================================================

import { db, contacts, deals, eq, and, gte, desc, sql, isNull, isNotNull } from "@nexus/db";
import {
  HubSpotService,
  HubSpotContact,
  HubSpotDeal,
  getHubSpotService,
} from "./hubspot";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type ConflictResolutionStrategy = "local_wins" | "remote_wins" | "newest_wins" | "merge";

export interface SyncConfig {
  syncInterval: number; // milliseconds between sync runs
  batchSize: number; // number of records per batch
  conflictResolution: ConflictResolutionStrategy;
  syncContacts: boolean;
  syncDeals: boolean;
  enableWebhooks: boolean;
  lastSyncTimestamp?: Date;
}

export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  contacts: {
    pushed: number;
    pulled: number;
    conflicts: number;
    errors: number;
  };
  deals: {
    pushed: number;
    pulled: number;
    conflicts: number;
    errors: number;
  };
  errors: SyncError[];
}

export interface SyncError {
  entityType: "contact" | "deal";
  entityId: string;
  hubspotId?: string;
  operation: "push" | "pull" | "conflict";
  message: string;
  timestamp: Date;
}

export interface ConflictRecord {
  entityType: "contact" | "deal";
  localId: string;
  hubspotId: string;
  localUpdatedAt: Date;
  hubspotUpdatedAt: Date;
  localData: Record<string, unknown>;
  hubspotData: Record<string, unknown>;
  resolution?: "local" | "remote" | "merged";
  resolvedAt?: Date;
}

export interface IdMapping {
  localId: string;
  hubspotId: string;
  entityType: "contact" | "deal";
  createdAt: Date;
  lastSyncedAt: Date;
}

// Local contact type from database
interface LocalContact {
  id: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
  position: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  website: string | null;
  whatsappNumber: string | null;
  hubspotContactId: string | null;
  consentStatus: "pending" | "confirmed" | "revoked" | null;
  consentSource: string | null;
  consentDate: Date | null;
  leadScore: number | null;
  emailStatus: "active" | "bounced" | "unsubscribed" | "complained" | null;
  createdAt: Date;
  updatedAt: Date;
}

// Local deal type from database
interface LocalDeal {
  id: string;
  organizationId: string;
  contactId: string | null;
  name: string;
  description: string | null;
  amount: string | null;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost" | null;
  expectedCloseDate: Date | null;
  hubspotDealId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact?: LocalContact | null;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  syncInterval: 5 * 60 * 1000, // 5 minutes
  batchSize: 100,
  conflictResolution: "local_wins",
  syncContacts: true,
  syncDeals: true,
  enableWebhooks: true,
};

// =============================================================================
// ID MAPPING STORAGE (In-memory for now, should be persisted in production)
// =============================================================================

const idMappingCache = new Map<string, IdMapping>();

// =============================================================================
// HUBSPOT SYNC SERVICE CLASS
// =============================================================================

export class HubSpotSyncService {
  private config: SyncConfig;
  private organizationId: string;
  private hubspotService: HubSpotService | null = null;
  private syncInProgress: boolean = false;
  private syncIntervalId: NodeJS.Timeout | null = null;

  constructor(organizationId: string, config: Partial<SyncConfig> = {}) {
    this.organizationId = organizationId;
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<boolean> {
    this.hubspotService = await getHubSpotService(this.organizationId);
    if (!this.hubspotService) {
      console.warn(`[HubSpot Sync] No HubSpot service available for org: ${this.organizationId}`);
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // SYNC LIFECYCLE
  // ---------------------------------------------------------------------------

  startAutoSync(): void {
    if (this.syncIntervalId) {
      console.warn("[HubSpot Sync] Auto-sync already running");
      return;
    }

    console.log(`[HubSpot Sync] Starting auto-sync with interval: ${this.config.syncInterval}ms`);

    this.syncIntervalId = setInterval(async () => {
      try {
        await this.runFullSync();
      } catch (error) {
        console.error("[HubSpot Sync] Auto-sync error:", error);
      }
    }, this.config.syncInterval);

    // Run initial sync immediately
    this.runFullSync().catch(console.error);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log("[HubSpot Sync] Auto-sync stopped");
    }
  }

  // ---------------------------------------------------------------------------
  // FULL SYNC
  // ---------------------------------------------------------------------------

  async runFullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log("[HubSpot Sync] Sync already in progress, skipping");
      return {
        success: false,
        syncedAt: new Date(),
        contacts: { pushed: 0, pulled: 0, conflicts: 0, errors: 0 },
        deals: { pushed: 0, pulled: 0, conflicts: 0, errors: 0 },
        errors: [{ entityType: "contact", entityId: "", operation: "push", message: "Sync already in progress", timestamp: new Date() }],
      };
    }

    this.syncInProgress = true;
    const startTime = new Date();
    const result: SyncResult = {
      success: true,
      syncedAt: startTime,
      contacts: { pushed: 0, pulled: 0, conflicts: 0, errors: 0 },
      deals: { pushed: 0, pulled: 0, conflicts: 0, errors: 0 },
      errors: [],
    };

    try {
      if (!await this.initialize()) {
        result.success = false;
        result.errors.push({
          entityType: "contact",
          entityId: "",
          operation: "push",
          message: "Failed to initialize HubSpot service",
          timestamp: new Date(),
        });
        return result;
      }

      console.log("[HubSpot Sync] Starting full sync...");

      // Sync contacts
      if (this.config.syncContacts) {
        const contactResult = await this.syncAllContacts();
        result.contacts = contactResult;
      }

      // Sync deals
      if (this.config.syncDeals) {
        const dealResult = await this.syncAllDeals();
        result.deals = dealResult;
      }

      // Update last sync timestamp
      this.config.lastSyncTimestamp = new Date();

      console.log(`[HubSpot Sync] Sync completed. Contacts: ${result.contacts.pushed} pushed, ${result.contacts.pulled} pulled. Deals: ${result.deals.pushed} pushed, ${result.deals.pulled} pulled`);
    } catch (error) {
      result.success = false;
      result.errors.push({
        entityType: "contact",
        entityId: "",
        operation: "push",
        message: String(error),
        timestamp: new Date(),
      });
      console.error("[HubSpot Sync] Full sync error:", error);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // CONTACT SYNC
  // ---------------------------------------------------------------------------

  private async syncAllContacts(): Promise<SyncResult["contacts"]> {
    const stats = { pushed: 0, pulled: 0, conflicts: 0, errors: 0 };

    // Push local contacts to HubSpot
    const pushResult = await this.pushContactsToHubSpot();
    stats.pushed = pushResult.synced;
    stats.errors += pushResult.errors;

    // Pull contacts from HubSpot
    const pullResult = await this.syncFromHubSpot("contacts");
    stats.pulled = pullResult.synced;
    stats.conflicts = pullResult.conflicts;
    stats.errors += pullResult.errors;

    return stats;
  }

  private async pushContactsToHubSpot(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    // Get contacts that need syncing (verified contacts without HubSpot ID or recently updated)
    const contactsToSync = await db.query.contacts.findMany({
      where: and(
        eq(contacts.organizationId, this.organizationId),
        eq(contacts.consentStatus, "confirmed")
      ),
      limit: this.config.batchSize,
    });

    for (const contact of contactsToSync) {
      try {
        const result = await this.syncContactToHubSpot(contact.id);
        if (result.success) {
          synced++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`[HubSpot Sync] Error syncing contact ${contact.id}:`, error);
        errors++;
      }
    }

    return { synced, errors };
  }

  /**
   * Push a single local contact to HubSpot (only if verified/confirmed)
   */
  async syncContactToHubSpot(
    contactId: string
  ): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
    try {
      if (!this.hubspotService) {
        await this.initialize();
      }

      if (!this.hubspotService) {
        return { success: false, error: "HubSpot not configured" };
      }

      // Get local contact
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, contactId),
          eq(contacts.organizationId, this.organizationId)
        ),
      });

      if (!contact) {
        return { success: false, error: "Contact not found" };
      }

      // Only sync verified contacts
      if (contact.consentStatus !== "confirmed") {
        return { success: false, error: "Contact not verified (consent not confirmed)" };
      }

      // Map local fields to HubSpot properties
      const properties: HubSpotContact["properties"] = {
        email: contact.email,
        firstname: contact.firstName ?? undefined,
        lastname: contact.lastName ?? undefined,
        phone: contact.phone ?? contact.mobile ?? undefined,
        company: contact.company ?? undefined,
        jobtitle: contact.position ?? undefined,
        address: contact.street ?? undefined,
        city: contact.city ?? undefined,
        zip: contact.postalCode ?? undefined,
        country: contact.country ?? undefined,
        website: contact.website ?? undefined,
        hs_whatsapp_phone_number: contact.whatsappNumber ?? undefined,
        consent_status: contact.consentStatus ?? undefined,
        consent_source: contact.consentSource ?? undefined,
        consent_date: contact.consentDate?.toISOString() ?? undefined,
        lead_score: contact.leadScore?.toString() ?? undefined,
      };

      let hubspotContact: HubSpotContact;

      if (contact.hubspotContactId) {
        // Check for conflicts before updating
        const existingHubspotContact = await this.hubspotService.getContact(contact.hubspotContactId);

        if (existingHubspotContact) {
          const conflict = this.detectConflict(
            "contact",
            contact as unknown as Record<string, unknown>,
            existingHubspotContact as unknown as Record<string, unknown>,
            contact.updatedAt,
            existingHubspotContact.updatedAt ? new Date(existingHubspotContact.updatedAt) : new Date()
          );

          if (conflict) {
            const resolution = await this.resolveConflict(conflict);
            if (resolution.resolution === "remote") {
              // Don't push, let the pull handle it
              return { success: true, hubspotId: contact.hubspotContactId };
            }
          }
        }

        // Update existing HubSpot contact
        hubspotContact = await this.hubspotService.updateContact(contact.hubspotContactId, properties);
      } else {
        // Check if contact exists by email first
        const existingContacts = await this.hubspotService.searchContacts({ email: contact.email });

        if (existingContacts.length > 0) {
          // Link and update existing
          hubspotContact = await this.hubspotService.updateContact(existingContacts[0].id, properties);
        } else {
          // Create new contact
          hubspotContact = await this.hubspotService.createContact(properties);
        }

        // Save HubSpot ID to local database
        await db
          .update(contacts)
          .set({
            hubspotContactId: hubspotContact.id,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contactId));

        // Update ID mapping
        this.setIdMapping(contactId, hubspotContact.id, "contact");
      }

      return { success: true, hubspotId: hubspotContact.id };
    } catch (error) {
      console.error("[HubSpot Sync] Sync contact to HubSpot error:", error);
      return { success: false, error: String(error) };
    }
  }

  // ---------------------------------------------------------------------------
  // DEAL SYNC
  // ---------------------------------------------------------------------------

  private async syncAllDeals(): Promise<SyncResult["deals"]> {
    const stats = { pushed: 0, pulled: 0, conflicts: 0, errors: 0 };

    // Push local deals to HubSpot
    const pushResult = await this.pushDealsToHubSpot();
    stats.pushed = pushResult.synced;
    stats.errors += pushResult.errors;

    // Pull deals from HubSpot
    const pullResult = await this.syncFromHubSpot("deals");
    stats.pulled = pullResult.synced;
    stats.conflicts = pullResult.conflicts;
    stats.errors += pullResult.errors;

    return stats;
  }

  private async pushDealsToHubSpot(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    // Get deals that need syncing
    const dealsToSync = await db.query.deals.findMany({
      where: eq(deals.organizationId, this.organizationId),
      with: { contact: true },
      limit: this.config.batchSize,
    });

    for (const deal of dealsToSync) {
      try {
        const result = await this.syncDealToHubSpot(deal.id);
        if (result.success) {
          synced++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`[HubSpot Sync] Error syncing deal ${deal.id}:`, error);
        errors++;
      }
    }

    return { synced, errors };
  }

  /**
   * Push a single local deal to HubSpot
   */
  async syncDealToHubSpot(
    dealId: string
  ): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
    try {
      if (!this.hubspotService) {
        await this.initialize();
      }

      if (!this.hubspotService) {
        return { success: false, error: "HubSpot not configured" };
      }

      // Get local deal with contact
      const deal = await db.query.deals.findFirst({
        where: and(
          eq(deals.id, dealId),
          eq(deals.organizationId, this.organizationId)
        ),
        with: { contact: true },
      }) as LocalDeal | undefined;

      if (!deal) {
        return { success: false, error: "Deal not found" };
      }

      // Map Nexus stage to HubSpot stage
      const stageMapping: Record<string, string> = {
        lead: "appointmentscheduled",
        qualified: "qualifiedtobuy",
        proposal: "presentationscheduled",
        negotiation: "contractsent",
        won: "closedwon",
        lost: "closedlost",
      };

      // Map local fields to HubSpot properties
      const properties: HubSpotDeal["properties"] = {
        dealname: deal.name,
        amount: deal.amount?.toString() ?? undefined,
        dealstage: deal.stage ? stageMapping[deal.stage] ?? "appointmentscheduled" : "appointmentscheduled",
        closedate: deal.expectedCloseDate?.toISOString() ?? undefined,
        description: deal.description ?? undefined,
      };

      let hubspotDeal: HubSpotDeal;

      if (deal.hubspotDealId) {
        // Check for conflicts before updating
        const existingHubspotDeal = await this.hubspotService.getDeal(deal.hubspotDealId);

        if (existingHubspotDeal) {
          const conflict = this.detectConflict(
            "deal",
            deal as unknown as Record<string, unknown>,
            existingHubspotDeal as unknown as Record<string, unknown>,
            deal.updatedAt,
            existingHubspotDeal.updatedAt ? new Date(existingHubspotDeal.updatedAt) : new Date()
          );

          if (conflict) {
            const resolution = await this.resolveConflict(conflict);
            if (resolution.resolution === "remote") {
              return { success: true, hubspotId: deal.hubspotDealId };
            }
          }
        }

        // Update existing HubSpot deal
        hubspotDeal = await this.hubspotService.updateDeal(deal.hubspotDealId, properties);
      } else {
        // Create new deal with contact association if available
        const associations = deal.contact?.hubspotContactId
          ? { contactId: deal.contact.hubspotContactId }
          : undefined;

        hubspotDeal = await this.hubspotService.createDeal(properties, associations);

        // Save HubSpot ID to local database
        await db
          .update(deals)
          .set({
            hubspotDealId: hubspotDeal.id,
            updatedAt: new Date(),
          })
          .where(eq(deals.id, dealId));

        // Update ID mapping
        this.setIdMapping(dealId, hubspotDeal.id, "deal");
      }

      return { success: true, hubspotId: hubspotDeal.id };
    } catch (error) {
      console.error("[HubSpot Sync] Sync deal to HubSpot error:", error);
      return { success: false, error: String(error) };
    }
  }

  // ---------------------------------------------------------------------------
  // PULL FROM HUBSPOT
  // ---------------------------------------------------------------------------

  /**
   * Pull changes from HubSpot to local database
   */
  async syncFromHubSpot(
    entityType: "contacts" | "deals" | "all" = "all"
  ): Promise<{ synced: number; conflicts: number; errors: number }> {
    let totalSynced = 0;
    let totalConflicts = 0;
    let totalErrors = 0;

    try {
      if (!this.hubspotService) {
        await this.initialize();
      }

      if (!this.hubspotService) {
        throw new Error("HubSpot not configured");
      }

      // Sync contacts from HubSpot
      if (entityType === "contacts" || entityType === "all") {
        const contactResult = await this.pullContactsFromHubSpot();
        totalSynced += contactResult.synced;
        totalConflicts += contactResult.conflicts;
        totalErrors += contactResult.errors;
      }

      // Sync deals from HubSpot
      if (entityType === "deals" || entityType === "all") {
        const dealResult = await this.pullDealsFromHubSpot();
        totalSynced += dealResult.synced;
        totalConflicts += dealResult.conflicts;
        totalErrors += dealResult.errors;
      }
    } catch (error) {
      console.error("[HubSpot Sync] Pull from HubSpot error:", error);
      totalErrors++;
    }

    return { synced: totalSynced, conflicts: totalConflicts, errors: totalErrors };
  }

  private async pullContactsFromHubSpot(): Promise<{ synced: number; conflicts: number; errors: number }> {
    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      // Get recently updated contacts from HubSpot
      const hubspotContacts = await this.hubspotService!.searchContacts({});

      for (const hsContact of hubspotContacts) {
        try {
          // Find local contact by HubSpot ID or email
          let localContact = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.organizationId, this.organizationId),
              eq(contacts.hubspotContactId, hsContact.id)
            ),
          });

          if (!localContact && hsContact.properties.email) {
            localContact = await db.query.contacts.findFirst({
              where: and(
                eq(contacts.organizationId, this.organizationId),
                eq(contacts.email, hsContact.properties.email)
              ),
            });
          }

          // Check for conflicts
          if (localContact) {
            const conflict = this.detectConflict(
              "contact",
              localContact as unknown as Record<string, unknown>,
              hsContact as unknown as Record<string, unknown>,
              localContact.updatedAt,
              hsContact.updatedAt ? new Date(hsContact.updatedAt) : new Date()
            );

            if (conflict) {
              const resolution = await this.resolveConflict(conflict);
              conflicts++;

              if (resolution.resolution === "local") {
                // Skip updating local, push to HubSpot instead
                continue;
              }
            }
          }

          // Map HubSpot properties to local fields
          const contactData = this.mapHubSpotContactToLocal(hsContact);

          if (localContact) {
            // Update existing local contact
            await db
              .update(contacts)
              .set({
                ...contactData,
                hubspotContactId: hsContact.id,
                updatedAt: new Date(),
              })
              .where(eq(contacts.id, localContact.id));
          } else {
            // Create new local contact - ensure required fields are present
            const email = contactData.email ?? `hubspot-${hsContact.id}@placeholder.local`;
            await db.insert(contacts).values({
              email,
              organizationId: this.organizationId,
              hubspotContactId: hsContact.id,
              type: "lead",
              source: "hubspot",
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              phone: contactData.phone,
              company: contactData.company,
              position: contactData.position,
              street: contactData.street,
              city: contactData.city,
              postalCode: contactData.postalCode,
              country: contactData.country,
              website: contactData.website,
              whatsappNumber: contactData.whatsappNumber,
              leadScore: contactData.leadScore,
            });
          }

          synced++;
        } catch (error) {
          console.error(`[HubSpot Sync] Error pulling contact ${hsContact.id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error("[HubSpot Sync] Pull contacts error:", error);
      errors++;
    }

    return { synced, conflicts, errors };
  }

  private async pullDealsFromHubSpot(): Promise<{ synced: number; conflicts: number; errors: number }> {
    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      // Get deals from HubSpot
      const hubspotDeals = await this.hubspotService!.searchDeals({});

      for (const hsDeal of hubspotDeals) {
        try {
          // Find local deal by HubSpot ID
          const localDeal = await db.query.deals.findFirst({
            where: and(
              eq(deals.organizationId, this.organizationId),
              eq(deals.hubspotDealId, hsDeal.id)
            ),
          });

          // Check for conflicts
          if (localDeal) {
            const conflict = this.detectConflict(
              "deal",
              localDeal as unknown as Record<string, unknown>,
              hsDeal as unknown as Record<string, unknown>,
              localDeal.updatedAt,
              hsDeal.updatedAt ? new Date(hsDeal.updatedAt) : new Date()
            );

            if (conflict) {
              const resolution = await this.resolveConflict(conflict);
              conflicts++;

              if (resolution.resolution === "local") {
                continue;
              }
            }
          }

          // Map HubSpot properties to local fields
          const dealData = this.mapHubSpotDealToLocal(hsDeal);

          // Try to find associated contact
          let contactId: string | null = null;
          const associatedContactHubspotId = hsDeal.associations?.contacts?.results?.[0]?.id;
          if (associatedContactHubspotId) {
            const contact = await db.query.contacts.findFirst({
              where: and(
                eq(contacts.organizationId, this.organizationId),
                eq(contacts.hubspotContactId, associatedContactHubspotId)
              ),
            });
            contactId = contact?.id ?? null;
          }

          if (localDeal) {
            // Update existing local deal
            await db
              .update(deals)
              .set({
                ...dealData,
                contactId,
                hubspotDealId: hsDeal.id,
                updatedAt: new Date(),
              })
              .where(eq(deals.id, localDeal.id));
          } else {
            // Create new local deal - ensure required fields are present
            const name = dealData.name ?? `Deal ${hsDeal.id}`;
            await db.insert(deals).values({
              name,
              organizationId: this.organizationId,
              contactId,
              hubspotDealId: hsDeal.id,
              description: dealData.description,
              amount: dealData.amount,
              stage: dealData.stage ?? "lead",
              expectedCloseDate: dealData.expectedCloseDate,
            });
          }

          synced++;
        } catch (error) {
          console.error(`[HubSpot Sync] Error pulling deal ${hsDeal.id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error("[HubSpot Sync] Pull deals error:", error);
      errors++;
    }

    return { synced, conflicts, errors };
  }

  // ---------------------------------------------------------------------------
  // CONFLICT RESOLUTION
  // ---------------------------------------------------------------------------

  private detectConflict(
    entityType: "contact" | "deal",
    localData: Record<string, unknown>,
    hubspotData: Record<string, unknown>,
    localUpdatedAt: Date,
    hubspotUpdatedAt: Date
  ): ConflictRecord | null {
    // Simple conflict detection: both records updated since last sync
    const lastSync = this.config.lastSyncTimestamp ?? new Date(0);

    if (localUpdatedAt > lastSync && hubspotUpdatedAt > lastSync) {
      return {
        entityType,
        localId: localData.id as string,
        hubspotId: hubspotData.id as string,
        localUpdatedAt,
        hubspotUpdatedAt,
        localData,
        hubspotData,
      };
    }

    return null;
  }

  /**
   * Resolve a sync conflict using the configured strategy
   */
  async resolveConflict(conflict: ConflictRecord): Promise<ConflictRecord> {
    const resolvedConflict = { ...conflict };

    switch (this.config.conflictResolution) {
      case "local_wins":
        resolvedConflict.resolution = "local";
        break;

      case "remote_wins":
        resolvedConflict.resolution = "remote";
        break;

      case "newest_wins":
        resolvedConflict.resolution =
          conflict.localUpdatedAt > conflict.hubspotUpdatedAt ? "local" : "remote";
        break;

      case "merge":
        // For merge strategy, we would need field-level conflict resolution
        // For now, default to local_wins
        resolvedConflict.resolution = "merged";
        console.log(`[HubSpot Sync] Merge conflict for ${conflict.entityType} ${conflict.localId}`);
        break;

      default:
        resolvedConflict.resolution = "local";
    }

    resolvedConflict.resolvedAt = new Date();

    console.log(
      `[HubSpot Sync] Resolved ${conflict.entityType} conflict: ${resolvedConflict.resolution} wins (local: ${conflict.localUpdatedAt.toISOString()}, remote: ${conflict.hubspotUpdatedAt.toISOString()})`
    );

    return resolvedConflict;
  }

  // ---------------------------------------------------------------------------
  // ID MAPPING HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Get HubSpot ID from local UUID
   */
  getHubSpotIdFromLocal(localId: string, entityType: "contact" | "deal"): string | null {
    const key = `${entityType}:${localId}`;
    const mapping = idMappingCache.get(key);
    return mapping?.hubspotId ?? null;
  }

  /**
   * Get local UUID from HubSpot ID
   */
  getLocalIdFromHubSpot(hubspotId: string, entityType: "contact" | "deal"): string | null {
    for (const [key, mapping] of idMappingCache.entries()) {
      if (mapping.hubspotId === hubspotId && mapping.entityType === entityType) {
        return mapping.localId;
      }
    }
    return null;
  }

  /**
   * Set ID mapping between local and HubSpot
   */
  setIdMapping(localId: string, hubspotId: string, entityType: "contact" | "deal"): void {
    const key = `${entityType}:${localId}`;
    const mapping: IdMapping = {
      localId,
      hubspotId,
      entityType,
      createdAt: new Date(),
      lastSyncedAt: new Date(),
    };
    idMappingCache.set(key, mapping);
  }

  /**
   * Remove ID mapping
   */
  removeIdMapping(localId: string, entityType: "contact" | "deal"): void {
    const key = `${entityType}:${localId}`;
    idMappingCache.delete(key);
  }

  /**
   * Get all ID mappings for an entity type
   */
  getAllIdMappings(entityType: "contact" | "deal"): IdMapping[] {
    const mappings: IdMapping[] = [];
    for (const mapping of idMappingCache.values()) {
      if (mapping.entityType === entityType) {
        mappings.push(mapping);
      }
    }
    return mappings;
  }

  /**
   * Load ID mappings from database
   */
  async loadIdMappingsFromDatabase(): Promise<void> {
    // Load contact mappings
    const contactsWithHubSpot = await db.query.contacts.findMany({
      where: and(
        eq(contacts.organizationId, this.organizationId),
        isNotNull(contacts.hubspotContactId)
      ),
      columns: { id: true, hubspotContactId: true, updatedAt: true },
    });

    for (const contact of contactsWithHubSpot) {
      if (contact.hubspotContactId) {
        this.setIdMapping(contact.id, contact.hubspotContactId, "contact");
      }
    }

    // Load deal mappings
    const dealsWithHubSpot = await db.query.deals.findMany({
      where: and(
        eq(deals.organizationId, this.organizationId),
        isNotNull(deals.hubspotDealId)
      ),
      columns: { id: true, hubspotDealId: true, updatedAt: true },
    });

    for (const deal of dealsWithHubSpot) {
      if (deal.hubspotDealId) {
        this.setIdMapping(deal.id, deal.hubspotDealId, "deal");
      }
    }

    console.log(
      `[HubSpot Sync] Loaded ${contactsWithHubSpot.length} contact mappings and ${dealsWithHubSpot.length} deal mappings`
    );
  }

  // ---------------------------------------------------------------------------
  // DATA MAPPING HELPERS
  // ---------------------------------------------------------------------------

  private mapHubSpotContactToLocal(hsContact: HubSpotContact): Partial<LocalContact> {
    const props = hsContact.properties;

    return {
      email: props.email ?? `hubspot-${hsContact.id}@placeholder.local`,
      firstName: props.firstname ?? null,
      lastName: props.lastname ?? null,
      phone: props.phone ?? null,
      company: props.company ?? null,
      position: props.jobtitle ?? null,
      street: props.address ?? null,
      city: props.city ?? null,
      postalCode: props.zip ?? null,
      country: props.country ?? null,
      website: props.website ?? null,
      whatsappNumber: props.hs_whatsapp_phone_number ?? null,
      consentStatus: (props.consent_status as "pending" | "confirmed" | "revoked") ?? null,
      consentSource: props.consent_source ?? null,
      consentDate: props.consent_date ? new Date(props.consent_date) : null,
      leadScore: props.lead_score ? parseInt(props.lead_score, 10) : null,
    };
  }

  private mapHubSpotDealToLocal(hsDeal: HubSpotDeal): Partial<LocalDeal> {
    const props = hsDeal.properties;

    // Map HubSpot stage to local stage
    const stageMapping: Record<string, LocalDeal["stage"]> = {
      appointmentscheduled: "lead",
      qualifiedtobuy: "qualified",
      presentationscheduled: "proposal",
      decisionmakerboughtin: "proposal",
      contractsent: "negotiation",
      closedwon: "won",
      closedlost: "lost",
    };

    return {
      name: props.dealname ?? `Deal ${hsDeal.id}`,
      description: props.description ?? null,
      amount: props.amount ?? null,
      stage: props.dealstage ? stageMapping[props.dealstage.toLowerCase()] ?? "lead" : "lead",
      expectedCloseDate: props.closedate ? new Date(props.closedate) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a HubSpot sync service instance for an organization
 */
export async function createHubSpotSyncService(
  organizationId: string,
  config?: Partial<SyncConfig>
): Promise<HubSpotSyncService | null> {
  const service = new HubSpotSyncService(organizationId, config);
  const initialized = await service.initialize();

  if (!initialized) {
    return null;
  }

  // Load existing ID mappings
  await service.loadIdMappingsFromDatabase();

  return service;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Sync a single contact to HubSpot (convenience function)
 */
export async function syncContactToHubSpot(
  contactId: string,
  organizationId: string
): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
  const service = await createHubSpotSyncService(organizationId);
  if (!service) {
    return { success: false, error: "HubSpot sync service not available" };
  }
  return service.syncContactToHubSpot(contactId);
}

/**
 * Sync a single deal to HubSpot (convenience function)
 */
export async function syncDealToHubSpot(
  dealId: string,
  organizationId: string
): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
  const service = await createHubSpotSyncService(organizationId);
  if (!service) {
    return { success: false, error: "HubSpot sync service not available" };
  }
  return service.syncDealToHubSpot(dealId);
}

/**
 * Pull changes from HubSpot (convenience function)
 */
export async function syncFromHubSpot(
  organizationId: string,
  entityType: "contacts" | "deals" | "all" = "all"
): Promise<{ synced: number; conflicts: number; errors: number }> {
  const service = await createHubSpotSyncService(organizationId);
  if (!service) {
    return { synced: 0, conflicts: 0, errors: 1 };
  }
  return service.syncFromHubSpot(entityType);
}

/**
 * Resolve a conflict manually (convenience function)
 */
export async function resolveConflict(
  organizationId: string,
  conflict: ConflictRecord
): Promise<ConflictRecord> {
  const service = await createHubSpotSyncService(organizationId);
  if (!service) {
    throw new Error("HubSpot sync service not available");
  }
  return service.resolveConflict(conflict);
}
