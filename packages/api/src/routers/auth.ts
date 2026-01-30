import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as OTPAuth from "otpauth";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import {
  db,
  users,
  organizations,
  eq,
  and,
} from "@nexus/db";

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  preferences: z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
    }).optional(),
    dashboardLayout: z.string().optional(),
  }).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// =============================================================================
// AUTH ROUTER
// =============================================================================

export const authRouter = createTRPCRouter({
  // Get current session user
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        organizationId: true,
        role: true,
        preferences: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
      with: {
        organization: {
          columns: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            subsidiary: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const [user] = await db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning();

      return user;
    }),

  // Change password (for credential-based auth)
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password authentication not enabled for this account",
        });
      }

      // Verify current password
      const isValid = await verifyPassword(input.currentPassword, user.hashedPassword);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(input.newPassword);

      await db
        .update(users)
        .set({
          hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // Enable 2FA
  enable2FA: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (user.twoFactorEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "2FA is already enabled",
      });
    }

    // Generate secret
    const secret = generateTOTPSecret();

    // Store secret (but don't enable yet - need verification)
    await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.user.id));

    // Generate QR code URL
    const otpauthUrl = `otpauth://totp/NexusCommandCenter:${user.email}?secret=${secret}&issuer=NexusCommandCenter`;

    return {
      secret,
      qrCodeUrl: otpauthUrl,
    };
  }),

  // Verify and enable 2FA
  verify2FA: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user || !user.twoFactorSecret) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA setup not initiated",
        });
      }

      // Verify TOTP code
      const isValid = verifyTOTP(input.code, user.twoFactorSecret);

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code",
        });
      }

      // Enable 2FA
      await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // Disable 2FA
  disable2FA: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA is not enabled",
        });
      }

      // Verify TOTP code
      const isValid = verifyTOTP(input.code, user.twoFactorSecret);

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code",
        });
      }

      // Disable 2FA
      await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // Get user sessions (for security page)
  sessions: protectedProcedure.query(async ({ ctx }) => {
    // This would typically query active sessions from your session store
    // For now, return a placeholder
    return {
      current: {
        id: ctx.session?.expires,
        createdAt: new Date(),
        expiresAt: ctx.session?.expires,
      },
      others: [],
    };
  }),

  // Delete account
  deleteAccount: protectedProcedure
    .input(z.object({
      confirmation: z.literal("DELETE MY ACCOUNT"),
      password: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // If user has password, verify it
      if (user.hashedPassword && input.password) {
        const isValid = await verifyPassword(input.password, user.hashedPassword);
        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Password is incorrect",
          });
        }
      }

      // Can't delete super_admin
      if (user.role === "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Super admin accounts cannot be deleted",
        });
      }

      // Soft delete - deactivate account
      await db
        .update(users)
        .set({
          isActive: false,
          email: `deleted_${Date.now()}_${user.email}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  // Derive key
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, "0")).join("");

  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [saltHex, hashHex] = hashedPassword.split(":");

  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const computedHashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, "0")).join("");

  return computedHashHex === hashHex;
}

// =============================================================================
// TOTP FUNCTIONS (RFC 6238 compliant using otpauth library)
// =============================================================================

/**
 * Generate a cryptographically secure TOTP secret (Base32 encoded)
 * Uses 20 bytes of entropy as recommended by RFC 4226
 */
function generateTOTPSecret(): string {
  // Generate 20 bytes of random data (160 bits) - recommended for TOTP
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Verify a TOTP code against the stored secret
 * Allows for time drift of ±1 time step (±30 seconds)
 */
function verifyTOTP(code: string, secret: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: "NexusCommandCenter",
      label: "User",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Validate with window of 1 (allows ±30 seconds drift)
    // Returns null if invalid, or the delta (time step difference) if valid
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

/**
 * Generate the current TOTP code (for testing/debugging only)
 */
function generateCurrentTOTPCode(secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "NexusCommandCenter",
    label: "User",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.generate();
}
