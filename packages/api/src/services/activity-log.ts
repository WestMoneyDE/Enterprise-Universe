// =============================================================================
// ACTIVITY LOG SERVICE - Audit trail and activity tracking
// =============================================================================
// TODO: Migrate to database storage (PostgreSQL with audit_logs table)
// Current implementation uses in-memory Map for development

import { TRPCError } from "@trpc/server";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Types of actions that can be logged
 */
export enum ActivityType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  VIEW = "view",
  EXPORT = "export",
  LOGIN = "login",
  LOGOUT = "logout",
}

/**
 * Types of entities that can be tracked
 */
export enum EntityType {
  CONTACT = "contact",
  DEAL = "deal",
  PROJECT = "project",
  USER = "user",
  ORGANIZATION = "organization",
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a single activity log entry
 */
export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: ActivityType;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  changes?: Record<string, { from?: unknown; to?: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  organizationId?: string | null;
  timestamp: Date;
}

/**
 * Input for logging a new activity
 */
export interface LogActivityInput {
  userId: string;
  userName?: string;
  userEmail?: string;
  action: ActivityType;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  changes?: Record<string, { from?: unknown; to?: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  organizationId?: string | null;
}

/**
 * Filters for querying activity logs
 */
export interface ActivityLogFilters {
  userId?: string;
  entityType?: EntityType;
  entityId?: string;
  action?: ActivityType;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Paginated result for activity log queries
 */
export interface ActivityLogResult {
  items: ActivityLogEntry[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

// =============================================================================
// IN-MEMORY STORAGE
// =============================================================================
// TODO: Replace with database queries when migrating to PostgreSQL
// This Map stores activities indexed by their ID for quick lookup
// Secondary indexes could be added for performance optimization

const activityStore = new Map<string, ActivityLogEntry>();

// Index for quick lookups by entity
const entityIndex = new Map<string, Set<string>>();

// Index for quick lookups by user
const userIndex = new Map<string, Set<string>>();

// Index for quick lookups by organization
const organizationIndex = new Map<string, Set<string>>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates a unique ID for activity entries
 */
function generateId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates an index key for entity lookups
 */
function getEntityKey(entityType: EntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/**
 * Adds an activity to all relevant indexes
 */
function addToIndexes(activity: ActivityLogEntry): void {
  // Entity index
  const entityKey = getEntityKey(activity.entityType, activity.entityId);
  if (!entityIndex.has(entityKey)) {
    entityIndex.set(entityKey, new Set());
  }
  entityIndex.get(entityKey)!.add(activity.id);

  // User index
  if (!userIndex.has(activity.userId)) {
    userIndex.set(activity.userId, new Set());
  }
  userIndex.get(activity.userId)!.add(activity.id);

  // Organization index
  if (activity.organizationId) {
    if (!organizationIndex.has(activity.organizationId)) {
      organizationIndex.set(activity.organizationId, new Set());
    }
    organizationIndex.get(activity.organizationId)!.add(activity.id);
  }
}

/**
 * Removes an activity from all indexes
 */
function removeFromIndexes(activity: ActivityLogEntry): void {
  // Entity index
  const entityKey = getEntityKey(activity.entityType, activity.entityId);
  entityIndex.get(entityKey)?.delete(activity.id);

  // User index
  userIndex.get(activity.userId)?.delete(activity.id);

  // Organization index
  if (activity.organizationId) {
    organizationIndex.get(activity.organizationId)?.delete(activity.id);
  }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Logs a new activity to the audit trail
 *
 * @param input - The activity details to log
 * @returns The created activity log entry
 *
 * @example
 * ```typescript
 * const activity = await logActivity({
 *   userId: "user_123",
 *   action: ActivityType.CREATE,
 *   entityType: EntityType.CONTACT,
 *   entityId: "contact_456",
 *   entityName: "John Doe",
 *   changes: {
 *     email: { from: null, to: "john@example.com" }
 *   },
 *   metadata: {
 *     source: "web_form"
 *   }
 * });
 * ```
 */
export function logActivity(input: LogActivityInput): ActivityLogEntry {
  const activity: ActivityLogEntry = {
    id: generateId(),
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    changes: input.changes,
    metadata: input.metadata,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    organizationId: input.organizationId,
    timestamp: new Date(),
  };

  // Store in main map
  activityStore.set(activity.id, activity);

  // Add to indexes
  addToIndexes(activity);

  // Log for debugging (remove in production)
  console.log(`[ACTIVITY_LOG] ${activity.action} ${activity.entityType}:${activity.entityId} by ${activity.userId}`);

  return activity;
}

/**
 * Retrieves activity logs based on filters
 *
 * @param filters - Optional filters to narrow down results
 * @returns Paginated activity log results
 *
 * @example
 * ```typescript
 * // Get recent activities
 * const recent = getActivityLog({ limit: 20 });
 *
 * // Get activities for a specific entity
 * const contactActivities = getActivityLog({
 *   entityType: EntityType.CONTACT,
 *   entityId: "contact_456"
 * });
 *
 * // Get activities by a specific user
 * const userActivities = getActivityLog({
 *   userId: "user_123",
 *   startDate: new Date("2024-01-01")
 * });
 * ```
 */
export function getActivityLog(filters: ActivityLogFilters = {}): ActivityLogResult {
  const {
    userId,
    entityType,
    entityId,
    action,
    organizationId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  // Start with all activities or use index for optimization
  let activityIds: Set<string> | null = null;

  // Use entity index if both entityType and entityId are provided
  if (entityType && entityId) {
    const entityKey = getEntityKey(entityType, entityId);
    activityIds = entityIndex.get(entityKey) || new Set();
  }
  // Use user index if userId is provided
  else if (userId) {
    activityIds = userIndex.get(userId) || new Set();
  }
  // Use organization index if organizationId is provided
  else if (organizationId) {
    activityIds = organizationIndex.get(organizationId) || new Set();
  }

  // Get activities from store
  let activities: ActivityLogEntry[];
  if (activityIds !== null) {
    activities = Array.from(activityIds)
      .map((id) => activityStore.get(id))
      .filter((a): a is ActivityLogEntry => a !== undefined);
  } else {
    activities = Array.from(activityStore.values());
  }

  // Apply filters
  activities = activities.filter((activity) => {
    // Filter by userId if not already filtered by index
    if (userId && activity.userId !== userId) return false;

    // Filter by entityType
    if (entityType && activity.entityType !== entityType) return false;

    // Filter by entityId (when entityType was provided alone)
    if (entityId && activity.entityId !== entityId) return false;

    // Filter by action
    if (action && activity.action !== action) return false;

    // Filter by organization (when not already filtered by index)
    if (organizationId && activity.organizationId !== organizationId) return false;

    // Filter by date range
    if (startDate && activity.timestamp < startDate) return false;
    if (endDate && activity.timestamp > endDate) return false;

    return true;
  });

  // Sort by timestamp descending (newest first)
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Get total before pagination
  const total = activities.length;

  // Apply pagination
  const paginatedActivities = activities.slice(offset, offset + limit);

  return {
    items: paginatedActivities,
    total,
    hasMore: offset + paginatedActivities.length < total,
    limit,
    offset,
  };
}

/**
 * Gets a single activity by ID
 *
 * @param id - The activity ID
 * @returns The activity entry or null if not found
 */
export function getActivityById(id: string): ActivityLogEntry | null {
  return activityStore.get(id) || null;
}

/**
 * Gets activities for a specific entity
 *
 * @param entityType - The type of entity
 * @param entityId - The entity ID
 * @param limit - Maximum number of results
 * @returns Array of activity entries for the entity
 */
export function getActivitiesByEntity(
  entityType: EntityType,
  entityId: string,
  limit = 50
): ActivityLogEntry[] {
  const result = getActivityLog({ entityType, entityId, limit });
  return result.items;
}

/**
 * Gets activities by a specific user
 *
 * @param userId - The user ID
 * @param limit - Maximum number of results
 * @returns Array of activity entries by the user
 */
export function getActivitiesByUser(userId: string, limit = 50): ActivityLogEntry[] {
  const result = getActivityLog({ userId, limit });
  return result.items;
}

/**
 * Gets activity statistics
 *
 * @param organizationId - Optional organization filter
 * @param hours - Time window in hours (default 24)
 * @returns Statistics about activities
 */
export function getActivityStats(
  organizationId?: string,
  hours = 24
): {
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  recentActivity: ActivityLogEntry[];
} {
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  const result = getActivityLog({
    organizationId,
    startDate,
    limit: 1000, // Get enough for stats
  });

  const byAction: Record<string, number> = {};
  const byEntityType: Record<string, number> = {};

  for (const activity of result.items) {
    byAction[activity.action] = (byAction[activity.action] || 0) + 1;
    byEntityType[activity.entityType] = (byEntityType[activity.entityType] || 0) + 1;
  }

  return {
    total: result.total,
    byAction,
    byEntityType,
    recentActivity: result.items.slice(0, 10),
  };
}

/**
 * Clears old activities (for maintenance)
 * TODO: In production, this should archive to cold storage instead
 *
 * @param olderThan - Delete activities older than this date
 * @returns Number of activities deleted
 */
export function clearOldActivities(olderThan: Date): number {
  let deleted = 0;

  for (const [id, activity] of activityStore) {
    if (activity.timestamp < olderThan) {
      removeFromIndexes(activity);
      activityStore.delete(id);
      deleted++;
    }
  }

  console.log(`[ACTIVITY_LOG] Cleared ${deleted} activities older than ${olderThan.toISOString()}`);
  return deleted;
}

/**
 * Gets the current size of the activity store
 * Useful for monitoring memory usage
 */
export function getStoreSize(): { activities: number; entityIndexes: number; userIndexes: number } {
  return {
    activities: activityStore.size,
    entityIndexes: entityIndex.size,
    userIndexes: userIndex.size,
  };
}

// =============================================================================
// CONVENIENCE HELPERS
// =============================================================================

/**
 * Logs a create action
 */
export function logCreate(
  userId: string,
  entityType: EntityType,
  entityId: string,
  entityName?: string,
  metadata?: Record<string, unknown>,
  organizationId?: string | null
): ActivityLogEntry {
  return logActivity({
    userId,
    action: ActivityType.CREATE,
    entityType,
    entityId,
    entityName,
    metadata,
    organizationId,
  });
}

/**
 * Logs an update action with changes
 */
export function logUpdate(
  userId: string,
  entityType: EntityType,
  entityId: string,
  changes: Record<string, { from?: unknown; to?: unknown }>,
  entityName?: string,
  organizationId?: string | null
): ActivityLogEntry {
  return logActivity({
    userId,
    action: ActivityType.UPDATE,
    entityType,
    entityId,
    entityName,
    changes,
    organizationId,
  });
}

/**
 * Logs a delete action
 */
export function logDelete(
  userId: string,
  entityType: EntityType,
  entityId: string,
  entityName?: string,
  organizationId?: string | null
): ActivityLogEntry {
  return logActivity({
    userId,
    action: ActivityType.DELETE,
    entityType,
    entityId,
    entityName,
    organizationId,
  });
}

/**
 * Logs a view action
 */
export function logView(
  userId: string,
  entityType: EntityType,
  entityId: string,
  entityName?: string,
  organizationId?: string | null
): ActivityLogEntry {
  return logActivity({
    userId,
    action: ActivityType.VIEW,
    entityType,
    entityId,
    entityName,
    organizationId,
  });
}

/**
 * Logs an export action
 */
export function logExport(
  userId: string,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>,
  organizationId?: string | null
): ActivityLogEntry {
  return logActivity({
    userId,
    action: ActivityType.EXPORT,
    entityType,
    entityId,
    metadata,
    organizationId,
  });
}

/**
 * Logs a login action
 */
export function logLogin(
  userId: string,
  ipAddress?: string | null,
  userAgent?: string | null,
  organizationId?: string | null
): ActivityLogEntry {
  return logActivity({
    userId,
    action: ActivityType.LOGIN,
    entityType: EntityType.USER,
    entityId: userId,
    ipAddress,
    userAgent,
    organizationId,
  });
}

/**
 * Logs a logout action
 */
export function logLogout(
  userId: string,
  organizationId?: string | null
): ActivityLogEntry {
  return logActivity({
    userId,
    action: ActivityType.LOGOUT,
    entityType: EntityType.USER,
    entityId: userId,
    organizationId,
  });
}
