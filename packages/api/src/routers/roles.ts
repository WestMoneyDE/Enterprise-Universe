import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import {
  db,
  userRoles,
  userRoleAssignments,
  users,
  eq,
  and,
  isNull,
  or,
} from "@nexus/db";
import type { RolePermissions } from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const roleNameSchema = z.enum([
  "super_admin",
  "admin",
  "sales_manager",
  "sales_rep",
  "marketing",
  "viewer",
  "partner",
]);

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  expiresAt: z.date().optional(),
});

const removeRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
});

const getUserRolesSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
});

const checkPermissionSchema = z.object({
  userId: z.string().uuid().optional(), // If not provided, check current user
  permission: z.string(), // e.g., "contacts.create", "deals.read", "system.settings"
  organizationId: z.string().uuid().optional(),
});

const updateRolePermissionsSchema = z.object({
  roleId: z.string().uuid(),
  permissions: z.record(z.any()) as z.ZodType<RolePermissions>,
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a user has a specific permission
 * Traverses the permission path (e.g., "contacts.create") and checks the value
 */
function hasPermissionInRole(
  permissions: RolePermissions,
  permissionPath: string,
  userId?: string,
  resourceOwnerId?: string
): boolean {
  const parts = permissionPath.split(".");
  let current: unknown = permissions;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }

  // Handle "own" permission - check if user owns the resource
  if (current === "own") {
    return userId !== undefined && resourceOwnerId !== undefined && userId === resourceOwnerId;
  }

  return current === true;
}

/**
 * Get combined permissions from all roles for a user
 */
async function getUserCombinedPermissions(
  userId: string,
  organizationId?: string
): Promise<RolePermissions> {
  const whereConditions = organizationId
    ? and(
        eq(userRoleAssignments.userId, userId),
        or(
          eq(userRoleAssignments.organizationId, organizationId),
          isNull(userRoleAssignments.organizationId)
        )
      )
    : eq(userRoleAssignments.userId, userId);

  const assignments = await db.query.userRoleAssignments.findMany({
    where: whereConditions,
    with: {
      role: true,
    },
  });

  // Filter out expired assignments
  const now = new Date();
  const activeAssignments = assignments.filter(
    (a) => !a.expiresAt || a.expiresAt > now
  );

  // Merge all permissions (union - if any role grants a permission, user has it)
  const combined: RolePermissions = {};

  for (const assignment of activeAssignments) {
    const role = assignment.role as { permissions: RolePermissions } | null;
    if (role?.permissions) {
      mergePermissions(combined, role.permissions);
    }
  }

  return combined;
}

/**
 * Deep merge permissions objects (union strategy)
 */
function mergePermissions(target: RolePermissions, source: RolePermissions): void {
  for (const key of Object.keys(source) as Array<keyof RolePermissions>) {
    const sourceValue = source[key];
    if (sourceValue === undefined) continue;

    if (typeof sourceValue === "object" && sourceValue !== null) {
      if (!(key in target) || target[key] === undefined) {
        (target as Record<string, unknown>)[key] = {};
      }
      const targetValue = target[key];
      if (typeof targetValue === "object" && targetValue !== null) {
        for (const subKey of Object.keys(sourceValue)) {
          const subSourceValue = (sourceValue as Record<string, unknown>)[subKey];
          const subTargetValue = (targetValue as Record<string, unknown>)[subKey];

          // true overrides "own", "own" overrides false/undefined
          if (subSourceValue === true) {
            (targetValue as Record<string, unknown>)[subKey] = true;
          } else if (subSourceValue === "own" && subTargetValue !== true) {
            (targetValue as Record<string, unknown>)[subKey] = "own";
          } else if (subTargetValue === undefined) {
            (targetValue as Record<string, unknown>)[subKey] = subSourceValue;
          }
        }
      }
    }
  }
}

/**
 * Check if the current user is a super_admin
 */
async function isSuperAdmin(userId: string): Promise<boolean> {
  const superAdminRole = await db.query.userRoles.findFirst({
    where: eq(userRoles.name, "super_admin"),
  });

  if (!superAdminRole) return false;

  const assignment = await db.query.userRoleAssignments.findFirst({
    where: and(
      eq(userRoleAssignments.userId, userId),
      eq(userRoleAssignments.roleId, superAdminRole.id)
    ),
  });

  // Check if assignment is active (not expired)
  if (assignment && (!assignment.expiresAt || assignment.expiresAt > new Date())) {
    return true;
  }

  return false;
}

// =============================================================================
// ROLES ROUTER
// =============================================================================

export const rolesRouter = createTRPCRouter({
  /**
   * List all available roles
   */
  listRoles: protectedProcedure.query(async () => {
    const roles = await db.query.userRoles.findMany({
      orderBy: (roles, { asc }) => [asc(roles.name)],
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions as RolePermissions,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }),

  /**
   * Get a single role by ID or name
   */
  getRole: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: roleNameSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.id && !input.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either id or name must be provided",
        });
      }

      const role = await db.query.userRoles.findFirst({
        where: input.id
          ? eq(userRoles.id, input.id)
          : eq(userRoles.name, input.name!),
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      return {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions as RolePermissions,
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
    }),

  /**
   * Assign a role to a user
   * Requires admin or super_admin role
   */
  assignRole: adminProcedure
    .input(assignRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify role exists
      const role = await db.query.userRoles.findFirst({
        where: eq(userRoles.id, input.roleId),
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Only super_admin can assign super_admin role
      if (role.name === "super_admin") {
        const isCurrentUserSuperAdmin = await isSuperAdmin(ctx.user.id);
        if (!isCurrentUserSuperAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only super administrators can assign the super_admin role",
          });
        }
      }

      // Verify target user exists
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if assignment already exists
      const existingAssignment = await db.query.userRoleAssignments.findFirst({
        where: and(
          eq(userRoleAssignments.userId, input.userId),
          eq(userRoleAssignments.roleId, input.roleId),
          input.organizationId
            ? eq(userRoleAssignments.organizationId, input.organizationId)
            : isNull(userRoleAssignments.organizationId)
        ),
      });

      if (existingAssignment) {
        // Update existing assignment (e.g., extend expiration)
        const [updated] = await db
          .update(userRoleAssignments)
          .set({
            assignedBy: ctx.user.id,
            assignedAt: new Date(),
            expiresAt: input.expiresAt,
          })
          .where(eq(userRoleAssignments.id, existingAssignment.id))
          .returning();

        return {
          ...updated,
          roleName: role.name,
          action: "updated",
        };
      }

      // Create new assignment
      const [assignment] = await db
        .insert(userRoleAssignments)
        .values({
          userId: input.userId,
          roleId: input.roleId,
          organizationId: input.organizationId,
          assignedBy: ctx.user.id,
          expiresAt: input.expiresAt,
        })
        .returning();

      return {
        ...assignment,
        roleName: role.name,
        action: "created",
      };
    }),

  /**
   * Remove a role from a user
   * Requires admin or super_admin role
   */
  removeRole: adminProcedure
    .input(removeRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // Find the assignment
      const assignment = await db.query.userRoleAssignments.findFirst({
        where: and(
          eq(userRoleAssignments.userId, input.userId),
          eq(userRoleAssignments.roleId, input.roleId),
          input.organizationId
            ? eq(userRoleAssignments.organizationId, input.organizationId)
            : isNull(userRoleAssignments.organizationId)
        ),
        with: {
          role: true,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role assignment not found",
        });
      }

      // Only super_admin can remove super_admin role
      const assignmentRole = assignment.role as { id: string; name: string; displayName: string } | null;
      if (assignmentRole?.name === "super_admin") {
        const isCurrentUserSuperAdmin = await isSuperAdmin(ctx.user.id);
        if (!isCurrentUserSuperAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only super administrators can remove the super_admin role",
          });
        }

        // Prevent removing the last super_admin
        const superAdminCount = await db.query.userRoleAssignments.findMany({
          where: eq(userRoleAssignments.roleId, assignment.roleId),
        });

        if (superAdminCount.length <= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot remove the last super administrator",
          });
        }
      }

      // Delete the assignment
      await db
        .delete(userRoleAssignments)
        .where(eq(userRoleAssignments.id, assignment.id));

      return {
        success: true,
        removedRole: assignmentRole?.name ?? "unknown",
        userId: input.userId,
      };
    }),

  /**
   * Get all roles assigned to a user
   */
  getUserRoles: protectedProcedure
    .input(getUserRolesSchema)
    .query(async ({ ctx, input }) => {
      // Users can view their own roles, admins can view anyone's
      if (input.userId !== ctx.user.id) {
        const isAdmin = ["admin", "super_admin"].includes(ctx.user.role);
        if (!isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view your own roles",
          });
        }
      }

      const whereConditions = input.organizationId
        ? and(
            eq(userRoleAssignments.userId, input.userId),
            or(
              eq(userRoleAssignments.organizationId, input.organizationId),
              isNull(userRoleAssignments.organizationId)
            )
          )
        : eq(userRoleAssignments.userId, input.userId);

      const assignments = await db.query.userRoleAssignments.findMany({
        where: whereConditions,
        with: {
          role: true,
          organization: {
            columns: {
              id: true,
              name: true,
              slug: true,
            },
          },
          assignedByUser: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: (assignments, { desc }) => [desc(assignments.assignedAt)],
      });

      const now = new Date();
      return assignments.map((a) => {
        const role = a.role as { id: string; name: string; displayName: string; description: string | null } | null;
        return {
          id: a.id,
          role: role ? {
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            description: role.description,
          } : null,
          organization: a.organization,
          assignedBy: a.assignedByUser,
          assignedAt: a.assignedAt,
          expiresAt: a.expiresAt,
          isExpired: a.expiresAt ? a.expiresAt < now : false,
          isActive: !a.expiresAt || a.expiresAt > now,
        };
      });
    }),

  /**
   * Check if a user has a specific permission
   */
  checkPermission: protectedProcedure
    .input(checkPermissionSchema)
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.user.id;
      const organizationId = input.organizationId ?? ctx.organizationId ?? undefined;

      // Get combined permissions for user
      const permissions = await getUserCombinedPermissions(targetUserId, organizationId);

      // Check the specific permission
      const hasPermission = hasPermissionInRole(
        permissions,
        input.permission,
        targetUserId
      );

      return {
        userId: targetUserId,
        permission: input.permission,
        hasPermission,
        organizationId,
      };
    }),

  /**
   * Check multiple permissions at once
   */
  checkPermissions: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        permissions: z.array(z.string()),
        organizationId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.user.id;
      const organizationId = input.organizationId ?? ctx.organizationId ?? undefined;

      // Get combined permissions for user
      const combinedPermissions = await getUserCombinedPermissions(targetUserId, organizationId);

      // Check each permission
      const results: Record<string, boolean> = {};
      for (const permission of input.permissions) {
        results[permission] = hasPermissionInRole(
          combinedPermissions,
          permission,
          targetUserId
        );
      }

      return {
        userId: targetUserId,
        permissions: results,
        organizationId,
      };
    }),

  /**
   * Get effective permissions for a user (combined from all roles)
   */
  getEffectivePermissions: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        organizationId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.user.id;
      const organizationId = input.organizationId ?? ctx.organizationId ?? undefined;

      // Users can view their own permissions, admins can view anyone's
      if (targetUserId !== ctx.user.id) {
        const isAdmin = ["admin", "super_admin"].includes(ctx.user.role);
        if (!isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view your own permissions",
          });
        }
      }

      const permissions = await getUserCombinedPermissions(targetUserId, organizationId);

      return {
        userId: targetUserId,
        organizationId,
        permissions,
      };
    }),

  /**
   * Update role permissions (super_admin only)
   */
  updateRolePermissions: protectedProcedure
    .input(updateRolePermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      // Only super_admin can update role permissions
      const isCurrentUserSuperAdmin = await isSuperAdmin(ctx.user.id);
      if (!isCurrentUserSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super administrators can modify role permissions",
        });
      }

      // Find the role
      const role = await db.query.userRoles.findFirst({
        where: eq(userRoles.id, input.roleId),
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Prevent modifying super_admin permissions directly
      // (to prevent locking out all admins)
      if (role.name === "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Super admin role permissions cannot be modified",
        });
      }

      // Update the role
      const [updated] = await db
        .update(userRoles)
        .set({
          permissions: input.permissions,
          updatedAt: new Date(),
        })
        .where(eq(userRoles.id, input.roleId))
        .returning();

      return {
        id: updated.id,
        name: updated.name,
        displayName: updated.displayName,
        description: updated.description,
        permissions: updated.permissions as RolePermissions,
        isSystem: updated.isSystem,
        updatedAt: updated.updatedAt,
      };
    }),

  /**
   * Create a custom role (super_admin only)
   */
  createRole: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50).regex(/^[a-z_]+$/),
        displayName: z.string().min(2).max(100),
        description: z.string().optional(),
        permissions: z.record(z.any()) as z.ZodType<RolePermissions>,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only super_admin can create roles
      const isCurrentUserSuperAdmin = await isSuperAdmin(ctx.user.id);
      if (!isCurrentUserSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super administrators can create roles",
        });
      }

      // Check for duplicate name
      const existing = await db.query.userRoles.findFirst({
        where: eq(userRoles.name, input.name),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A role with this name already exists",
        });
      }

      // Create the role
      const [role] = await db
        .insert(userRoles)
        .values({
          name: input.name,
          displayName: input.displayName,
          description: input.description,
          permissions: input.permissions,
          isSystem: false, // Custom roles are not system roles
        })
        .returning();

      return {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions as RolePermissions,
        isSystem: role.isSystem,
        createdAt: role.createdAt,
      };
    }),

  /**
   * Delete a custom role (super_admin only)
   */
  deleteRole: protectedProcedure
    .input(z.object({ roleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only super_admin can delete roles
      const isCurrentUserSuperAdmin = await isSuperAdmin(ctx.user.id);
      if (!isCurrentUserSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super administrators can delete roles",
        });
      }

      // Find the role
      const role = await db.query.userRoles.findFirst({
        where: eq(userRoles.id, input.roleId),
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Prevent deleting system roles
      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System roles cannot be deleted",
        });
      }

      // Check if role is assigned to any users
      const assignments = await db.query.userRoleAssignments.findMany({
        where: eq(userRoleAssignments.roleId, input.roleId),
      });

      if (assignments.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete role: it is assigned to ${assignments.length} user(s). Remove all assignments first.`,
        });
      }

      // Delete the role
      await db.delete(userRoles).where(eq(userRoles.id, input.roleId));

      return {
        success: true,
        deletedRole: role.name,
      };
    }),

  /**
   * List all users with a specific role
   */
  listUsersWithRole: adminProcedure
    .input(
      z.object({
        roleId: z.string().uuid().optional(),
        roleName: roleNameSchema.optional(),
        organizationId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.roleId && !input.roleName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either roleId or roleName must be provided",
        });
      }

      // Get the role
      const role = await db.query.userRoles.findFirst({
        where: input.roleId
          ? eq(userRoles.id, input.roleId)
          : eq(userRoles.name, input.roleName!),
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Get assignments
      const whereConditions = input.organizationId
        ? and(
            eq(userRoleAssignments.roleId, role.id),
            eq(userRoleAssignments.organizationId, input.organizationId)
          )
        : eq(userRoleAssignments.roleId, role.id);

      const assignments = await db.query.userRoleAssignments.findMany({
        where: whereConditions,
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              status: true,
            },
          },
          organization: {
            columns: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: (assignments, { desc }) => [desc(assignments.assignedAt)],
      });

      const now = new Date();
      return {
        role: {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
        },
        users: assignments.map((a) => ({
          ...a.user,
          organization: a.organization,
          assignedAt: a.assignedAt,
          expiresAt: a.expiresAt,
          isActive: !a.expiresAt || a.expiresAt > now,
        })),
      };
    }),

  /**
   * Initialize default roles (run once during setup)
   * This is idempotent - it won't create duplicates
   */
  initializeDefaultRoles: protectedProcedure.mutation(async ({ ctx }) => {
    // Only super_admin or during initial setup
    const existingRoles = await db.query.userRoles.findMany();

    // If roles already exist and user is not super_admin, deny
    if (existingRoles.length > 0) {
      const isCurrentUserSuperAdmin = await isSuperAdmin(ctx.user.id);
      if (!isCurrentUserSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super administrators can reinitialize roles",
        });
      }
    }

    const { DEFAULT_ROLES } = await import("@nexus/db");

    const results: Array<{ name: string; action: string }> = [];

    for (const roleData of DEFAULT_ROLES) {
      const existing = await db.query.userRoles.findFirst({
        where: eq(userRoles.name, roleData.name),
      });

      if (existing) {
        results.push({ name: roleData.name, action: "skipped (exists)" });
        continue;
      }

      await db.insert(userRoles).values({
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        permissions: roleData.permissions,
        isSystem: true,
      });

      results.push({ name: roleData.name, action: "created" });
    }

    return {
      success: true,
      results,
    };
  }),
});
