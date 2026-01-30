// =============================================================================
// Vitest Setup File
// Global test configuration and mocks
// =============================================================================

import { beforeAll, afterAll, afterEach, vi } from "vitest";

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.REDIS_URL = "redis://localhost:6379";
});

afterAll(() => {
  // Cleanup
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
});

// =============================================================================
// GLOBAL MOCKS
// =============================================================================

// Mock fetch for API tests
global.fetch = vi.fn();

// Mock console.error to keep test output clean (but still track calls)
const originalConsoleError = console.error;
console.error = vi.fn((...args) => {
  // Only log actual errors during development
  if (process.env.DEBUG_TESTS) {
    originalConsoleError(...args);
  }
});

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("waitFor timeout");
}

/**
 * Create a mock response for fetch
 */
export function mockFetchResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    clone: () => mockFetchResponse(data, status),
  } as Response;
}

/**
 * Create a delayed promise for testing async behavior
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
