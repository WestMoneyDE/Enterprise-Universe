// =============================================================================
// LIVENESS PROBE ENDPOINT
// Simple endpoint for Kubernetes liveness probes
// =============================================================================

import { NextResponse } from "next/server";

/**
 * GET /api/health/live
 * Returns 200 if the process is running
 * Used by Kubernetes liveness probes
 */
export function GET(): NextResponse<{ status: "ok" }> {
  return NextResponse.json({ status: "ok" });
}
