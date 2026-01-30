"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode } from "@/components/scifi";
import { api } from "@/trpc";
import { Loader2 } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// BAUHERREN PASS - SciFi VIP Tier System
// Cyberpunk-styled commission tracking and tier progression
// Connected to tRPC bauherrenPass router for real data
// ═══════════════════════════════════════════════════════════════════════════════

// Tier Configuration with SciFi colors
const TIER_CONFIG = {
  bronze: {
    name: "BRONZE OPERATIVE",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    glowColor: "shadow-orange-500/20",
    icon: "◇",
    minVolume: 0,
    commission: 2.5,
    powerLevel: 10000,
  },
  silver: {
    name: "SILVER AGENT",
    color: "text-slate-300",
    bgColor: "bg-slate-400/10",
    borderColor: "border-slate-400/30",
    glowColor: "shadow-slate-400/20",
    icon: "◆",
    minVolume: 100000,
    commission: 3.0,
    powerLevel: 50000,
  },
  gold: {
    name: "GOLD ELITE",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    glowColor: "shadow-yellow-500/20",
    icon: "★",
    minVolume: 500000,
    commission: 3.5,
    powerLevel: 250000,
  },
  platinum: {
    name: "PLATINUM COMMANDER",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/20",
    icon: "◈",
    minVolume: 1000000,
    commission: 4.0,
    powerLevel: 1000000,
  },
  diamond: {
    name: "DIAMOND OVERLORD",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    glowColor: "shadow-cyan-500/20",
    icon: "神",
    minVolume: 5000000,
    commission: 5.0,
    powerLevel: 9999999,
  },
};

const TIERS = ["bronze", "silver", "gold", "platinum", "diamond"] as const;
type TierType = (typeof TIERS)[number];

export default function BauherrenPassPage() {
  const { isGodMode, isUltraInstinct, powerLevel } = usePowerMode();
  const [animatedVolume, setAnimatedVolume] = useState(0);
  const [animatedCommission, setAnimatedCommission] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "quarter" | "year">("month");

  // ═══════════════════════════════════════════════════════════════════════════════
  // tRPC QUERIES - Fetch data from Bauherren Pass router
  // ═══════════════════════════════════════════════════════════════════════════════
  const { data: statusData, isLoading: statusLoading } = api.bauherrenPass.getStatus.useQuery();
  const { data: monthlyData, isLoading: monthlyLoading } = api.bauherrenPass.getMonthlyStats.useQuery({ months: 6 });
  const { data: dealsData, isLoading: dealsLoading } = api.bauherrenPass.getRecentDeals.useQuery({ limit: 5 });
  const { data: tierData, isLoading: tierLoading } = api.bauherrenPass.getTierProgression.useQuery();

  const isLoading = statusLoading || monthlyLoading || dealsLoading || tierLoading;

  // Derived data with fallbacks
  const currentTier = (statusData?.currentTier ?? "bronze") as TierType;
  const totalVolume = statusData?.totalVolume ?? 0;
  const totalCommission = statusData?.totalCommission ?? 0;
  const referrals = statusData?.referrals ?? 0;
  const activeDeals = statusData?.activeDeals ?? 0;
  const pendingCommission = statusData?.pendingCommission ?? 0;
  const monthlyStats = monthlyData?.stats ?? [];
  const recentDeals = dealsData?.deals ?? [];

  // Animate numbers on data load
  useEffect(() => {
    if (statusLoading || !statusData) return;

    const targetVolume = statusData.totalVolume;
    const targetCommission = statusData.totalCommission;

    const volumeInterval = setInterval(() => {
      setAnimatedVolume((prev) => {
        const next = prev + Math.ceil(targetVolume / 50);
        return next >= targetVolume ? targetVolume : next;
      });
    }, 20);

    const commissionInterval = setInterval(() => {
      setAnimatedCommission((prev) => {
        const next = prev + Math.ceil(targetCommission / 50);
        return next >= targetCommission ? targetCommission : next;
      });
    }, 20);

    return () => {
      clearInterval(volumeInterval);
      clearInterval(commissionInterval);
    };
  }, [statusData, statusLoading]);

  const currentTierConfig = TIER_CONFIG[currentTier];
  const nextTierIndex = TIERS.indexOf(currentTier) + 1;
  const nextTier = nextTierIndex < TIERS.length ? TIERS[nextTierIndex] : null;
  const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null;

  const progressToNextTier = nextTierConfig
    ? Math.min(100, (totalVolume / nextTierConfig.minVolume) * 100)
    : 100;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-neon-cyan animate-spin" />
          <span className="text-white/50 font-mono text-sm">LOADING BAUHERREN DATA...</span>
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
    }).format(amount);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "text-3xl font-display font-bold tracking-wider",
            isGodMode ? "text-god-secondary" : isUltraInstinct ? "text-ultra-primary" : "text-white"
          )}>
            BAUHERREN PASS
          </h1>
          <p className="text-white/50 text-sm font-mono mt-1">
            VIP Commission & Referral Program • Power Level: {powerLevel.toLocaleString()}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(["month", "quarter", "year"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-mono uppercase transition-all",
                selectedPeriod === period
                  ? "bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan"
                  : "bg-void-surface/50 border border-white/10 text-white/50 hover:text-white hover:border-white/30"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Current Tier Card */}
      <div
        className={cn(
          "relative p-6 rounded-2xl border backdrop-blur-xl overflow-hidden",
          currentTierConfig.bgColor,
          currentTierConfig.borderColor
        )}
      >
        {/* Background glow */}
        <div
          className={cn(
            "absolute inset-0 opacity-20",
            `bg-gradient-to-br from-transparent via-${currentTierConfig.color.replace("text-", "")} to-transparent`
          )}
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Tier Icon */}
            <div
              className={cn(
                "w-24 h-24 rounded-2xl flex items-center justify-center text-4xl",
                currentTierConfig.bgColor,
                "border-2",
                currentTierConfig.borderColor,
                "shadow-lg",
                currentTierConfig.glowColor
              )}
            >
              <span className={currentTierConfig.color}>{currentTierConfig.icon}</span>
            </div>

            <div>
              <div className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">
                Current Status
              </div>
              <h2 className={cn("text-2xl font-display font-bold tracking-wider", currentTierConfig.color)}>
                {currentTierConfig.name}
              </h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-white/60 text-sm font-mono">
                  Commission Rate: <span className={currentTierConfig.color}>{currentTierConfig.commission}%</span>
                </span>
                <span className="text-white/40">|</span>
                <span className="text-white/60 text-sm font-mono">
                  Power: <span className="text-neon-green">{currentTierConfig.powerLevel.toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Next Tier Progress */}
          {nextTierConfig && (
            <div className="text-right">
              <div className="text-white/40 text-xs font-mono uppercase tracking-widest mb-2">
                Progress to {nextTierConfig.name}
              </div>
              <div className="w-48 h-3 bg-void-surface rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    `bg-gradient-to-r from-${currentTierConfig.color.replace("text-", "")} to-${nextTierConfig.color.replace("text-", "")}`
                  )}
                  style={{ width: `${progressToNextTier}%` }}
                />
              </div>
              <div className="text-xs font-mono text-white/50 mt-1">
                {formatCurrency(totalVolume)} / {formatCurrency(nextTierConfig.minVolume)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Volume */}
        <StatsCard
          label="TOTAL VOLUME"
          value={formatCurrency(animatedVolume)}
          icon="◈"
          color="cyan"
          subtitle={`${referrals} Referrals`}
        />

        {/* Total Commission */}
        <StatsCard
          label="TOTAL COMMISSION"
          value={formatCurrency(animatedCommission)}
          icon="€"
          color="green"
          subtitle="Lifetime Earnings"
        />

        {/* Pending Commission */}
        <StatsCard
          label="PENDING PAYOUT"
          value={formatCurrency(pendingCommission)}
          icon="◇"
          color="orange"
          subtitle={`${activeDeals} Active Deals`}
        />

        {/* Referrals */}
        <StatsCard
          label="ACTIVE REFERRALS"
          value={referrals.toString()}
          icon="★"
          color="purple"
          subtitle="Network Members"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Deals */}
        <div className="bg-void-surface/30 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-display font-bold text-white mb-4">RECENT DEALS</h3>
          <div className="space-y-3">
            {recentDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-3 bg-void-dark/50 rounded-lg border border-white/5"
              >
                <div>
                  <div className="text-white font-medium text-sm">{deal.name}</div>
                  <div className="text-white/40 text-xs font-mono">{formatCurrency(deal.value)}</div>
                </div>
                <div className="text-right">
                  <div className="text-neon-green font-mono text-sm">+{formatCurrency(deal.commission)}</div>
                  <StatusBadge status={deal.status as "closed" | "pending" | "processing"} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Performance Chart */}
        <div className="bg-void-surface/30 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-display font-bold text-white mb-4">MONTHLY PERFORMANCE</h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {monthlyStats.map((stat, index) => {
              const maxVolume = Math.max(...monthlyStats.map((s) => s.volume));
              const height = maxVolume > 0 ? (stat.volume / maxVolume) * 100 : 0;

              return (
                <div key={stat.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-[10px] font-mono text-neon-cyan mb-1">
                      {formatCurrency(stat.commission).replace("€", "")}
                    </span>
                    <div
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500",
                        "bg-gradient-to-t from-neon-cyan/50 to-neon-cyan/20",
                        "border border-neon-cyan/30"
                      )}
                      style={{
                        height: `${height}%`,
                        animationDelay: `${index * 100}ms`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/40">{stat.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tier Progression */}
      <div className="bg-void-surface/30 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-display font-bold text-white mb-6">TIER PROGRESSION MATRIX</h3>
        <div className="flex items-center justify-between gap-4">
          {TIERS.map((tier, index) => {
            const config = TIER_CONFIG[tier];
            const isCurrentTier = tier === currentTier;
            const isPastTier = TIERS.indexOf(tier) < TIERS.indexOf(currentTier);

            return (
              <div key={tier} className="flex-1">
                <div
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300",
                    isCurrentTier
                      ? `${config.bgColor} ${config.borderColor} ring-2 ring-${config.color.replace("text-", "")}`
                      : isPastTier
                      ? "bg-void-dark/50 border-white/10"
                      : "bg-void-dark/30 border-white/5 opacity-50"
                  )}
                >
                  <div className="text-center">
                    <div className={cn("text-3xl mb-2", isCurrentTier || isPastTier ? config.color : "text-white/30")}>
                      {config.icon}
                    </div>
                    <div className={cn("text-xs font-mono font-bold", isCurrentTier || isPastTier ? config.color : "text-white/30")}>
                      {config.name.split(" ")[0]}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">
                      {formatCurrency(config.minVolume)}+
                    </div>
                    <div className={cn("text-sm font-bold mt-2", isCurrentTier || isPastTier ? "text-neon-green" : "text-white/30")}>
                      {config.commission}%
                    </div>
                  </div>
                </div>

                {/* Connector */}
                {index < TIERS.length - 1 && (
                  <div className="flex items-center justify-center -mt-4 -mb-4 relative z-10">
                    <div
                      className={cn(
                        "w-8 h-0.5",
                        isPastTier ? "bg-neon-cyan" : "bg-white/10"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
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
  icon: string;
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
        <span className={cn("text-lg", classes.text)}>{icon}</span>
      </div>
      <div className={cn("text-2xl font-display font-bold", classes.text)}>{value}</div>
      {subtitle && <div className="text-xs font-mono text-white/40 mt-1">{subtitle}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusBadgeProps {
  status: "closed" | "pending" | "processing";
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    closed: { text: "CLOSED", color: "text-neon-green", bg: "bg-neon-green/10" },
    pending: { text: "PENDING", color: "text-neon-orange", bg: "bg-neon-orange/10" },
    processing: { text: "PROCESSING", color: "text-neon-cyan", bg: "bg-neon-cyan/10" },
  };

  const { text, color, bg } = config[status];

  return (
    <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded", color, bg)}>
      {text}
    </span>
  );
}
