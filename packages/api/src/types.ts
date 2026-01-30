// =============================================================================
// SESSION & USER TYPES
// =============================================================================

/**
 * User type compatible with next-auth session user
 */
export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  // Extended fields from database
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  organizationId: string | null;
  role: "super_admin" | "admin" | "manager" | "member" | "viewer" | string;
}

/**
 * Session type compatible with next-auth session
 */
export interface Session {
  user: User;
  expires: string;
}

// =============================================================================
// PAGINATION
// =============================================================================

export interface PaginationInput {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

// =============================================================================
// FILTERS
// =============================================================================

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SortOption {
  field: string;
  direction: "asc" | "desc";
}

// =============================================================================
// COMMON RESPONSE TYPES
// =============================================================================

export interface OperationResult {
  success: boolean;
  message?: string;
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
