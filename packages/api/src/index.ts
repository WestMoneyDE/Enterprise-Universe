// =============================================================================
// @nexus/api - tRPC API Package
// =============================================================================

/**
 * Nexus Command Center API
 *
 * Type-safe tRPC API for the Nexus Command Center platform.
 * Provides endpoints for:
 * - User authentication and profile management
 * - Organization and team management
 * - Contact management (CRM)
 * - Deal pipeline management
 * - Construction project management (West Money Bau)
 * - Email campaign management
 *
 * @packageDocumentation
 */

// =============================================================================
// ROUTER EXPORTS
// =============================================================================

export { appRouter, type AppRouter } from "./routers";

// Individual routers for granular imports
export { authRouter } from "./routers/auth";
export { contactsRouter } from "./routers/contacts";
export { dealsRouter, pipelinesRouter } from "./routers/deals";
export { projectsRouter } from "./routers/projects";
export { campaignsRouter, emailTemplatesRouter } from "./routers/campaigns";
export { organizationsRouter } from "./routers/organizations";

// =============================================================================
// tRPC EXPORTS
// =============================================================================

export {
  createTRPCRouter,
  createCallerFactory,
  mergeRouters,
  publicProcedure,
  protectedProcedure,
  orgProcedure,
  adminProcedure,
  createContext,
  type Context,
  type CreateContextOptions,
} from "./trpc";

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  User,
  Session,
  PaginationInput,
  PaginatedResult,
  DateRange,
  SortOption,
  OperationResult,
  BulkOperationResult,
} from "./types";
