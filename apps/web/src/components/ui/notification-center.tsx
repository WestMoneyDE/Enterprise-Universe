"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CENTER - Persistent notification panel with SciFi styling
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "nexus-notifications";

export type NotificationType = "info" | "success" | "warning" | "error" | "alert";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: Date | string;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
  maxDisplay?: number;
  className?: string;
}

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string; glow: string; border: string }
> = {
  info: {
    icon: Info,
    color: "text-neon-cyan",
    bg: "bg-neon-cyan/10",
    glow: "shadow-[0_0_10px_rgba(0,255,255,0.3)]",
    border: "border-neon-cyan/30",
  },
  success: {
    icon: CheckCircle2,
    color: "text-neon-green",
    bg: "bg-neon-green/10",
    glow: "shadow-[0_0_10px_rgba(0,255,128,0.3)]",
    border: "border-neon-green/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-neon-gold",
    bg: "bg-neon-gold/10",
    glow: "shadow-[0_0_10px_rgba(255,215,0,0.3)]",
    border: "border-neon-gold/30",
  },
  error: {
    icon: AlertCircle,
    color: "text-neon-red",
    bg: "bg-neon-red/10",
    glow: "shadow-[0_0_10px_rgba(255,0,64,0.3)]",
    border: "border-neon-red/30",
  },
  alert: {
    icon: ShieldAlert,
    color: "text-neon-purple",
    bg: "bg-neon-purple/10",
    glow: "shadow-[0_0_10px_rgba(168,85,247,0.3)]",
    border: "border-neon-purple/30",
  },
};

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  maxDisplay = 5,
  className,
}: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications = notifications.slice(0, maxDisplay);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative group transition-all duration-300",
            "hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)]",
            className
          )}
        >
          <Bell className={cn(
            "h-5 w-5 transition-all duration-300",
            unreadCount > 0 && "text-neon-cyan animate-pulse"
          )} />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center",
              "rounded-full bg-neon-red text-[10px] font-bold text-white",
              "shadow-[0_0_10px_rgba(255,0,64,0.5)] animate-pulse"
            )}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          {/* Glow ring effect */}
          <span className={cn(
            "absolute inset-0 rounded-md opacity-0 transition-opacity duration-300",
            "bg-gradient-to-r from-neon-cyan/0 via-neon-cyan/10 to-neon-purple/0",
            "group-hover:opacity-100"
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        variant="cyber"
        className={cn(
          "w-[400px] p-0 overflow-hidden",
          "bg-gradient-to-b from-gray-900/98 to-gray-950/98",
          "border border-neon-cyan/30",
          "shadow-[0_0_30px_rgba(0,255,255,0.15),inset_0_1px_0_rgba(0,255,255,0.1)]",
          "backdrop-blur-xl"
        )}
      >
        {/* Header with animated border */}
        <div className={cn(
          "relative flex items-center justify-between px-4 py-3",
          "border-b border-neon-cyan/20",
          "bg-gradient-to-r from-neon-cyan/5 via-transparent to-neon-purple/5"
        )}>
          {/* Scanning line effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent animate-scan" />
          </div>

          <div>
            <h3 className={cn(
              "font-display text-sm font-semibold",
              "bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent",
              "drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]"
            )}>
              NOTIFICATIONS
            </h3>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500">
                {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && onMarkAllAsRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className={cn(
                  "h-8 px-2 text-xs",
                  "text-neon-cyan hover:bg-neon-cyan/10",
                  "hover:shadow-[0_0_10px_rgba(0,255,255,0.2)]",
                  "transition-all duration-300"
                )}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-neon-cyan/20 scrollbar-track-transparent">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className={cn(
                "rounded-full p-4 mb-3",
                "bg-gradient-to-br from-gray-800/50 to-gray-900/50",
                "border border-neon-cyan/10",
                "shadow-[0_0_20px_rgba(0,255,255,0.1)]"
              )}>
                <Bell className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-sm text-gray-500">No notifications</p>
              <p className="text-xs text-gray-600 mt-1">You're all caught up!</p>
            </div>
          ) : (
            displayedNotifications.map((notification, index) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative flex gap-3 px-4 py-3 transition-all duration-300",
                    "border-b border-neon-cyan/10 last:border-0",
                    !notification.read && [
                      "bg-gradient-to-r from-neon-cyan/5 via-transparent to-neon-purple/5",
                      config.border,
                    ],
                    "hover:bg-neon-cyan/5"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* Icon with glow */}
                  <div className={cn(
                    "rounded-full p-2 transition-all duration-300",
                    config.bg,
                    !notification.read && config.glow
                  )}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm transition-colors duration-300",
                          notification.read
                            ? "text-gray-400"
                            : "font-medium text-white"
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          config.bg.replace("/10", ""),
                          "shadow-[0_0_8px_currentColor] animate-pulse"
                        )} style={{ backgroundColor: config.color.includes("cyan") ? "rgb(0,255,255)" : config.color.includes("green") ? "rgb(0,255,128)" : config.color.includes("gold") ? "rgb(255,215,0)" : config.color.includes("red") ? "rgb(255,0,64)" : "rgb(168,85,247)" }} />
                      )}
                    </div>

                    {notification.message && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                        {notification.message}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-mono">
                        {formatRelativeTime(notification.timestamp)}
                      </span>

                      {notification.action && (
                        <button
                          onClick={() => {
                            notification.action?.onClick();
                            setOpen(false);
                          }}
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded",
                            "transition-all duration-300",
                            config.color,
                            config.bg,
                            "hover:shadow-[0_0_10px_currentColor]"
                          )}
                        >
                          {notification.action.label}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className={cn(
                    "absolute right-2 top-2 flex gap-1",
                    "opacity-0 transition-all duration-300 translate-x-2",
                    "group-hover:opacity-100 group-hover:translate-x-0"
                  )}>
                    {!notification.read && onMarkAsRead && (
                      <button
                        onClick={() => onMarkAsRead(notification.id)}
                        className={cn(
                          "rounded p-1.5 transition-all duration-300",
                          "bg-gray-800/50 text-gray-500",
                          "hover:bg-neon-cyan/20 hover:text-neon-cyan",
                          "hover:shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                        )}
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(notification.id)}
                        className={cn(
                          "rounded p-1.5 transition-all duration-300",
                          "bg-gray-800/50 text-gray-500",
                          "hover:bg-neon-red/20 hover:text-neon-red",
                          "hover:shadow-[0_0_10px_rgba(255,0,64,0.3)]"
                        )}
                        title="Delete"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > maxDisplay && (
          <div className={cn(
            "border-t border-neon-cyan/20 px-4 py-2",
            "bg-gradient-to-r from-neon-cyan/5 via-transparent to-neon-purple/5"
          )}>
            <button className={cn(
              "w-full text-center text-xs py-1",
              "text-neon-cyan hover:text-neon-cyan/80",
              "transition-all duration-300",
              "hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]"
            )}>
              View all {notifications.length} notifications
            </button>
          </div>
        )}

        {notifications.length > 0 && onClearAll && (
          <div className={cn(
            "border-t border-neon-cyan/20 px-4 py-2",
            "bg-gradient-to-b from-transparent to-gray-950/50"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className={cn(
                "w-full text-xs",
                "text-gray-500 hover:text-neon-red",
                "hover:bg-neon-red/10",
                "hover:shadow-[0_0_10px_rgba(255,0,64,0.2)]",
                "transition-all duration-300"
              )}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Clear all notifications
            </Button>
          </div>
        )}

        {/* Bottom glow line */}
        <div className="h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// useNotifications Hook - Manages notification state with localStorage persistence
// ═══════════════════════════════════════════════════════════════════════════════

interface UseNotificationsOptions {
  storageKey?: string;
  maxNotifications?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  add: (notification: Omit<Notification, "id" | "timestamp" | "read">) => string;
  remove: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  // Legacy aliases for backwards compatibility
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => string;
  deleteNotification: (id: string) => void;
}

function serializeNotifications(notifications: Notification[]): string {
  return JSON.stringify(
    notifications.map((n) => ({
      ...n,
      timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp,
      // Remove action functions as they can't be serialized
      action: undefined,
    }))
  );
}

function deserializeNotifications(json: string): Notification[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.map((n: Notification) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }))
      : [];
  } catch {
    return [];
  }
}

export function useNotifications(
  initial: Notification[] = [],
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { storageKey = STORAGE_KEY, maxNotifications = 100 } = options;

  const [notifications, setNotifications] = React.useState<Notification[]>(() => {
    // Try to load from localStorage on initial render (client-side only)
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = deserializeNotifications(stored);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    }
    return initial;
  });

  // Persist to localStorage whenever notifications change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, serializeNotifications(notifications));
    }
  }, [notifications, storageKey]);

  const add = React.useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        // Limit the number of stored notifications
        return updated.slice(0, maxNotifications);
      });
      return newNotification.id;
    },
    [maxNotifications]
  );

  const remove = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = React.useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = React.useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    add,
    remove,
    markAsRead,
    markAllAsRead,
    clearAll,
    // Legacy aliases
    addNotification: add,
    deleteNotification: remove,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NotificationProvider - Context-based notification management
// ═══════════════════════════════════════════════════════════════════════════════

interface NotificationContextValue extends UseNotificationsReturn {}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  storageKey?: string;
  maxNotifications?: number;
}

export function NotificationProvider({
  children,
  storageKey,
  maxNotifications,
}: NotificationProviderProps) {
  const value = useNotifications([], { storageKey, maxNotifications });

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }
  return context;
}
