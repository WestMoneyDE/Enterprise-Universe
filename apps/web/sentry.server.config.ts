// =============================================================================
// SENTRY SERVER CONFIGURATION
// Server-side error tracking for API routes and Server Components
// =============================================================================

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.npm_package_version,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // Only enable in production
  enabled: process.env.NODE_ENV === "production" && !!SENTRY_DSN,

  // Integration configuration
  integrations: [
    // Add profiling for performance insights
    Sentry.nodeProfilingIntegration(),
  ],

  // Filter out certain errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    if (error instanceof Error) {
      // Filter out expected errors
      if (
        error.message.includes("NEXT_NOT_FOUND") ||
        error.message.includes("NEXT_REDIRECT")
      ) {
        return null;
      }

      // Filter out auth-related expected errors
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("UNAUTHORIZED")
      ) {
        // Still log these but at a lower level
        event.level = "warning";
      }
    }

    return event;
  },

  // Sensitive data scrubbing
  beforeSendTransaction(event) {
    // Scrub sensitive data from transactions
    if (event.request?.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
    }

    return event;
  },
});
