// =============================================================================
// Vitest Setup for React Component Testing
// =============================================================================

import { beforeAll, afterAll, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

afterAll(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// DOM MOCKS
// =============================================================================

// Mock window.matchMedia for responsive components
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit
  ) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
  root = null;
  rootMargin = "";
  thresholds = [];
}

window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, "sessionStorage", {
  value: localStorageMock,
});

// =============================================================================
// FETCH MOCK
// =============================================================================

global.fetch = vi.fn();

// =============================================================================
// NEXT.JS MOCKS
// =============================================================================

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// =============================================================================
// CONSOLE MOCKING
// =============================================================================

// Suppress console errors/warnings in tests (but allow explicit debugging)
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: unknown[]) => {
  // Allow explicit debugging
  if (process.env.DEBUG_TESTS) {
    originalError(...args);
  }
  // Filter out known React warnings in tests
  const message = args[0]?.toString() || "";
  if (
    message.includes("Warning: ReactDOM.render") ||
    message.includes("Warning: An update to") ||
    message.includes("Not implemented: navigation")
  ) {
    return;
  }
  originalError(...args);
};

console.warn = (...args: unknown[]) => {
  if (process.env.DEBUG_TESTS) {
    originalWarn(...args);
  }
};
