// =============================================================================
// tRPC Server-side Client (for RSC and Server Actions)
// =============================================================================

import "server-only";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { headers } from "next/headers";
import superjson from "superjson";
import type { AppRouter } from "@nexus/api";

/**
 * Server-side tRPC client for React Server Components and Server Actions
 */
export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getBaseUrl() + "/api/trpc",
      transformer: superjson,
      headers: async () => {
        const headersList = await headers();
        return {
          cookie: headersList.get("cookie") ?? "",
          "x-trpc-source": "rsc",
        };
      },
    }),
  ],
});

function getBaseUrl() {
  if (typeof window !== "undefined") {
    // Browser should use relative path
    return "";
  }

  if (process.env.VERCEL_URL) {
    // Reference for vercel.com deployments
    return `https://${process.env.VERCEL_URL}`;
  }

  // Assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
