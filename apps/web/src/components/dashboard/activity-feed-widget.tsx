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
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY FEED WIDGET - Recent activity timeline
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
  activities: Activity[];
  maxItems?: number;
  className?: string;
  title?: string;
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

export function ActivityFeedWidget({
  activities,
  maxItems = 5,
  className,
  title = "Aktivitäten",
}: ActivityFeedWidgetProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card variant="holo" className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-neon-cyan font-display text-sm uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedActivities.map((activity, index) => {
            const Icon = activityIcons[activity.type];
            const iconColor = activityColors[activity.type];

            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3",
                  index !== displayedActivities.length - 1 &&
                    "pb-4 border-b border-neon-cyan/10"
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
      </CardContent>
    </Card>
  );
}
