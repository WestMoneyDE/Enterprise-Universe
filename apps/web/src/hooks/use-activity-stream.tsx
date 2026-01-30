"use client";

import * as React from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// USE ACTIVITY STREAM - Real-time activity feed via SSE
// ═══════════════════════════════════════════════════════════════════════════════

export interface Activity {
  id: string;
  icon: string;
  color: string;
  action: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  user: { id: string; name: string } | null;
  timestamp: string;
  status?: string;
}

interface UseActivityStreamOptions {
  organizationId?: string;
  category?: string;
  limit?: number;
  enabled?: boolean;
  maxActivities?: number;
  onActivity?: (activity: Activity) => void;
  onError?: (error: Error) => void;
}

interface UseActivityStreamReturn {
  activities: Activity[];
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  reconnect: () => void;
  clearActivities: () => void;
}

export function useActivityStream({
  organizationId,
  category,
  limit = 20,
  enabled = true,
  maxActivities = 100,
  onActivity,
  onError,
}: UseActivityStreamOptions = {}): UseActivityStreamReturn {
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const eventSourceRef = React.useRef<EventSource | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = React.useRef(0);

  const connect = React.useCallback(() => {
    if (!enabled) return;

    // Build SSE URL with query params
    const params = new URLSearchParams();
    if (organizationId) params.set("organizationId", organizationId);
    if (category) params.set("category", category);
    params.set("limit", limit.toString());

    const url = `/api/sse/activity?${params.toString()}`;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);
    setError(null);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
      console.log("[ActivityStream] Connected");
    });

    eventSource.addEventListener("initial", (event) => {
      try {
        const data = JSON.parse(event.data);
        setActivities(data.activities || []);
        setIsLoading(false);
      } catch (err) {
        console.error("[ActivityStream] Error parsing initial data:", err);
      }
    });

    eventSource.addEventListener("activity", (event) => {
      try {
        const activity = JSON.parse(event.data) as Activity;

        setActivities((prev) => {
          // Prevent duplicates
          if (prev.some((a) => a.id === activity.id)) {
            return prev;
          }

          // Add new activity at the beginning, limit total count
          const updated = [activity, ...prev].slice(0, maxActivities);
          return updated;
        });

        // Trigger callback
        onActivity?.(activity);
      } catch (err) {
        console.error("[ActivityStream] Error parsing activity:", err);
      }
    });

    eventSource.addEventListener("heartbeat", () => {
      // Keep-alive, connection is healthy
    });

    eventSource.addEventListener("error", (event) => {
      console.error("[ActivityStream] Error:", event);

      const err = new Error("Activity stream connection error");
      setError(err);
      setIsConnected(false);
      onError?.(err);

      // Close the connection
      eventSource.close();
      eventSourceRef.current = null;

      // Reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current += 1;

      console.log(`[ActivityStream] Reconnecting in ${delay}ms...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    });

    return () => {
      eventSource.close();
    };
  }, [enabled, organizationId, category, limit, maxActivities, onActivity, onError]);

  // Connect on mount and when dependencies change
  React.useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect, enabled]);

  const reconnect = React.useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  const clearActivities = React.useCallback(() => {
    setActivities([]);
  }, []);

  return {
    activities,
    isConnected,
    isLoading,
    error,
    reconnect,
    clearActivities,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY STREAM CONTEXT - For app-wide activity sharing
// ═══════════════════════════════════════════════════════════════════════════════

interface ActivityStreamContextValue extends UseActivityStreamReturn {
  unreadCount: number;
  markAllRead: () => void;
}

const ActivityStreamContext = React.createContext<ActivityStreamContextValue | null>(null);

interface ActivityStreamProviderProps {
  children: React.ReactNode;
  options?: UseActivityStreamOptions;
}

export function ActivityStreamProvider({ children, options }: ActivityStreamProviderProps) {
  const stream = useActivityStream(options);
  const [lastReadTime, setLastReadTime] = React.useState<Date>(new Date());

  const unreadCount = React.useMemo(() => {
    return stream.activities.filter((a) => new Date(a.timestamp) > lastReadTime).length;
  }, [stream.activities, lastReadTime]);

  const markAllRead = React.useCallback(() => {
    setLastReadTime(new Date());
  }, []);

  const value = React.useMemo(
    () => ({
      ...stream,
      unreadCount,
      markAllRead,
    }),
    [stream, unreadCount, markAllRead]
  );

  return (
    <ActivityStreamContext.Provider value={value}>
      {children}
    </ActivityStreamContext.Provider>
  );
}

export function useActivityStreamContext() {
  const context = React.useContext(ActivityStreamContext);
  if (!context) {
    throw new Error("useActivityStreamContext must be used within an ActivityStreamProvider");
  }
  return context;
}
