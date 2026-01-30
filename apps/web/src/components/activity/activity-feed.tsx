"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  Download,
  Shield,
  LogOut,
  Circle,
  Filter,
  ChevronDown,
  RefreshCw,
  Loader2,
  User,
  Building2,
  Briefcase,
  FolderKanban,
  Users,
  LucideIcon,
  Clock,
  Activity,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "login"
  | "logout";

export type EntityType =
  | "contact"
  | "deal"
  | "project"
  | "user"
  | "organization";

export interface ActivityItem {
  id: string;
  icon: string;
  color: string;
  action: ActivityAction;
  actionLabel: string;
  entityType: EntityType;
  entityTypeLabel: string;
  entityId: string;
  entityName?: string;
  title: string;
  description: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  timestamp: Date | string;
  ipAddress?: string | null;
}

export interface ActivityFeedProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onFilterChange?: (filters: ActivityFilters) => void;
  className?: string;
  maxHeight?: string;
  showFilters?: boolean;
  showTimeline?: boolean;
  title?: string;
}

export interface ActivityFilters {
  entityType?: EntityType;
  action?: ActivityAction;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const actionIcons: Record<ActivityAction, LucideIcon> = {
  create: PlusCircle,
  update: Edit,
  delete: Trash2,
  view: Eye,
  export: Download,
  login: Shield,
  logout: LogOut,
};

const actionColors: Record<ActivityAction, string> = {
  create: "neon-green",
  update: "neon-cyan",
  delete: "neon-red",
  view: "neon-blue",
  export: "neon-purple",
  login: "neon-cyan",
  logout: "gray",
};

const entityIcons: Record<EntityType, LucideIcon> = {
  contact: User,
  deal: Briefcase,
  project: FolderKanban,
  user: Users,
  organization: Building2,
};

const entityLabels: Record<EntityType, string> = {
  contact: "Kontakt",
  deal: "Deal",
  project: "Projekt",
  user: "Benutzer",
  organization: "Organisation",
};

const actionLabels: Record<ActivityAction, string> = {
  create: "Erstellt",
  update: "Aktualisiert",
  delete: "Geloscht",
  view: "Angesehen",
  export: "Exportiert",
  login: "Anmeldung",
  logout: "Abmeldung",
};

// =============================================================================
// ACTIVITY ITEM COMPONENT
// =============================================================================

interface ActivityItemProps {
  activity: ActivityItem;
  isFirst?: boolean;
  showTimeline?: boolean;
}

function ActivityItemComponent({
  activity,
  isFirst = false,
  showTimeline = true,
}: ActivityItemProps) {
  const ActionIcon = actionIcons[activity.action] || Circle;
  const EntityIcon = entityIcons[activity.entityType] || Circle;
  const color = actionColors[activity.action] || "gray";

  const [showChanges, setShowChanges] = useState(false);
  const hasChanges =
    activity.changes && Object.keys(activity.changes).length > 0;

  return (
    <div
      className={cn(
        "group relative flex gap-4 py-4 transition-all duration-300",
        "hover:bg-white/[0.02]",
        isFirst && "animate-[slideIn_0.3s_ease-out]"
      )}
    >
      {/* Timeline connector */}
      {showTimeline && (
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
      )}

      {/* Icon */}
      <div className="relative z-10 flex-shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            "border transition-all duration-300",
            `bg-${color}/10 border-${color}/30`,
            "group-hover:scale-110 group-hover:shadow-lg",
            `group-hover:shadow-${color}/20`
          )}
          style={{
            background: `rgba(var(--${color}-rgb, 0, 255, 255), 0.1)`,
            borderColor: `rgba(var(--${color}-rgb, 0, 255, 255), 0.3)`,
          }}
        >
          <ActionIcon
            className={cn("w-4 h-4 transition-colors", `text-${color}`)}
            style={{ color: `var(--${color}, #00ffff)` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action badge */}
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider",
              "border transition-colors"
            )}
            style={{
              background: `rgba(var(--${color}-rgb, 0, 255, 255), 0.15)`,
              borderColor: `rgba(var(--${color}-rgb, 0, 255, 255), 0.3)`,
              color: `var(--${color}, #00ffff)`,
            }}
          >
            {actionLabels[activity.action] || activity.action}
          </span>

          {/* Entity type badge */}
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/50">
            <EntityIcon className="w-3 h-3" />
            {entityLabels[activity.entityType] || activity.entityType}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
          {activity.title}
        </h4>

        {/* Description */}
        {activity.description && (
          <p className="text-xs text-white/50 truncate">{activity.description}</p>
        )}

        {/* Changes toggle */}
        {hasChanges && (
          <button
            onClick={() => setShowChanges(!showChanges)}
            className={cn(
              "flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider",
              "text-white/40 hover:text-white/60 transition-colors"
            )}
          >
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform",
                showChanges && "rotate-180"
              )}
            />
            {Object.keys(activity.changes || {}).length} Anderungen
          </button>
        )}

        {/* Changes list */}
        {showChanges && activity.changes && (
          <div className="mt-2 p-2 rounded-lg bg-void/50 border border-white/5 space-y-1">
            {Object.entries(activity.changes).map(([field, change]) => (
              <div key={field} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-white/50">{field}:</span>
                <span className="text-neon-red/70 line-through">
                  {String(change.from ?? "null")}
                </span>
                <span className="text-white/30">-&gt;</span>
                <span className="text-neon-green/70">{String(change.to ?? "null")}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/30">
          {/* User */}
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {activity.user.name}
          </span>

          {/* Timestamp */}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(activity.timestamp)}
          </span>

          {/* IP Address */}
          {activity.ipAddress && (
            <span className="hidden sm:flex items-center gap-1">
              {activity.ipAddress}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FILTER BAR COMPONENT
// =============================================================================

interface FilterBarProps {
  filters: ActivityFilters;
  onFilterChange: (filters: ActivityFilters) => void;
}

function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 p-3 border-b border-white/10">
      <Filter className="w-4 h-4 text-white/40" />

      {/* Entity type filter */}
      <select
        value={filters.entityType || ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            entityType: (e.target.value as EntityType) || undefined,
          })
        }
        className={cn(
          "px-2 py-1 rounded text-xs font-mono",
          "bg-void/50 border border-white/10 text-white/70",
          "focus:outline-none focus:border-neon-cyan/50"
        )}
      >
        <option value="">Alle Entitaten</option>
        {(Object.keys(entityLabels) as EntityType[]).map((type) => (
          <option key={type} value={type}>
            {entityLabels[type]}
          </option>
        ))}
      </select>

      {/* Action filter */}
      <select
        value={filters.action || ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            action: (e.target.value as ActivityAction) || undefined,
          })
        }
        className={cn(
          "px-2 py-1 rounded text-xs font-mono",
          "bg-void/50 border border-white/10 text-white/70",
          "focus:outline-none focus:border-neon-cyan/50"
        )}
      >
        <option value="">Alle Aktionen</option>
        {(Object.keys(actionLabels) as ActivityAction[]).map((action) => (
          <option key={action} value={action}>
            {actionLabels[action]}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {(filters.entityType || filters.action) && (
        <button
          onClick={() => onFilterChange({})}
          className="px-2 py-1 rounded text-xs font-mono text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          Zurucksetzen
        </button>
      )}
    </div>
  );
}

// =============================================================================
// MAIN ACTIVITY FEED COMPONENT
// =============================================================================

export function ActivityFeed({
  activities = [],
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onFilterChange,
  className,
  maxHeight = "500px",
  showFilters = true,
  showTimeline = true,
  title = "Aktivitaten",
}: ActivityFeedProps) {
  const [filters, setFilters] = useState<ActivityFilters>({});
  const feedRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: ActivityFilters) => {
      setFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [onFilterChange]
  );

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoading]);

  // Count active activities by action
  const activityCounts = activities.reduce(
    (acc, a) => {
      acc[a.action] = (acc[a.action] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div
      className={cn(
        "bg-void-surface/80 backdrop-blur-xl rounded-xl",
        "border border-white/10 overflow-hidden",
        "shadow-2xl shadow-black/50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-void/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-neon-cyan" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white/90 uppercase tracking-wider">
              {title}
            </h3>
            <p className="text-[10px] font-mono text-white/40">
              {activities.length} Aktivitaten
            </p>
          </div>
        </div>

        {/* Activity summary */}
        <div className="hidden sm:flex items-center gap-2">
          {Object.entries(activityCounts)
            .slice(0, 3)
            .map(([action, count]) => (
              <div
                key={action}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded",
                  "text-[10px] font-mono"
                )}
                style={{
                  background: `rgba(var(--${actionColors[action as ActivityAction]}-rgb, 128, 128, 128), 0.1)`,
                  color: `var(--${actionColors[action as ActivityAction]}, #888)`,
                }}
              >
                {React.createElement(actionIcons[action as ActivityAction] || Circle, {
                  className: "w-3 h-3",
                })}
                <span>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Filters */}
      {showFilters && onFilterChange && (
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />
      )}

      {/* Activity List */}
      <div
        ref={feedRef}
        className="overflow-y-auto scrollbar-thin scrollbar-track-void scrollbar-thumb-white/10"
        style={{ maxHeight }}
      >
        {isLoading && activities.length === 0 ? (
          // Loading skeleton
          <div className="px-4 py-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-white/5 rounded" />
                  <div className="h-3 w-48 bg-white/5 rounded" />
                  <div className="h-2 w-32 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          // Empty state
          <div className="px-4 py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-white/10" />
            <p className="text-sm font-medium text-white/40">Keine Aktivitaten</p>
            <p className="text-xs text-white/20 mt-1">
              Aktivitaten werden hier angezeigt
            </p>
          </div>
        ) : (
          // Activity list
          <div className="px-4 divide-y divide-white/5">
            {activities.map((activity, index) => (
              <ActivityItemComponent
                key={activity.id}
                activity={activity}
                isFirst={index === 0}
                showTimeline={showTimeline}
              />
            ))}

            {/* Load more trigger */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="py-4 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-mono">Laden...</span>
                  </div>
                ) : (
                  <button
                    onClick={onLoadMore}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                      "text-xs font-mono text-white/50",
                      "bg-white/5 border border-white/10",
                      "hover:bg-white/10 hover:text-white/70 transition-colors"
                    )}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Mehr laden
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/5 bg-void/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            <span className="text-[10px] font-mono text-white/30">
              LIVE AUDIT TRAIL
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/20">
            NEXUS COMMAND CENTER
          </span>
        </div>
      </div>

      {/* Slide-in animation */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        :root {
          --neon-cyan: #00ffff;
          --neon-cyan-rgb: 0, 255, 255;
          --neon-green: #00ff88;
          --neon-green-rgb: 0, 255, 136;
          --neon-red: #ff4444;
          --neon-red-rgb: 255, 68, 68;
          --neon-purple: #aa66ff;
          --neon-purple-rgb: 170, 102, 255;
          --neon-blue: #4488ff;
          --neon-blue-rgb: 68, 136, 255;
          --gray: #888888;
          --gray-rgb: 136, 136, 136;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// COMPACT ACTIVITY FEED VARIANT
// =============================================================================

export interface CompactActivityFeedProps {
  activities?: ActivityItem[];
  maxItems?: number;
  className?: string;
}

export function CompactActivityFeed({
  activities = [],
  maxItems = 5,
  className,
}: CompactActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className={cn("space-y-2", className)}>
      {displayedActivities.map((activity) => {
        const ActionIcon = actionIcons[activity.action] || Circle;
        const color = actionColors[activity.action] || "gray";

        return (
          <div
            key={activity.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg",
              "bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            )}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: `rgba(var(--${color}-rgb, 128, 128, 128), 0.15)`,
              }}
            >
              <ActionIcon
                className="w-3 h-3"
                style={{ color: `var(--${color}, #888)` }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 truncate">{activity.title}</p>
              <p className="text-[10px] text-white/30">
                {activity.user.name} - {formatRelativeTime(activity.timestamp)}
              </p>
            </div>
          </div>
        );
      })}

      {activities.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-xs text-white/30">Keine Aktivitaten</p>
        </div>
      )}

      {activities.length > maxItems && (
        <div className="pt-2 text-center">
          <span className="text-[10px] font-mono text-white/30">
            +{activities.length - maxItems} weitere
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ACTIVITY TIMELINE COMPONENT
// =============================================================================

export interface ActivityTimelineProps {
  activities?: ActivityItem[];
  className?: string;
}

export function ActivityTimeline({
  activities = [],
  className,
}: ActivityTimelineProps) {
  // Group activities by date
  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const date = new Date(activity.timestamp).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, ActivityItem[]>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {Object.entries(groupedActivities).map(([date, dateActivities]) => (
        <div key={date}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-xs font-mono text-white/40 uppercase tracking-wider">
              {date}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Activities for this date */}
          <div className="space-y-1">
            {dateActivities.map((activity) => (
              <ActivityItemComponent
                key={activity.id}
                activity={activity}
                showTimeline={true}
              />
            ))}
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="py-12 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-white/10" />
          <p className="text-sm text-white/40">Keine Aktivitaten vorhanden</p>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
