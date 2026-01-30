"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// AI ACTIVITY FEED - Real-time AI agent activity stream
// Shows what AI agents are doing in an engaging visual format
// ═══════════════════════════════════════════════════════════════════════════════

export interface Activity {
  id: string;
  agentName: string;
  agentModel: "haiku" | "sonnet" | "opus" | "gpt4" | "system";
  action: "thinking" | "generating" | "completed" | "error" | "analyzing" | "learning";
  description: string;
  timestamp: Date;
  duration?: number; // in ms
  metadata?: Record<string, string | number>;
}

export interface ActivityFeedProps {
  activities?: Activity[];
  maxVisible?: number;
  showTimestamps?: boolean;
  autoScroll?: boolean;
  className?: string;
}

const agentConfig = {
  haiku: {
    color: "text-neon-cyan",
    bgColor: "bg-neon-cyan/20",
    borderColor: "border-neon-cyan/40",
    glow: "shadow-neon-cyan/20",
    label: "HAIKU",
  },
  sonnet: {
    color: "text-neon-purple",
    bgColor: "bg-neon-purple/20",
    borderColor: "border-neon-purple/40",
    glow: "shadow-neon-purple/20",
    label: "SONNET",
  },
  opus: {
    color: "text-neon-orange",
    bgColor: "bg-neon-orange/20",
    borderColor: "border-neon-orange/40",
    glow: "shadow-neon-orange/20",
    label: "OPUS",
  },
  gpt4: {
    color: "text-neon-green",
    bgColor: "bg-neon-green/20",
    borderColor: "border-neon-green/40",
    glow: "shadow-neon-green/20",
    label: "GPT-4",
  },
  system: {
    color: "text-white/70",
    bgColor: "bg-white/10",
    borderColor: "border-white/20",
    glow: "shadow-white/10",
    label: "SYSTEM",
  },
};

const actionConfig = {
  thinking: { icon: "◐", animation: "animate-spin-slow", label: "THINKING" },
  generating: { icon: "◈", animation: "animate-pulse", label: "GENERATING" },
  completed: { icon: "✓", animation: "", label: "COMPLETED" },
  error: { icon: "⊗", animation: "animate-pulse", label: "ERROR" },
  analyzing: { icon: "◎", animation: "animate-ping-slow", label: "ANALYZING" },
  learning: { icon: "◇", animation: "animate-bounce-subtle", label: "LEARNING" },
};

export default function ActivityFeed({
  activities = [],
  maxVisible = 10,
  showTimestamps = true,
  autoScroll = true,
  className,
}: ActivityFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [visibleActivities, setVisibleActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const sorted = [...activities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxVisible);
    setVisibleActivities(sorted);
  }, [activities, maxVisible]);

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [visibleActivities, autoScroll]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  // Calculate active agents count
  const activeAgents = new Set(
    activities
      .filter(a => a.action === "thinking" || a.action === "generating" || a.action === "analyzing")
      .map(a => a.agentModel)
  ).size;

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
            <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-neon-cyan animate-ping" />
          </div>
          <h3 className="text-sm font-display font-bold text-white/90 uppercase tracking-wider">
            AI Activity Stream
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/40">
            {activeAgents} ACTIVE
          </span>
          <span className="w-px h-3 bg-white/20" />
          <span className="text-[10px] font-mono text-neon-cyan">
            LIVE
          </span>
        </div>
      </div>

      {/* Activity List */}
      <div
        ref={feedRef}
        className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-track-void scrollbar-thumb-white/10"
      >
        {visibleActivities.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-3xl mb-2 opacity-20">◎</div>
            <p className="text-xs font-mono text-white/30">NO RECENT ACTIVITY</p>
            <p className="text-[10px] font-mono text-white/20 mt-1">Agents are standing by...</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visibleActivities.map((activity, index) => {
              const agent = agentConfig[activity.agentModel];
              const action = actionConfig[activity.action];

              return (
                <div
                  key={activity.id}
                  className={cn(
                    "px-4 py-3 transition-all duration-500",
                    "hover:bg-white/5",
                    index === 0 && "bg-white/[0.02]"
                  )}
                  style={{
                    animation: index === 0 ? "slideIn 0.3s ease-out" : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Agent Badge */}
                    <div className={cn(
                      "flex-shrink-0 px-2 py-1 rounded text-[10px] font-mono font-bold",
                      "border",
                      agent.bgColor,
                      agent.borderColor,
                      agent.color
                    )}>
                      {agent.label}
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {/* Action Icon */}
                        <span className={cn(
                          "text-sm",
                          action.animation,
                          activity.action === "completed" && "text-neon-green",
                          activity.action === "error" && "text-neon-red",
                          (activity.action === "thinking" || activity.action === "generating") && agent.color
                        )}>
                          {action.icon}
                        </span>

                        {/* Action Label */}
                        <span className={cn(
                          "text-[10px] font-mono uppercase tracking-wide",
                          activity.action === "completed" && "text-neon-green",
                          activity.action === "error" && "text-neon-red",
                          activity.action !== "completed" && activity.action !== "error" && "text-white/50"
                        )}>
                          {action.label}
                        </span>

                        {/* Duration Badge */}
                        {activity.duration && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-white/5 rounded text-white/40">
                            {formatDuration(activity.duration)}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-white/70 leading-relaxed">
                        {activity.description}
                      </p>

                      {/* Metadata */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <span
                              key={key}
                              className="text-[9px] font-mono px-1.5 py-0.5 bg-void rounded text-white/40"
                            >
                              {key}: <span className="text-white/60">{value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    {showTimestamps && (
                      <span className="flex-shrink-0 text-[10px] font-mono text-white/30">
                        {formatTime(activity.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Agent Status Bar */}
      <div className="px-4 py-2 border-t border-white/5 bg-void/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Object.entries(agentConfig)
              .filter(([key]) => key !== "system")
              .map(([key, config]) => {
                const isActive = activities.some(
                  a => a.agentModel === key &&
                  (a.action === "thinking" || a.action === "generating" || a.action === "analyzing")
                );
                return (
                  <div key={key} className="flex items-center gap-1">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      isActive ? config.bgColor.replace("/20", "") : "bg-white/20"
                    )} />
                    <span className={cn(
                      "text-[9px] font-mono transition-colors",
                      isActive ? config.color : "text-white/30"
                    )}>
                      {config.label}
                    </span>
                  </div>
                );
              })}
          </div>
          <span className="text-[10px] font-mono text-white/30">
            {activities.length} EVENTS
          </span>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI ACTIVITY INDICATOR - Compact version for header bars
// ═══════════════════════════════════════════════════════════════════════════════

export interface MiniActivityIndicatorProps {
  activities: Activity[];
  className?: string;
}

export function MiniActivityIndicator({ activities, className }: MiniActivityIndicatorProps) {
  const activeActivities = activities.filter(
    a => a.action === "thinking" || a.action === "generating" || a.action === "analyzing"
  );

  if (activeActivities.length === 0) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        <span className="text-[10px] font-mono text-white/30">IDLE</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex -space-x-1">
        {activeActivities.slice(0, 3).map((activity) => {
          const agent = agentConfig[activity.agentModel];
          return (
            <div
              key={activity.id}
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center",
                "text-[8px] font-bold border border-void",
                agent.bgColor,
                agent.color
              )}
            >
              {agent.label[0]}
            </div>
          );
        })}
      </div>
      <span className="text-[10px] font-mono text-neon-cyan animate-pulse">
        {activeActivities.length} PROCESSING
      </span>
    </div>
  );
}
