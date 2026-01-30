// =============================================================================
// @nexus/db - Database Package
// =============================================================================

// Re-export everything from schema
export * from "./schema";

// Re-export database client
export * from "./client";

// Re-export drizzle-orm utilities that consumers might need
export { eq, ne, gt, gte, lt, lte, like, ilike, and, or, not, inArray, notInArray, isNull, isNotNull, asc, desc, sql, count, sum, avg, min, max } from "drizzle-orm";
