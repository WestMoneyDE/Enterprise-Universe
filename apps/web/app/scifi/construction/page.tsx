"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode } from "@/components/scifi";
import { api } from "@/trpc";

// =============================================================================
// WEST MONEY BAU - CONSTRUCTION COMMAND CENTER
// Real-time construction project monitoring with SciFi interface
// =============================================================================

interface Project {
  id: string;
  name: string;
  location: string;
  type: string;
  phase: string;
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  estimatedEnd: string;
  team: number;
}

interface Phase {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  count: number;
  progress: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// =============================================================================
// ANIMATED NUMBER COMPONENT
// =============================================================================
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {displayValue.toLocaleString("de-DE")}
      {suffix}
    </span>
  );
}

// =============================================================================
// PROGRESS BAR COMPONENT
// =============================================================================
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: "bg-cyan-400 shadow-cyan-400/50",
    purple: "bg-purple-400 shadow-purple-400/50",
    orange: "bg-orange-400 shadow-orange-400/50",
    green: "bg-green-400 shadow-green-400/50",
    god: "bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500",
  };

  return (
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-1000 shadow-lg",
          colorClasses[color] || colorClasses.cyan
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// =============================================================================
// STATS CARD COMPONENT
// =============================================================================
function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color = "cyan",
  isGodMode,
  isUltraInstinct,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
  isGodMode: boolean;
  isUltraInstinct: boolean;
}) {
  const colorClasses: Record<string, string> = {
    cyan: "border-cyan-500/30 text-cyan-400",
    purple: "border-purple-500/30 text-purple-400",
    orange: "border-orange-500/30 text-orange-400",
    green: "border-green-500/30 text-green-400",
    god: "border-yellow-500/30 text-yellow-400",
  };

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border backdrop-blur-sm",
        "bg-slate-900/60 transition-all duration-300",
        colorClasses[color],
        isGodMode && "shadow-lg shadow-yellow-500/20",
        isUltraInstinct && "shadow-lg shadow-purple-500/20 animate-pulse"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-slate-400">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// =============================================================================
// PROJECT CARD COMPONENT
// =============================================================================
function ProjectCard({
  project,
  phases,
  isGodMode,
  isUltraInstinct,
}: {
  project: Project;
  phases: Phase[];
  isGodMode: boolean;
  isUltraInstinct: boolean;
}) {
  const phase = phases.find((p) => p.id === project.phase);
  const budgetUsage = (project.spent / project.budget) * 100;

  return (
    <div
      className={cn(
        "relative p-6 rounded-lg border backdrop-blur-sm",
        "bg-slate-900/60 border-slate-700/50 transition-all duration-300",
        "hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10",
        isGodMode && "border-yellow-500/30",
        isUltraInstinct && "border-purple-500/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{project.name}</h3>
          <p className="text-sm text-slate-400">{project.location}</p>
        </div>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-xs font-mono uppercase",
            phase?.color === "cyan" && "bg-cyan-500/20 text-cyan-400",
            phase?.color === "purple" && "bg-purple-500/20 text-purple-400",
            phase?.color === "orange" && "bg-orange-500/20 text-orange-400",
            phase?.color === "green" && "bg-green-500/20 text-green-400",
            phase?.color === "god" && "bg-yellow-500/20 text-yellow-400"
          )}
        >
          {phase?.icon} {phase?.name}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">Fortschritt</span>
          <span className="text-cyan-400 font-mono">{project.progress}%</span>
        </div>
        <ProgressBar progress={project.progress} color={phase?.color || "cyan"} />
      </div>

      {/* Budget */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">Budget</span>
          <span className={cn("font-mono", budgetUsage > 90 ? "text-orange-400" : "text-green-400")}>
            {formatCurrency(project.spent)} / {formatCurrency(project.budget)}
          </span>
        </div>
        <ProgressBar progress={budgetUsage} color={budgetUsage > 90 ? "orange" : "green"} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
        <div>
          <p className="text-xs text-slate-500 uppercase">Typ</p>
          <p className="text-sm text-white">{project.type}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Team</p>
          <p className="text-sm text-cyan-400">{project.team} Personen</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Fertigstellung</p>
          <p className="text-sm text-purple-400">{formatDate(project.estimatedEnd)}</p>
        </div>
      </div>

      {/* Scan Line Effect */}
      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
        <div
          className={cn(
            "absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent",
            "animate-scan-line"
          )}
        />
      </div>
    </div>
  );
}

// =============================================================================
// PHASE TIMELINE COMPONENT
// =============================================================================
function PhaseTimeline({
  phases,
  isGodMode,
  isUltraInstinct,
}: {
  phases: Phase[];
  isGodMode: boolean;
  isUltraInstinct: boolean;
}) {
  return (
    <div
      className={cn(
        "relative p-6 rounded-lg border backdrop-blur-sm",
        "bg-slate-900/60 border-slate-700/50",
        isGodMode && "border-yellow-500/30",
        isUltraInstinct && "border-purple-500/30"
      )}
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-cyan-400">◈</span> Bauphasen-Timeline
      </h3>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500 via-purple-500 to-slate-700" />

        {/* Phases */}
        <div className="space-y-4">
          {phases.map((phase) => (
            <div key={phase.id} className="relative flex items-center gap-4 pl-12">
              {/* Node */}
              <div
                className={cn(
                  "absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs",
                  phase.progress === 100 && "bg-green-500/20 border-green-500 text-green-400",
                  phase.progress > 0 && phase.progress < 100 && "bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse",
                  phase.progress === 0 && "bg-slate-800 border-slate-600 text-slate-500"
                )}
              >
                {phase.progress === 100 ? "✓" : phase.icon}
              </div>

              {/* Content */}
              <div className="flex-1 flex items-center justify-between py-2">
                <div>
                  <span
                    className={cn(
                      "font-medium",
                      phase.progress === 100 && "text-green-400",
                      phase.progress > 0 && phase.progress < 100 && "text-cyan-400",
                      phase.progress === 0 && "text-slate-500"
                    )}
                  >
                    {phase.name}
                  </span>
                  {phase.count > 0 && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({phase.count} {phase.count === 1 ? "Projekt" : "Projekte"})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <ProgressBar progress={phase.progress} color={phase.color} />
                  </div>
                  <span className="text-xs font-mono text-slate-400 w-10 text-right">{phase.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DATA SOURCE INDICATOR
// =============================================================================
function DataSourceIndicator({ source, connected }: { source: string; connected: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono",
        connected
          ? "bg-green-500/10 border border-green-500/30 text-green-400"
          : "bg-orange-500/10 border border-orange-500/30 text-orange-400"
      )}
    >
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          connected ? "bg-green-400 animate-pulse" : "bg-orange-400"
        )}
      />
      {source === "database" ? "LIVE DATABASE" : "DEMO DATA"}
    </div>
  );
}

// =============================================================================
// MAIN CONSTRUCTION PAGE
// =============================================================================
export default function ConstructionPage() {
  const { isGodMode, isUltraInstinct, powerLevel } = usePowerMode();

  // Fetch data from API
  const { data: statsData, isLoading: statsLoading } = api.constructionStats.getDashboardStats.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: projectsData, isLoading: projectsLoading } = api.constructionStats.getProjects.useQuery(
    { limit: 20 },
    { refetchInterval: 30000 }
  );

  const { data: connectionStatus } = api.constructionStats.getConnectionStatus.useQuery();

  const isLoading = statsLoading || projectsLoading;

  // Extract data with fallbacks
  const stats = statsData?.data;
  const projects = (projectsData?.data || []) as Project[];
  const phases = (stats?.phases || []) as Phase[];
  const source = statsData?.source || "demo";

  // Calculate totals (from API or fallback)
  const totalBudget = stats?.totalBudget || 0;
  const totalSpent = stats?.totalSpent || 0;
  const avgProgress = stats?.avgProgress || 0;
  const totalTeam = stats?.totalTeam || 0;
  const activeProjects = stats?.activeProjects || projects.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className={cn(
                "text-3xl font-bold tracking-tight",
                isGodMode && "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500",
                isUltraInstinct && "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400",
                !isGodMode && !isUltraInstinct && "text-white"
              )}
            >
              <span className="text-cyan-400">▣</span> CONSTRUCTION COMMAND
            </h1>
            <p className="text-slate-400 mt-1">West Money Bau - Bauprojekt-Überwachung</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Data Source Indicator */}
            <DataSourceIndicator
              source={source}
              connected={connectionStatus?.connected || false}
            />

            {/* Power Level Indicator */}
            <div
              className={cn(
                "px-4 py-2 rounded-lg border backdrop-blur-sm font-mono text-sm",
                isGodMode && "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
                isUltraInstinct && "border-purple-500/50 bg-purple-500/10 text-purple-400",
                !isGodMode && !isUltraInstinct && "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
              )}
            >
              {isUltraInstinct ? "極 ULTRA INSTINCT" : isGodMode ? "神 GOD MODE" : "◉ STANDARD"}
              <span className="ml-2 text-slate-500">PWR: {powerLevel}</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400"></div>
            <span className="ml-3 text-cyan-400">Loading construction data...</span>
          </div>
        )}

        {/* Stats Overview */}
        {!isLoading && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <StatsCard
                title="Aktive Projekte"
                value={activeProjects}
                subtitle="in Bearbeitung"
                icon="◈"
                color="cyan"
                isGodMode={isGodMode}
                isUltraInstinct={isUltraInstinct}
              />
              <StatsCard
                title="Gesamtbudget"
                value={formatCurrency(totalBudget)}
                subtitle={`${formatCurrency(totalSpent)} ausgegeben`}
                icon="◆"
                color="purple"
                isGodMode={isGodMode}
                isUltraInstinct={isUltraInstinct}
              />
              <StatsCard
                title="Durchschn. Fortschritt"
                value={`${avgProgress}%`}
                subtitle="aller Projekte"
                icon="◉"
                color="green"
                isGodMode={isGodMode}
                isUltraInstinct={isUltraInstinct}
              />
              <StatsCard
                title="Team-Größe"
                value={totalTeam}
                subtitle="Mitarbeiter aktiv"
                icon="★"
                color="orange"
                isGodMode={isGodMode}
                isUltraInstinct={isUltraInstinct}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Projects List */}
              <div className="col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-purple-400">◇</span> Aktive Bauprojekte
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      phases={phases}
                      isGodMode={isGodMode}
                      isUltraInstinct={isUltraInstinct}
                    />
                  ))}
                </div>
              </div>

              {/* Phase Timeline */}
              <div className="col-span-1">
                <PhaseTimeline
                  phases={phases}
                  isGodMode={isGodMode}
                  isUltraInstinct={isUltraInstinct}
                />
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-slate-600 text-xs pt-8 border-t border-slate-800">
          <p>WEST MONEY BAU CONSTRUCTION COMMAND v2.0</p>
          <p className="mt-1">
            {isUltraInstinct
              ? "極 TRANSCENDENT BUILDING MASTERY UNLOCKED"
              : isGodMode
              ? "神 DIVINE CONSTRUCTION OVERSIGHT ENABLED"
              : "◉ STANDARD MONITORING ACTIVE"}
          </p>
          {stats?.lastUpdated && (
            <p className="mt-1 text-slate-700">
              Last updated: {new Date(stats.lastUpdated).toLocaleTimeString("de-DE")}
            </p>
          )}
        </div>
      </div>

      {/* Scan Line Animation Style */}
      <style jsx global>{`
        @keyframes scan-line {
          0% {
            top: -100%;
          }
          100% {
            top: 200%;
          }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
