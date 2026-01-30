import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, adminProcedure, protectedProcedure } from "../trpc";
import {
  db,
  organizations,
  users,
  apiKeys,
  contacts,
  deals,
  projects,
  campaigns,
  eq,
  and,
  count,
  sql,
} from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const subsidiaries = [
  "west_money_bau",
  "west_money_os",
  "z_automation",
  "dedsec_world_ai",
  "enterprise_universe",
] as const;

const updateOrganizationSchema = z.object({
  name: z.string().max(255).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  subsidiary: z.enum(subsidiaries).optional(),
  settings: z.object({
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    language: z.string().optional(),
    features: z.array(z.string()).optional(),
  }).optional(),
});

const createApiKeySchema = z.object({
  name: z.string().max(255),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.date().optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "member", "viewer"]).default("member"),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

// =============================================================================
// ORGANIZATIONS ROUTER
// =============================================================================

export const organizationsRouter = createTRPCRouter({
  // Get current organization
  current: orgProcedure.query(async ({ ctx }) => {
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, ctx.organizationId),
      with: {
        users: {
          where: eq(users.isActive, true),
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
            lastActiveAt: true,
          },
        },
      },
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return organization;
  }),

  // Update organization settings
  update: adminProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const [organization] = await db
        .update(organizations)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, ctx.organizationId!))
        .returning();

      return organization;
    }),

  // Get organization usage statistics
  usage: orgProcedure.query(async ({ ctx }) => {
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, ctx.organizationId),
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    // Get counts
    const [contactCount] = await db
      .select({ count: count() })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId));

    const [userCount] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.organizationId, ctx.organizationId),
          eq(users.isActive, true)
        )
      );

    const [projectCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.organizationId, ctx.organizationId));

    const [dealCount] = await db
      .select({ count: count() })
      .from(deals)
      .where(eq(deals.organizationId, ctx.organizationId));

    // Get emails sent this month
    const [emailsThisMonth] = await db
      .select({
        sent: sql<number>`COALESCE(SUM(${campaigns.emailsSent}), 0)`,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.organizationId, ctx.organizationId),
          sql`${campaigns.startedAt} >= DATE_TRUNC('month', CURRENT_DATE)`
        )
      );

    return {
      limits: {
        contacts: organization.contactLimit,
        emails: organization.emailLimit,
        users: organization.userLimit,
        projects: organization.projectLimit,
      },
      usage: {
        contacts: contactCount?.count ?? 0,
        users: userCount?.count ?? 0,
        projects: projectCount?.count ?? 0,
        deals: dealCount?.count ?? 0,
        emailsThisMonth: emailsThisMonth?.sent ?? 0,
      },
      percentages: {
        contacts: Math.round(((contactCount?.count ?? 0) / (organization.contactLimit ?? 1)) * 100),
        users: Math.round(((userCount?.count ?? 0) / (organization.userLimit ?? 1)) * 100),
        projects: Math.round(((projectCount?.count ?? 0) / (organization.projectLimit ?? 1)) * 100),
        emails: Math.round(((emailsThisMonth?.sent ?? 0) / (organization.emailLimit ?? 1)) * 100),
      },
      subscription: {
        status: organization.subscriptionStatus,
        plan: organization.subscriptionPlan,
        periodEnd: organization.subscriptionPeriodEnd,
      },
    };
  }),

  // List organization members
  members: orgProcedure.query(async ({ ctx }) => {
    const members = await db.query.users.findMany({
      where: and(
        eq(users.organizationId, ctx.organizationId),
        eq(users.isActive, true)
      ),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: (users, { asc }) => [asc(users.createdAt)],
    });

    return members;
  }),

  // Invite new member
  inviteMember: adminProcedure
    .input(inviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Check user limit
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, ctx.organizationId!),
      });

      const [userCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.organizationId, ctx.organizationId!),
            eq(users.isActive, true)
          )
        );

      if ((userCount?.count ?? 0) >= (organization?.userLimit ?? 0)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User limit reached for this organization",
        });
      }

      // Check if user already exists
      const existing = await db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });

      if (existing) {
        if (existing.organizationId === ctx.organizationId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member of this organization",
          });
        } else if (existing.organizationId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User belongs to another organization",
          });
        }

        // Add existing user to organization
        const [user] = await db
          .update(users)
          .set({
            organizationId: ctx.organizationId,
            role: input.role,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning();

        return user;
      }

      // Create new user (pending email verification)
      const [user] = await db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          firstName: input.firstName,
          lastName: input.lastName,
          organizationId: ctx.organizationId,
          role: input.role,
          isActive: true,
        })
        .returning();

      // TODO: Send invitation email

      return user;
    }),

  // Update member role
  updateMemberRole: adminProcedure
    .input(z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "manager", "member", "viewer"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.userId),
          eq(users.organizationId, ctx.organizationId!)
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Can't change own role
      if (member.id === ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change your own role",
        });
      }

      // Can't demote super_admin
      if (member.role === "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change super admin role",
        });
      }

      const [user] = await db
        .update(users)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId))
        .returning();

      return user;
    }),

  // Remove member
  removeMember: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const member = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.userId),
          eq(users.organizationId, ctx.organizationId!)
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Can't remove yourself
      if (member.id === ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove yourself",
        });
      }

      // Can't remove super_admin
      if (member.role === "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove super admin",
        });
      }

      // Remove from organization (soft delete)
      await db
        .update(users)
        .set({
          organizationId: null,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  // List API keys
  listApiKeys: adminProcedure.query(async ({ ctx }) => {
    const keys = await db.query.apiKeys.findMany({
      where: and(
        eq(apiKeys.organizationId, ctx.organizationId!),
        eq(apiKeys.isActive, true)
      ),
      columns: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        usageCount: true,
        expiresAt: true,
        createdAt: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
    });

    return keys;
  }),

  // Create API key
  createApiKey: adminProcedure
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      // Generate a random key
      const rawKey = generateApiKey();
      const keyHash = await hashApiKey(rawKey);
      const keyPrefix = rawKey.substring(0, 8);

      const [apiKey] = await db
        .insert(apiKeys)
        .values({
          organizationId: ctx.organizationId!,
          userId: ctx.user.id,
          name: input.name,
          keyHash,
          keyPrefix,
          scopes: input.scopes,
          expiresAt: input.expiresAt,
        })
        .returning();

      // Return the raw key only once
      return {
        ...apiKey,
        key: rawKey,
      };
    }),

  // Revoke API key
  revokeApiKey: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = await db.query.apiKeys.findFirst({
        where: and(
          eq(apiKeys.id, input.id),
          eq(apiKeys.organizationId, ctx.organizationId!)
        ),
      });

      if (!apiKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      await db
        .update(apiKeys)
        .set({ isActive: false })
        .where(eq(apiKeys.id, input.id));

      return { success: true };
    }),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const prefix = "nxs_";
  let key = prefix;

  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return key;
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
