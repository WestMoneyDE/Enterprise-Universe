import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Session, User } from "./types";

// =============================================================================
// CONTEXT
// =============================================================================

export interface Context {
  session: Session | null;
  user: User | null;
  organizationId: string | null;
  requestId: string;
  ipAddress: string | null;
}

export type CreateContextOptions = {
  session: Session | null;
  headers: Headers;
};

export function createContext(opts: CreateContextOptions): Context {
  const requestId = opts.headers.get("x-request-id") ?? crypto.randomUUID();
  const ipAddress = opts.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  return {
    session: opts.session,
    user: opts.session?.user ?? null,
    organizationId: opts.session?.user?.organizationId ?? null,
    requestId,
    ipAddress,
  };
}

// =============================================================================
// tRPC INITIALIZATION
// =============================================================================

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// =============================================================================
// ROUTER & PROCEDURE EXPORTS
// =============================================================================

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const mergeRouters = t.mergeRouters;

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Error logging middleware - logs errors with context for debugging
 */
const errorLoggingMiddleware = t.middleware(async ({ path, type, ctx, next }) => {
  try {
    return await next();
  } catch (error) {
    const errorDetails = {
      path,
      type,
      requestId: ctx.requestId,
      userId: ctx.user?.id,
      organizationId: ctx.organizationId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      } : String(error),
    };

    console.error("[API_ERROR]", JSON.stringify(errorDetails, null, 2));

    throw error;
  }
});

/**
 * Timing middleware - logs procedure execution time
 */
const timingMiddleware = t.middleware(async ({ path, type, ctx, next }) => {
  const start = Date.now();

  const result = await next();

  const duration = Date.now() - start;

  if (duration > 100) {
    console.log(`[SLOW] ${type} ${path} took ${duration}ms (requestId: ${ctx.requestId})`);
  }

  return result;
});

/**
 * Authentication middleware - ensures user is logged in
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
      organizationId: ctx.organizationId,
    },
  });
});

/**
 * Organization middleware - ensures user belongs to an organization
 * Narrows organizationId to string (non-null) after validation
 */
const hasOrganization = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  if (!ctx.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must belong to an organization to perform this action",
    });
  }

  // Type assertion: organizationId is guaranteed non-null after the check above
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
      organizationId: ctx.organizationId as string,
    },
  });
});

/**
 * Admin middleware - ensures user is admin or super_admin
 * Also validates organization membership
 */
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  if (!["admin", "super_admin"].includes(ctx.user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to perform this action",
    });
  }

  if (!ctx.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must belong to an organization to perform this action",
    });
  }

  // Type assertion: organizationId is guaranteed non-null after the check above
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
      organizationId: ctx.organizationId as string,
    },
  });
});

// =============================================================================
// PROCEDURES
// =============================================================================

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure
  .use(errorLoggingMiddleware)
  .use(timingMiddleware);

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure
  .use(errorLoggingMiddleware)
  .use(timingMiddleware)
  .use(isAuthed);

/**
 * Organization procedure - requires authentication AND organization membership
 */
export const orgProcedure = t.procedure
  .use(errorLoggingMiddleware)
  .use(timingMiddleware)
  .use(hasOrganization);

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = t.procedure
  .use(errorLoggingMiddleware)
  .use(timingMiddleware)
  .use(isAdmin);
