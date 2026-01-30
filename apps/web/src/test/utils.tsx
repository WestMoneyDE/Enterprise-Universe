// =============================================================================
// Testing Utilities - Helpers for React component testing
// =============================================================================

import * as React from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// =============================================================================
// PROVIDERS WRAPPER
// =============================================================================

interface TestProviderProps {
  children: React.ReactNode;
}

/**
 * All providers needed for component testing
 */
function TestProviders({ children }: TestProviderProps) {
  return (
    <>
      {children}
    </>
  );
}

// =============================================================================
// CUSTOM RENDER
// =============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  providerProps?: Partial<TestProviderProps>;
}

interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
}

/**
 * Custom render with all providers and userEvent setup
 */
function customRender(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  const user = userEvent.setup();

  const renderResult = render(ui, {
    wrapper: TestProviders,
    ...options,
  });

  return {
    ...renderResult,
    user,
  };
}

// =============================================================================
// MOCK HELPERS
// =============================================================================

/**
 * Create a mock fetch response
 */
export function mockFetchResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
    clone: () => mockFetchResponse(data, status),
    body: null,
    bodyUsed: false,
  } as Response;
}

/**
 * Setup fetch mock to return specified data
 */
export function setupFetchMock(responses: Array<{ url?: string; data: unknown; status?: number }>) {
  const mockedFetch = vi.mocked(global.fetch);

  mockedFetch.mockImplementation((input) => {
    const url = typeof input === "string" ? input : input.toString();

    for (const response of responses) {
      if (!response.url || url.includes(response.url)) {
        return Promise.resolve(mockFetchResponse(response.data, response.status || 200));
      }
    }

    return Promise.resolve(mockFetchResponse({ error: "Not found" }, 404));
  });

  return mockedFetch;
}

/**
 * Create a mock event
 */
export function createMockEvent<T extends Event>(overrides: Partial<T> = {}): T {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: {},
    currentTarget: {},
    ...overrides,
  } as unknown as T;
}

// =============================================================================
// ASYNC HELPERS
// =============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`waitFor timeout after ${timeout}ms`);
}

/**
 * Create a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a promise that can be resolved/rejected manually
 */
export function createDeferredPromise<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

// =============================================================================
// COMPONENT TESTING HELPERS
// =============================================================================

/**
 * Get all text content from an element (recursively)
 */
export function getAllTextContent(element: Element): string {
  return element.textContent?.trim() || "";
}

/**
 * Check if element is visible (not hidden by CSS)
 */
export function isElementVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

/**
 * Simulate a resize event
 */
export function simulateResize(width: number, height: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true });
  Object.defineProperty(window, "innerHeight", { value: height, writable: true });
  window.dispatchEvent(new Event("resize"));
}

/**
 * Simulate a scroll event
 */
export function simulateScroll(scrollY: number): void {
  Object.defineProperty(window, "scrollY", { value: scrollY, writable: true });
  window.dispatchEvent(new Event("scroll"));
}

// =============================================================================
// FORM TESTING HELPERS
// =============================================================================

/**
 * Fill a form field by label
 */
export async function fillFormField(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
  label: string | RegExp,
  value: string
): Promise<void> {
  const input = container.querySelector(`[aria-label="${label}"]`) ||
    container.querySelector(`input[name="${label}"]`) ||
    container.querySelector(`textarea[name="${label}"]`);

  if (!input) {
    throw new Error(`Could not find form field with label: ${label}`);
  }

  await user.clear(input);
  await user.type(input, value);
}

/**
 * Submit a form
 */
export async function submitForm(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement
): Promise<void> {
  const submitButton = container.querySelector('button[type="submit"]') ||
    container.querySelector('input[type="submit"]');

  if (!submitButton) {
    throw new Error("Could not find submit button");
  }

  await user.click(submitButton);
}

// =============================================================================
// MOCK DATA FACTORIES
// =============================================================================

let idCounter = 0;

/**
 * Generate a unique ID for test data
 */
export function generateTestId(): string {
  return `test-id-${++idCounter}-${Date.now()}`;
}

/**
 * Create mock user data
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: generateTestId(),
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

/**
 * Create mock activity data
 */
export function createMockActivity(overrides: Partial<MockActivity> = {}): MockActivity {
  return {
    id: generateTestId(),
    icon: "✨",
    color: "cyan",
    action: "create",
    category: "system",
    categoryLabel: "System",
    title: "Test activity",
    description: "Test activity description",
    timestamp: new Date().toISOString(),
    user: null,
    ...overrides,
  };
}

interface MockActivity {
  id: string;
  icon: string;
  color: string;
  action: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  timestamp: string;
  user: { id: string; name: string } | null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { customRender as render, userEvent };
export * from "@testing-library/react";
