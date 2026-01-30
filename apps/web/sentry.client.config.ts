// =============================================================================
// SENTRY CLIENT CONFIGURATION
// Client-side error tracking and performance monitoring
// =============================================================================

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // Only enable in production
  enabled: process.env.NODE_ENV === "production" && !!SENTRY_DSN,

  // Trace propagation targets (moved to top level in Sentry v8)
  tracePropagationTargets: ["localhost", /^https:\/\/.*\.nexus\.app/],

  // Integration configuration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out certain errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Filter out known non-actionable errors
    if (error instanceof Error) {
      // Network errors during navigation
      if (error.message.includes("Failed to fetch")) {
        return null;
      }

      // Chunk loading errors (usually due to deployment during user session)
      if (error.name === "ChunkLoadError" || error.message.includes("Loading chunk")) {
        return null;
      }

      // ResizeObserver errors (browser quirk)
      if (error.message.includes("ResizeObserver")) {
        return null;
      }

      // Cancel errors from AbortController
      if (error.name === "AbortError") {
        return null;
      }
    }

    return event;
  },

  // Ignore certain URLs in breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === "console" && breadcrumb.level === "log") {
      return null;
    }

    return breadcrumb;
  },
});
