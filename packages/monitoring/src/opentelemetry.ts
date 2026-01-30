// =============================================================================
// OPENTELEMETRY OBSERVABILITY
// Distributed tracing and metrics with OpenTelemetry
// =============================================================================

import { trace, context, SpanStatusCode, Span, Tracer, SpanKind } from "@opentelemetry/api";

// =============================================================================
// TYPES
// =============================================================================

export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  exporterEndpoint?: string;
  sampleRate?: number;
  enabled?: boolean;
}

export interface SpanOptions {
  name: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  parentSpan?: Span;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

let globalTracer: Tracer | null = null;
let isInitialized = false;

/**
 * Get default tracing configuration from environment
 */
export function getDefaultTracingConfig(): TracingConfig {
  return {
    serviceName: process.env.OTEL_SERVICE_NAME || "nexus-command-center",
    serviceVersion: process.env.OTEL_SERVICE_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || "0.1"),
    enabled: process.env.OTEL_ENABLED === "true",
  };
}

/**
 * Initialize OpenTelemetry tracing
 * Note: In production, this would set up the full SDK
 */
export function initializeTracing(config: Partial<TracingConfig> = {}): void {
  if (isInitialized) {
    console.log("[OpenTelemetry] Already initialized");
    return;
  }

  const mergedConfig = { ...getDefaultTracingConfig(), ...config };

  if (!mergedConfig.enabled) {
    console.log("[OpenTelemetry] Tracing disabled");
    return;
  }

  console.log("[OpenTelemetry] Initializing tracing:", {
    serviceName: mergedConfig.serviceName,
    environment: mergedConfig.environment,
    endpoint: mergedConfig.exporterEndpoint,
  });

  // Get the tracer
  globalTracer = trace.getTracer(mergedConfig.serviceName, mergedConfig.serviceVersion);
  isInitialized = true;
}

/**
 * Get the global tracer instance
 */
export function getTracer(): Tracer {
  if (!globalTracer) {
    // Return a no-op tracer if not initialized
    return trace.getTracer("nexus-command-center");
  }
  return globalTracer;
}

// =============================================================================
// SPAN UTILITIES
// =============================================================================

/**
 * Create and start a new span
 */
export function createSpan(options: SpanOptions): Span {
  const tracer = getTracer();
  const span = tracer.startSpan(options.name, {
    kind: options.kind || SpanKind.INTERNAL,
    attributes: options.attributes,
  });

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }

  return span;
}

/**
 * Execute a function within a span context
 */
export async function withSpan<T>(
  options: SpanOptions,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const span = createSpan(options);

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Execute a synchronous function within a span context
 */
export function withSpanSync<T>(options: SpanOptions, fn: (span: Span) => T): T {
  const span = createSpan(options);

  try {
    const result = fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

// =============================================================================
// HTTP TRACING UTILITIES
// =============================================================================

/**
 * Create a span for an HTTP request
 */
export function createHttpSpan(options: {
  method: string;
  url: string;
  route?: string;
}): Span {
  return createSpan({
    name: `HTTP ${options.method} ${options.route || options.url}`,
    kind: SpanKind.CLIENT,
    attributes: {
      "http.method": options.method,
      "http.url": options.url,
      ...(options.route && { "http.route": options.route }),
    },
  });
}

/**
 * Set HTTP response attributes on a span
 */
export function setHttpResponseAttributes(
  span: Span,
  statusCode: number,
  contentLength?: number
): void {
  span.setAttribute("http.status_code", statusCode);
  if (contentLength !== undefined) {
    span.setAttribute("http.response_content_length", contentLength);
  }

  if (statusCode >= 400) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `HTTP ${statusCode}`,
    });
  }
}

// =============================================================================
// DATABASE TRACING UTILITIES
// =============================================================================

/**
 * Create a span for a database query
 */
export function createDbSpan(options: {
  operation: string;
  table?: string;
  statement?: string;
}): Span {
  return createSpan({
    name: `DB ${options.operation}${options.table ? ` ${options.table}` : ""}`,
    kind: SpanKind.CLIENT,
    attributes: {
      "db.system": "postgresql",
      "db.operation": options.operation,
      ...(options.table && { "db.sql.table": options.table }),
      ...(options.statement && { "db.statement": options.statement }),
    },
  });
}

/**
 * Trace a database query
 */
export async function traceDbQuery<T>(
  options: {
    operation: string;
    table?: string;
    statement?: string;
  },
  fn: () => Promise<T>
): Promise<T> {
  const span = createDbSpan(options);

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

// =============================================================================
// QUEUE/JOB TRACING UTILITIES
// =============================================================================

/**
 * Create a span for a queue job
 */
export function createJobSpan(options: {
  jobName: string;
  queueName: string;
  jobId?: string;
}): Span {
  return createSpan({
    name: `Job ${options.queueName}/${options.jobName}`,
    kind: SpanKind.CONSUMER,
    attributes: {
      "messaging.system": "bullmq",
      "messaging.destination": options.queueName,
      "messaging.operation": "process",
      "job.name": options.jobName,
      ...(options.jobId && { "job.id": options.jobId }),
    },
  });
}

/**
 * Trace a queue job execution
 */
export async function traceJob<T>(
  options: {
    jobName: string;
    queueName: string;
    jobId?: string;
  },
  fn: () => Promise<T>
): Promise<T> {
  const span = createJobSpan(options);

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttribute("job.status", "completed");
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.setAttribute("job.status", "failed");
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

// =============================================================================
// CUSTOM METRICS
// =============================================================================

/**
 * Record a custom metric event
 */
export function recordMetric(
  name: string,
  value: number,
  attributes?: Record<string, string | number | boolean>
): void {
  console.log("[OpenTelemetry] Metric:", { name, value, attributes });

  // In production, this would use the Metrics API
  // For now, we log for debugging purposes
}

/**
 * Record a timing metric
 */
export function recordTiming(
  name: string,
  durationMs: number,
  attributes?: Record<string, string | number | boolean>
): void {
  recordMetric(`${name}.duration_ms`, durationMs, attributes);
}

/**
 * Record a counter metric
 */
export function incrementCounter(
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  recordMetric(`${name}.count`, 1, attributes);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the current active span
 */
export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Add an event to the current active span
 */
export function addSpanEvent(
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  const span = getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Set attributes on the current active span
 */
export function setSpanAttributes(
  attributes: Record<string, string | number | boolean>
): void {
  const span = getActiveSpan();
  if (span) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

// =============================================================================
// SHUTDOWN
// =============================================================================

/**
 * Gracefully shutdown the tracing provider
 */
export async function shutdownTracing(): Promise<void> {
  if (!isInitialized) return;

  console.log("[OpenTelemetry] Shutting down tracing...");

  // In production, this would flush and shutdown the SDK
  isInitialized = false;
  globalTracer = null;

  console.log("[OpenTelemetry] Tracing shutdown complete");
}
