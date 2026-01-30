"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc";
import {
  HoloCard,
  NeonButton,
  StatsGrid,
  MetricRing,
  DataBar,
  ActivityIndicator,
  StatItem,
} from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD SCORING - AI-Powered Lead Qualification Dashboard
// Visualize lead scores, grades, and conversion predictions
// ═══════════════════════════════════════════════════════════════════════════════

const GRADE_COLORS = {
  A: { bg: "bg-neon-green/20", border: "border-neon-green/50", text: "text-neon-green", glow: "shadow-neon-green/20" },
  B: { bg: "bg-neon-cyan/20", border: "border-neon-cyan/50", text: "text-neon-cyan", glow: "shadow-neon-cyan/20" },
  C: { bg: "bg-neon-gold/20", border: "border-neon-gold/50", text: "text-neon-gold", glow: "shadow-neon-gold/20" },
  D: { bg: "bg-neon-orange/20", border: "border-neon-orange/50", text: "text-neon-orange", glow: "shadow-neon-orange/20" },
} as const;

const GRADE_DESCRIPTIONS = {
  A: "Hot Lead - Ready to convert",
  B: "Warm Lead - High potential",
  C: "Cool Lead - Needs nurturing",
  D: "Cold Lead - Low priority",
} as const;

type Grade = keyof typeof GRADE_COLORS;

export default function LeadScoringPage() {
  const [selectedGrade, setSelectedGrade] = useState<Grade | "all">("all");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [configEditing, setConfigEditing] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // tRPC QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: leaderboard, isLoading: leaderboardLoading, refetch: refetchLeaderboard } =
    api.leadScoring.getLeaderboard.useQuery({
      limit: 50,
      grade: selectedGrade !== "all" ? selectedGrade : undefined,
    });

  const { data: distribution, isLoading: distributionLoading } =
    api.leadScoring.getDistribution.useQuery();

  const { data: trends, isLoading: trendsLoading } = api.leadScoring.getTrends.useQuery({
    days: 30,
  });

  const { data: gradeChanges, isLoading: changesLoading } = api.leadScoring.getGradeChanges.useQuery({
    days: 7,
  });

  const { data: config, refetch: refetchConfig } = api.leadScoring.getConfig.useQuery();

  // ═══════════════════════════════════════════════════════════════════════════
  // tRPC MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const updateConfigMutation = api.leadScoring.updateConfig.useMutation({
    onSuccess: () => {
      refetchConfig();
      setConfigEditing(false);
    },
  });

  const calculateScoreMutation = api.leadScoring.calculateScore.useMutation({
    onSuccess: () => {
      refetchLeaderboard();
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const totalLeads = leaderboard?.length ?? 0;
  const gradeACount = leaderboard?.filter((l) => l.grade === "A").length ?? 0;
  const gradeBCount = leaderboard?.filter((l) => l.grade === "B").length ?? 0;
  const gradeCCount = leaderboard?.filter((l) => l.grade === "C").length ?? 0;
  const gradeDCount = leaderboard?.filter((l) => l.grade === "D").length ?? 0;

  const avgScore =
    totalLeads > 0
      ? Math.round(
          (leaderboard?.reduce((sum, l) => sum + l.score, 0) ?? 0) / totalLeads
        )
      : 0;

  const scoringStats: StatItem[] = [
    {
      id: "total",
      label: "Scored Leads",
      value: totalLeads.toString(),
      trend: "up",
      trendValue: "+8%",
      status: "online",
    },
    {
      id: "grade-a",
      label: "Grade A Leads",
      value: gradeACount.toString(),
      trend: gradeACount > 5 ? "up" : "neutral",
      trendValue: "Hot",
      status: "online",
    },
    {
      id: "avg-score",
      label: "Avg Score",
      value: avgScore.toString(),
      trend: avgScore > 50 ? "up" : "neutral",
      trendValue: avgScore > 50 ? "Good" : "Fair",
      status: avgScore > 50 ? "online" : "warning",
    },
    {
      id: "changes",
      label: "Recent Upgrades",
      value: gradeChanges?.filter((c) => isUpgrade(c.previousGrade, c.newGrade)).length?.toString() ?? "0",
      trend: "up",
      trendValue: "7 days",
      status: "online",
    },
  ];

  // Distribution data for visualization
  const distributionBars = distribution
    ? [
        { label: "Grade A (80-100)", value: distribution.A ?? 0, color: "green" as const },
        { label: "Grade B (60-79)", value: distribution.B ?? 0, color: "cyan" as const },
        { label: "Grade C (40-59)", value: distribution.C ?? 0, color: "gold" as const },
        { label: "Grade D (0-39)", value: distribution.D ?? 0, color: "orange" as const },
      ]
    : [];

  const maxDistribution = Math.max(...distributionBars.map((b) => b.value), 1);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (leaderboardLoading && distributionLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-wider">
              LEAD SCORING
            </h1>
            <p className="text-sm text-white/50 font-mono mt-1">
              Initializing scoring algorithms...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-void-surface/30 rounded-lg border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            LEAD SCORING
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Status: <span className="text-neon-green">AI SCORING ACTIVE</span>
            <span className="ml-4">Model: <span className="text-neon-cyan">HAIKU v3</span></span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ActivityIndicator
            status="active"
            label="Scoring Engine"
            pulse
          />
          <NeonButton
            variant="cyan"
            size="sm"
            onClick={() => setConfigEditing(!configEditing)}
          >
            {configEditing ? "Cancel" : "Configure"}
          </NeonButton>
          <NeonButton variant="purple" size="sm" glow>
            Recalculate All
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={scoringStats} columns={4} animated variant="cyan" />

      {/* Grade Filter Tabs */}
      <div className="flex items-center gap-2 p-1 w-fit rounded-lg bg-void-surface/50 border border-white/10">
        <button
          onClick={() => setSelectedGrade("all")}
          className={cn(
            "px-4 py-2 rounded-md text-xs font-mono uppercase transition-all",
            selectedGrade === "all"
              ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
              : "text-white/50 hover:text-white"
          )}
        >
          All ({totalLeads})
        </button>
        {(["A", "B", "C", "D"] as Grade[]).map((grade) => {
          const count = leaderboard?.filter((l) => l.grade === grade).length ?? 0;
          const colors = GRADE_COLORS[grade];
          return (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={cn(
                "px-4 py-2 rounded-md text-xs font-mono uppercase transition-all flex items-center gap-2",
                selectedGrade === grade
                  ? cn(colors.bg, colors.text, "border", colors.border)
                  : "text-white/50 hover:text-white"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", colors.bg.replace("/20", ""))} />
              {grade} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Leaderboard */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <HoloCard
            title="LEAD LEADERBOARD"
            subtitle={`Top ${totalLeads} scored leads`}
            icon={<span>★</span>}
            variant="cyan"
          >
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((lead, index) => (
                  <LeadCard
                    key={lead.contactId}
                    lead={lead}
                    rank={index + 1}
                    isSelected={selectedLead === lead.contactId}
                    onClick={() => setSelectedLead(lead.contactId)}
                  />
                ))
              ) : (
                <div className="py-8 text-center text-white/30 text-sm font-mono">
                  No scored leads found
                </div>
              )}
            </div>
          </HoloCard>
        </div>

        {/* Right Column - Analytics */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Score Distribution */}
          <HoloCard title="SCORE DISTRIBUTION" subtitle="By grade" icon="◈" variant="cyan">
            <div className="space-y-4">
              {distributionBars.map((bar) => (
                <div key={bar.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/70">{bar.label}</span>
                    <span className={cn(
                      bar.color === "green" && "text-neon-green",
                      bar.color === "cyan" && "text-neon-cyan",
                      bar.color === "gold" && "text-neon-gold",
                      bar.color === "orange" && "text-neon-orange"
                    )}>
                      {bar.value} leads
                    </span>
                  </div>
                  <div className="h-3 bg-void-surface/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        bar.color === "green" && "bg-neon-green",
                        bar.color === "cyan" && "bg-neon-cyan",
                        bar.color === "gold" && "bg-neon-gold",
                        bar.color === "orange" && "bg-neon-orange"
                      )}
                      style={{ width: `${(bar.value / maxDistribution) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Rings */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10">
              <MetricRing
                value={Math.round(((gradeACount + gradeBCount) / Math.max(totalLeads, 1)) * 100)}
                label="Hot Leads"
                color="green"
                size="md"
              />
              <MetricRing
                value={avgScore}
                label="Avg Score"
                color="cyan"
                size="md"
              />
            </div>
          </HoloCard>

          {/* Recent Grade Changes */}
          <HoloCard
            title="GRADE CHANGES"
            subtitle="Last 7 days"
            icon="◇"
            variant="purple"
          >
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {changesLoading ? (
                <div className="py-4 text-center text-white/30 text-sm font-mono">
                  Loading changes...
                </div>
              ) : gradeChanges && gradeChanges.length > 0 ? (
                gradeChanges.map((change, index) => (
                  <GradeChangeCard key={index} change={change} />
                ))
              ) : (
                <div className="py-4 text-center text-white/30 text-sm font-mono">
                  No recent grade changes
                </div>
              )}
            </div>
          </HoloCard>

          {/* Scoring Configuration */}
          {configEditing ? (
            <HoloCard
              title="SCORING CONFIGURATION"
              subtitle="Edit Mode"
              icon={<span>⚙</span>}
              variant="gold"
              glow
            >
              <ScoringConfigEditor
                config={config}
                onSave={(newConfig) => updateConfigMutation.mutate(newConfig)}
                onCancel={() => setConfigEditing(false)}
                isLoading={updateConfigMutation.isPending}
              />
            </HoloCard>
          ) : (
            <HoloCard title="SCORING WEIGHTS" subtitle="Current configuration" icon={<span>⚙</span>}>
              <div className="space-y-3">
                <WeightBar label="Engagement Score" value={config?.weights?.engagement ?? 25} color="cyan" />
                <WeightBar label="Firmographic Score" value={config?.weights?.firmographic ?? 25} color="purple" />
                <WeightBar label="Demographic Fit" value={config?.weights?.demographic ?? 25} color="green" />
                <WeightBar label="Behavioral Score" value={config?.weights?.behavioral ?? 25} color="gold" />
              </div>
            </HoloCard>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface LeadCardProps {
  lead: {
    contactId: string;
    contactName: string;
    contactEmail?: string | null;
    score: number;
    grade: string;
    lastCalculated: Date | null;
  };
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}

function LeadCard({ lead, rank, isSelected, onClick }: LeadCardProps) {
  const grade = lead.grade as Grade;
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS.D;
  const timeAgo = lead.lastCalculated ? formatTimeAgo(new Date(lead.lastCalculated)) : "Never";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-lg border transition-all text-left",
        isSelected
          ? "bg-neon-purple/20 border-neon-purple/50"
          : "bg-void-surface/30 border-white/10 hover:border-neon-cyan/30"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-bold",
          rank <= 3 ? "bg-neon-gold/20 text-neon-gold" : "bg-void-surface/50 text-white/50"
        )}>
          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
        </div>

        {/* Lead Info */}
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm text-white font-bold truncate">
            {lead.contactName}
          </div>
          <div className="text-[10px] text-white/50 font-mono truncate">
            {lead.contactEmail ?? "No email"}
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <div className={cn(
            "text-2xl font-mono font-bold",
            lead.score >= 80 ? "text-neon-green" :
            lead.score >= 60 ? "text-neon-cyan" :
            lead.score >= 40 ? "text-neon-gold" : "text-neon-orange"
          )}>
            {lead.score}
          </div>
          <div className="text-[10px] text-white/40 font-mono">{timeAgo}</div>
        </div>

        {/* Grade Badge */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg",
          colors.bg,
          colors.border,
          colors.text,
          "border"
        )}>
          {grade}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 bg-void-surface/50 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            lead.score >= 80 ? "bg-neon-green" :
            lead.score >= 60 ? "bg-neon-cyan" :
            lead.score >= 40 ? "bg-neon-gold" : "bg-neon-orange"
          )}
          style={{ width: `${lead.score}%` }}
        />
      </div>
    </button>
  );
}

interface GradeChangeCardProps {
  change: {
    contactId: string;
    contactName: string;
    previousGrade: string;
    newGrade: string;
    previousScore: number;
    newScore: number;
    changedAt: Date;
  };
}

function GradeChangeCard({ change }: GradeChangeCardProps) {
  const isUpgraded = isUpgrade(change.previousGrade, change.newGrade);
  const prevColors = GRADE_COLORS[change.previousGrade as Grade] ?? GRADE_COLORS.D;
  const newColors = GRADE_COLORS[change.newGrade as Grade] ?? GRADE_COLORS.D;
  const timeAgo = formatTimeAgo(new Date(change.changedAt));

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      isUpgraded
        ? "bg-neon-green/10 border-neon-green/30"
        : "bg-neon-red/10 border-neon-red/30"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-display text-white truncate max-w-[120px]">
            {change.contactName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Previous Grade */}
          <span className={cn(
            "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
            prevColors.bg,
            prevColors.text
          )}>
            {change.previousGrade}
          </span>

          {/* Arrow */}
          <span className={cn(
            "text-sm",
            isUpgraded ? "text-neon-green" : "text-neon-red"
          )}>
            {isUpgraded ? "↑" : "↓"}
          </span>

          {/* New Grade */}
          <span className={cn(
            "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
            newColors.bg,
            newColors.text
          )}>
            {change.newGrade}
          </span>
        </div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-white/40 font-mono">
          {change.previousScore} → {change.newScore} pts
        </span>
        <span className="text-[10px] text-white/40 font-mono">{timeAgo}</span>
      </div>
    </div>
  );
}

interface WeightBarProps {
  label: string;
  value: number;
  color: "cyan" | "purple" | "green" | "gold";
}

function WeightBar({ label, value, color }: WeightBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-white/70">{label}</span>
        <span className={cn(
          color === "cyan" && "text-neon-cyan",
          color === "purple" && "text-neon-purple",
          color === "green" && "text-neon-green",
          color === "gold" && "text-neon-gold"
        )}>
          {value}%
        </span>
      </div>
      <div className="h-2 bg-void-surface/50 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color === "cyan" && "bg-neon-cyan",
            color === "purple" && "bg-neon-purple",
            color === "green" && "bg-neon-green",
            color === "gold" && "bg-neon-gold"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface ScoringConfigEditorProps {
  config?: {
    weights?: {
      engagement?: number;
      activity?: number;
      demographic?: number;
      behavioral?: number;
    };
    thresholds?: {
      A?: number;
      B?: number;
      C?: number;
    };
  };
  onSave: (config: {
    weights?: {
      engagement?: number;
      activity?: number;
      demographic?: number;
      behavioral?: number;
    };
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ScoringConfigEditor({ config, onSave, onCancel, isLoading }: ScoringConfigEditorProps) {
  const [weights, setWeights] = useState({
    engagement: config?.weights?.engagement ?? 25,
    activity: config?.weights?.activity ?? 25,
    demographic: config?.weights?.demographic ?? 25,
    behavioral: config?.weights?.behavioral ?? 25,
  });

  const total = weights.engagement + weights.activity + weights.demographic + weights.behavioral;
  const isValid = total === 100;

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/50 font-mono mb-2">
        Adjust weights (must total 100%)
      </div>

      {(["engagement", "activity", "demographic", "behavioral"] as const).map((key) => (
        <div key={key} className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-white/70 capitalize">{key}</span>
            <span className="text-neon-cyan">{weights[key]}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={weights[key]}
            onChange={(e) => setWeights({ ...weights, [key]: parseInt(e.target.value) })}
            className="w-full h-2 bg-void-surface/50 rounded-full appearance-none cursor-pointer accent-neon-cyan"
          />
        </div>
      ))}

      <div className={cn(
        "text-xs font-mono text-center py-2 rounded",
        isValid ? "text-neon-green bg-neon-green/10" : "text-neon-red bg-neon-red/10"
      )}>
        Total: {total}% {isValid ? "✓" : "(must be 100%)"}
      </div>

      <div className="flex gap-2 pt-2">
        <NeonButton
          variant="cyan"
          size="sm"
          className="flex-1"
          onClick={() => onSave({ weights })}
          disabled={isLoading || !isValid}
        >
          {isLoading ? "Saving..." : "Save Weights"}
        </NeonButton>
        <NeonButton
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </NeonButton>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function isUpgrade(prev: string, next: string): boolean {
  const order = ["D", "C", "B", "A"];
  return order.indexOf(next) > order.indexOf(prev);
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
