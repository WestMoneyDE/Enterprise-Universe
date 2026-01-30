// =============================================================================
// SENTRY ERROR TRACKING
// Centralized error tracking and monitoring with Sentry
// =============================================================================

/**
 * Sentry configuration options
 */
export interface SentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  debug?: boolean;
  enabled?: boolean;
}

/**
 * Error context for enhanced error reporting
 */
export interface ErrorContext {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    organizationId?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: "fatal" | "error" | "warning" | "info" | "debug";
}

/**
 * Breadcrumb for tracking user actions
 */
export interface Breadcrumb {
  category: string;
  message: string;
  level?: "fatal" | "error" | "warning" | "info" | "debug";
  data?: Record<string, unknown>;
  timestamp?: number;
}

// =============================================================================
// SERVER-SIDE SENTRY UTILITIES
// =============================================================================

/**
 * Get default Sentry configuration from environment
 */
export function getDefaultSentryConfig(): SentryConfig {
  return {
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "",
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: process.env.NODE_ENV === "development",
    enabled: process.env.NODE_ENV === "production",
  };
}

/**
 * Create Sentry initialization config for Next.js
 */
export function createSentryNextConfig(config: Partial<SentryConfig> = {}) {
  const defaultConfig = getDefaultSentryConfig();
  const mergedConfig = { ...defaultConfig, ...config };

  return {
    dsn: mergedConfig.dsn,
    environment: mergedConfig.environment,
    release: mergedConfig.release,
    tracesSampleRate: mergedConfig.tracesSampleRate,
    replaysSessionSampleRate: mergedConfig.replaysSessionSampleRate,
    replaysOnErrorSampleRate: mergedConfig.replaysOnErrorSampleRate,
    debug: mergedConfig.debug,
    enabled: mergedConfig.enabled,

    // Integration filters
    integrations(integrations: unknown[]) {
      return integrations.filter((integration) => {
        // Filter out any problematic integrations
        return integration;
      });
    },

    // Error filtering
    beforeSend(event: unknown) {
      // Filter out certain errors
      const err = event as { exception?: { values?: Array<{ type?: string; value?: string }> } };
      if (err.exception?.values?.[0]) {
        const errorType = err.exception.values[0].type;
        const errorValue = err.exception.values[0].value;

        // Filter out known non-actionable errors
        if (
          errorType === "ChunkLoadError" ||
          errorValue?.includes("Loading chunk") ||
          errorValue?.includes("Failed to fetch")
        ) {
          return null;
        }
      }
      return event;
    },
  };
}

// =============================================================================
// ERROR CAPTURE UTILITIES
// =============================================================================

/**
 * Enhanced error capture with context
 */
export function captureError(
  error: Error | string,
  context?: ErrorContext
): string {
  // In production, this would use Sentry.captureException
  // For now, log to console and return a mock event ID
  const errorObj = typeof error === "string" ? new Error(error) : error;

  console.error("[Sentry] Captured error:", {
    error: errorObj.message,
    stack: errorObj.stack,
    context,
  });

  // Return a mock event ID (in production, this would be the Sentry event ID)
  return `mock-event-${Date.now()}`;
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: ErrorContext["level"] = "info",
  context?: Omit<ErrorContext, "level">
): string {
  console.log(`[Sentry] Captured message (${level}):`, {
    message,
    ...context,
  });

  return `mock-event-${Date.now()}`;
}

/**
 * Set user context for error tracking
 */
export function setUser(user: ErrorContext["user"] | null): void {
  if (user) {
    console.log("[Sentry] Set user context:", user);
  } else {
    console.log("[Sentry] Cleared user context");
  }
}

/**
 * Set tags for the current scope
 */
export function setTags(tags: Record<string, string>): void {
  console.log("[Sentry] Set tags:", tags);
}

/**
 * Add a breadcrumb for tracking user actions
 */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  console.log("[Sentry] Added breadcrumb:", breadcrumb);
}

// =============================================================================
// TRANSACTION UTILITIES (FOR APM)
// =============================================================================

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(options: {
  name: string;
  op: string;
  description?: string;
  data?: Record<string, unknown>;
}) {
  const startTime = Date.now();

  console.log("[Sentry] Started transaction:", options.name);

  return {
    name: options.name,
    op: options.op,
    startTime,

    setData(key: string, value: unknown) {
      console.log(`[Sentry] Transaction data: ${key}=`, value);
    },

    setStatus(status: "ok" | "error" | "cancelled") {
      console.log(`[Sentry] Transaction status: ${status}`);
    },

    finish() {
      const duration = Date.now() - startTime;
      console.log(`[Sentry] Finished transaction: ${options.name} (${duration}ms)`);
    },
  };
}

/**
 * Create a child span within a transaction
 */
export function startSpan(options: {
  name: string;
  op: string;
  description?: string;
}) {
  const startTime = Date.now();

  console.log("[Sentry] Started span:", options.name);

  return {
    name: options.name,
    startTime,

    finish() {
      const duration = Date.now() - startTime;
      console.log(`[Sentry] Finished span: ${options.name} (${duration}ms)`);
    },
  };
}

// =============================================================================
// ERROR BOUNDARY HELPER
// =============================================================================

/**
 * Error handler for React Error Boundaries
 */
export function handleErrorBoundary(
  error: Error,
  errorInfo: { componentStack: string }
): string {
  return captureError(error, {
    extra: {
      componentStack: errorInfo.componentStack,
    },
    tags: {
      errorBoundary: "true",
    },
  });
}

// =============================================================================
// API ERROR TRACKING
// =============================================================================

/**
 * Track API errors with full context
 */
export function trackApiError(
  endpoint: string,
  method: string,
  statusCode: number,
  error: Error | string,
  requestData?: unknown
): string {
  return captureError(
    typeof error === "string" ? new Error(error) : error,
    {
      tags: {
        api_endpoint: endpoint,
        http_method: method,
        status_code: String(statusCode),
      },
      extra: {
        requestData,
      },
    }
  );
}

/**
 * Track slow API responses
 */
export function trackSlowApi(
  endpoint: string,
  method: string,
  durationMs: number,
  threshold = 3000
): void {
  if (durationMs > threshold) {
    captureMessage(
      `Slow API response: ${method} ${endpoint} took ${durationMs}ms`,
      "warning",
      {
        tags: {
          api_endpoint: endpoint,
          http_method: method,
        },
        extra: {
          duration_ms: durationMs,
          threshold_ms: threshold,
        },
      }
    );
  }
}
