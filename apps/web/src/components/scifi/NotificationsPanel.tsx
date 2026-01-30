"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS PANEL - Real-time alerts with cyberpunk aesthetics
// ═══════════════════════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "critical" | "ai";
  title: string;
  message: string;
  timestamp: Date;
  source?: string;
  read?: boolean;
}

export interface NotificationsPanelProps {
  notifications?: Notification[];
  maxVisible?: number;
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  className?: string;
  compact?: boolean;
}

const typeConfig = {
  info: {
    color: "text-neon-cyan",
    bgColor: "bg-neon-cyan/10",
    borderColor: "border-neon-cyan/30",
    icon: "ℹ",
    pulse: false,
  },
  success: {
    color: "text-neon-green",
    bgColor: "bg-neon-green/10",
    borderColor: "border-neon-green/30",
    icon: "✓",
    pulse: false,
  },
  warning: {
    color: "text-neon-orange",
    bgColor: "bg-neon-orange/10",
    borderColor: "border-neon-orange/30",
    icon: "⚠",
    pulse: true,
  },
  critical: {
    color: "text-neon-red",
    bgColor: "bg-neon-red/10",
    borderColor: "border-neon-red/30",
    icon: "⊗",
    pulse: true,
  },
  ai: {
    color: "text-neon-purple",
    bgColor: "bg-neon-purple/10",
    borderColor: "border-neon-purple/30",
    icon: "◉",
    pulse: true,
  },
};

export default function NotificationsPanel({
  notifications = [],
  maxVisible = 5,
  onDismiss,
  onMarkRead,
  className,
  compact = false,
}: NotificationsPanelProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setVisibleNotifications(isExpanded ? sorted : sorted.slice(0, maxVisible));
  }, [notifications, maxVisible, isExpanded]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter((n) => n.type === "critical" && !n.read).length;

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString("de-DE");
  };

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <button
          className={cn(
            "relative p-2 rounded-lg transition-all",
            "bg-void-surface/50 border border-white/10",
            "hover:border-neon-cyan/30 hover:bg-void-surface",
            criticalCount > 0 && "border-neon-red/50 animate-pulse"
          )}
        >
          <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1",
              "flex items-center justify-center rounded-full",
              "text-[10px] font-bold",
              criticalCount > 0
                ? "bg-neon-red text-white"
                : "bg-neon-cyan text-void"
            )}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-void-surface/80 backdrop-blur-xl rounded-xl",
      "border border-white/10 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              "w-2 h-2 rounded-full",
              criticalCount > 0 ? "bg-neon-red animate-pulse" : "bg-neon-cyan"
            )} />
          </div>
          <h3 className="text-sm font-display font-bold text-white/90 uppercase tracking-wider">
            System Alerts
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-neon-cyan/20 text-neon-cyan rounded">
              {unreadCount} NEW
            </span>
          )}
        </div>
        {notifications.length > maxVisible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-mono text-white/50 hover:text-neon-cyan transition-colors"
          >
            {isExpanded ? "COLLAPSE" : `+${notifications.length - maxVisible} MORE`}
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-void scrollbar-thumb-white/10">
        {visibleNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-2xl mb-2 opacity-30">◎</div>
            <p className="text-xs font-mono text-white/30">NO ACTIVE ALERTS</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visibleNotifications.map((notification, index) => {
              const config = typeConfig[notification.type];
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "relative px-4 py-3 transition-all duration-300",
                    "hover:bg-white/5 cursor-pointer",
                    !notification.read && config.bgColor,
                    config.pulse && !notification.read && "animate-pulse"
                  )}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                  onClick={() => onMarkRead?.(notification.id)}
                >
                  {/* Type Indicator Line */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-0.5",
                    notification.type === "critical" && "bg-neon-red",
                    notification.type === "warning" && "bg-neon-orange",
                    notification.type === "success" && "bg-neon-green",
                    notification.type === "info" && "bg-neon-cyan",
                    notification.type === "ai" && "bg-neon-purple"
                  )} />

                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span className={cn("text-lg", config.color)}>
                      {config.icon}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                          "text-xs font-display font-bold uppercase tracking-wide",
                          config.color
                        )}>
                          {notification.title}
                        </span>
                        {notification.source && (
                          <span className="text-[9px] font-mono text-white/30 px-1.5 py-0.5 bg-white/5 rounded">
                            {notification.source}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-[10px] font-mono text-white/30 mt-1 block">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>

                    {/* Dismiss Button */}
                    {onDismiss && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(notification.id);
                        }}
                        className="p-1 text-white/30 hover:text-white/70 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-white/5 bg-void/50">
        <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
          <span>TOTAL: {notifications.length}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-red" />
              {notifications.filter(n => n.type === "critical").length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-orange" />
              {notifications.filter(n => n.type === "warning").length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
              {notifications.filter(n => n.type === "success").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TOAST - Floating notification for immediate alerts
// ═══════════════════════════════════════════════════════════════════════════════

export interface NotificationToastProps {
  notification: Notification;
  onClose?: () => void;
  duration?: number;
}

export function NotificationToast({
  notification,
  onClose,
  duration = 5000
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = typeConfig[notification.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        setTimeout(onClose, 300); // Wait for animation
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={cn(
      "fixed bottom-4 right-4 max-w-sm",
      "transform transition-all duration-300",
      isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    )}>
      <div className={cn(
        "relative overflow-hidden rounded-lg",
        "bg-void-surface/95 backdrop-blur-xl",
        "border", config.borderColor,
        "shadow-lg shadow-black/50"
      )}>
        {/* Animated Border Glow */}
        <div className={cn(
          "absolute inset-0 opacity-20",
          config.bgColor
        )} />

        <div className="relative px-4 py-3">
          <div className="flex items-start gap-3">
            <span className={cn("text-xl", config.color)}>
              {config.icon}
            </span>
            <div className="flex-1">
              <p className={cn("text-sm font-display font-bold", config.color)}>
                {notification.title}
              </p>
              <p className="text-xs text-white/60 mt-0.5">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => {
                setIsVisible(false);
                if (onClose) {
                  setTimeout(onClose, 300);
                }
              }}
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 bg-white/5">
          <div
            className={cn("h-full", config.bgColor.replace("/10", ""))}
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
