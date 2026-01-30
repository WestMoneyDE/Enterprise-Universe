// =============================================================================
// useActivityStream Hook Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useActivityStream } from "./use-activity-stream";

describe("useActivityStream", () => {
  let mockEventSource: {
    addEventListener: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
  };

  beforeEach(() => {
    // Mock EventSource
    mockEventSource = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      readyState: 1,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).EventSource = vi.fn().mockImplementation(() => mockEventSource);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  it("initializes with default state", () => {
    const { result } = renderHook(() => useActivityStream({ enabled: false }));

    expect(result.current.activities).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("does not connect when disabled", () => {
    renderHook(() => useActivityStream({ enabled: false }));

    expect(global.EventSource).not.toHaveBeenCalled();
  });

  it("connects when enabled", () => {
    renderHook(() => useActivityStream({ enabled: true }));

    expect(global.EventSource).toHaveBeenCalledWith(
      expect.stringContaining("/api/sse/activity")
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // URL PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════════

  it("includes organizationId in URL", () => {
    renderHook(() =>
      useActivityStream({
        enabled: true,
        organizationId: "org-123",
      })
    );

    expect(global.EventSource).toHaveBeenCalledWith(
      expect.stringContaining("organizationId=org-123")
    );
  });

  it("includes category in URL", () => {
    renderHook(() =>
      useActivityStream({
        enabled: true,
        category: "automation",
      })
    );

    expect(global.EventSource).toHaveBeenCalledWith(
      expect.stringContaining("category=automation")
    );
  });

  it("includes limit in URL", () => {
    renderHook(() =>
      useActivityStream({
        enabled: true,
        limit: 50,
      })
    );

    expect(global.EventSource).toHaveBeenCalledWith(
      expect.stringContaining("limit=50")
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  it("handles connected event", async () => {
    const { result } = renderHook(() => useActivityStream({ enabled: true }));

    // Get the connected event handler
    const connectedHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "connected"
    )?.[1];

    // Simulate connected event
    act(() => {
      connectedHandler?.();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("handles initial event with activities", async () => {
    const { result } = renderHook(() => useActivityStream({ enabled: true }));

    const initialHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "initial"
    )?.[1];

    const mockActivities = [
      {
        id: "1",
        title: "Test Activity",
        action: "create",
        timestamp: new Date().toISOString(),
      },
    ];

    act(() => {
      initialHandler?.({ data: JSON.stringify({ activities: mockActivities }) });
    });

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("handles activity event and adds to list", async () => {
    const { result } = renderHook(() => useActivityStream({ enabled: true }));

    // First set initial activities
    const initialHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "initial"
    )?.[1];

    act(() => {
      initialHandler?.({ data: JSON.stringify({ activities: [] }) });
    });

    // Then receive new activity
    const activityHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "activity"
    )?.[1];

    const newActivity = {
      id: "2",
      title: "New Activity",
      action: "update",
      timestamp: new Date().toISOString(),
    };

    act(() => {
      activityHandler?.({ data: JSON.stringify(newActivity) });
    });

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
      expect(result.current.activities[0].id).toBe("2");
    });
  });

  it("prevents duplicate activities", async () => {
    const { result } = renderHook(() => useActivityStream({ enabled: true }));

    const activityHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "activity"
    )?.[1];

    // First set initial with one activity
    const initialHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "initial"
    )?.[1];

    act(() => {
      initialHandler?.({
        data: JSON.stringify({
          activities: [{ id: "1", title: "Existing" }],
        }),
      });
    });

    // Try to add duplicate
    act(() => {
      activityHandler?.({ data: JSON.stringify({ id: "1", title: "Duplicate" }) });
    });

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  it("handles error event", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useActivityStream({
        enabled: true,
        onError,
      })
    );

    const errorHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "error"
    )?.[1];

    act(() => {
      errorHandler?.({});
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(onError).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  it("closes connection on unmount", () => {
    const { unmount } = renderHook(() => useActivityStream({ enabled: true }));

    unmount();

    expect(mockEventSource.close).toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACKS
  // ═══════════════════════════════════════════════════════════════════════════

  it("calls onActivity callback for new activities", async () => {
    const onActivity = vi.fn();
    renderHook(() =>
      useActivityStream({
        enabled: true,
        onActivity,
      })
    );

    const activityHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "activity"
    )?.[1];

    const activity = {
      id: "1",
      title: "Test",
      action: "create",
      timestamp: new Date().toISOString(),
    };

    act(() => {
      activityHandler?.({ data: JSON.stringify(activity) });
    });

    await waitFor(() => {
      expect(onActivity).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  it("reconnect function creates new connection", () => {
    const { result } = renderHook(() => useActivityStream({ enabled: true }));

    const initialCallCount = (global.EventSource as ReturnType<typeof vi.fn>).mock.calls.length;

    act(() => {
      result.current.reconnect();
    });

    expect((global.EventSource as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
      initialCallCount
    );
  });

  it("clearActivities function empties the list", async () => {
    const { result } = renderHook(() => useActivityStream({ enabled: true }));

    // Add some activities
    const initialHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "initial"
    )?.[1];

    act(() => {
      initialHandler?.({
        data: JSON.stringify({
          activities: [{ id: "1" }, { id: "2" }],
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(2);
    });

    // Clear activities
    act(() => {
      result.current.clearActivities();
    });

    expect(result.current.activities).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MAX ACTIVITIES LIMIT
  // ═══════════════════════════════════════════════════════════════════════════

  it("respects maxActivities limit", async () => {
    const { result } = renderHook(() =>
      useActivityStream({
        enabled: true,
        maxActivities: 3,
      })
    );

    const initialHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "initial"
    )?.[1];

    const activityHandler = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "activity"
    )?.[1];

    // Set initial activities
    act(() => {
      initialHandler?.({
        data: JSON.stringify({
          activities: [{ id: "1" }, { id: "2" }, { id: "3" }],
        }),
      });
    });

    // Add one more
    act(() => {
      activityHandler?.({ data: JSON.stringify({ id: "4" }) });
    });

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(3);
      expect(result.current.activities[0].id).toBe("4"); // Newest first
      expect(result.current.activities.find((a) => a.id === "1")).toBeUndefined(); // Oldest removed
    });
  });
});
