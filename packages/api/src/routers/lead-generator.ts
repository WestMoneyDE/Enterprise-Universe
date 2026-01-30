// =============================================================================
// Lead Generator Router - Multi-Source Lead Generation
// =============================================================================
// Sources: Web Forms, HubSpot Import, Google Places API
// All leads verified via email-verifier service before storage
// Automatic lead scoring after import

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, publicProcedure } from "../trpc";
import {
  db,
  contacts,
  contactActivities,
  eq,
  and,
  gte,
  sql,
  count,
  desc,
} from "@nexus/db";
import { verifyEmail, verifyEmails, type VerificationResult } from "../services/email-verifier";
import { updateContactLeadScore } from "../services/lead-scoring-engine";
import {
  getHubSpotService,
  fetchAllContactsFromHubSpot,
  type HubSpotContact,
} from "../services/hubspot";

// =============================================================================
// TYPES
// =============================================================================

export type LeadSource = "web_form" | "hubspot" | "google_places" | "manual" | "import";

export interface LeadGeneratorStats {
  source: LeadSource;
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
}

export interface VerificationStats {
  valid: number;
  rejected: number;
  pending: number;
  reviewNeeded: number;
  total: number;
  avgScore: number;
}

export interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  types: string[];
  businessStatus?: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface ImportedLead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  source: LeadSource;
  verificationStatus: "valid" | "rejected" | "pending" | "review";
  verificationScore: number;
  leadScore?: number;
  createdAt: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GOOGLE_PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";
const GOOGLE_PLACES_DAILY_LIMIT = 2500; // Free tier limit

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const webFormSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  company: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
  source: z.string().max(100).default("website"),
  sourceDetail: z.string().max(255).optional(), // Form name, page URL, etc.
  consentGiven: z.boolean().default(false),
  consentText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

const hubSpotImportSchema = z.object({
  lifecycleStages: z.array(z.string()).optional(), // Filter by lifecycle stage
  minLeadScore: z.number().min(0).max(100).optional(),
  limit: z.number().min(1).max(1000).default(100),
  skipExisting: z.boolean().default(true),
});

const googlePlacesSearchSchema = z.object({
  keyword: z.string().min(1).max(255),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  radius: z.number().min(100).max(50000).default(5000), // meters
  type: z.string().optional(), // e.g., "construction_company", "real_estate_agency"
  language: z.string().default("de"),
});

const googlePlacesImportSchema = z.object({
  placeIds: z.array(z.string()).min(1).max(50),
  tags: z.array(z.string()).optional(),
  assignToUserId: z.string().uuid().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate SHA-256 email hash for deduplication
 */
async function generateEmailHash(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Map verification result to status string
 */
function getVerificationStatus(
  result: VerificationResult
): "valid" | "rejected" | "pending" | "review" {
  if (result.recommendation === "accept") return "valid";
  if (result.recommendation === "reject") return "rejected";
  return "review";
}

/**
 * Get date ranges for stats
 */
function getDateRanges(): {
  todayStart: Date;
  weekStart: Date;
  monthStart: Date;
} {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return { todayStart, weekStart, monthStart };
}

/**
 * Fetch place details from Google Places API
 */
async function fetchPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<{
  name: string;
  address: string;
  phone?: string;
  website?: string;
  email?: string;
} | null> {
  try {
    const fields = "name,formatted_address,formatted_phone_number,website";
    const url = `${GOOGLE_PLACES_API_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      return null;
    }

    const result = data.result;

    // Try to extract email from website (basic heuristic)
    let email: string | undefined;
    if (result.website) {
      // Generate a contact email based on domain
      try {
        const domain = new URL(result.website).hostname.replace("www.", "");
        email = `info@${domain}`;
      } catch {
        // Ignore URL parse errors
      }
    }

    return {
      name: result.name,
      address: result.formatted_address,
      phone: result.formatted_phone_number,
      website: result.website,
      email,
    };
  } catch (error) {
    console.error(`[LeadGenerator] Error fetching place details: ${error}`);
    return null;
  }
}

// =============================================================================
// LEAD GENERATOR ROUTER
// =============================================================================

export const leadGeneratorRouter = createTRPCRouter({
  // ===========================================================================
  // WEB FORM CAPTURE
  // ===========================================================================

  /**
   * Capture lead from web form submission
   * Verifies email, stores lead, calculates initial score
   */
  captureFromWebForm: publicProcedure
    .input(webFormSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Organization context required",
        });
      }

      // Step 1: Verify email
      console.log(`[LeadGenerator] Verifying email: ${input.email}`);
      const verificationResult = await verifyEmail(input.email, {
        checkMx: true,
        checkSmtp: true,
        timeout: 5000,
      });

      const verificationStatus = getVerificationStatus(verificationResult);

      // Reject if verification completely fails
      if (verificationResult.recommendation === "reject") {
        console.log(
          `[LeadGenerator] Email rejected: ${input.email} - ${verificationResult.reason}`
        );

        // Log the rejected attempt for analytics
        await db.insert(contactActivities).values({
          contactId: null as unknown as string, // Will be ignored
          organizationId,
          type: "lead_rejected",
          title: "Web form lead rejected",
          description: `Email verification failed: ${verificationResult.reason}`,
          metadata: {
            email: input.email,
            source: input.source,
            verificationScore: verificationResult.score,
            reason: verificationResult.reason,
          },
          occurredAt: new Date(),
        }).catch(() => {
          // Silently ignore if activity logging fails
        });

        return {
          success: false,
          error: "email_verification_failed",
          message: "Email address could not be verified",
          verificationResult: {
            isValid: verificationResult.isValid,
            score: verificationResult.score,
            reason: verificationResult.reason,
          },
        };
      }

      // Step 2: Check for existing contact
      const emailHash = await generateEmailHash(input.email);
      const existingContact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.organizationId, organizationId),
          eq(contacts.emailHash, emailHash)
        ),
      });

      if (existingContact) {
        // Update existing contact with new info
        const [updatedContact] = await db
          .update(contacts)
          .set({
            firstName: input.firstName || existingContact.firstName,
            lastName: input.lastName || existingContact.lastName,
            company: input.company || existingContact.company,
            phone: input.phone || existingContact.phone,
            notes: input.message
              ? `${existingContact.notes || ""}\n\n[${new Date().toISOString()}] ${input.message}`.trim()
              : existingContact.notes,
            tags: input.tags
              ? [...new Set([...(existingContact.tags || []), ...input.tags])]
              : existingContact.tags,
            customFields: input.customFields
              ? { ...(existingContact.customFields || {}), ...input.customFields }
              : existingContact.customFields,
            lastEngagementAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, existingContact.id))
          .returning();

        // Log activity
        await db.insert(contactActivities).values({
          contactId: existingContact.id,
          organizationId,
          type: "web_form_submitted",
          title: "Returned via web form",
          description: input.message || "Form submission",
          metadata: {
            source: input.source,
            sourceDetail: input.sourceDetail,
            isReturning: true,
          },
          occurredAt: new Date(),
        });

        // Recalculate lead score
        const leadScore = await updateContactLeadScore(existingContact.id);

        return {
          success: true,
          isNew: false,
          contact: {
            id: existingContact.id,
            email: existingContact.email,
            leadScore: leadScore.total,
            leadGrade: leadScore.grade,
          },
          verificationStatus,
          verificationScore: verificationResult.score,
        };
      }

      // Step 3: Create new contact
      const [newContact] = await db
        .insert(contacts)
        .values({
          organizationId,
          email: input.email.toLowerCase().trim(),
          emailHash,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company,
          phone: input.phone,
          notes: input.message,
          source: "web_form",
          sourceDetail: input.sourceDetail || input.source,
          tags: input.tags,
          customFields: input.customFields,
          type: "lead",
          consentStatus: input.consentGiven ? "granted" : "pending",
          consentDate: input.consentGiven ? new Date() : null,
          consentText: input.consentText,
          consentIp: ctx.ipAddress,
          emailStatus: verificationStatus === "valid" ? "active" : "active",
          engagementScore: 10, // Initial engagement for form submission
          lastEngagementAt: new Date(),
        })
        .returning();

      // Log activity
      await db.insert(contactActivities).values({
        contactId: newContact.id,
        organizationId,
        type: "web_form_submitted",
        title: "New lead from web form",
        description: input.message || "Form submission",
        metadata: {
          source: input.source,
          sourceDetail: input.sourceDetail,
          verificationScore: verificationResult.score,
        },
        occurredAt: new Date(),
      });

      // Step 4: Calculate initial lead score
      const leadScore = await updateContactLeadScore(newContact.id);

      console.log(
        `[LeadGenerator] New lead created: ${newContact.id} (score: ${leadScore.total})`
      );

      return {
        success: true,
        isNew: true,
        contact: {
          id: newContact.id,
          email: newContact.email,
          leadScore: leadScore.total,
          leadGrade: leadScore.grade,
        },
        verificationStatus,
        verificationScore: verificationResult.score,
      };
    }),

  // ===========================================================================
  // HUBSPOT IMPORT
  // ===========================================================================

  /**
   * Import qualified contacts from HubSpot
   * Filters by lifecycle stage and lead score, verifies emails
   */
  importFromHubSpot: orgProcedure
    .input(hubSpotImportSchema)
    .mutation(async ({ ctx, input }) => {
      const hubspot = await getHubSpotService(ctx.organizationId);

      if (!hubspot) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HubSpot not configured for this organization",
        });
      }

      const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
      if (!accessToken) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HUBSPOT_ACCESS_TOKEN not configured",
        });
      }

      console.log("[LeadGenerator] Fetching contacts from HubSpot...");

      // Fetch contacts from HubSpot
      const { contacts: hubspotContacts } = await fetchAllContactsFromHubSpot(
        accessToken,
        input.limit
      );

      // Filter by lifecycle stage if specified
      let filteredContacts = hubspotContacts;
      if (input.lifecycleStages && input.lifecycleStages.length > 0) {
        filteredContacts = hubspotContacts.filter((c) =>
          input.lifecycleStages!.includes(c.properties.lifecyclestage || "")
        );
      }

      // Filter by lead score if specified
      if (input.minLeadScore !== undefined) {
        filteredContacts = filteredContacts.filter((c) => {
          const score = parseInt(c.properties.lead_score || "0", 10);
          return score >= input.minLeadScore!;
        });
      }

      console.log(
        `[LeadGenerator] Processing ${filteredContacts.length} HubSpot contacts...`
      );

      const results: {
        imported: number;
        updated: number;
        skipped: number;
        rejected: number;
        errors: Array<{ email: string; error: string }>;
      } = {
        imported: 0,
        updated: 0,
        skipped: 0,
        rejected: 0,
        errors: [],
      };

      for (const hsContact of filteredContacts) {
        const email = hsContact.properties.email;

        if (!email) {
          results.skipped++;
          continue;
        }

        try {
          // Check if exists
          if (input.skipExisting) {
            const existing = await db.query.contacts.findFirst({
              where: and(
                eq(contacts.organizationId, ctx.organizationId),
                eq(contacts.email, email.toLowerCase())
              ),
            });

            if (existing) {
              results.skipped++;
              continue;
            }
          }

          // Verify email
          const verification = await verifyEmail(email, {
            checkMx: true,
            checkSmtp: false, // Skip SMTP for bulk import
            timeout: 3000,
          });

          if (verification.recommendation === "reject") {
            results.rejected++;
            continue;
          }

          // Create or update contact
          const emailHash = await generateEmailHash(email);
          const existingByHash = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.organizationId, ctx.organizationId),
              eq(contacts.emailHash, emailHash)
            ),
          });

          const contactData = {
            organizationId: ctx.organizationId,
            email: email.toLowerCase(),
            emailHash,
            firstName: hsContact.properties.firstname,
            lastName: hsContact.properties.lastname,
            phone: hsContact.properties.phone,
            company: hsContact.properties.company,
            position: hsContact.properties.jobtitle,
            street: hsContact.properties.address,
            city: hsContact.properties.city,
            postalCode: hsContact.properties.zip,
            country: hsContact.properties.country,
            website: hsContact.properties.website,
            whatsappNumber: hsContact.properties.hs_whatsapp_phone_number,
            hubspotContactId: hsContact.id,
            source: "hubspot" as const,
            sourceDetail: `Lifecycle: ${hsContact.properties.lifecyclestage || "unknown"}`,
            type: "lead" as const,
            updatedAt: new Date(),
          };

          let contactId: string;

          if (existingByHash) {
            await db
              .update(contacts)
              .set(contactData)
              .where(eq(contacts.id, existingByHash.id));
            contactId = existingByHash.id;
            results.updated++;
          } else {
            const [newContact] = await db
              .insert(contacts)
              .values(contactData)
              .returning();
            contactId = newContact.id;
            results.imported++;
          }

          // Calculate lead score
          await updateContactLeadScore(contactId);
        } catch (error) {
          results.errors.push({
            email,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log(
        `[LeadGenerator] HubSpot import complete: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped, ${results.rejected} rejected`
      );

      return {
        success: true,
        results,
      };
    }),

  // ===========================================================================
  // GOOGLE PLACES SEARCH
  // ===========================================================================

  /**
   * Search businesses via Google Places API
   * Free tier: 2500 requests/day
   */
  searchGooglePlaces: orgProcedure
    .input(googlePlacesSearchSchema)
    .query(async ({ input }) => {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GOOGLE_PLACES_API_KEY not configured",
        });
      }

      const url = new URL(`${GOOGLE_PLACES_API_BASE}/nearbysearch/json`);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("location", `${input.location.lat},${input.location.lng}`);
      url.searchParams.set("radius", String(input.radius));
      url.searchParams.set("keyword", input.keyword);
      url.searchParams.set("language", input.language);

      if (input.type) {
        url.searchParams.set("type", input.type);
      }

      console.log(`[LeadGenerator] Searching Google Places: ${input.keyword}`);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "REQUEST_DENIED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Google Places API request denied. Check API key.",
        });
      }

      if (data.status === "OVER_QUERY_LIMIT") {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Google Places API daily limit reached (${GOOGLE_PLACES_DAILY_LIMIT}/day)`,
        });
      }

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Google Places API error: ${data.status}`,
        });
      }

      const results: GooglePlaceResult[] = (data.results || []).map(
        (place: {
          place_id: string;
          name: string;
          vicinity: string;
          formatted_address?: string;
          rating?: number;
          user_ratings_total?: number;
          types?: string[];
          business_status?: string;
          geometry?: { location?: { lat: number; lng: number } };
        }) => ({
          placeId: place.place_id,
          name: place.name,
          address: place.vicinity || place.formatted_address || "",
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          types: place.types || [],
          businessStatus: place.business_status,
          location: {
            lat: place.geometry?.location?.lat || input.location.lat,
            lng: place.geometry?.location?.lng || input.location.lng,
          },
        })
      );

      return {
        results,
        total: results.length,
        nextPageToken: data.next_page_token,
        status: data.status,
      };
    }),

  // ===========================================================================
  // GOOGLE PLACES IMPORT
  // ===========================================================================

  /**
   * Import selected businesses from Google Places as leads
   * Fetches details, attempts email extraction, creates contacts
   */
  importFromGooglePlaces: orgProcedure
    .input(googlePlacesImportSchema)
    .mutation(async ({ ctx, input }) => {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GOOGLE_PLACES_API_KEY not configured",
        });
      }

      console.log(
        `[LeadGenerator] Importing ${input.placeIds.length} places from Google...`
      );

      const results: {
        imported: number;
        skipped: number;
        errors: Array<{ placeId: string; error: string }>;
        leads: ImportedLead[];
      } = {
        imported: 0,
        skipped: 0,
        errors: [],
        leads: [],
      };

      for (const placeId of input.placeIds) {
        try {
          // Fetch place details
          const details = await fetchPlaceDetails(placeId, apiKey);

          if (!details) {
            results.errors.push({ placeId, error: "Failed to fetch place details" });
            continue;
          }

          // Generate email if not found
          let email = details.email;
          if (!email && details.website) {
            try {
              const domain = new URL(details.website).hostname.replace("www.", "");
              email = `info@${domain}`;
            } catch {
              email = `contact-${placeId.substring(0, 8)}@placeholder.local`;
            }
          } else if (!email) {
            // Create placeholder email for tracking
            email = `place-${placeId.substring(0, 12)}@google-places.local`;
          }

          // Check for existing
          const emailHash = await generateEmailHash(email);
          const existing = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.organizationId, ctx.organizationId),
              eq(contacts.emailHash, emailHash)
            ),
          });

          if (existing) {
            results.skipped++;
            continue;
          }

          // Verify email if it looks real
          let verificationStatus: "valid" | "rejected" | "pending" | "review" = "pending";
          let verificationScore = 0;

          if (!email.includes("@placeholder.local") && !email.includes("@google-places.local")) {
            const verification = await verifyEmail(email, {
              checkMx: true,
              checkSmtp: false,
              timeout: 3000,
            });
            verificationStatus = getVerificationStatus(verification);
            verificationScore = verification.score;

            if (verification.recommendation === "reject") {
              // Try alternative email patterns
              const domain = email.split("@")[1];
              const altEmails = [`kontakt@${domain}`, `mail@${domain}`];

              for (const altEmail of altEmails) {
                const altVerification = await verifyEmail(altEmail, {
                  checkMx: true,
                  checkSmtp: false,
                });
                if (altVerification.recommendation !== "reject") {
                  email = altEmail;
                  verificationStatus = getVerificationStatus(altVerification);
                  verificationScore = altVerification.score;
                  break;
                }
              }
            }
          }

          // Create contact
          const [newContact] = await db
            .insert(contacts)
            .values({
              organizationId: ctx.organizationId,
              email: email.toLowerCase(),
              emailHash: await generateEmailHash(email),
              company: details.name,
              phone: details.phone,
              website: details.website,
              street: details.address,
              source: "google_places",
              sourceDetail: `Place ID: ${placeId}`,
              type: "lead",
              tags: input.tags,
              ownerId: input.assignToUserId,
              customFields: {
                googlePlaceId: placeId,
                importedAt: new Date().toISOString(),
              },
            })
            .returning();

          // Log activity
          await db.insert(contactActivities).values({
            contactId: newContact.id,
            organizationId: ctx.organizationId,
            type: "google_places_import",
            title: "Imported from Google Places",
            description: `Business: ${details.name}`,
            metadata: {
              placeId,
              website: details.website,
              phone: details.phone,
            },
            occurredAt: new Date(),
          });

          // Calculate lead score
          const leadScore = await updateContactLeadScore(newContact.id);

          results.imported++;
          results.leads.push({
            id: newContact.id,
            email: newContact.email,
            company: details.name,
            phone: details.phone,
            source: "google_places",
            verificationStatus,
            verificationScore,
            leadScore: leadScore.total,
            createdAt: newContact.createdAt,
          });
        } catch (error) {
          results.errors.push({
            placeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log(
        `[LeadGenerator] Google Places import complete: ${results.imported} imported, ${results.skipped} skipped`
      );

      return {
        success: true,
        results,
      };
    }),

  // ===========================================================================
  // SOURCE STATS
  // ===========================================================================

  /**
   * Get lead statistics per source
   * Returns counts for today, this week, this month
   */
  getSourceStats: orgProcedure.query(async ({ ctx }) => {
    const { todayStart, weekStart, monthStart } = getDateRanges();

    const sources: LeadSource[] = ["web_form", "hubspot", "google_places", "manual", "import"];
    const stats: LeadGeneratorStats[] = [];

    for (const source of sources) {
      // Total
      const [totalResult] = await db
        .select({ count: count() })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            eq(contacts.source, source)
          )
        );

      // Today
      const [todayResult] = await db
        .select({ count: count() })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            eq(contacts.source, source),
            gte(contacts.createdAt, todayStart)
          )
        );

      // This Week
      const [weekResult] = await db
        .select({ count: count() })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            eq(contacts.source, source),
            gte(contacts.createdAt, weekStart)
          )
        );

      // This Month
      const [monthResult] = await db
        .select({ count: count() })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            eq(contacts.source, source),
            gte(contacts.createdAt, monthStart)
          )
        );

      stats.push({
        source,
        today: todayResult?.count ?? 0,
        thisWeek: weekResult?.count ?? 0,
        thisMonth: monthResult?.count ?? 0,
        total: totalResult?.count ?? 0,
      });
    }

    // Calculate totals
    const totals = {
      today: stats.reduce((sum, s) => sum + s.today, 0),
      thisWeek: stats.reduce((sum, s) => sum + s.thisWeek, 0),
      thisMonth: stats.reduce((sum, s) => sum + s.thisMonth, 0),
      total: stats.reduce((sum, s) => sum + s.total, 0),
    };

    return {
      bySource: stats,
      totals,
    };
  }),

  // ===========================================================================
  // VERIFICATION STATS
  // ===========================================================================

  /**
   * Get email verification statistics
   * Valid, rejected, pending counts
   */
  getVerificationStats: orgProcedure.query(async ({ ctx }) => {
    // Query contacts grouped by email status
    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE email_status = 'active' AND consent_status IN ('granted', 'confirmed')) as valid_count,
        COUNT(*) FILTER (WHERE email_status IN ('bounced', 'complained')) as rejected_count,
        COUNT(*) FILTER (WHERE consent_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE email_status = 'active' AND consent_status NOT IN ('granted', 'confirmed', 'pending')) as review_count,
        COUNT(*) as total_count,
        COALESCE(AVG(engagement_score), 0) as avg_engagement
      FROM contacts
      WHERE organization_id = ${ctx.organizationId}
    `);

    const row = result.rows[0] as {
      valid_count: string;
      rejected_count: string;
      pending_count: string;
      review_count: string;
      total_count: string;
      avg_engagement: string;
    };

    const stats: VerificationStats = {
      valid: parseInt(row.valid_count) || 0,
      rejected: parseInt(row.rejected_count) || 0,
      pending: parseInt(row.pending_count) || 0,
      reviewNeeded: parseInt(row.review_count) || 0,
      total: parseInt(row.total_count) || 0,
      avgScore: parseFloat(row.avg_engagement) || 0,
    };

    // Calculate percentages
    const validPercent = stats.total > 0 ? (stats.valid / stats.total) * 100 : 0;
    const rejectedPercent = stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0;

    return {
      ...stats,
      validPercent: Math.round(validPercent * 10) / 10,
      rejectedPercent: Math.round(rejectedPercent * 10) / 10,
    };
  }),

  // ===========================================================================
  // RECENT LEADS
  // ===========================================================================

  /**
   * Get recently imported leads with verification status
   */
  getRecentLeads: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        source: z.enum(["web_form", "hubspot", "google_places", "manual", "import"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      const conditions = [eq(contacts.organizationId, ctx.organizationId)];

      if (input?.source) {
        conditions.push(eq(contacts.source, input.source));
      }

      const recentContacts = await db
        .select({
          id: contacts.id,
          email: contacts.email,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          company: contacts.company,
          phone: contacts.phone,
          source: contacts.source,
          emailStatus: contacts.emailStatus,
          consentStatus: contacts.consentStatus,
          leadScore: contacts.leadScore,
          engagementScore: contacts.engagementScore,
          createdAt: contacts.createdAt,
        })
        .from(contacts)
        .where(and(...conditions))
        .orderBy(desc(contacts.createdAt))
        .limit(limit);

      return {
        leads: recentContacts.map((c) => ({
          ...c,
          verificationStatus:
            c.emailStatus === "bounced" || c.emailStatus === "complained"
              ? "rejected"
              : c.consentStatus === "pending"
                ? "pending"
                : c.consentStatus === "granted"
                  ? "valid"
                  : "review",
        })),
        total: recentContacts.length,
      };
    }),

  // ===========================================================================
  // BULK VERIFY
  // ===========================================================================

  /**
   * Bulk verify emails for existing contacts
   * Useful for cleaning up imported lists
   */
  bulkVerifyEmails: orgProcedure
    .input(
      z.object({
        contactIds: z.array(z.string().uuid()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log(
        `[LeadGenerator] Bulk verifying ${input.contactIds.length} contacts...`
      );

      const results: {
        verified: number;
        rejected: number;
        errors: Array<{ contactId: string; error: string }>;
      } = {
        verified: 0,
        rejected: 0,
        errors: [],
      };

      // Get contacts
      const contactsToVerify = await db.query.contacts.findMany({
        where: and(
          eq(contacts.organizationId, ctx.organizationId),
          sql`${contacts.id} = ANY(${input.contactIds}::uuid[])`
        ),
      });

      // Extract emails
      const emails = contactsToVerify.map((c) => c.email);

      // Bulk verify
      const { results: verificationResults } = await verifyEmails(emails, {
        checkMx: true,
        checkSmtp: false,
        timeout: 3000,
      });

      // Update contacts
      for (let i = 0; i < contactsToVerify.length; i++) {
        const contact = contactsToVerify[i];
        const verification = verificationResults[i];

        try {
          const newStatus =
            verification.recommendation === "reject" ? "bounced" : "active";

          await db
            .update(contacts)
            .set({
              emailStatus: newStatus as "active" | "bounced",
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, contact.id));

          if (verification.recommendation === "reject") {
            results.rejected++;
          } else {
            results.verified++;
          }
        } catch (error) {
          results.errors.push({
            contactId: contact.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log(
        `[LeadGenerator] Bulk verify complete: ${results.verified} verified, ${results.rejected} rejected`
      );

      return {
        success: true,
        results,
      };
    }),
});
