"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

// ═══════════════════════════════════════════════════════════════════════════════
// KPI CARD - Metric card with sparkline visualization
// ═══════════════════════════════════════════════════════════════════════════════

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparklineData?: { value: number }[];
  icon?: LucideIcon;
  variant?: "cyan" | "purple" | "green" | "gold" | "red";
  chartType?: "line" | "area";
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  sparklineData,
  icon: Icon,
  variant = "cyan",
  chartType = "area",
  className,
}: KPICardProps) {
  const colorMap = {
    cyan: {
      border: "border-neon-cyan/30",
      glow: "shadow-[0_0_20px_rgba(0,240,255,0.1)]",
      text: "text-neon-cyan",
      chart: "#00F0FF",
      gradient: "from-neon-cyan/20 to-transparent",
      bg: "bg-neon-cyan/10",
    },
    purple: {
      border: "border-neon-purple/30",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.1)]",
      text: "text-neon-purple",
      chart: "#A855F7",
      gradient: "from-neon-purple/20 to-transparent",
      bg: "bg-neon-purple/10",
    },
    green: {
      border: "border-neon-green/30",
      glow: "shadow-[0_0_20px_rgba(0,255,136,0.1)]",
      text: "text-neon-green",
      chart: "#00FF88",
      gradient: "from-neon-green/20 to-transparent",
      bg: "bg-neon-green/10",
    },
    gold: {
      border: "border-neon-gold/30",
      glow: "shadow-[0_0_20px_rgba(255,215,0,0.1)]",
      text: "text-neon-gold",
      chart: "#FFD700",
      gradient: "from-neon-gold/20 to-transparent",
      bg: "bg-neon-gold/10",
    },
    red: {
      border: "border-neon-red/30",
      glow: "shadow-[0_0_20px_rgba(255,51,102,0.1)]",
      text: "text-neon-red",
      chart: "#FF3366",
      gradient: "from-neon-red/20 to-transparent",
      bg: "bg-neon-red/10",
    },
  };

  const colors = colorMap[variant];

  const getTrendIcon = () => {
    if (!change) return <Minus className="h-4 w-4 text-gray-400" />;
    if (change > 0)
      return <TrendingUp className="h-4 w-4 text-neon-green" />;
    return <TrendingDown className="h-4 w-4 text-neon-red" />;
  };

  const getTrendColor = () => {
    if (!change) return "text-gray-400";
    return change > 0 ? "text-neon-green" : "text-neon-red";
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-void-surface/80 backdrop-blur-sm",
        colors.border,
        colors.glow,
        className
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          colors.gradient
        )}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {title}
            </p>
            <p className={cn("mt-2 text-3xl font-bold font-display", colors.text)}>
              {value}
            </p>
          </div>
          {Icon && (
            <div className={cn("rounded-lg p-2.5", colors.bg)}>
              <Icon className={cn("h-5 w-5", colors.text)} />
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={`gradient-${variant}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.chart} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={colors.chart} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.chart}
                    strokeWidth={2}
                    fill={`url(#gradient-${variant})`}
                  />
                </AreaChart>
              ) : (
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors.chart}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Change indicator */}
        {change !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            {getTrendIcon()}
            <span className={cn("text-sm font-medium", getTrendColor())}>
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            {changeLabel && (
              <span className="text-xs text-gray-500">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Grid wrapper for KPI cards
interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function KPIGrid({ children, columns = 4, className }: KPIGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}
