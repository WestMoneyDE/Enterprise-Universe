"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH MONITOR - Visual system status with animated gauges
// Displays CPU, Memory, Network, and service health in cyberpunk style
// ═══════════════════════════════════════════════════════════════════════════════

export interface SystemMetric {
  id: string;
  label: string;
  value: number; // 0-100
  unit?: string;
  status: "healthy" | "warning" | "critical" | "offline";
  trend?: "up" | "down" | "stable";
}

export interface ServiceStatus {
  id: string;
  name: string;
  status: "online" | "degraded" | "offline" | "maintenance";
  latency?: number; // in ms
  uptime?: number; // percentage
}

export interface SystemHealthMonitorProps {
  metrics?: SystemMetric[];
  services?: ServiceStatus[];
  onRefresh?: () => void;
  className?: string;
}

const statusColors = {
  healthy: { color: "text-neon-green", bg: "bg-neon-green", ring: "#00ff88" },
  warning: { color: "text-neon-orange", bg: "bg-neon-orange", ring: "#ff9500" },
  critical: { color: "text-neon-red", bg: "bg-neon-red", ring: "#ff3366" },
  offline: { color: "text-white/30", bg: "bg-white/30", ring: "#ffffff33" },
  online: { color: "text-neon-green", bg: "bg-neon-green" },
  degraded: { color: "text-neon-orange", bg: "bg-neon-orange" },
  maintenance: { color: "text-neon-cyan", bg: "bg-neon-cyan" },
};

export default function SystemHealthMonitor({
  metrics = defaultMetrics,
  services = defaultServices,
  onRefresh,
  className,
}: SystemHealthMonitorProps) {
  const [animatedMetrics, setAnimatedMetrics] = useState<SystemMetric[]>(
    metrics.map(m => ({ ...m, value: 0 }))
  );

  // Animate metrics on mount and change
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedMetrics(metrics);
    }, 100);
    return () => clearTimeout(timeout);
  }, [metrics]);

  const overallHealth = metrics.every(m => m.status === "healthy")
    ? "OPTIMAL"
    : metrics.some(m => m.status === "critical")
    ? "CRITICAL"
    : "DEGRADED";

  const overallColor =
    overallHealth === "OPTIMAL"
      ? "text-neon-green"
      : overallHealth === "CRITICAL"
      ? "text-neon-red"
      : "text-neon-orange";

  return (
    <div className={cn(
      "bg-void-surface/80 backdrop-blur-xl rounded-xl",
      "border border-white/10 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            overallHealth === "OPTIMAL" && "bg-neon-green",
            overallHealth === "DEGRADED" && "bg-neon-orange animate-pulse",
            overallHealth === "CRITICAL" && "bg-neon-red animate-pulse"
          )} />
          <h3 className="text-sm font-display font-bold text-white/90 uppercase tracking-wider">
            System Health
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-xs font-mono font-bold", overallColor)}>
            {overallHealth}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 text-white/40 hover:text-neon-cyan transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Metric Gauges */}
      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {animatedMetrics.map((metric) => (
            <MetricGauge key={metric.id} metric={metric} />
          ))}
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="px-4 pb-4">
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">
          Service Status
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {services.map((service) => (
            <ServiceStatusCard key={service.id} service={service} />
          ))}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-white/5 bg-void/50">
        <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
          <span>Last scan: just now</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
              {services.filter(s => s.status === "online").length} online
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-orange" />
              {services.filter(s => s.status === "degraded").length} degraded
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC GAUGE - Animated circular gauge for system metrics
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricGaugeProps {
  metric: SystemMetric;
}

function MetricGauge({ metric }: MetricGaugeProps) {
  const status = statusColors[metric.status];
  const circumference = 2 * Math.PI * 36; // radius = 36
  const strokeDashoffset = circumference - (metric.value / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center p-3 bg-void/50 rounded-lg border border-white/5">
      {/* SVG Gauge */}
      <div className="relative w-20 h-20">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
          {/* Background Ring */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />
          {/* Progress Ring */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={status.ring}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${status.ring})`,
            }}
          />
        </svg>

        {/* Value Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-lg font-mono font-bold", status.color)}>
            {Math.round(metric.value)}
          </span>
          <span className="text-[9px] font-mono text-white/40">
            {metric.unit || "%"}
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="mt-2 text-center">
        <span className="text-[10px] font-mono text-white/60 uppercase tracking-wide">
          {metric.label}
        </span>
        {metric.trend && (
          <span className={cn(
            "ml-1 text-[9px]",
            metric.trend === "up" && "text-neon-red",
            metric.trend === "down" && "text-neon-green",
            metric.trend === "stable" && "text-white/40"
          )}>
            {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE STATUS CARD - Compact service health indicator
// ═══════════════════════════════════════════════════════════════════════════════

interface ServiceStatusCardProps {
  service: ServiceStatus;
}

function ServiceStatusCard({ service }: ServiceStatusCardProps) {
  const status = statusColors[service.status];

  return (
    <div className={cn(
      "px-3 py-2 rounded-lg border transition-colors",
      "bg-void/30 border-white/5",
      "hover:border-white/10"
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-white/70 uppercase truncate">
          {service.name}
        </span>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          status.bg,
          service.status !== "online" && service.status !== "offline" && "animate-pulse"
        )} />
      </div>
      <div className="flex items-center justify-between">
        <span className={cn("text-[9px] font-mono uppercase", status.color)}>
          {service.status}
        </span>
        {service.latency !== undefined && (
          <span className="text-[9px] font-mono text-white/40">
            {service.latency}ms
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI HEALTH INDICATOR - Compact version for headers
// ═══════════════════════════════════════════════════════════════════════════════

export interface MiniHealthIndicatorProps {
  metrics: SystemMetric[];
  className?: string;
}

export function MiniHealthIndicator({ metrics, className }: MiniHealthIndicatorProps) {
  const avgValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  const hasWarning = metrics.some(m => m.status === "warning");
  const hasCritical = metrics.some(m => m.status === "critical");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        hasCritical && "bg-neon-red animate-pulse",
        hasWarning && !hasCritical && "bg-neon-orange animate-pulse",
        !hasWarning && !hasCritical && "bg-neon-green"
      )} />
      <div className="flex items-center gap-1">
        {metrics.slice(0, 3).map((metric) => (
          <div
            key={metric.id}
            className="w-8 h-1 bg-white/10 rounded-full overflow-hidden"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                metric.status === "healthy" && "bg-neon-green",
                metric.status === "warning" && "bg-neon-orange",
                metric.status === "critical" && "bg-neon-red"
              )}
              style={{ width: `${metric.value}%` }}
            />
          </div>
        ))}
      </div>
      <span className={cn(
        "text-[10px] font-mono",
        hasCritical && "text-neon-red",
        hasWarning && !hasCritical && "text-neon-orange",
        !hasWarning && !hasCritical && "text-neon-green"
      )}>
        {Math.round(avgValue)}%
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT DATA - For demo/preview purposes
// ═══════════════════════════════════════════════════════════════════════════════

const defaultMetrics: SystemMetric[] = [
  { id: "cpu", label: "CPU", value: 42, status: "healthy", trend: "stable" },
  { id: "memory", label: "Memory", value: 68, status: "warning", trend: "up" },
  { id: "network", label: "Network", value: 23, unit: "MB/s", status: "healthy", trend: "down" },
  { id: "disk", label: "Disk I/O", value: 15, status: "healthy", trend: "stable" },
];

const defaultServices: ServiceStatus[] = [
  { id: "api", name: "API Gateway", status: "online", latency: 12 },
  { id: "db", name: "Database", status: "online", latency: 3 },
  { id: "ws", name: "WebSocket", status: "online", latency: 8 },
  { id: "ai", name: "AI Engine", status: "degraded", latency: 245 },
];
