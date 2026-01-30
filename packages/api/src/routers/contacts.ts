import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, protectedProcedure } from "../trpc";
import { db, contacts, contactLists, contactListMembers, contactActivities, eq, and, like, ilike, desc, asc, count, sql } from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const contactFilterSchema = z.object({
  search: z.string().optional(),
  type: z.enum(["lead", "customer", "investor", "partner", "vendor", "employee"]).optional(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  consentStatus: z.enum(["pending", "granted", "revoked"]).optional(),
  emailStatus: z.enum(["active", "bounced", "complained", "unsubscribed"]).optional(),
  ownerId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createContactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  salutation: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  position: z.string().max(100).optional(),
  street: z.string().max(255).optional(),
  streetNumber: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2).default("DE"),
  type: z.enum(["lead", "customer", "investor", "partner", "vendor", "employee"]).default("lead"),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  source: z.string().max(100).optional(),
  sourceDetail: z.string().max(255).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().uuid(),
});

// =============================================================================
// CONTACTS ROUTER
// =============================================================================

export const contactsRouter = createTRPCRouter({
  // List contacts with filters and pagination
  list: orgProcedure
    .input(z.object({
      filters: contactFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [eq(contacts.organizationId, ctx.organizationId)];

      if (filters?.search) {
        conditions.push(
          sql`(
            ${contacts.email} ILIKE ${`%${filters.search}%`} OR
            ${contacts.firstName} ILIKE ${`%${filters.search}%`} OR
            ${contacts.lastName} ILIKE ${`%${filters.search}%`} OR
            ${contacts.company} ILIKE ${`%${filters.search}%`}
          )`
        );
      }

      if (filters?.type) {
        conditions.push(eq(contacts.type, filters.type));
      }

      if (filters?.subsidiary) {
        conditions.push(eq(contacts.subsidiary, filters.subsidiary));
      }

      if (filters?.consentStatus) {
        conditions.push(eq(contacts.consentStatus, filters.consentStatus));
      }

      if (filters?.emailStatus) {
        conditions.push(eq(contacts.emailStatus, filters.emailStatus));
      }

      if (filters?.ownerId) {
        conditions.push(eq(contacts.ownerId, filters.ownerId));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(contacts)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      // Get paginated results
      const sortField = contacts[pagination?.sortBy as keyof typeof contacts] ?? contacts.createdAt;
      const sortOrder = pagination?.sortOrder === "asc" ? asc : desc;

      const items = await db
        .select()
        .from(contacts)
        .where(and(...conditions))
        .orderBy(sortOrder(sortField as any))
        .limit(limit)
        .offset(offset);

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Get single contact by ID
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.organizationId, ctx.organizationId)
        ),
        with: {
          owner: true,
          activities: {
            orderBy: desc(contactActivities.occurredAt),
            limit: 20,
          },
          listMemberships: {
            with: {
              list: true,
            },
          },
        },
      });

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      return contact;
    }),

  // Create new contact
  create: orgProcedure
    .input(createContactSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate email
      const existing = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.email, input.email),
          eq(contacts.organizationId, ctx.organizationId)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A contact with this email already exists",
        });
      }

      // Generate email hash
      const emailHash = await generateEmailHash(input.email);

      const [contact] = await db
        .insert(contacts)
        .values({
          ...input,
          organizationId: ctx.organizationId,
          emailHash,
          ownerId: ctx.user.id,
        })
        .returning();

      // Log activity
      await db.insert(contactActivities).values({
        contactId: contact.id,
        organizationId: ctx.organizationId,
        type: "created",
        title: "Contact created",
        performedBy: ctx.user.id,
      });

      return contact;
    }),

  // Update contact
  update: orgProcedure
    .input(updateContactSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const existing = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, id),
          eq(contacts.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      // If email changed, check for duplicates
      if (data.email && data.email !== existing.email) {
        const duplicate = await db.query.contacts.findFirst({
          where: and(
            eq(contacts.email, data.email),
            eq(contacts.organizationId, ctx.organizationId)
          ),
        });

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A contact with this email already exists",
          });
        }

        // Update email hash
        (data as any).emailHash = await generateEmailHash(data.email);
      }

      const [contact] = await db
        .update(contacts)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, id))
        .returning();

      // Log activity
      await db.insert(contactActivities).values({
        contactId: contact.id,
        organizationId: ctx.organizationId,
        type: "updated",
        title: "Contact updated",
        performedBy: ctx.user.id,
        metadata: { changedFields: Object.keys(data) },
      });

      return contact;
    }),

  // Delete contact
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      await db.delete(contacts).where(eq(contacts.id, input.id));

      return { success: true };
    }),

  // Bulk delete
  bulkDelete: orgProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      let deleted = 0;
      const errors: Array<{ id: string; error: string }> = [];

      for (const id of input.ids) {
        try {
          const existing = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.id, id),
              eq(contacts.organizationId, ctx.organizationId)
            ),
          });

          if (existing) {
            await db.delete(contacts).where(eq(contacts.id, id));
            deleted++;
          } else {
            errors.push({ id, error: "Not found" });
          }
        } catch (error) {
          errors.push({ id, error: "Delete failed" });
        }
      }

      return {
        success: errors.length === 0,
        processed: deleted,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // Get contact statistics
  stats: orgProcedure.query(async ({ ctx }) => {
    const [totalResult] = await db
      .select({ count: count() })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId));

    const byType = await db
      .select({
        type: contacts.type,
        count: count(),
      })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId))
      .groupBy(contacts.type);

    const byConsentStatus = await db
      .select({
        status: contacts.consentStatus,
        count: count(),
      })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId))
      .groupBy(contacts.consentStatus);

    const byEmailStatus = await db
      .select({
        status: contacts.emailStatus,
        count: count(),
      })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId))
      .groupBy(contacts.emailStatus);

    return {
      total: totalResult?.count ?? 0,
      byType: Object.fromEntries(byType.map((r) => [r.type, r.count])),
      byConsentStatus: Object.fromEntries(byConsentStatus.map((r) => [r.status, r.count])),
      byEmailStatus: Object.fromEntries(byEmailStatus.map((r) => [r.status, r.count])),
    };
  }),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function generateEmailHash(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
