"use client";

// =============================================================================
// tRPC Client-side Provider and Hooks
// =============================================================================

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState, useCallback } from "react";
import superjson from "superjson";
import type { AppRouter } from "@nexus/api";

/**
 * tRPC React hooks for client components
 */
export const api = createTRPCReact<AppRouter>();

// =============================================================================
// CACHE TIME CONSTANTS
// =============================================================================

const CACHE_TIMES = {
  /** Static data that rarely changes (settings, config) */
  LONG: 1000 * 60 * 30, // 30 minutes

  /** Regular data (contacts, deals, projects) */
  MEDIUM: 1000 * 60 * 5, // 5 minutes

  /** Frequently updated data (activity, notifications) */
  SHORT: 1000 * 60, // 1 minute

  /** Real-time data (system health, queue stats) */
  REALTIME: 1000 * 15, // 15 seconds
} as const;

// =============================================================================
// ERROR RETRY LOGIC
// =============================================================================

function shouldRetry(failureCount: number, error: unknown): boolean {
  // Don't retry on auth errors
  if (isAuthError(error)) return false;

  // Don't retry on validation errors
  if (isValidationError(error)) return false;

  // Retry up to 3 times for network/server errors
  return failureCount < 3;
}

function isAuthError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const trpcError = error as { data?: { code?: string } };
    return trpcError.data?.code === "UNAUTHORIZED" || trpcError.data?.code === "FORBIDDEN";
  }
  return false;
}

function isValidationError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const trpcError = error as { data?: { code?: string } };
    return trpcError.data?.code === "BAD_REQUEST";
  }
  return false;
}

// =============================================================================
// QUERY CLIENT FACTORY
// =============================================================================

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 1 minute by default
        staleTime: CACHE_TIMES.MEDIUM,

        // Keep unused data in cache for 10 minutes
        gcTime: 1000 * 60 * 10,

        // Don't refetch on window focus (can be noisy)
        refetchOnWindowFocus: false,

        // Refetch when reconnecting after being offline
        refetchOnReconnect: true,

        // Retry logic
        retry: shouldRetry,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Don't refetch in background by default
        refetchOnMount: true,
        refetchInterval: false,
      },
      mutations: {
        // Retry mutations once for network errors
        retry: 1,
        retryDelay: 1000,

        // Show errors to user
        onError: (error) => {
          console.error("[Mutation Error]", error);
        },
      },
    },
  });
}

/**
 * Provider component for tRPC and React Query
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: getBaseUrl() + "/api/trpc",
          transformer: superjson,
          headers: () => ({
            "x-trpc-source": "client",
          }),
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// =============================================================================
// CACHE TIME HELPERS
// =============================================================================

/**
 * Export cache times for use in individual queries
 *
 * Usage:
 * ```ts
 * const { data } = api.system.health.useQuery(undefined, {
 *   staleTime: CACHE_TIMES.REALTIME,
 *   refetchInterval: CACHE_TIMES.REALTIME,
 * });
 * ```
 */
export { CACHE_TIMES };

/**
 * Query options preset for real-time data (health checks, queue stats)
 */
export const REALTIME_QUERY_OPTIONS = {
  staleTime: CACHE_TIMES.REALTIME,
  refetchInterval: CACHE_TIMES.REALTIME,
} as const;

/**
 * Query options preset for frequently updated data (activity, notifications)
 */
export const FREQUENT_QUERY_OPTIONS = {
  staleTime: CACHE_TIMES.SHORT,
  refetchInterval: CACHE_TIMES.SHORT * 2,
} as const;

/**
 * Query options preset for static/config data
 */
export const STATIC_QUERY_OPTIONS = {
  staleTime: CACHE_TIMES.LONG,
  gcTime: 1000 * 60 * 60, // 1 hour
} as const;
