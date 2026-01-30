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
  X,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CENTER - Dropdown notification panel with actions
// ═══════════════════════════════════════════════════════════════════════════════

type NotificationType = "info" | "success" | "warning" | "error";

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
  { icon: React.ElementType; color: string; bg: string }
> = {
  info: { icon: Info, color: "text-neon-cyan", bg: "bg-neon-cyan/10" },
  success: { icon: CheckCircle2, color: "text-neon-green", bg: "bg-neon-green/10" },
  warning: { icon: AlertTriangle, color: "text-neon-gold", bg: "bg-neon-gold/10" },
  error: { icon: AlertCircle, color: "text-neon-red", bg: "bg-neon-red/10" },
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
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-neon-red text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        variant="cyber"
        className="w-[380px] p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neon-cyan/20 px-4 py-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-neon-cyan">
              Benachrichtigungen
            </h3>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500">
                {unreadCount} ungelesen
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && onMarkAllAsRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="h-8 px-2 text-xs"
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Alle lesen
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-10 w-10 text-gray-600" />
              <p className="mt-2 text-sm text-gray-500">
                Keine Benachrichtigungen
              </p>
            </div>
          ) : (
            displayedNotifications.map((notification) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative flex gap-3 border-b border-neon-cyan/10 px-4 py-3 transition-colors last:border-0",
                    !notification.read && "bg-neon-cyan/5"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("rounded-full p-2", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          notification.read
                            ? "text-gray-300"
                            : "font-medium text-white"
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-neon-cyan" />
                      )}
                    </div>

                    {notification.message && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                        {notification.message}
                      </p>
                    )}

                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        {formatRelativeTime(notification.timestamp)}
                      </span>

                      {notification.action && (
                        <button
                          onClick={() => {
                            notification.action?.onClick();
                            setOpen(false);
                          }}
                          className={cn(
                            "text-xs font-medium",
                            config.color,
                            "hover:underline"
                          )}
                        >
                          {notification.action.label}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!notification.read && onMarkAsRead && (
                      <button
                        onClick={() => onMarkAsRead(notification.id)}
                        className="rounded p-1 text-gray-500 hover:bg-neon-cyan/10 hover:text-neon-cyan"
                        title="Als gelesen markieren"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(notification.id)}
                        className="rounded p-1 text-gray-500 hover:bg-neon-red/10 hover:text-neon-red"
                        title="Löschen"
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
          <div className="border-t border-neon-cyan/20 px-4 py-2">
            <button className="w-full text-center text-xs text-neon-cyan hover:underline">
              Alle {notifications.length} Benachrichtigungen anzeigen
            </button>
          </div>
        )}

        {notifications.length > 0 && onClearAll && (
          <div className="border-t border-neon-cyan/20 px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="w-full text-xs text-gray-500 hover:text-neon-red"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Alle löschen
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook for managing notification state
export function useNotifications(initial: Notification[] = []) {
  const [notifications, setNotifications] = React.useState<Notification[]>(initial);

  const addNotification = React.useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    return newNotification.id;
  }, []);

  const markAsRead = React.useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = React.useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
