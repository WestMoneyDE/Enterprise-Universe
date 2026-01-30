// =============================================================================
// SSE ACTIVITY STREAM - Real-time activity feed via Server-Sent Events
// =============================================================================

import { NextRequest } from "next/server";
import { db, auditLogs, desc, gt, eq, and } from "@nexus/db";
import { auth } from "@/lib/auth";

// Configuration
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const POLL_INTERVAL = 2000; // 2 seconds for new activity

/**
 * SSE endpoint for real-time activity streaming.
 * Clients connect and receive activity updates in real-time.
 */
export async function GET(request: NextRequest) {
  // Authenticate the user
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get organization from session or query param
  const searchParams = request.nextUrl.searchParams;
  const organizationId = searchParams.get("organizationId");
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // Track the last seen activity timestamp
  let lastActivityTime = new Date();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE events
      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Send initial connection event
      sendEvent("connected", {
        message: "Activity stream connected",
        timestamp: new Date().toISOString(),
      });

      // Send initial batch of recent activities
      try {
        const initialActivities = await fetchRecentActivities({
          organizationId,
          category,
          limit,
        });
        sendEvent("initial", { activities: initialActivities });

        if (initialActivities.length > 0) {
          lastActivityTime = new Date(initialActivities[0].timestamp);
        }
      } catch (error) {
        console.error("[SSE] Error fetching initial activities:", error);
        sendEvent("error", { message: "Failed to fetch initial activities" });
      }

      // Heartbeat interval to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          sendEvent("heartbeat", { timestamp: new Date().toISOString() });
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL);

      // Poll for new activities
      const pollInterval = setInterval(async () => {
        try {
          const newActivities = await fetchNewActivities({
            organizationId,
            category,
            since: lastActivityTime,
          });

          if (newActivities.length > 0) {
            for (const activity of newActivities.reverse()) {
              sendEvent("activity", activity);
            }
            lastActivityTime = new Date(newActivities[0].timestamp);
          }
        } catch (error) {
          console.error("[SSE] Error polling activities:", error);
        }
      }, POLL_INTERVAL);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

// Activity type icons and colors (same as activity router)
const activityConfig: Record<string, { icon: string; color: string }> = {
  login: { icon: "🔐", color: "cyan" },
  logout: { icon: "🚪", color: "gray" },
  create: { icon: "✨", color: "green" },
  update: { icon: "✏️", color: "cyan" },
  delete: { icon: "🗑️", color: "red" },
  trigger: { icon: "⚡", color: "orange" },
  complete: { icon: "✅", color: "green" },
  fail: { icon: "❌", color: "red" },
  send: { icon: "📤", color: "purple" },
  receive: { icon: "📥", color: "cyan" },
  sync: { icon: "🔄", color: "cyan" },
  import: { icon: "📥", color: "green" },
  export: { icon: "📤", color: "purple" },
};

const categoryLabels: Record<string, string> = {
  auth: "Authentifizierung",
  contact: "Kontakte",
  deal: "Deals",
  project: "Projekte",
  campaign: "Kampagnen",
  automation: "Automation",
  messaging: "Messaging",
  payment: "Zahlungen",
  settings: "Einstellungen",
  system: "System",
};

interface FetchOptions {
  organizationId: string | null;
  category: string | null;
  limit?: number;
  since?: Date;
}

async function fetchRecentActivities(options: FetchOptions) {
  const conditions = [];

  if (options.organizationId) {
    conditions.push(eq(auditLogs.organizationId, options.organizationId));
  }

  if (options.category) {
    conditions.push(eq(auditLogs.category, options.category));
  }

  const logs = await db.query.auditLogs.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(auditLogs.createdAt),
    limit: options.limit || 20,
    with: {
      user: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return logs.map(formatActivity);
}

async function fetchNewActivities(options: FetchOptions & { since: Date }) {
  const conditions = [gt(auditLogs.createdAt, options.since)];

  if (options.organizationId) {
    conditions.push(eq(auditLogs.organizationId, options.organizationId));
  }

  if (options.category) {
    conditions.push(eq(auditLogs.category, options.category));
  }

  const logs = await db.query.auditLogs.findMany({
    where: and(...conditions),
    orderBy: desc(auditLogs.createdAt),
    with: {
      user: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return logs.map(formatActivity);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatActivity(log: any) {
  const config = activityConfig[log.action] || { icon: "◉", color: "gray" };
  const entityName = log.entityName || log.entityType || "Element";

  let title: string;
  switch (log.action) {
    case "create":
      title = `${entityName} erstellt`;
      break;
    case "update":
      title = `${entityName} aktualisiert`;
      break;
    case "delete":
      title = `${entityName} gelöscht`;
      break;
    case "trigger":
      title = `${entityName} ausgelöst`;
      break;
    case "send":
      title = `Nachricht gesendet`;
      break;
    case "sync":
      title = `Synchronisation durchgeführt`;
      break;
    case "login":
      title = "Anmeldung";
      break;
    case "logout":
      title = "Abmeldung";
      break;
    default:
      title = `${log.action}: ${entityName}`;
  }

  return {
    id: log.id,
    icon: config.icon,
    color: config.color,
    action: log.action,
    category: log.category,
    categoryLabel: categoryLabels[log.category] || log.category,
    title,
    description: log.description || (log.entityType && log.entityName ? `${log.entityType}: ${log.entityName}` : ""),
    entityType: log.entityType,
    entityId: log.entityId,
    entityName: log.entityName,
    user: log.user
      ? {
          id: log.user.id,
          name: [log.user.firstName, log.user.lastName].filter(Boolean).join(" ") || log.user.email,
        }
      : null,
    timestamp: log.createdAt.toISOString(),
    status: log.status,
  };
}
