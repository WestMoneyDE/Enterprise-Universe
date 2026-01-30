// =============================================================================
// HEALTH CHECK API ENDPOINT
// Returns system health status for monitoring and load balancers
// =============================================================================

import { NextResponse } from "next/server";

interface HealthCheck {
  name: string;
  status: "healthy" | "unhealthy";
  latencyMs?: number;
  message?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  timestamp: string;
  checks: Record<string, HealthCheck>;
}

// Track process start time for uptime calculation
const startTime = Date.now();

/**
 * GET /api/health
 * Returns comprehensive health status
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks: HealthCheck[] = [];
  let overallStatus: HealthResponse["status"] = "healthy";

  // Database check
  const dbCheck = await checkDatabase();
  checks.push(dbCheck);
  if (dbCheck.status === "unhealthy") overallStatus = "unhealthy";

  // Redis check (if configured)
  if (process.env.REDIS_URL) {
    const redisCheck = await checkRedis();
    checks.push(redisCheck);
    if (redisCheck.status === "unhealthy") overallStatus = "degraded";
  }

  // Memory check
  const memoryCheck = checkMemory();
  checks.push(memoryCheck);
  if (memoryCheck.status === "unhealthy") overallStatus = "degraded";

  // Convert checks array to object
  const checksMap = checks.reduce(
    (acc, check) => ({
      ...acc,
      [check.name]: check,
    }),
    {} as Record<string, HealthCheck>
  );

  const response: HealthResponse = {
    status: overallStatus,
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: checksMap,
  };

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Simplified check - in production, use actual DB query
    // const { db } = await import("@nexus/db");
    // await db.execute(sql`SELECT 1`);

    // Mock successful check for now
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      name: "database",
      status: "healthy",
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: "database",
      status: "unhealthy",
      latencyMs: Date.now() - startTime,
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Mock successful check - in production, use actual Redis client
    await new Promise((resolve) => setTimeout(resolve, 5));

    return {
      name: "redis",
      status: "healthy",
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: "redis",
      status: "unhealthy",
      latencyMs: Date.now() - startTime,
      message: error instanceof Error ? error.message : "Redis connection failed",
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheck {
  const used = process.memoryUsage();
  const heapUsedMb = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(used.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((heapUsedMb / heapTotalMb) * 100);

  const CRITICAL_THRESHOLD = 90;
  const WARNING_THRESHOLD = 80;

  let status: HealthCheck["status"] = "healthy";
  let message: string | undefined;

  if (usagePercent >= CRITICAL_THRESHOLD) {
    status = "unhealthy";
    message = `Memory usage critical: ${usagePercent}% (${heapUsedMb}MB / ${heapTotalMb}MB)`;
  } else if (usagePercent >= WARNING_THRESHOLD) {
    message = `Memory usage high: ${usagePercent}% (${heapUsedMb}MB / ${heapTotalMb}MB)`;
  }

  return {
    name: "memory",
    status,
    message,
  };
}
