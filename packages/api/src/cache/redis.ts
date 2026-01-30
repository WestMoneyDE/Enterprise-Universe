// =============================================================================
// REDIS CACHE - High-performance caching for API responses
// =============================================================================

import { Redis } from "ioredis";

// =============================================================================
// CONNECTION
// =============================================================================

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1)) || 0 : 0,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

// Lazy connection - only connect when needed
let redisClient: Redis | null = null;

function getClient(): Redis {
  if (!redisClient) {
    const options = parseRedisUrl(REDIS_URL);
    redisClient = new Redis({
      ...options,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
    });

    redisClient.on("error", (err) => {
      console.warn("[Cache] Redis error:", err.message);
    });
  }
  return redisClient;
}

// =============================================================================
// CACHE KEYS
// =============================================================================

export const CacheKeys = {
  // Dashboard
  DASHBOARD_STATS: "nexus:dashboard:stats",
  MODULE_STATUS: "nexus:dashboard:modules",

  // Lead Scoring
  LEAD_DISTRIBUTION: "nexus:leads:distribution",
  LEAD_LEADERBOARD: (limit: number, grade?: string) =>
    `nexus:leads:leaderboard:${limit}:${grade || "all"}`,

  // Contacts
  CONTACT: (id: string) => `nexus:contact:${id}`,
  CONTACTS_LIST: (orgId: string, page: number) =>
    `nexus:contacts:${orgId}:page:${page}`,

  // Deals
  DEAL: (id: string) => `nexus:deal:${id}`,
  DEALS_PIPELINE: (orgId: string) => `nexus:deals:pipeline:${orgId}`,

  // AI Agent
  AI_STATS: "nexus:ai:stats",
  AI_CONFIG: "nexus:ai:config",
} as const;

// =============================================================================
// TTL SETTINGS (in seconds)
// =============================================================================

export const CacheTTL = {
  SHORT: 30, // 30 seconds - rapidly changing data
  MEDIUM: 300, // 5 minutes - moderate refresh
  LONG: 900, // 15 minutes - stable data
  HOUR: 3600, // 1 hour - rarely changing
  DAY: 86400, // 24 hours - static data
} as const;

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getClient();
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.warn("[Cache] Get failed:", key, error);
    return null;
  }
}

/**
 * Set a value in cache
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  try {
    const client = getClient();
    const ttl = options.ttl ?? CacheTTL.MEDIUM;
    const serialized = JSON.stringify(value);

    if (ttl > 0) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    // Track tags for invalidation
    if (options.tags?.length) {
      for (const tag of options.tags) {
        await client.sadd(`nexus:tag:${tag}`, key);
      }
    }

    return true;
  } catch (error) {
    console.warn("[Cache] Set failed:", key, error);
    return false;
  }
}

/**
 * Delete a specific cache key
 */
export async function cacheDel(key: string): Promise<boolean> {
  try {
    const client = getClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.warn("[Cache] Delete failed:", key, error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  try {
    const client = getClient();
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;
    return await client.del(...keys);
  } catch (error) {
    console.warn("[Cache] Delete pattern failed:", pattern, error);
    return 0;
  }
}

/**
 * Invalidate all keys with a specific tag
 */
export async function cacheInvalidateTag(tag: string): Promise<number> {
  try {
    const client = getClient();
    const tagKey = `nexus:tag:${tag}`;
    const keys = await client.smembers(tagKey);
    if (keys.length === 0) return 0;

    await client.del(...keys);
    await client.del(tagKey);
    return keys.length;
  } catch (error) {
    console.warn("[Cache] Tag invalidation failed:", tag, error);
    return 0;
  }
}

/**
 * Get or set cache (cache-aside pattern)
 * Returns cached value if exists, otherwise calls fetcher and caches result
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const fresh = await fetcher();

  // Cache it (don't await - fire and forget)
  cacheSet(key, fresh, options).catch(() => {});

  return fresh;
}

// =============================================================================
// CACHE MIDDLEWARE FOR tRPC
// =============================================================================

export interface WithCacheOptions<TInput, TOutput> {
  /** Generate cache key from input */
  key: (input: TInput) => string;
  /** TTL in seconds */
  ttl?: number;
  /** Tags for invalidation */
  tags?: string[];
  /** Whether to skip cache (e.g., for authenticated requests) */
  skip?: (input: TInput) => boolean;
}

/**
 * Higher-order function to wrap a query resolver with caching
 */
export function withCache<TInput, TOutput>(
  resolver: (input: TInput) => Promise<TOutput>,
  options: WithCacheOptions<TInput, TOutput>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput) => {
    // Check if caching should be skipped
    if (options.skip?.(input)) {
      return resolver(input);
    }

    const key = options.key(input);

    return cacheGetOrSet(
      key,
      () => resolver(input),
      {
        ttl: options.ttl ?? CacheTTL.MEDIUM,
        tags: options.tags,
      }
    );
  };
}

// =============================================================================
// CACHE HEALTH CHECK
// =============================================================================

export async function checkCacheHealth(): Promise<{
  connected: boolean;
  latencyMs: number | null;
}> {
  try {
    const client = getClient();
    const start = Date.now();
    await client.ping();
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      connected: false,
      latencyMs: null,
    };
  }
}

// =============================================================================
// CACHE STATS
// =============================================================================

export async function getCacheStats(): Promise<{
  keys: number;
  memoryUsed: string;
  hitRate: string;
}> {
  try {
    const client = getClient();
    const info = await client.info("memory");
    const keyspace = await client.info("keyspace");

    const memMatch = info.match(/used_memory_human:(\S+)/);
    const keysMatch = keyspace.match(/keys=(\d+)/);

    return {
      keys: keysMatch ? parseInt(keysMatch[1]) : 0,
      memoryUsed: memMatch ? memMatch[1] : "0B",
      hitRate: "N/A", // Would need to track hits/misses
    };
  } catch {
    return {
      keys: 0,
      memoryUsed: "0B",
      hitRate: "N/A",
    };
  }
}
