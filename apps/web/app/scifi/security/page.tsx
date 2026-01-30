"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode } from "@/components/scifi";
import {
  HoloCard,
  NeonButton,
  StatsGrid,
  Terminal,
  MetricRing,
  DataBar,
} from "@/components/scifi";
import { api } from "@/trpc";

// ═══════════════════════════════════════════════════════════════════════════════
// DEDSEC SHIELD - Security Monitoring & SSH Status
// Real-time SSH monitoring, failed logins, and system security
// ═══════════════════════════════════════════════════════════════════════════════

interface SecurityEvent {
  id: string;
  type: "threat" | "warning" | "blocked" | "info" | "success";
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  severity: "critical" | "high" | "medium" | "low";
}

interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  max: number;
  status: "healthy" | "warning" | "critical";
}

const eventTypeConfig = {
  threat: { color: "text-neon-red", bg: "bg-neon-red/20", icon: "⚠" },
  warning: { color: "text-neon-orange", bg: "bg-neon-orange/20", icon: "◎" },
  blocked: { color: "text-neon-purple", bg: "bg-neon-purple/20", icon: "⊘" },
  info: { color: "text-neon-cyan", bg: "bg-neon-cyan/20", icon: "ℹ" },
  success: { color: "text-neon-green", bg: "bg-neon-green/20", icon: "✓" },
  failure: { color: "text-neon-red", bg: "bg-neon-red/20", icon: "✗" },
};

const severityConfig = {
  critical: { color: "text-neon-red", border: "border-neon-red/50" },
  high: { color: "text-neon-orange", border: "border-neon-orange/50" },
  medium: { color: "text-neon-yellow", border: "border-neon-yellow/50" },
  low: { color: "text-white/50", border: "border-white/20" },
};

export default function SecurityPage() {
  const { mode } = usePowerMode();

  // Real data from security router
  const { data: sshStatus, isLoading: sshLoading } = api.security.getSSHStatus.useQuery();
  const { data: sessions, isLoading: sessionsLoading } = api.security.getActiveSessions.useQuery();
  const { data: failedLogins, isLoading: failedLoading } = api.security.getFailedLogins.useQuery({ limit: 10 });
  const { data: successLogins } = api.security.getSuccessfulLogins.useQuery({ limit: 5 });
  const { data: overview, isLoading: overviewLoading } = api.security.getSecurityOverview.useQuery();

  // Combine events from failed and successful logins
  const events: SecurityEvent[] = [
    ...(failedLogins?.data?.events || []).map((e) => ({
      ...e,
      type: e.type as SecurityEvent["type"],
      timestamp: new Date(e.timestamp),
    })),
    ...(successLogins?.data?.events || []).map((e) => ({
      ...e,
      type: e.type as SecurityEvent["type"],
      timestamp: new Date(e.timestamp),
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

  // Security metrics from real data
  const sshData = sshStatus?.data;
  const overviewData = overview?.data;
  const securityScore = overviewData?.securityScore ?? 0;

  const metrics: SecurityMetric[] = [
    {
      id: "ssh",
      name: "SSH Service",
      value: sshData?.isRunning ? 100 : 0,
      max: 100,
      status: sshData?.isRunning ? "healthy" : "critical",
    },
    {
      id: "firewall",
      name: "Firewall",
      value: overviewData?.firewallActive ? 100 : 0,
      max: 100,
      status: overviewData?.firewallActive ? "healthy" : "warning",
    },
    {
      id: "password",
      name: "Password Auth",
      value: sshData?.config?.passwordAuth ? 70 : 100,
      max: 100,
      status: sshData?.config?.passwordAuth ? "warning" : "healthy",
    },
    {
      id: "root",
      name: "Root Login",
      value: sshData?.config?.rootLogin ? 50 : 100,
      max: 100,
      status: sshData?.config?.rootLogin ? "critical" : "healthy",
    },
    {
      id: "pubkey",
      name: "PubKey Auth",
      value: sshData?.config?.pubkeyAuth ? 100 : 50,
      max: 100,
      status: sshData?.config?.pubkeyAuth ? "healthy" : "warning",
    },
    {
      id: "failures",
      name: "Failed Logins",
      value: Math.max(0, 100 - (overviewData?.failedLoginsLast24h || 0)),
      max: 100,
      status: (overviewData?.failedLoginsLast24h || 0) > 50 ? "critical" :
              (overviewData?.failedLoginsLast24h || 0) > 10 ? "warning" : "healthy",
    },
  ];

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 60) return `${minutes}m ago`;
    return `${hours}h ago`;
  };

  const formatUptime = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const isLoading = sshLoading || overviewLoading;

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-neon-red">◐</span> DEDSEC SHIELD
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            SSH Security Monitoring & System Protection
          </p>
        </div>
        <div className="flex gap-2">
          <NeonButton variant="cyan" size="md">
            SCAN NOW
          </NeonButton>
          <NeonButton variant="red" size="md">
            LOCKDOWN
          </NeonButton>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Security Score */}
        <HoloCard variant="default" className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider">
              Security Score
            </h3>
            <div className="flex justify-center">
              {isLoading ? (
                <div className="w-32 h-32 rounded-full border-4 border-white/10 animate-pulse" />
              ) : (
                <MetricRing
                  value={securityScore}
                  size="lg"
                  color={securityScore >= 90 ? "green" : securityScore >= 70 ? "orange" : "red"}
                  label={`${securityScore}%`}
                  sublabel="OVERALL"
                />
              )}
            </div>
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono",
              securityScore >= 90 ? "bg-neon-green/20 text-neon-green" :
              securityScore >= 70 ? "bg-neon-orange/20 text-neon-orange" :
              "bg-neon-red/20 text-neon-red"
            )}>
              {securityScore >= 90 ? "✓ SECURE" : securityScore >= 70 ? "◎ MODERATE" : "⚠ AT RISK"}
            </div>
          </div>
        </HoloCard>

        {/* Center: Quick Stats - Real Data */}
        <div className="lg:col-span-2">
          <StatsGrid
            variant="default"
            stats={[
              {
                id: "ssh",
                label: "SSH Status",
                value: isLoading ? "..." : (sshData?.isRunning ? "ONLINE" : "OFFLINE"),
                trend: sshData?.isRunning ? "up" : "down",
                trendValue: `Port ${sshData?.port || "22"}`
              },
              {
                id: "sessions",
                label: "Active Sessions",
                value: sessionsLoading ? "..." : (sessions?.data?.sessions?.length || 0).toString(),
                trend: "neutral",
                trendValue: `${sessions?.data?.activeUsers || 0} users`
              },
              {
                id: "failed",
                label: "Failed Logins (24h)",
                value: isLoading ? "..." : (overviewData?.failedLoginsLast24h || 0).toString(),
                trend: (overviewData?.failedLoginsLast24h || 0) > 10 ? "down" : "up",
                trendValue: (overviewData?.failedLoginsLast24h || 0) > 50 ? "!" : "OK"
              },
              {
                id: "uptime",
                label: "SSH Uptime",
                value: isLoading ? "..." : formatUptime(sshData?.uptime || null),
                trend: "up",
                trendValue: "stable"
              },
            ]}
          />
        </div>
      </div>

      {/* SSH Configuration Status */}
      <HoloCard variant="default" className="p-4">
        <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider mb-4">
          SSH Configuration
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={cn(
            "p-3 rounded-lg border",
            sshData?.config?.passwordAuth
              ? "bg-neon-orange/10 border-neon-orange/30"
              : "bg-neon-green/10 border-neon-green/30"
          )}>
            <p className="text-[10px] font-mono text-white/50 mb-1">Password Auth</p>
            <p className={cn(
              "text-sm font-mono font-bold",
              sshData?.config?.passwordAuth ? "text-neon-orange" : "text-neon-green"
            )}>
              {sshLoading ? "..." : (sshData?.config?.passwordAuth ? "ENABLED" : "DISABLED")}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border",
            sshData?.config?.rootLogin
              ? "bg-neon-red/10 border-neon-red/30"
              : "bg-neon-green/10 border-neon-green/30"
          )}>
            <p className="text-[10px] font-mono text-white/50 mb-1">Root Login</p>
            <p className={cn(
              "text-sm font-mono font-bold",
              sshData?.config?.rootLogin ? "text-neon-red" : "text-neon-green"
            )}>
              {sshLoading ? "..." : (sshData?.config?.rootLogin ? "ALLOWED" : "BLOCKED")}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border",
            sshData?.config?.pubkeyAuth
              ? "bg-neon-green/10 border-neon-green/30"
              : "bg-neon-orange/10 border-neon-orange/30"
          )}>
            <p className="text-[10px] font-mono text-white/50 mb-1">PubKey Auth</p>
            <p className={cn(
              "text-sm font-mono font-bold",
              sshData?.config?.pubkeyAuth ? "text-neon-green" : "text-neon-orange"
            )}>
              {sshLoading ? "..." : (sshData?.config?.pubkeyAuth ? "ENABLED" : "DISABLED")}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border",
            overviewData?.firewallActive
              ? "bg-neon-green/10 border-neon-green/30"
              : "bg-neon-red/10 border-neon-red/30"
          )}>
            <p className="text-[10px] font-mono text-white/50 mb-1">Firewall (UFW)</p>
            <p className={cn(
              "text-sm font-mono font-bold",
              overviewData?.firewallActive ? "text-neon-green" : "text-neon-red"
            )}>
              {overviewLoading ? "..." : (overviewData?.firewallActive ? "ACTIVE" : "INACTIVE")}
            </p>
          </div>
        </div>
      </HoloCard>

      {/* Active SSH Sessions */}
      <HoloCard variant="default" className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider">
            Active SSH Sessions
          </h3>
          <span className="text-xs font-mono text-neon-cyan">
            {sessions?.data?.totalConnections || 0} connections
          </span>
        </div>
        {sessionsLoading ? (
          <div className="text-center py-4 text-white/50 font-mono text-sm animate-pulse">
            Loading sessions...
          </div>
        ) : (sessions?.data?.sessions?.length || 0) === 0 ? (
          <div className="text-center py-4 text-white/30 font-mono text-sm">
            No active SSH sessions
          </div>
        ) : (
          <div className="space-y-2">
            {sessions?.data?.sessions?.map((session, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-void/50 border border-neon-cyan/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                    <span className="text-neon-cyan text-sm">◉</span>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-white font-bold">{session.user}</p>
                    <p className="text-[10px] font-mono text-white/50">{session.tty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-neon-purple">{session.ip}</p>
                  <p className="text-[10px] font-mono text-white/30">{session.loginTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </HoloCard>

      {/* Security Metrics */}
      <HoloCard variant="default" className="p-4">
        <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider mb-4">
          Security Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((metric) => (
            <div key={metric.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/50">{metric.name}</span>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  metric.status === "healthy" ? "bg-neon-green" :
                  metric.status === "warning" ? "bg-neon-orange" :
                  "bg-neon-red"
                )} />
              </div>
              <DataBar
                value={metric.value}
                max={metric.max}
                label={metric.name}
                color={metric.status === "healthy" ? "green" : metric.status === "warning" ? "orange" : "red"}
                showValue
              />
            </div>
          ))}
        </div>
      </HoloCard>

      {/* Security Events - Real Login Data */}
      <HoloCard variant="default" className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider">
            SSH Auth Events (24h)
          </h3>
          <div className="flex items-center gap-2">
            {failedLogins?.data?.bannedCount ? (
              <span className="px-2 py-1 text-[10px] font-mono bg-neon-purple/20 text-neon-purple rounded">
                {failedLogins.data.bannedCount} IPs blocked
              </span>
            ) : null}
            <NeonButton variant="ghost" size="sm">
              VIEW ALL
            </NeonButton>
          </div>
        </div>

        {failedLoading ? (
          <div className="text-center py-8 text-white/50 font-mono animate-pulse">
            Loading security events...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-white/30 font-mono">
            No security events in the last 24 hours
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const typeStyle = eventTypeConfig[event.type] || eventTypeConfig.info;
              const severityStyle = severityConfig[event.severity];

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg",
                    "bg-void/50 border-l-2",
                    severityStyle.border
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", typeStyle.bg)}>
                    <span className={cn("text-sm", typeStyle.color)}>{typeStyle.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-display font-bold text-white">{event.title}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-mono uppercase", severityStyle.color, "bg-white/5")}>
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 line-clamp-1">{event.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-white/30">
                      <span>{event.source}</span>
                      <span>•</span>
                      <span>{formatTime(event.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HoloCard>

      {/* Terminal with Real Status */}
      <HoloCard variant="default" className="p-0">
        <Terminal
          title="DEDSEC CONSOLE"
          lines={[
            { id: "1", type: "system", content: "DEDSEC Shield v5.0 - SSH Security Monitor", timestamp: new Date() },
            {
              id: "2",
              type: sshData?.isRunning ? "success" : "error",
              content: `SSH Service: ${sshData?.isRunning ? "ACTIVE" : "INACTIVE"} | Port: ${sshData?.port || "22"}`,
              timestamp: new Date()
            },
            {
              id: "3",
              type: overviewData?.firewallActive ? "success" : "warning",
              content: `Firewall: ${overviewData?.firewallActive ? "ENABLED" : "DISABLED"} | Sessions: ${sessions?.data?.sessions?.length || 0}`,
              timestamp: new Date()
            },
            {
              id: "4",
              type: (overviewData?.failedLoginsLast24h || 0) > 50 ? "error" : "output",
              content: `Failed logins (24h): ${overviewData?.failedLoginsLast24h || 0} | Security Score: ${securityScore}%`,
              timestamp: new Date()
            },
            {
              id: "5",
              type: "output",
              content: overviewData?.systemUptime || "System uptime: loading...",
              timestamp: new Date()
            },
          ]}
        />
      </HoloCard>
    </div>
  );
}
