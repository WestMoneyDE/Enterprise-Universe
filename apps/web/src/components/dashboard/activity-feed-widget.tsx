"use client";

import * as React from "react";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  User,
  FileText,
  ShoppingCart,
  Mail,
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  LucideIcon,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { useActivityStream, Activity as StreamActivity } from "@/hooks/use-activity-stream";

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY FEED WIDGET - Recent activity timeline with real-time support
// ═══════════════════════════════════════════════════════════════════════════════

type ActivityType = "user" | "document" | "order" | "message" | "notification" | "success" | "error" | "info";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date | string;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface ActivityFeedWidgetProps {
  activities?: Activity[];
  maxItems?: number;
  className?: string;
  title?: string;
  realtime?: boolean;
  organizationId?: string;
  category?: string;
}

const activityIcons: Record<ActivityType, LucideIcon> = {
  user: User,
  document: FileText,
  order: ShoppingCart,
  message: Mail,
  notification: Bell,
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const activityColors: Record<ActivityType, string> = {
  user: "bg-neon-cyan/20 text-neon-cyan",
  document: "bg-neon-purple/20 text-neon-purple",
  order: "bg-neon-green/20 text-neon-green",
  message: "bg-neon-blue/20 text-neon-blue",
  notification: "bg-neon-gold/20 text-neon-gold",
  success: "bg-neon-green/20 text-neon-green",
  error: "bg-neon-red/20 text-neon-red",
  info: "bg-neon-cyan/20 text-neon-cyan",
};

// Map stream activity colors to ActivityType
function getActivityType(action: string, color: string): ActivityType {
  if (action === "login" || action === "logout") return "user";
  if (action === "create") return "success";
  if (action === "delete" || color === "red") return "error";
  if (action === "send" || action === "receive") return "message";
  if (action === "trigger") return "notification";
  return "info";
}

// Convert stream activity to widget activity
function convertStreamActivity(activity: StreamActivity): Activity {
  return {
    id: activity.id,
    type: getActivityType(activity.action, activity.color),
    title: activity.title,
    description: activity.description,
    timestamp: activity.timestamp,
    user: activity.user ? { name: activity.user.name } : undefined,
  };
}

export function ActivityFeedWidget({
  activities: staticActivities,
  maxItems = 5,
  className,
  title = "Aktivitäten",
  realtime = false,
  organizationId,
  category,
}: ActivityFeedWidgetProps) {
  // Use real-time stream if enabled
  const stream = useActivityStream({
    enabled: realtime,
    organizationId,
    category,
    limit: maxItems,
  });

  // Determine which activities to display
  const activities = realtime
    ? stream.activities.map(convertStreamActivity)
    : (staticActivities || []);

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card variant="holo" className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-neon-cyan font-display text-sm uppercase tracking-wider">
          {title}
        </CardTitle>
        {realtime && (
          <div className="flex items-center gap-2">
            {stream.isConnected ? (
              <div className="flex items-center gap-1.5 text-neon-green">
                <Wifi className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wider">Live</span>
              </div>
            ) : stream.error ? (
              <button
                onClick={stream.reconnect}
                className="flex items-center gap-1.5 text-neon-red hover:text-neon-cyan transition-colors"
              >
                <WifiOff className="h-3 w-3" />
                <RefreshCw className="h-3 w-3" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-500">
                <RefreshCw className="h-3 w-3 animate-spin" />
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {realtime && stream.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="rounded-full p-2 bg-gray-700/50 w-8 h-8" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700/50 rounded w-3/4" />
                  <div className="h-3 bg-gray-700/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedActivities.map((activity, index) => {
              const Icon = activityIcons[activity.type];
              const iconColor = activityColors[activity.type];

              return (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-start gap-3 transition-all duration-300",
                    index !== displayedActivities.length - 1 &&
                      "pb-4 border-b border-neon-cyan/10",
                    realtime && index === 0 && "animate-[slideIn_0.3s_ease-out]"
                  )}
                >
                  <div className={cn("rounded-full p-2", iconColor)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {activity.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {activity.user && (
                        <span className="text-xs text-gray-400">
                          {activity.user.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {activities.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Keine Aktivitäten vorhanden
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REALTIME ACTIVITY FEED - Standalone real-time component
// ═══════════════════════════════════════════════════════════════════════════════

interface RealtimeActivityFeedProps {
  maxItems?: number;
  className?: string;
  title?: string;
  organizationId?: string;
  category?: string;
  onActivity?: (activity: StreamActivity) => void;
}

export function RealtimeActivityFeed({
  maxItems = 10,
  className,
  title = "Live Aktivitäten",
  organizationId,
  category,
  onActivity,
}: RealtimeActivityFeedProps) {
  return (
    <ActivityFeedWidget
      realtime
      maxItems={maxItems}
      className={className}
      title={title}
      organizationId={organizationId}
      category={category}
    />
  );
}
