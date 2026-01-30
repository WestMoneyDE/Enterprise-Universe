"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc";
import { usePowerMode } from "@/components/scifi";
import {
  HoloCard,
  NeonButton,
  StatsGrid,
  Terminal,
  DataBar,
} from "@/components/scifi";

// =============================================================================
// AUTOMATION HUB - Workflow & Process Automation Management
// Connected to real tRPC API for workflow management
// =============================================================================

const statusConfig = {
  scheduled: { color: "text-neon-cyan", bg: "bg-neon-cyan/20", icon: "◷", label: "Geplant" },
  running: { color: "text-neon-orange", bg: "bg-neon-orange/20", icon: "▶", label: "Läuft" },
  completed: { color: "text-neon-green", bg: "bg-neon-green/20", icon: "✓", label: "Fertig" },
  failed: { color: "text-neon-red", bg: "bg-neon-red/20", icon: "⚠", label: "Fehler" },
  cancelled: { color: "text-white/50", bg: "bg-white/10", icon: "✕", label: "Abgebrochen" },
  paused: { color: "text-neon-purple", bg: "bg-neon-purple/20", icon: "⏸", label: "Pausiert" },
};

const triggerConfig: Record<string, { icon: string; label: string }> = {
  cron: { icon: "⏰", label: "Zeitbasiert" },
  event: { icon: "⚡", label: "Event-basiert" },
  webhook: { icon: "◉", label: "Webhook" },
  manual: { icon: "◎", label: "Manuell" },
};

export default function AutomationPage() {
  const { mode } = usePowerMode();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // tRPC QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: workflowsData, isLoading: workflowsLoading, refetch: refetchWorkflows } =
    api.automation.list.useQuery({
      status: selectedStatus as "scheduled" | "running" | "completed" | "failed" | "cancelled" | "paused" | undefined,
      limit: 50,
    });

  const { data: stats, isLoading: statsLoading } = api.automation.getStats.useQuery();
  const { data: workflowTypes } = api.automation.getWorkflowTypes.useQuery();
  const { data: recentActivity } = api.automation.getRecentActivity.useQuery({ limit: 5 });

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const triggerMutation = api.automation.trigger.useMutation({
    onSuccess: () => {
      refetchWorkflows();
    },
  });

  const toggleStatusMutation = api.automation.toggleStatus.useMutation({
    onSuccess: () => {
      refetchWorkflows();
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const formatDuration = (date: Date | string | null) => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 60) return `vor ${minutes}m`;
    if (hours < 24) return `vor ${hours}h`;
    return `vor ${Math.floor(hours / 24)}d`;
  };

  const workflows = workflowsData?.items || [];
  const isLoading = workflowsLoading || statsLoading;

  // ═══════════════════════════════════════════════════════════════════════════
  // TERMINAL LINES
  // ═══════════════════════════════════════════════════════════════════════════

  const terminalLines = [
    { id: "1", type: "system" as const, content: "Automation Hub v3.0 online", timestamp: new Date() },
    { id: "2", type: "success" as const, content: `${stats?.active ?? 0} aktive Workflows überwacht`, timestamp: new Date() },
    { id: "3", type: "output" as const, content: `${stats?.totalExecutions?.toLocaleString() ?? 0} Gesamtausführungen`, timestamp: new Date() },
    ...(stats?.errors && stats.errors > 0
      ? [{ id: "4", type: "error" as const, content: `⚠ ${stats.errors} Workflow(s) mit Fehlern - Prüfung erforderlich`, timestamp: new Date() }]
      : []
    ),
    ...(recentActivity?.slice(0, 3).map((activity, i) => ({
      id: `activity-${i}`,
      type: activity.status === "success" ? "success" as const : "output" as const,
      content: `${activity.action}: ${activity.workflowName}`,
      timestamp: activity.timestamp,
    })) || []),
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wider">
            AUTOMATION HUB
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Workflow & Process Automation Management
            {isLoading && <span className="text-neon-orange animate-pulse ml-2">SYNCING...</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <NeonButton variant="ghost" size="md" onClick={() => refetchWorkflows()}>
            🔄 REFRESH
          </NeonButton>
          <NeonButton variant="cyan" size="md" onClick={() => setShowCreateModal(true)}>
            + NEUER WORKFLOW
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid
        variant="purple"
        stats={[
          {
            id: "active",
            label: "Aktive Workflows",
            value: stats?.active?.toString() ?? "—",
            trend: "up",
            trendValue: `${stats?.total ?? 0} total`,
            status: statsLoading ? "warning" : "online",
          },
          {
            id: "exec",
            label: "Ausführungen",
            value: stats?.totalExecutions?.toLocaleString("de-DE") ?? "—",
            trend: "up",
            trendValue: "+15%",
            status: statsLoading ? "warning" : "online",
          },
          {
            id: "rate",
            label: "Erfolgsrate",
            value: stats?.avgSuccessRate ? `${stats.avgSuccessRate}%` : "—",
            trend: "up",
            trendValue: "+0.5%",
            status: statsLoading ? "warning" : "online",
          },
          {
            id: "errors",
            label: "Fehler",
            value: stats?.errors?.toString() ?? "0",
            trend: (stats?.errors ?? 0) > 0 ? "down" : "neutral",
            trendValue: (stats?.errors ?? 0) > 0 ? "!" : "OK",
            status: (stats?.errors ?? 0) > 0 ? "critical" : "online",
          },
        ]}
      />

      {/* Status Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-white/50">STATUS:</span>
        {["all", "scheduled", "running", "paused", "failed"].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status === "all" ? null : status)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all",
              "border flex items-center gap-2",
              (status === "all" && !selectedStatus) || selectedStatus === status
                ? "bg-neon-purple/20 border-neon-purple/50 text-neon-purple"
                : "bg-void-surface/50 border-white/10 text-white/50 hover:border-white/30"
            )}
          >
            {status !== "all" && (
              <span className={statusConfig[status as keyof typeof statusConfig]?.color}>
                {statusConfig[status as keyof typeof statusConfig]?.icon}
              </span>
            )}
            {status === "all" ? "ALLE" : statusConfig[status as keyof typeof statusConfig]?.label?.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Workflows Grid */}
      {workflows.length === 0 && !workflowsLoading ? (
        <HoloCard variant="default" className="p-8 text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <h3 className="text-lg font-display text-white mb-2">Keine Workflows gefunden</h3>
          <p className="text-sm text-white/50 mb-4">
            Erstelle deinen ersten Workflow, um Prozesse zu automatisieren.
          </p>
          <NeonButton variant="cyan" onClick={() => setShowCreateModal(true)}>
            + WORKFLOW ERSTELLEN
          </NeonButton>
        </HoloCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workflows.map((workflow) => {
            const status = statusConfig[workflow.status as keyof typeof statusConfig] || statusConfig.scheduled;
            const triggerType = workflow.cronExpression ? "cron" : "manual";
            const trigger = triggerConfig[triggerType];

            // Calculate mock metrics (in production, these would come from the API)
            const executionCount = Math.floor(Math.random() * 5000) + 100;
            const successRate = 85 + Math.random() * 15;
            const avgDuration = Math.random() * 50 + 1;

            return (
              <HoloCard key={workflow.id} variant="default" className="p-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", status.bg)}>
                        <span className={cn("text-lg", status.color)}>{status.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-display font-bold text-white">
                          {workflow.name}
                        </h3>
                        <p className="text-[10px] text-white/40">{workflow.description || workflow.type}</p>
                      </div>
                    </div>
                    <span className={cn("px-2 py-1 rounded text-[10px] font-mono uppercase", status.bg, status.color)}>
                      {status.label}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-void/50 rounded p-2 text-center">
                      <p className="text-[9px] font-mono text-white/40">AUSFÜHRUNGEN</p>
                      <p className="text-sm font-mono text-neon-cyan">{executionCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-void/50 rounded p-2 text-center">
                      <p className="text-[9px] font-mono text-white/40">ERFOLGSRATE</p>
                      <p className={cn("text-sm font-mono", successRate >= 95 ? "text-neon-green" : successRate >= 90 ? "text-neon-orange" : "text-neon-red")}>
                        {successRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-void/50 rounded p-2 text-center">
                      <p className="text-[9px] font-mono text-white/40">Ø DAUER</p>
                      <p className="text-sm font-mono text-white/70">{avgDuration.toFixed(1)}s</p>
                    </div>
                  </div>

                  {/* Success Rate Bar */}
                  <DataBar
                    value={successRate}
                    max={100}
                    label="Erfolgsrate"
                    color={successRate >= 95 ? "green" : successRate >= 90 ? "orange" : "red"}
                  />

                  {/* Timing */}
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">TRIGGER:</span>
                      <span className="text-white/60">{trigger.icon} {trigger.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {workflow.lastRunAt && (
                        <span className="text-white/40">
                          Letzte Ausführung: <span className="text-white/60">{formatDuration(workflow.lastRunAt)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    {workflow.isActive && workflow.status !== "running" ? (
                      <NeonButton
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleStatusMutation.mutate({ id: workflow.id, isActive: false })}
                        disabled={toggleStatusMutation.isPending}
                      >
                        ⏸ PAUSIEREN
                      </NeonButton>
                    ) : workflow.status === "paused" || !workflow.isActive ? (
                      <NeonButton
                        variant="green"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleStatusMutation.mutate({ id: workflow.id, isActive: true })}
                        disabled={toggleStatusMutation.isPending}
                      >
                        ▶ STARTEN
                      </NeonButton>
                    ) : workflow.status === "failed" ? (
                      <NeonButton
                        variant="red"
                        size="sm"
                        className="flex-1"
                        onClick={() => triggerMutation.mutate({ id: workflow.id })}
                        disabled={triggerMutation.isPending}
                      >
                        🔄 RETRY
                      </NeonButton>
                    ) : (
                      <NeonButton
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => triggerMutation.mutate({ id: workflow.id })}
                        disabled={triggerMutation.isPending || workflow.status === "running"}
                      >
                        ▶ AUSFÜHREN
                      </NeonButton>
                    )}
                    <NeonButton variant="ghost" size="sm">
                      ⚙ CONFIG
                    </NeonButton>
                    <NeonButton variant="ghost" size="sm">
                      📊 LOGS
                    </NeonButton>
                  </div>
                </div>
              </HoloCard>
            );
          })}
        </div>
      )}

      {/* Terminal */}
      <HoloCard variant="default" className="p-0">
        <Terminal
          title="AUTOMATION CONSOLE"
          lines={terminalLines}
        />
      </HoloCard>

      {/* Workflow Types Info */}
      {workflowTypes && workflowTypes.length > 0 && (
        <HoloCard variant="purple" title="VERFÜGBARE WORKFLOW-TYPEN" icon="⚙">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {workflowTypes.map((type) => (
              <div
                key={type.value}
                className="p-3 rounded-lg bg-void/50 border border-white/5 hover:border-neon-purple/30 transition-colors"
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="text-xs font-mono text-white">{type.label}</div>
                <div className="text-[10px] text-white/40">{type.value}</div>
              </div>
            ))}
          </div>
        </HoloCard>
      )}
    </div>
  );
}
