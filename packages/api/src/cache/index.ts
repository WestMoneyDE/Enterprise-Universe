// =============================================================================
// CACHE MODULE - Redis-based caching for API performance
// =============================================================================

export {
  // Cache operations
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheInvalidateTag,
  cacheGetOrSet,

  // Cache wrapper
  withCache,

  // Keys and TTL
  CacheKeys,
  CacheTTL,

  // Health and stats
  checkCacheHealth,
  getCacheStats,

  // Types
  type CacheOptions,
  type WithCacheOptions,
} from "./redis";
