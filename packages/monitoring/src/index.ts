// =============================================================================
// NEXUS MONITORING PACKAGE
// Unified exports for error tracking, observability, and health monitoring
// =============================================================================

// Sentry Error Tracking
export {
  // Configuration
  type SentryConfig,
  type ErrorContext,
  type Breadcrumb,
  getDefaultSentryConfig,
  createSentryNextConfig,

  // Error Capture
  captureError,
  captureMessage,
  setUser,
  setTags,
  addBreadcrumb,

  // Transactions/APM
  startTransaction,
  startSpan,

  // Helpers
  handleErrorBoundary,
  trackApiError,
  trackSlowApi,
} from "./sentry";

// OpenTelemetry Observability
export {
  // Configuration
  type TracingConfig,
  type SpanOptions,
  getDefaultTracingConfig,
  initializeTracing,
  getTracer,
  shutdownTracing,

  // Span Utilities
  createSpan,
  withSpan,
  withSpanSync,
  getActiveSpan,
  addSpanEvent,
  setSpanAttributes,

  // HTTP Tracing
  createHttpSpan,
  setHttpResponseAttributes,

  // Database Tracing
  createDbSpan,
  traceDbQuery,

  // Queue/Job Tracing
  createJobSpan,
  traceJob,

  // Metrics
  recordMetric,
  recordTiming,
  incrementCounter,
} from "./opentelemetry";

// Health Checks
export {
  // Types
  type HealthStatus,
  type ServiceHealth,
  type SystemHealth,
  type HealthCheckResult,
  type HealthCheckFn,

  // Registry
  healthRegistry,

  // Pre-built Checks
  createDatabaseCheck,
  createRedisCheck,
  createHttpCheck,
  createMemoryCheck,
  createDiskCheck,

  // Endpoint Helpers
  formatHealthResponse,
  livenessCheck,
  readinessCheck,
} from "./health";

// =============================================================================
// CONVENIENCE WRAPPERS
// =============================================================================

import { captureError, setUser, trackApiError } from "./sentry";
import { withSpan, traceDbQuery, traceJob, incrementCounter } from "./opentelemetry";
import { healthRegistry } from "./health";

/**
 * Initialize all monitoring services
 */
export async function initializeMonitoring(options: {
  sentryDsn?: string;
  otelEndpoint?: string;
  environment?: string;
  serviceName?: string;
} = {}): Promise<void> {
  console.log("[Monitoring] Initializing monitoring services...", {
    environment: options.environment || process.env.NODE_ENV,
    serviceName: options.serviceName || "nexus-command-center",
  });

  // Monitoring services are initialized lazily when first used
  // or can be explicitly configured via their individual init functions
}

/**
 * Create a monitored async function that tracks errors and performance
 */
export function monitored<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    trackTiming?: boolean;
    trackErrors?: boolean;
    tags?: Record<string, string>;
  } = {}
): (...args: TArgs) => Promise<TResult> {
  const { trackTiming = true, trackErrors = true, tags = {} } = options;

  return async (...args: TArgs): Promise<TResult> => {
    const startTime = Date.now();

    try {
      const result = await withSpan(
        {
          name,
          attributes: tags,
        },
        async () => fn(...args)
      );

      if (trackTiming) {
        incrementCounter(`${name}.success`);
      }

      return result;
    } catch (error) {
      if (trackErrors) {
        captureError(error as Error, { tags });
        incrementCounter(`${name}.error`);
      }
      throw error;
    } finally {
      if (trackTiming) {
        console.log(`[Monitoring] ${name} completed in ${Date.now() - startTime}ms`);
      }
    }
  };
}

/**
 * Wrap a tRPC procedure with monitoring
 */
export function monitoredProcedure<TInput, TOutput>(
  name: string,
  handler: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<TOutput> {
  return monitored(
    `trpc.${name}`,
    handler,
    {
      trackTiming: true,
      trackErrors: true,
      tags: { type: "trpc" },
    }
  );
}

/**
 * Wrap a database query with monitoring
 */
export async function monitoredQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return traceDbQuery({ operation, table }, queryFn);
}

/**
 * Wrap a job handler with monitoring
 */
export async function monitoredJob<T>(
  queueName: string,
  jobName: string,
  jobFn: () => Promise<T>
): Promise<T> {
  return traceJob({ queueName, jobName }, jobFn);
}

// =============================================================================
// ERROR HANDLING DECORATORS (for use with class methods)
// =============================================================================

/**
 * Decorator to track errors in class methods
 */
export function trackErrors(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      captureError(error as Error, {
        tags: {
          class: (target as { constructor: { name: string } }).constructor.name,
          method: propertyKey,
        },
      });
      throw error;
    }
  };

  return descriptor;
}

/**
 * Decorator to track timing in class methods
 */
export function trackTiming(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    const className = (target as { constructor: { name: string } }).constructor.name;
    const metricName = `${className}.${propertyKey}`;

    return withSpan(
      { name: metricName },
      async () => originalMethod.apply(this, args)
    );
  };

  return descriptor;
}
