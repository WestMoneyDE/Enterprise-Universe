"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode } from "@/components/scifi";
import { api } from "@/trpc";
import {
  Loader2,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Eye,
  FileText,
  Users,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Zap,
  Target,
  DollarSign,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// MONEY MACHINE DASHBOARD - Automated Presentation & Sales Workflow
// Cyberpunk-styled workflow monitoring and management
// ═══════════════════════════════════════════════════════════════════════════════

// Stage Configuration with SciFi colors
const STAGE_CONFIG = {
  deal_received: {
    label: "Deal Empfangen",
    icon: Target,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    description: "Neuer Deal eingegangen",
  },
  kundenkarte_created: {
    label: "Kundenkarte",
    icon: Users,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    description: "Kundenkarte erstellt",
  },
  documents_pending: {
    label: "Dokumente Ausstehend",
    icon: Clock,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    description: "Warten auf Dokumente",
  },
  documents_uploaded: {
    label: "Dokumente Hochgeladen",
    icon: FileText,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    description: "Dokumente vollständig",
  },
  presentation_ready: {
    label: "Präsentation Bereit",
    icon: Zap,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    description: "Präsentation generiert",
  },
  email_sent: {
    label: "E-Mail Gesendet",
    icon: Mail,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    description: "Link verschickt",
  },
  presentation_viewed: {
    label: "Präsentation Angesehen",
    icon: Eye,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    description: "Kunde hat angesehen",
  },
  bauherren_pass_offered: {
    label: "Bauherren-Pass Angeboten",
    icon: DollarSign,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "Upsell angeboten",
  },
  bauherren_pass_sold: {
    label: "Bauherren-Pass Verkauft",
    icon: TrendingUp,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    description: "Upsell erfolgreich",
  },
  completed: {
    label: "Abgeschlossen",
    icon: CheckCircle2,
    color: "text-neon-green",
    bgColor: "bg-neon-green/10",
    borderColor: "border-neon-green/30",
    description: "Workflow beendet",
  },
} as const;

type StageType = keyof typeof STAGE_CONFIG;

const STAGES_ORDER: StageType[] = [
  "deal_received",
  "kundenkarte_created",
  "documents_pending",
  "documents_uploaded",
  "presentation_ready",
  "email_sent",
  "presentation_viewed",
  "bauherren_pass_offered",
  "bauherren_pass_sold",
  "completed",
];

export default function MoneyMachinePage() {
  const { isGodMode, isUltraInstinct, powerLevel } = usePowerMode();
  const [selectedStage, setSelectedStage] = useState<StageType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // tRPC QUERIES - Fetch data from Money Machine router
  // ═══════════════════════════════════════════════════════════════════════════════
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = api.moneyMachine.getStats.useQuery();

  const {
    data: actionData,
    isLoading: actionLoading,
    refetch: refetchAction,
  } = api.moneyMachine.getActionRequired.useQuery();

  const {
    data: workflowsData,
    isLoading: workflowsLoading,
    refetch: refetchWorkflows,
  } = api.moneyMachine.listWorkflows.useQuery({
    stage: selectedStage ?? undefined,
    limit: 20,
    offset: 0,
  });

  const isLoading = statsLoading || actionLoading || workflowsLoading;

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchStats(), refetchAction(), refetchWorkflows()]);
    setIsRefreshing(false);
  };

  // Derived data with fallbacks
  const stats = statsData ?? {
    total: 0,
    byStage: {} as Record<string, number>,
    completedToday: 0,
    revenue: { total: 0, bauherrenPass: 0 },
    conversionRate: 0,
  };

  // Calculate active count from byStage (all non-completed)
  const activeCount = Object.entries(stats.byStage)
    .filter(([stage]) => stage !== "completed")
    .reduce((sum, [, count]) => sum + count, 0);

  const actionRequired = actionData ?? [];
  const workflows = workflowsData?.items ?? [];

  // Show loading state
  if (isLoading && !statsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-neon-cyan animate-spin" />
          <span className="text-white/50 font-mono text-sm">LOADING MONEY MACHINE DATA...</span>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={cn(
              "text-3xl font-display font-bold tracking-wider",
              isGodMode ? "text-god-secondary" : isUltraInstinct ? "text-ultra-primary" : "text-white"
            )}
          >
            MONEY MACHINE
          </h1>
          <p className="text-white/50 text-sm font-mono mt-1">
            Automatisierter Präsentations- & Verkaufs-Workflow • Power Level: {powerLevel.toLocaleString()}
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all",
            "bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan",
            "hover:bg-neon-cyan/20 hover:border-neon-cyan/50",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          REFRESH
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4">
        <StatsCard
          label="GESAMT WORKFLOWS"
          value={stats.total.toString()}
          icon={<Zap className="h-5 w-5" />}
          color="cyan"
          subtitle={`${activeCount} aktiv`}
        />
        <StatsCard
          label="HEUTE ABGESCHLOSSEN"
          value={stats.completedToday.toString()}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="green"
          subtitle="Workflows"
        />
        <StatsCard
          label="CONVERSION RATE"
          value={`${(stats.conversionRate * 100).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
          subtitle="Bauherren-Pass"
        />
        <StatsCard
          label="DEAL REVENUE"
          value={formatCurrency(stats.revenue.total)}
          icon={<DollarSign className="h-5 w-5" />}
          color="orange"
          subtitle="Gesamt"
        />
        <StatsCard
          label="BAUHERREN-PASS"
          value={formatCurrency(stats.revenue.bauherrenPass)}
          icon={<Target className="h-5 w-5" />}
          color="green"
          subtitle="Upsell Revenue"
        />
      </div>

      {/* Workflow Funnel */}
      <div className="bg-void-surface/30 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-display font-bold text-white mb-6">WORKFLOW PIPELINE</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          {STAGES_ORDER.map((stage, index) => {
            const config = STAGE_CONFIG[stage];
            const count = (stats.byStage as Record<string, number>)?.[stage] ?? 0;
            const Icon = config.icon;
            const isSelected = selectedStage === stage;

            return (
              <div key={stage} className="flex items-center">
                <button
                  onClick={() => setSelectedStage(isSelected ? null : stage)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border transition-all min-w-[120px]",
                    isSelected
                      ? `${config.bgColor} ${config.borderColor} ring-2 ring-offset-2 ring-offset-void-dark`
                      : "bg-void-dark/50 border-white/10 hover:border-white/30",
                    isSelected && `ring-${config.color.replace("text-", "")}`
                  )}
                >
                  <Icon className={cn("h-6 w-6 mb-2", isSelected ? config.color : "text-white/50")} />
                  <span className={cn("text-2xl font-display font-bold", isSelected ? config.color : "text-white")}>
                    {count}
                  </span>
                  <span className="text-[10px] font-mono text-white/50 text-center mt-1 leading-tight">
                    {config.label}
                  </span>
                </button>

                {index < STAGES_ORDER.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-white/20 mx-1 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Action Required */}
        <div className="bg-void-surface/30 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-white">AKTION ERFORDERLICH</h3>
            <span className="text-xs font-mono px-2 py-1 rounded bg-neon-orange/10 text-neon-orange border border-neon-orange/30">
              {actionRequired.length} offen
            </span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {actionRequired.length === 0 ? (
              <div className="text-center py-8 text-white/40 font-mono text-sm">
                Keine Aktionen erforderlich
              </div>
            ) : (
              actionRequired.map((item: any) => {
                const config = STAGE_CONFIG[item.currentStage as StageType];
                const Icon = config?.icon ?? AlertTriangle;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-void-dark/50 rounded-lg border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", config?.bgColor ?? "bg-white/10")}>
                        <Icon className={cn("h-4 w-4", config?.color ?? "text-white")} />
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">
                          {item.deal?.name ?? item.hubspotDealId ?? "Unknown Deal"}
                        </div>
                        <div className="text-white/40 text-xs font-mono">
                          {config?.description ?? item.currentStage}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ActionButton stage={item.currentStage} workflowId={item.id} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Workflows */}
        <div className="bg-void-surface/30 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-white">
              {selectedStage ? STAGE_CONFIG[selectedStage].label.toUpperCase() : "ALLE WORKFLOWS"}
            </h3>
            {selectedStage && (
              <button
                onClick={() => setSelectedStage(null)}
                className="text-xs font-mono text-neon-cyan hover:text-neon-cyan/80"
              >
                Alle anzeigen
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {workflows.length === 0 ? (
              <div className="text-center py-8 text-white/40 font-mono text-sm">
                Keine Workflows gefunden
              </div>
            ) : (
              workflows.map((workflow: any) => {
                const config = STAGE_CONFIG[workflow.currentStage as StageType];
                const Icon = config?.icon ?? Zap;

                return (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between p-3 bg-void-dark/50 rounded-lg border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", config?.bgColor ?? "bg-white/10")}>
                        <Icon className={cn("h-4 w-4", config?.color ?? "text-white")} />
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">
                          {workflow.deal?.name ?? workflow.hubspotDealId ?? "Unknown Deal"}
                        </div>
                        <div className="text-white/40 text-xs font-mono">
                          {workflow.customerEmail ?? "Keine E-Mail"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-xs font-mono", config?.color ?? "text-white/50")}>
                        {config?.label ?? workflow.currentStage}
                      </div>
                      <div className="text-[10px] font-mono text-white/30">
                        {formatRelativeTime(workflow.updatedAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="bg-void-surface/30 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-display font-bold text-white mb-4">SCHNELLSTART</h3>
        <div className="grid grid-cols-3 gap-4">
          <QuickStartCard
            title="Neuen Workflow starten"
            description="Workflow von HubSpot Deal oder Nexus Deal starten"
            icon={<Play className="h-6 w-6" />}
            color="cyan"
          />
          <QuickStartCard
            title="Bulk Import"
            description="Mehrere HubSpot Deals gleichzeitig importieren"
            icon={<Users className="h-6 w-6" />}
            color="purple"
          />
          <QuickStartCard
            title="Analytics"
            description="Detaillierte Workflow- und Präsentations-Statistiken"
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "cyan" | "green" | "orange" | "purple";
  subtitle?: string;
}

function StatsCard({ label, value, icon, color, subtitle }: StatsCardProps) {
  const colorClasses = {
    cyan: { text: "text-neon-cyan", bg: "bg-neon-cyan/10", border: "border-neon-cyan/30" },
    green: { text: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/30" },
    orange: { text: "text-neon-orange", bg: "bg-neon-orange/10", border: "border-neon-orange/30" },
    purple: { text: "text-neon-purple", bg: "bg-neon-purple/10", border: "border-neon-purple/30" },
  };

  const classes = colorClasses[color];

  return (
    <div className={cn("p-4 rounded-xl border backdrop-blur-sm", classes.bg, classes.border)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{label}</span>
        <span className={classes.text}>{icon}</span>
      </div>
      <div className={cn("text-2xl font-display font-bold", classes.text)}>{value}</div>
      {subtitle && <div className="text-xs font-mono text-white/40 mt-1">{subtitle}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ActionButtonProps {
  stage: string;
  workflowId: string;
}

function ActionButton({ stage, workflowId }: ActionButtonProps) {
  const actionLabels: Record<string, string> = {
    deal_received: "Kundenkarte erstellen",
    kundenkarte_created: "Dokumente anfordern",
    documents_pending: "Hochladen prüfen",
    documents_uploaded: "Präsentation generieren",
    presentation_ready: "E-Mail senden",
    email_sent: "View-Status prüfen",
    presentation_viewed: "Bauherren-Pass anbieten",
    bauherren_pass_offered: "Verkauf tracken",
    bauherren_pass_sold: "Abschließen",
  };

  const label = actionLabels[stage] ?? "Ansehen";

  return (
    <button
      className={cn(
        "text-[10px] font-mono px-3 py-1.5 rounded transition-all",
        "bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan",
        "hover:bg-neon-cyan/20 hover:border-neon-cyan/50"
      )}
    >
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK START CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface QuickStartCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: "cyan" | "purple" | "green";
}

function QuickStartCard({ title, description, icon, color }: QuickStartCardProps) {
  const colorClasses = {
    cyan: { text: "text-neon-cyan", bg: "bg-neon-cyan/10", border: "border-neon-cyan/30", hover: "hover:border-neon-cyan/50" },
    purple: { text: "text-neon-purple", bg: "bg-neon-purple/10", border: "border-neon-purple/30", hover: "hover:border-neon-purple/50" },
    green: { text: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/30", hover: "hover:border-neon-green/50" },
  };

  const classes = colorClasses[color];

  return (
    <button
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
        classes.bg,
        classes.border,
        classes.hover
      )}
    >
      <div className={cn("p-3 rounded-lg bg-void-dark/50", classes.text)}>{icon}</div>
      <div>
        <div className={cn("font-display font-bold", classes.text)}>{title}</div>
        <div className="text-xs font-mono text-white/40 mt-1">{description}</div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Gerade eben";
  if (diffMins < 60) return `vor ${diffMins}m`;
  if (diffHours < 24) return `vor ${diffHours}h`;
  if (diffDays < 7) return `vor ${diffDays}d`;

  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}
