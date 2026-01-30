// =============================================================================
// REDIS CONNECTION - Shared connection for all queues and workers
// =============================================================================

import { Redis } from 'ioredis';

// Get Redis URL from environment
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL for connection options
function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1)) || 0 : 0,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  } catch {
    // Fallback for simple host:port format
    const [host, port] = url.replace('redis://', '').split(':');
    return {
      host: host || 'localhost',
      port: parseInt(port) || 6379,
    };
  }
}

const connectionOptions = parseRedisUrl(REDIS_URL);

// Create Redis connection for BullMQ
// BullMQ requires maxRetriesPerRequest to be null
export const connection = new Redis({
  ...connectionOptions,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error('❌ Redis connection failed after 10 retries');
      return null;
    }
    const delay = Math.min(times * 200, 5000);
    console.log(`🔄 Redis reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
});

// Connection event handlers
connection.on('connect', () => {
  console.log('✅ Redis connected');
});

connection.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

connection.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

// Create a separate connection for subscribers (BullMQ recommendation)
export const subscriberConnection = new Redis({
  ...connectionOptions,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await connection.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

// Graceful shutdown
export async function closeConnections(): Promise<void> {
  await connection.quit();
  await subscriberConnection.quit();
  console.log('🔌 Redis connections closed');
}

// Export connection config for workers that need to create their own connections
export { connectionOptions };
