import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, publicProcedure, adminProcedure } from "../trpc";
import {
  db,
  contacts,
  consentRecords,
  consentHistory,
  gdprDeletionRequests,
  gdprDataExportRequests,
  contactActivities,
  auditLogs,
  eq,
  and,
  desc,
  count,
  sql,
} from "@nexus/db";
import { generateDoubleOptInEmail, generateDeletionVerificationEmail } from "../services/gdpr-emails";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const consentChannelSchema = z.enum(["email", "whatsapp", "phone", "post", "sms", "push"]);

const recordConsentSchema = z.object({
  contactId: z.string().uuid(),
  channel: consentChannelSchema,
  consentText: z.string().min(10, "Consent text must be at least 10 characters"),
  consentIp: z.string().optional(),
  consentUserAgent: z.string().optional(),
  consentSource: z.string().max(100).optional(),
  metadata: z
    .object({
      campaignId: z.string().optional(),
      formId: z.string().optional(),
      landingPage: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      consentVersion: z.string().optional(),
      legalBasis: z.string().optional(),
    })
    .optional(),
});

const revokeConsentSchema = z.object({
  contactId: z.string().uuid(),
  channel: consentChannelSchema,
  reason: z.string().optional(),
  revokedIp: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function generateSecureToken(): Promise<string> {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function logConsentHistory(params: {
  organizationId: string;
  consentRecordId: string;
  contactId: string;
  action: string;
  previousStatus: "pending" | "confirmed" | "revoked" | null;
  newStatus: "pending" | "confirmed" | "revoked";
  channel: "email" | "whatsapp" | "phone" | "post" | "sms" | "push";
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(consentHistory).values({
    organizationId: params.organizationId,
    consentRecordId: params.consentRecordId,
    contactId: params.contactId,
    action: params.action,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    channel: params.channel,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    reason: params.reason,
    metadata: params.metadata,
  });
}

// =============================================================================
// GDPR ROUTER
// =============================================================================

export const gdprRouter = createTRPCRouter({
  // =========================================================================
  // CONSENT MANAGEMENT
  // =========================================================================

  /**
   * Record initial consent for a contact on a specific channel
   * Creates a pending consent that requires double opt-in confirmation
   */
  recordConsent: orgProcedure
    .input(recordConsentSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify contact exists and belongs to organization
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

      // Check for existing consent record
      const existingConsent = await db.query.consentRecords.findFirst({
        where: and(
          eq(consentRecords.contactId, input.contactId),
          eq(consentRecords.channel, input.channel)
        ),
      });

      if (existingConsent) {
        // Update existing record
        const [updated] = await db
          .update(consentRecords)
          .set({
            status: "pending",
            consentText: input.consentText,
            consentIp: input.consentIp ?? ctx.ipAddress,
            consentUserAgent: input.consentUserAgent,
            consentSource: input.consentSource,
            metadata: input.metadata,
            doubleOptInToken: null,
            doubleOptInSentAt: null,
            doubleOptInConfirmedAt: null,
            revokedAt: null,
            revokedIp: null,
            revokedReason: null,
            updatedAt: new Date(),
          })
          .where(eq(consentRecords.id, existingConsent.id))
          .returning();

        await logConsentHistory({
          organizationId: ctx.organizationId,
          consentRecordId: updated.id,
          contactId: input.contactId,
          action: "renewed",
          previousStatus: existingConsent.status,
          newStatus: "pending",
          channel: input.channel,
          ipAddress: input.consentIp ?? ctx.ipAddress ?? undefined,
          userAgent: input.consentUserAgent,
          metadata: { source: "record_consent", ...input.metadata },
        });

        return {
          success: true,
          consentRecordId: updated.id,
          isNew: false,
          message: "Consent record renewed - awaiting double opt-in confirmation",
        };
      }

      // Create new consent record
      const [consentRecord] = await db
        .insert(consentRecords)
        .values({
          organizationId: ctx.organizationId,
          contactId: input.contactId,
          channel: input.channel,
          status: "pending",
          consentText: input.consentText,
          consentIp: input.consentIp ?? ctx.ipAddress,
          consentUserAgent: input.consentUserAgent,
          consentSource: input.consentSource,
          metadata: input.metadata,
        })
        .returning();

      await logConsentHistory({
        organizationId: ctx.organizationId,
        consentRecordId: consentRecord.id,
        contactId: input.contactId,
        action: "created",
        previousStatus: null,
        newStatus: "pending",
        channel: input.channel,
        ipAddress: input.consentIp ?? ctx.ipAddress ?? undefined,
        userAgent: input.consentUserAgent,
        metadata: { source: "record_consent", ...input.metadata },
      });

      return {
        success: true,
        consentRecordId: consentRecord.id,
        isNew: true,
        message: "Consent recorded - awaiting double opt-in confirmation",
      };
    }),

  /**
   * Send double opt-in confirmation email
   * Generates a token and sends verification email
   */
  sendDoubleOptIn: orgProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        channel: consentChannelSchema,
        language: z.enum(["de", "en"]).default("de"),
        baseUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get consent record
      const consentRecord = await db.query.consentRecords.findFirst({
        where: and(
          eq(consentRecords.contactId, input.contactId),
          eq(consentRecords.channel, input.channel),
          eq(consentRecords.organizationId, ctx.organizationId)
        ),
      });

      if (!consentRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Consent record not found. Please record consent first.",
        });
      }

      if (consentRecord.status === "confirmed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Consent already confirmed",
        });
      }

      // Get contact for email
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, input.contactId),
      });

      if (!contact?.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Contact has no email address",
        });
      }

      // Generate double opt-in token
      const token = await generateSecureToken();
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

      // Update consent record with token
      await db
        .update(consentRecords)
        .set({
          doubleOptInToken: token,
          doubleOptInSentAt: new Date(),
          doubleOptInExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(consentRecords.id, consentRecord.id));

      // Generate email content
      const baseUrl = input.baseUrl ?? process.env.APP_URL ?? "https://nexus.enterprise-universe.de";
      const confirmUrl = `${baseUrl}/api/gdpr/confirm?token=${token}`;

      const emailContent = generateDoubleOptInEmail({
        language: input.language,
        contactName: contact.firstName ?? contact.email.split("@")[0],
        channel: input.channel,
        confirmUrl,
        expiresAt,
        organizationName: "Enterprise Universe",
      });

      // TODO: Send email via mail service
      // For now, return the email content for manual sending or integration
      console.log(`[GDPR] Double opt-in email generated for ${contact.email}`);

      return {
        success: true,
        message: `Double opt-in email prepared for ${contact.email}`,
        token, // Return token for testing - remove in production
        confirmUrl,
        expiresAt,
        email: {
          to: contact.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        },
      };
    }),

  /**
   * Confirm double opt-in via token
   * Public endpoint - can be accessed without authentication
   */
  confirmDoubleOptIn: publicProcedure
    .input(
      z.object({
        token: z.string().min(32),
        confirmedIp: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find consent record by token
      const consentRecord = await db.query.consentRecords.findFirst({
        where: eq(consentRecords.doubleOptInToken, input.token),
        with: {
          contact: true,
        },
      });

      if (!consentRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired confirmation token",
        });
      }

      // Check if token expired
      if (
        consentRecord.doubleOptInExpiresAt &&
        consentRecord.doubleOptInExpiresAt < new Date()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmation token has expired. Please request a new confirmation email.",
        });
      }

      if (consentRecord.status === "confirmed") {
        return {
          success: true,
          alreadyConfirmed: true,
          message: "Consent was already confirmed",
          channel: consentRecord.channel,
        };
      }

      const previousStatus = consentRecord.status;

      // Confirm consent
      const [updated] = await db
        .update(consentRecords)
        .set({
          status: "confirmed",
          doubleOptInConfirmedAt: new Date(),
          confirmedAt: new Date(),
          confirmedIp: input.confirmedIp ?? ctx.ipAddress,
          updatedAt: new Date(),
        })
        .where(eq(consentRecords.id, consentRecord.id))
        .returning();

      await logConsentHistory({
        organizationId: consentRecord.organizationId,
        consentRecordId: consentRecord.id,
        contactId: consentRecord.contactId,
        action: "confirmed",
        previousStatus,
        newStatus: "confirmed",
        channel: consentRecord.channel,
        ipAddress: input.confirmedIp ?? ctx.ipAddress ?? undefined,
        metadata: { source: "double_opt_in" },
      });

      // Update main contact consent status if email channel
      if (consentRecord.channel === "email") {
        await db
          .update(contacts)
          .set({
            consentStatus: "granted",
            doubleOptInConfirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, consentRecord.contactId));
      }

      return {
        success: true,
        alreadyConfirmed: false,
        message: "Consent confirmed successfully",
        channel: updated.channel,
        contactEmail: consentRecord.contact?.email,
      };
    }),

  /**
   * Revoke consent for a specific channel
   */
  revokeConsent: orgProcedure
    .input(revokeConsentSchema)
    .mutation(async ({ ctx, input }) => {
      // Get consent record
      const consentRecord = await db.query.consentRecords.findFirst({
        where: and(
          eq(consentRecords.contactId, input.contactId),
          eq(consentRecords.channel, input.channel),
          eq(consentRecords.organizationId, ctx.organizationId)
        ),
      });

      if (!consentRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Consent record not found",
        });
      }

      if (consentRecord.status === "revoked") {
        return {
          success: true,
          alreadyRevoked: true,
          message: "Consent was already revoked",
        };
      }

      const previousStatus = consentRecord.status;

      // Revoke consent
      const [updated] = await db
        .update(consentRecords)
        .set({
          status: "revoked",
          revokedAt: new Date(),
          revokedIp: input.revokedIp ?? ctx.ipAddress,
          revokedReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(consentRecords.id, consentRecord.id))
        .returning();

      await logConsentHistory({
        organizationId: ctx.organizationId,
        consentRecordId: consentRecord.id,
        contactId: input.contactId,
        action: "revoked",
        previousStatus,
        newStatus: "revoked",
        channel: input.channel,
        ipAddress: input.revokedIp ?? ctx.ipAddress ?? undefined,
        reason: input.reason,
        metadata: { source: "manual_revocation", userId: ctx.user.id },
      });

      // Update main contact consent status if email channel
      if (input.channel === "email") {
        await db
          .update(contacts)
          .set({
            consentStatus: "revoked",
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.contactId));
      }

      return {
        success: true,
        alreadyRevoked: false,
        message: "Consent revoked successfully",
        channel: updated.channel,
      };
    }),

  /**
   * Get consent status for a contact
   * Returns consent status for all channels
   */
  getConsentStatus: orgProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify contact exists
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

      // Get all consent records for contact
      const consentList = await db.query.consentRecords.findMany({
        where: eq(consentRecords.contactId, input.contactId),
        orderBy: desc(consentRecords.updatedAt),
      });

      // Build status map
      const channelStatus: Record<
        string,
        {
          status: string;
          confirmedAt: Date | null;
          revokedAt: Date | null;
          doubleOptInPending: boolean;
        }
      > = {};

      for (const record of consentList) {
        channelStatus[record.channel] = {
          status: record.status,
          confirmedAt: record.confirmedAt,
          revokedAt: record.revokedAt,
          doubleOptInPending:
            record.status === "pending" &&
            record.doubleOptInSentAt !== null &&
            record.doubleOptInConfirmedAt === null,
        };
      }

      return {
        contactId: input.contactId,
        contactEmail: contact.email,
        overallStatus: contact.consentStatus,
        channels: channelStatus,
        consentRecords: consentList,
      };
    }),

  // =========================================================================
  // GDPR DELETION REQUESTS
  // =========================================================================

  /**
   * Request data deletion (Right to be forgotten)
   * Hybrid: Self-service request that requires admin approval
   */
  requestDeletion: orgProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        requestSource: z.enum(["self_service", "email", "phone", "support_ticket"]),
        notes: z.string().optional(),
        sendVerification: z.boolean().default(true),
        language: z.enum(["de", "en"]).default("de"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify contact exists
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

      // Check for existing pending request
      const existingRequest = await db.query.gdprDeletionRequests.findFirst({
        where: and(
          eq(gdprDeletionRequests.contactId, input.contactId),
          eq(gdprDeletionRequests.status, "pending")
        ),
      });

      if (existingRequest) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A deletion request is already pending for this contact",
        });
      }

      // Generate verification token for self-service
      const verificationToken =
        input.requestSource === "self_service" ? await generateSecureToken() : null;

      // Create deletion request
      const [deletionRequest] = await db
        .insert(gdprDeletionRequests)
        .values({
          organizationId: ctx.organizationId,
          contactId: input.contactId,
          requestedEmail: contact.email,
          status: "pending",
          requestSource: input.requestSource,
          requestIp: ctx.ipAddress,
          verificationToken,
          verificationSentAt: verificationToken ? new Date() : null,
          notes: input.notes,
        })
        .returning();

      // Log audit
      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "gdpr_deletion_requested",
        category: "gdpr",
        entityType: "contact",
        entityId: input.contactId,
        entityName: contact.email,
        description: `GDPR deletion requested via ${input.requestSource}`,
        ipAddress: ctx.ipAddress,
      });

      // Generate verification email if self-service
      let verificationEmail = null;
      if (input.sendVerification && verificationToken) {
        const baseUrl = process.env.APP_URL ?? "https://nexus.enterprise-universe.de";
        const verifyUrl = `${baseUrl}/api/gdpr/verify-deletion?token=${verificationToken}`;

        verificationEmail = generateDeletionVerificationEmail({
          language: input.language,
          contactName: contact.firstName ?? contact.email.split("@")[0],
          verifyUrl,
          organizationName: "Enterprise Universe",
        });
      }

      return {
        success: true,
        requestId: deletionRequest.id,
        status: deletionRequest.status,
        requiresVerification: input.requestSource === "self_service",
        requiresAdminApproval: true,
        message:
          input.requestSource === "self_service"
            ? "Deletion request submitted. Please check your email to verify the request."
            : "Deletion request submitted. Awaiting admin approval.",
        verificationEmail: verificationEmail
          ? {
              to: contact.email,
              subject: verificationEmail.subject,
              html: verificationEmail.html,
              text: verificationEmail.text,
            }
          : null,
      };
    }),

  /**
   * Process deletion request (Admin only)
   * Executes the actual data deletion with full audit logging
   */
  processDeletion: adminProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get deletion request
      const deletionRequest = await db.query.gdprDeletionRequests.findFirst({
        where: and(
          eq(gdprDeletionRequests.id, input.requestId),
          eq(gdprDeletionRequests.organizationId, ctx.organizationId)
        ),
      });

      if (!deletionRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deletion request not found",
        });
      }

      if (deletionRequest.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Request already ${deletionRequest.status}`,
        });
      }

      if (input.action === "reject") {
        // Reject the request
        await db
          .update(gdprDeletionRequests)
          .set({
            status: "rejected",
            rejectedAt: new Date(),
            rejectedReason: input.rejectionReason,
            updatedAt: new Date(),
          })
          .where(eq(gdprDeletionRequests.id, input.requestId));

        await db.insert(auditLogs).values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          action: "gdpr_deletion_rejected",
          category: "gdpr",
          entityType: "gdpr_deletion_request",
          entityId: input.requestId,
          entityName: deletionRequest.requestedEmail,
          description: `Deletion request rejected: ${input.rejectionReason ?? "No reason provided"}`,
          ipAddress: ctx.ipAddress,
        });

        return {
          success: true,
          action: "rejected",
          message: "Deletion request rejected",
        };
      }

      // Approve and process deletion
      await db
        .update(gdprDeletionRequests)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(gdprDeletionRequests.id, input.requestId));

      // Start processing
      await db
        .update(gdprDeletionRequests)
        .set({
          status: "processing",
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(gdprDeletionRequests.id, input.requestId));

      // Get contact data before deletion for audit
      let contactData: Record<string, unknown> | null = null;
      let deletedCounts = {
        contactData: false,
        consentRecords: 0,
        activities: 0,
        deals: 0,
        messages: 0,
        totalRecords: 0,
      };

      if (deletionRequest.contactId) {
        const contact = await db.query.contacts.findFirst({
          where: eq(contacts.id, deletionRequest.contactId),
        });

        if (contact) {
          // Store contact data for audit
          contactData = {
            id: contact.id,
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            company: contact.company,
            createdAt: contact.createdAt,
          };

          // Count and delete consent records
          const [consentCount] = await db
            .select({ count: count() })
            .from(consentRecords)
            .where(eq(consentRecords.contactId, deletionRequest.contactId));

          deletedCounts.consentRecords = consentCount?.count ?? 0;

          await db
            .delete(consentRecords)
            .where(eq(consentRecords.contactId, deletionRequest.contactId));

          // Count and delete activities
          const [activityCount] = await db
            .select({ count: count() })
            .from(contactActivities)
            .where(eq(contactActivities.contactId, deletionRequest.contactId));

          deletedCounts.activities = activityCount?.count ?? 0;

          await db
            .delete(contactActivities)
            .where(eq(contactActivities.contactId, deletionRequest.contactId));

          // Delete contact (will cascade to related records)
          await db
            .delete(contacts)
            .where(eq(contacts.id, deletionRequest.contactId));

          deletedCounts.contactData = true;
          deletedCounts.totalRecords =
            1 + deletedCounts.consentRecords + deletedCounts.activities;
        }
      }

      // Mark as completed
      await db
        .update(gdprDeletionRequests)
        .set({
          status: "completed",
          completedAt: new Date(),
          deletedData: {
            contactData: contactData ?? undefined,
            consentRecords: deletedCounts.consentRecords,
            activities: deletedCounts.activities,
            deals: deletedCounts.deals,
            messages: deletedCounts.messages,
            totalRecords: deletedCounts.totalRecords,
          },
          updatedAt: new Date(),
        })
        .where(eq(gdprDeletionRequests.id, input.requestId));

      // Audit log
      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "gdpr_deletion_completed",
        category: "gdpr",
        entityType: "gdpr_deletion_request",
        entityId: input.requestId,
        entityName: deletionRequest.requestedEmail,
        description: `GDPR deletion completed. ${deletedCounts.totalRecords} records deleted.`,
        metadata: {
          deletedCounts,
          contactEmail: deletionRequest.requestedEmail,
        },
        ipAddress: ctx.ipAddress,
      });

      return {
        success: true,
        action: "completed",
        message: `Data deletion completed for ${deletionRequest.requestedEmail}`,
        deletedCounts,
      };
    }),

  /**
   * List deletion requests (Admin)
   */
  listDeletionRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "processing", "completed", "rejected"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(gdprDeletionRequests.organizationId, ctx.organizationId)];

      if (input.status) {
        conditions.push(eq(gdprDeletionRequests.status, input.status));
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(gdprDeletionRequests)
        .where(and(...conditions));

      const requests = await db.query.gdprDeletionRequests.findMany({
        where: and(...conditions),
        orderBy: desc(gdprDeletionRequests.requestedAt),
        limit: input.limit,
        offset: input.offset,
      });

      return {
        items: requests,
        total: countResult?.count ?? 0,
        hasMore: (countResult?.count ?? 0) > input.offset + input.limit,
      };
    }),

  // =========================================================================
  // GDPR DATA EXPORT
  // =========================================================================

  /**
   * Export all data for a contact (Right to data portability)
   */
  exportData: orgProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        format: z.enum(["json", "csv"]).default("json"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify contact exists
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.contactId),
          eq(contacts.organizationId, ctx.organizationId)
        ),
        with: {
          activities: true,
          listMemberships: {
            with: { list: true },
          },
        },
      });

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      // Get consent records
      const consentList = await db.query.consentRecords.findMany({
        where: eq(consentRecords.contactId, input.contactId),
        with: {
          history: true,
        },
      });

      // Compile export data
      const exportData = {
        exportedAt: new Date().toISOString(),
        format: input.format,
        contact: {
          id: contact.id,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          salutation: contact.salutation,
          phone: contact.phone,
          mobile: contact.mobile,
          whatsappNumber: contact.whatsappNumber,
          company: contact.company,
          position: contact.position,
          website: contact.website,
          linkedinUrl: contact.linkedinUrl,
          address: {
            street: contact.street,
            streetNumber: contact.streetNumber,
            city: contact.city,
            postalCode: contact.postalCode,
            state: contact.state,
            country: contact.country,
          },
          type: contact.type,
          source: contact.source,
          tags: contact.tags,
          notes: contact.notes,
          customFields: contact.customFields,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
        },
        consent: {
          overallStatus: contact.consentStatus,
          consentDate: contact.consentDate,
          records: consentList.map((r) => ({
            channel: r.channel,
            status: r.status,
            consentText: r.consentText,
            confirmedAt: r.confirmedAt,
            revokedAt: r.revokedAt,
            history: r.history.map((h) => ({
              action: h.action,
              previousStatus: h.previousStatus,
              newStatus: h.newStatus,
              createdAt: h.createdAt,
            })),
          })),
        },
        activities: contact.activities.map((a) => ({
          type: a.type,
          title: a.title,
          description: a.description,
          occurredAt: a.occurredAt,
          metadata: a.metadata,
        })),
        listMemberships: contact.listMemberships.map((m) => ({
          listName: m.list?.name,
          addedAt: m.addedAt,
        })),
        engagement: {
          leadScore: contact.leadScore,
          engagementScore: contact.engagementScore,
          emailsSent: contact.emailsSent,
          emailsOpened: contact.emailsOpened,
          emailsClicked: contact.emailsClicked,
          lastEngagementAt: contact.lastEngagementAt,
        },
      };

      // Create export request record
      const downloadToken = await generateSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const [exportRequest] = await db
        .insert(gdprDataExportRequests)
        .values({
          organizationId: ctx.organizationId,
          contactId: input.contactId,
          status: "completed",
          format: input.format,
          requestSource: "manual",
          requestIp: ctx.ipAddress,
          processedAt: new Date(),
          completedAt: new Date(),
          downloadToken,
          downloadExpiresAt: expiresAt,
          exportStats: {
            contactData: true,
            consentRecords: consentList.length,
            activities: contact.activities.length,
            deals: 0,
            messages: 0,
            totalSize: JSON.stringify(exportData).length,
          },
        })
        .returning();

      // Audit log
      await db.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "gdpr_data_exported",
        category: "gdpr",
        entityType: "contact",
        entityId: input.contactId,
        entityName: contact.email,
        description: `GDPR data export generated (${input.format})`,
        ipAddress: ctx.ipAddress,
      });

      return {
        success: true,
        exportId: exportRequest.id,
        format: input.format,
        downloadToken,
        expiresAt,
        data: exportData,
        stats: exportRequest.exportStats,
      };
    }),

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * Get GDPR compliance statistics
   */
  getStats: orgProcedure.query(async ({ ctx }) => {
    // Consent stats
    const consentStats = await db
      .select({
        status: consentRecords.status,
        channel: consentRecords.channel,
        count: count(),
      })
      .from(consentRecords)
      .where(eq(consentRecords.organizationId, ctx.organizationId))
      .groupBy(consentRecords.status, consentRecords.channel);

    // Deletion request stats
    const deletionStats = await db
      .select({
        status: gdprDeletionRequests.status,
        count: count(),
      })
      .from(gdprDeletionRequests)
      .where(eq(gdprDeletionRequests.organizationId, ctx.organizationId))
      .groupBy(gdprDeletionRequests.status);

    // Export stats
    const [exportCount] = await db
      .select({ count: count() })
      .from(gdprDataExportRequests)
      .where(eq(gdprDataExportRequests.organizationId, ctx.organizationId));

    // Pending double opt-ins
    const [pendingDoiCount] = await db
      .select({ count: count() })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.organizationId, ctx.organizationId),
          eq(consentRecords.status, "pending"),
          sql`${consentRecords.doubleOptInSentAt} IS NOT NULL`,
          sql`${consentRecords.doubleOptInConfirmedAt} IS NULL`
        )
      );

    return {
      consent: {
        byStatus: Object.fromEntries(
          consentStats
            .filter((s) => s.status)
            .map((s) => [`${s.channel}_${s.status}`, s.count])
        ),
        totalRecords: consentStats.reduce((sum, s) => sum + (s.count ?? 0), 0),
        pendingDoubleOptIn: pendingDoiCount?.count ?? 0,
      },
      deletionRequests: {
        byStatus: Object.fromEntries(
          deletionStats.map((s) => [s.status, s.count])
        ),
        totalRequests: deletionStats.reduce((sum, s) => sum + (s.count ?? 0), 0),
      },
      dataExports: {
        totalExports: exportCount?.count ?? 0,
      },
    };
  }),
});
