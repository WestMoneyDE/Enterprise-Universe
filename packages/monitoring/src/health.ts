// =============================================================================
// HEALTH CHECK & SYSTEM MONITORING
// Unified health checks and system status monitoring
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastChecked: Date;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: Date;
  services: ServiceHealth[];
}

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export type HealthCheckFn = () => Promise<HealthCheckResult>;

// =============================================================================
// HEALTH CHECK REGISTRY
// =============================================================================

class HealthCheckRegistry {
  private checks: Map<string, HealthCheckFn> = new Map();
  private startTime: Date = new Date();

  /**
   * Register a health check
   */
  register(name: string, check: HealthCheckFn): void {
    this.checks.set(name, check);
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): void {
    this.checks.delete(name);
  }

  /**
   * Run all registered health checks
   */
  async runAll(timeout = 5000): Promise<SystemHealth> {
    const services: ServiceHealth[] = [];
    let overallStatus: HealthStatus = "healthy";

    for (const [name, check] of this.checks) {
      try {
        const startTime = Date.now();

        // Run check with timeout
        const result = await Promise.race([
          check(),
          new Promise<HealthCheckResult>((_, reject) =>
            setTimeout(() => reject(new Error("Health check timeout")), timeout)
          ),
        ]);

        const latencyMs = Date.now() - startTime;

        services.push({
          name,
          status: result.healthy ? "healthy" : "unhealthy",
          latencyMs: result.latencyMs ?? latencyMs,
          message: result.message,
          lastChecked: new Date(),
          metadata: result.metadata,
        });

        if (!result.healthy) {
          overallStatus = "unhealthy";
        }
      } catch (error) {
        services.push({
          name,
          status: "unhealthy",
          message: error instanceof Error ? error.message : String(error),
          lastChecked: new Date(),
        });
        overallStatus = "unhealthy";
      }
    }

    // Check for degraded status (some services slow)
    const slowServices = services.filter(
      (s) => s.status === "healthy" && s.latencyMs && s.latencyMs > 1000
    );
    if (slowServices.length > 0 && overallStatus === "healthy") {
      overallStatus = "degraded";
    }

    return {
      status: overallStatus,
      version: process.env.npm_package_version || "1.0.0",
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      timestamp: new Date(),
      services,
    };
  }

  /**
   * Run a specific health check
   */
  async runOne(name: string, timeout = 5000): Promise<ServiceHealth | null> {
    const check = this.checks.get(name);
    if (!check) return null;

    try {
      const startTime = Date.now();

      const result = await Promise.race([
        check(),
        new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), timeout)
        ),
      ]);

      return {
        name,
        status: result.healthy ? "healthy" : "unhealthy",
        latencyMs: result.latencyMs ?? (Date.now() - startTime),
        message: result.message,
        lastChecked: new Date(),
        metadata: result.metadata,
      };
    } catch (error) {
      return {
        name,
        status: "unhealthy",
        message: error instanceof Error ? error.message : String(error),
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Get list of registered checks
   */
  getRegisteredChecks(): string[] {
    return Array.from(this.checks.keys());
  }
}

// Global registry instance
export const healthRegistry = new HealthCheckRegistry();

// =============================================================================
// PRE-BUILT HEALTH CHECKS
// =============================================================================

/**
 * Create a database health check
 */
export function createDatabaseCheck(
  queryFn: () => Promise<unknown>,
  name = "database"
): { name: string; check: HealthCheckFn } {
  return {
    name,
    check: async () => {
      const startTime = Date.now();

      try {
        await queryFn();
        return {
          healthy: true,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        return {
          healthy: false,
          latencyMs: Date.now() - startTime,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Create a Redis health check
 */
export function createRedisCheck(
  pingFn: () => Promise<string>,
  name = "redis"
): { name: string; check: HealthCheckFn } {
  return {
    name,
    check: async () => {
      const startTime = Date.now();

      try {
        const result = await pingFn();
        return {
          healthy: result === "PONG",
          latencyMs: Date.now() - startTime,
          message: result !== "PONG" ? `Unexpected response: ${result}` : undefined,
        };
      } catch (error) {
        return {
          healthy: false,
          latencyMs: Date.now() - startTime,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Create an HTTP endpoint health check
 */
export function createHttpCheck(
  url: string,
  options: { timeout?: number; expectedStatus?: number } = {},
  name?: string
): { name: string; check: HealthCheckFn } {
  const { timeout = 5000, expectedStatus = 200 } = options;

  return {
    name: name || new URL(url).hostname,
    check: async () => {
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return {
          healthy: response.status === expectedStatus,
          latencyMs: Date.now() - startTime,
          message: response.status !== expectedStatus
            ? `Expected ${expectedStatus}, got ${response.status}`
            : undefined,
          metadata: {
            statusCode: response.status,
          },
        };
      } catch (error) {
        return {
          healthy: false,
          latencyMs: Date.now() - startTime,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Create a memory usage health check
 */
export function createMemoryCheck(
  options: { warningThresholdMb?: number; criticalThresholdMb?: number } = {}
): { name: string; check: HealthCheckFn } {
  const { warningThresholdMb = 1024, criticalThresholdMb = 2048 } = options;

  return {
    name: "memory",
    check: async () => {
      const used = process.memoryUsage();
      const heapUsedMb = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotalMb = Math.round(used.heapTotal / 1024 / 1024);

      let healthy = true;
      let message: string | undefined;

      if (heapUsedMb > criticalThresholdMb) {
        healthy = false;
        message = `Memory usage critical: ${heapUsedMb}MB (threshold: ${criticalThresholdMb}MB)`;
      } else if (heapUsedMb > warningThresholdMb) {
        message = `Memory usage high: ${heapUsedMb}MB (threshold: ${warningThresholdMb}MB)`;
      }

      return {
        healthy,
        latencyMs: 0,
        message,
        metadata: {
          heapUsedMb,
          heapTotalMb,
          rssMb: Math.round(used.rss / 1024 / 1024),
          externalMb: Math.round(used.external / 1024 / 1024),
        },
      };
    },
  };
}

/**
 * Create a disk space health check (requires Node.js fs module)
 */
export function createDiskCheck(
  path: string,
  options: { warningThresholdPct?: number; criticalThresholdPct?: number } = {}
): { name: string; check: HealthCheckFn } {
  const { warningThresholdPct = 80, criticalThresholdPct = 95 } = options;

  return {
    name: "disk",
    check: async () => {
      // Simplified check - in production, use statvfs or similar
      try {
        // Mock implementation - replace with actual disk check
        const usedPct = 50; // Would be calculated from actual disk stats

        let healthy = true;
        let message: string | undefined;

        if (usedPct > criticalThresholdPct) {
          healthy = false;
          message = `Disk usage critical: ${usedPct}% (threshold: ${criticalThresholdPct}%)`;
        } else if (usedPct > warningThresholdPct) {
          message = `Disk usage high: ${usedPct}% (threshold: ${warningThresholdPct}%)`;
        }

        return {
          healthy,
          latencyMs: 0,
          message,
          metadata: {
            path,
            usedPercent: usedPct,
          },
        };
      } catch (error) {
        return {
          healthy: false,
          latencyMs: 0,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

// =============================================================================
// HEALTH ENDPOINT HELPERS
// =============================================================================

/**
 * Format health status for API response
 */
export function formatHealthResponse(health: SystemHealth): {
  status: number;
  body: unknown;
} {
  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  return {
    status: statusCode,
    body: {
      status: health.status,
      version: health.version,
      uptime: health.uptime,
      timestamp: health.timestamp.toISOString(),
      checks: health.services.reduce(
        (acc, service) => ({
          ...acc,
          [service.name]: {
            status: service.status,
            latencyMs: service.latencyMs,
            message: service.message,
          },
        }),
        {}
      ),
    },
  };
}

/**
 * Simple liveness check (always returns healthy if the process is running)
 */
export function livenessCheck(): { status: "ok" } {
  return { status: "ok" };
}

/**
 * Readiness check (runs all health checks)
 */
export async function readinessCheck(): Promise<SystemHealth> {
  return healthRegistry.runAll();
}
