"use client";

import { forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StatCard, StatCardProps } from "./HoloCard";

// ═══════════════════════════════════════════════════════════════════════════════
// STATS GRID - Animated Statistics Dashboard Grid
// Displays multiple stat cards with staggered boot-up animations
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatItem extends Omit<StatCardProps, "children"> {
  id: string;
}

export interface StatsGridProps {
  stats: StatItem[];
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  animated?: boolean;
  staggerDelay?: number;
  variant?: "default" | "cyan" | "purple" | "gold" | "god" | "ultra";
}

export const StatsGrid = forwardRef<HTMLDivElement, StatsGridProps>(
  (
    {
      stats,
      className,
      columns = 4,
      animated = true,
      staggerDelay = 100,
      variant = "cyan",
    },
    ref
  ) => {
    const columnStyles = {
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
      6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
    };

    return (
      <div
        ref={ref}
        className={cn("grid gap-4", columnStyles[columns], className)}
      >
        {stats.map((stat, index) => (
          <div
            key={stat.id}
            className={cn(animated && "animate-slide-up")}
            style={{
              animationDelay: animated ? `${index * staggerDelay}ms` : undefined,
              animationFillMode: "backwards",
            }}
          >
            <StatCard variant={variant} {...stat} />
          </div>
        ))}
      </div>
    );
  }
);

StatsGrid.displayName = "StatsGrid";

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC RING - Circular progress indicator
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricRingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  sublabel?: string;
  color?: "cyan" | "purple" | "green" | "red" | "gold" | "orange";
  className?: string;
  animated?: boolean;
}

export function MetricRing({
  value,
  max = 100,
  size = "md",
  label,
  sublabel,
  color = "cyan",
  className,
  animated = true,
}: MetricRingProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizeStyles = {
    sm: { container: "w-20 h-20", text: "text-lg", subtext: "text-[8px]" },
    md: { container: "w-28 h-28", text: "text-2xl", subtext: "text-[10px]" },
    lg: { container: "w-36 h-36", text: "text-3xl", subtext: "text-xs" },
    xl: { container: "w-44 h-44", text: "text-4xl", subtext: "text-sm" },
  };

  const colorStyles = {
    cyan: { stroke: "#00F0FF", glow: "drop-shadow(0 0 10px #00F0FF)" },
    purple: { stroke: "#A855F7", glow: "drop-shadow(0 0 10px #A855F7)" },
    green: { stroke: "#00FF88", glow: "drop-shadow(0 0 10px #00FF88)" },
    red: { stroke: "#FF3366", glow: "drop-shadow(0 0 10px #FF3366)" },
    gold: { stroke: "#FFD700", glow: "drop-shadow(0 0 10px #FFD700)" },
    orange: { stroke: "#FF6B00", glow: "drop-shadow(0 0 10px #FF6B00)" },
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        sizeStyles[size].container,
        className
      )}
    >
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-white/10"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colorStyles[color].stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: colorStyles[color].glow,
            transition: animated ? "stroke-dashoffset 1s ease-out" : undefined,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-display font-bold text-white",
            sizeStyles[size].text
          )}
        >
          {Math.round(percentage)}%
        </span>
        {label && (
          <span
            className={cn(
              "font-mono text-white/50 uppercase tracking-wider",
              sizeStyles[size].subtext
            )}
          >
            {label}
          </span>
        )}
        {sublabel && (
          <span
            className={cn(
              "font-mono text-white/30",
              sizeStyles[size].subtext
            )}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA BAR - Horizontal progress bar with label
// ═══════════════════════════════════════════════════════════════════════════════

export interface DataBarProps {
  label: string;
  value: number;
  max?: number;
  color?: "cyan" | "purple" | "green" | "red" | "gold" | "orange";
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
}

export function DataBar({
  label,
  value,
  max = 100,
  color = "cyan",
  showValue = true,
  size = "md",
  className,
  animated = true,
}: DataBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeStyles = {
    sm: { bar: "h-1", text: "text-xs" },
    md: { bar: "h-2", text: "text-sm" },
    lg: { bar: "h-3", text: "text-base" },
  };

  const colorStyles = {
    cyan: "bg-neon-cyan shadow-neon-cyan",
    purple: "bg-neon-purple shadow-neon-purple",
    green: "bg-neon-green shadow-neon-green",
    red: "bg-neon-red shadow-neon-red",
    gold: "bg-neon-gold shadow-neon-gold",
    orange: "bg-neon-orange shadow-neon-orange",
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-mono text-white/70 uppercase tracking-wider",
            sizeStyles[size].text
          )}
        >
          {label}
        </span>
        {showValue && (
          <span className={cn("font-mono text-white/50", sizeStyles[size].text)}>
            {value}/{max}
          </span>
        )}
      </div>
      <div
        className={cn(
          "w-full rounded-full bg-white/10 overflow-hidden",
          sizeStyles[size].bar
        )}
      >
        <div
          className={cn(
            "h-full rounded-full",
            colorStyles[color],
            animated && "transition-all duration-1000 ease-out"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY INDICATOR - Animated status indicator
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActivityIndicatorProps {
  status: "active" | "idle" | "warning" | "critical" | "offline";
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

export function ActivityIndicator({
  status,
  label,
  className,
  size = "md",
  pulse = true,
}: ActivityIndicatorProps) {
  const sizeStyles = {
    sm: { dot: "w-2 h-2", text: "text-xs" },
    md: { dot: "w-3 h-3", text: "text-sm" },
    lg: { dot: "w-4 h-4", text: "text-base" },
  };

  const statusStyles = {
    active: "bg-neon-green",
    idle: "bg-neon-cyan",
    warning: "bg-neon-orange",
    critical: "bg-neon-red",
    offline: "bg-white/30",
  };

  const statusLabels = {
    active: "ACTIVE",
    idle: "IDLE",
    warning: "WARNING",
    critical: "CRITICAL",
    offline: "OFFLINE",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "rounded-full",
            sizeStyles[size].dot,
            statusStyles[status],
            pulse && status !== "offline" && "animate-pulse"
          )}
        />
        {pulse && status === "active" && (
          <div
            className={cn(
              "absolute inset-0 rounded-full bg-neon-green animate-pulse-ring"
            )}
          />
        )}
      </div>
      <span
        className={cn(
          "font-mono text-white/70 uppercase tracking-wider",
          sizeStyles[size].text
        )}
      >
        {label || statusLabels[status]}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE COUNTER - Animated number counter
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiveCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  className?: string;
  color?: "cyan" | "purple" | "green" | "gold" | "white";
  size?: "sm" | "md" | "lg" | "xl";
}

export function LiveCounter({
  value,
  prefix,
  suffix,
  label,
  className,
  color = "cyan",
  size = "md",
}: LiveCounterProps) {
  const sizeStyles = {
    sm: { value: "text-xl", label: "text-[10px]" },
    md: { value: "text-3xl", label: "text-xs" },
    lg: { value: "text-4xl", label: "text-sm" },
    xl: { value: "text-5xl", label: "text-base" },
  };

  const colorStyles = {
    cyan: "text-neon-cyan",
    purple: "text-neon-purple",
    green: "text-neon-green",
    gold: "text-neon-gold",
    white: "text-white",
  };

  // Format large numbers (use explicit locale for SSR consistency)
  const formatValue = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString("de-DE");
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className={cn(
          "font-display font-bold tracking-wider",
          sizeStyles[size].value,
          colorStyles[color]
        )}
      >
        {prefix}
        <span className="tabular-nums">{formatValue(value)}</span>
        {suffix}
      </div>
      {label && (
        <span
          className={cn(
            "font-mono text-white/50 uppercase tracking-widest",
            sizeStyles[size].label
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default StatsGrid;
