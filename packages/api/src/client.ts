// =============================================================================
// @nexus/api/client - tRPC Client Utilities
// =============================================================================

/**
 * Client-side utilities for consuming the Nexus API.
 *
 * This module provides type exports and utilities for creating
 * type-safe tRPC clients in React/Next.js applications.
 *
 * @packageDocumentation
 */

import type { AppRouter } from "./routers";

// Re-export the router type for client usage
export type { AppRouter };

// =============================================================================
// TYPE INFERENCE HELPERS
// =============================================================================

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

/**
 * Inferred input types for all procedures
 * @example
 * type CreateContactInput = RouterInputs["contacts"]["create"];
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inferred output types for all procedures
 * @example
 * type ContactListOutput = RouterOutputs["contacts"]["list"];
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// =============================================================================
// COMMON TYPE EXPORTS
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

// =============================================================================
// TRANSFORMER EXPORT
// =============================================================================

// Re-export superjson for consistent serialization
export { default as superjson } from "superjson";
