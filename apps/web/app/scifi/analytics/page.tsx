"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Eye,
  Target,
  Zap,
  Activity,
  Globe,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  HoloCard,
  StatCard,
  StatsGrid,
  MetricRing,
  DataBar,
  ActivityIndicator,
  LiveCounter,
  usePowerMode,
} from "@/components/scifi";
import { api } from "@/trpc";

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS ANALYTICS - Real-time CRM & Business Analytics
// Connected to HubSpot for live data
// ═══════════════════════════════════════════════════════════════════════════════

export default function SciFiAnalyticsPage() {
  const { mode } = usePowerMode();
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");

  // Real data from HubSpot
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = api.hubspotStats.getDashboardStats.useQuery();
  const { data: recentDeals, isLoading: dealsLoading } = api.hubspotStats.getRecentDeals.useQuery({ limit: 10 });
  const { data: recentContacts, isLoading: contactsLoading } = api.hubspotStats.getRecentContacts.useQuery({ limit: 5 });
  const { data: wonDealsData } = api.hubspotStats.getWonDeals.useQuery({ limit: 20 });
  const { data: connectionStatus } = api.hubspotStats.getConnectionStatus.useQuery();

  const isGodMode = mode === "god";
  const isUltraMode = mode === "ultra";

  // Extract stats
  const stats = dashboardStats?.data;
  const totalDeals = stats?.totalDeals ?? 0;
  const totalContacts = stats?.totalContacts ?? 0;
  const totalValue = stats?.totalValue ?? 0;
  const avgDealValue = stats?.avgDealValue ?? 0;
  const dealsByStage = stats?.dealsByStage ?? {};
  const pipelines = stats?.pipelines ?? [];

  // Won deals data
  const wonDeals = wonDealsData?.data;
  const wonCount = wonDeals?.count ?? 0;
  const wonTotalValue = wonDeals?.totalValue ?? 0;
  const wonTotalCommission = wonDeals?.totalCommission ?? 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
    return `€${amount.toLocaleString("de-DE", { minimumFractionDigits: 0 })}`;
  };

  // Build funnel data from real pipeline stages
  const funnelSteps = pipelines.length > 0 && pipelines[0].stages
    ? pipelines[0].stages.map((stage, index) => {
        const stageData = dealsByStage[stage.id];
        const count = stageData?.count ?? 0;
        const percentage = totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0;
        return {
          name: stage.label,
          value: count,
          percentage,
          color: index % 4 === 0 ? "cyan" : index % 4 === 1 ? "purple" : index % 4 === 2 ? "green" : "gold",
        };
      })
    : [];

  // Conversion metrics based on real data
  const conversionMetrics = [
    {
      label: "Deal Win Rate",
      value: totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0,
      max: 100,
      color: "green" as const,
    },
    {
      label: "Avg. Deal Size",
      value: Math.round(avgDealValue / 10000), // Scaled for display
      max: 100,
      color: "gold" as const,
    },
    {
      label: "Pipeline Coverage",
      value: Math.min(100, Math.round(totalValue / 1000000)), // % of 1M target
      max: 100,
      color: "purple" as const,
    },
    {
      label: "Contact → Deal",
      value: totalContacts > 0 ? Math.round((totalDeals / totalContacts) * 100) : 0,
      max: 100,
      color: "cyan" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-void p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${isGodMode ? "bg-god-primary/20" : isUltraMode ? "bg-ultra-secondary/20" : "bg-neon-cyan/20"}`}>
            <BarChart3 className={`h-8 w-8 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-cyan"}`} />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-cyan"}`}>
              NEXUS ANALYTICS
            </h1>
            <p className="text-gray-400 text-sm">
              Live CRM Analytics & Performance Metrics
              {connectionStatus?.connected && (
                <span className="ml-2 text-neon-green text-xs">● HubSpot Connected</span>
              )}
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(["24h", "7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTimeRange === range
                  ? isGodMode
                    ? "bg-god-primary text-black"
                    : isUltraMode
                    ? "bg-ultra-secondary text-black"
                    : "bg-neon-cyan text-black"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Connection Error Banner */}
      {statsError && (
        <HoloCard variant="default" className="p-4 border-neon-red/50">
          <div className="flex items-center gap-3 text-neon-red">
            <AlertCircle className="h-5 w-5" />
            <span className="font-mono text-sm">HubSpot Verbindungsfehler: {statsError.message}</span>
          </div>
        </HoloCard>
      )}

      {/* Realtime Stats Banner */}
      <HoloCard variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"} glow animated>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <ActivityIndicator status={statsLoading ? "idle" : "active"} size="md" pulse />
            <span className="text-lg font-semibold text-white">LIVE CRM DATA</span>
          </div>
          <div className="grid grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4 text-neon-cyan" />
                {statsLoading ? (
                  <span className="text-2xl font-bold text-white/50">...</span>
                ) : (
                  <LiveCounter value={totalDeals} className="text-2xl font-bold text-white" />
                )}
              </div>
              <p className="text-xs text-gray-400">Total Deals</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4 text-neon-purple" />
                {statsLoading ? (
                  <span className="text-2xl font-bold text-white/50">...</span>
                ) : (
                  <LiveCounter value={totalContacts} className="text-2xl font-bold text-white" />
                )}
              </div>
              <p className="text-xs text-gray-400">Kontakte</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="h-4 w-4 text-neon-green" />
                <span className="text-2xl font-bold text-white">
                  {statsLoading ? "..." : formatCurrency(totalValue)}
                </span>
              </div>
              <p className="text-xs text-gray-400">Pipeline-Wert</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Target className="h-4 w-4 text-neon-gold" />
                <span className="text-2xl font-bold text-white">
                  {statsLoading ? "..." : formatCurrency(avgDealValue)}
                </span>
              </div>
              <p className="text-xs text-gray-400">Ø Deal-Wert</p>
            </div>
          </div>
        </div>
      </HoloCard>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pipeline Value"
          value={statsLoading ? "..." : formatCurrency(totalValue)}
          trend="up"
          trendValue={`${totalDeals} Deals`}
          icon={<DollarSign className="h-5 w-5" />}
          status="online"
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "default"}
        />
        <StatCard
          label="Gewonnene Deals"
          value={statsLoading ? "..." : wonCount.toString()}
          trend="up"
          trendValue={formatCurrency(wonTotalValue)}
          icon={<TrendingUp className="h-5 w-5" />}
          status="online"
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
        />
        <StatCard
          label="CRM Kontakte"
          value={statsLoading ? "..." : totalContacts.toLocaleString("de-DE")}
          trend="up"
          trendValue="HubSpot"
          icon={<Users className="h-5 w-5" />}
          status="online"
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "purple"}
        />
        <StatCard
          label="Provision (3.5%)"
          value={statsLoading ? "..." : formatCurrency(wonTotalCommission)}
          trend="up"
          trendValue="Earned"
          icon={<Target className="h-5 w-5" />}
          status="online"
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "gold"}
        />
      </div>

      {/* Conversion Metrics & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Metrics Rings */}
        <HoloCard
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "default"}
          title="Performance Metrics"
          subtitle="Schlüsselkennzahlen"
          icon={<Zap className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-cyan"}`} />}
          glow
        >
          <div className="p-6">
            <div className="grid grid-cols-2 gap-8">
              {conversionMetrics.map((metric) => (
                <div key={metric.label} className="flex flex-col items-center">
                  <MetricRing
                    value={metric.value}
                    max={metric.max}
                    size="lg"
                    color={metric.color}
                    label={`${metric.value}%`}
                    animated
                  />
                  <p className="mt-3 text-sm text-gray-400 text-center">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </HoloCard>

        {/* Pipeline Funnel */}
        <HoloCard
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "purple"}
          title="Pipeline Funnel"
          subtitle={pipelines[0]?.label || "Deal Stages"}
          icon={<TrendingUp className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-purple"}`} />}
          glow
        >
          <div className="p-6 space-y-4">
            {funnelSteps.length > 0 ? (
              funnelSteps.map((step, index) => (
                <div key={step.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{step.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">
                        {step.value.toLocaleString("de-DE")}
                      </span>
                      <span className="text-gray-500">({step.percentage}%)</span>
                    </div>
                  </div>
                  <DataBar
                    label={step.name}
                    value={step.percentage}
                    max={100}
                    color={step.color as "cyan" | "purple" | "green" | "gold"}
                    showValue={false}
                    animated
                  />
                </div>
              ))
            ) : (
              <div className="text-center text-white/50 py-8">
                {statsLoading ? "Lade Pipeline-Daten..." : "Keine Pipeline-Daten verfügbar"}
              </div>
            )}
          </div>
        </HoloCard>
      </div>

      {/* Recent Deals & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deals */}
        <HoloCard
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
          title="Neueste Deals"
          subtitle="Recent Activity"
          icon={<Activity className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-cyan"}`} />}
          glow
          className="lg:col-span-2"
        >
          <div className="p-6 space-y-3">
            {dealsLoading ? (
              <div className="text-center text-white/50 py-4">Lade Deals...</div>
            ) : recentDeals?.data && recentDeals.data.length > 0 ? (
              recentDeals.data.slice(0, 6).map((deal) => (
                <div key={deal.id} className="flex items-center gap-4 p-3 bg-void/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300 text-sm font-medium truncate max-w-[200px]">
                        {deal.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {formatCurrency(deal.amount)}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-neon-green" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span className="px-2 py-0.5 bg-neon-purple/20 text-neon-purple rounded">
                        {deal.stage || "Unknown Stage"}
                      </span>
                      {deal.createdAt && (
                        <span>{new Date(deal.createdAt).toLocaleDateString("de-DE")}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-white/50 py-4">Keine Deals gefunden</div>
            )}
          </div>
        </HoloCard>

        {/* Performance Score */}
        <HoloCard
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "gold"}
          title="Performance Score"
          subtitle="Gesamtbewertung"
          icon={<Sparkles className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-gold"}`} />}
          glow
        >
          <div className="p-6 flex flex-col items-center justify-center">
            <MetricRing
              value={totalDeals > 0 && wonCount > 0 ? Math.round((wonCount / totalDeals) * 100) + 50 : 50}
              max={100}
              size="xl"
              color={isGodMode ? "gold" : isUltraMode ? "purple" : "gold"}
              animated
              label={`${totalDeals > 0 && wonCount > 0 ? Math.round((wonCount / totalDeals) * 100) + 50 : 50}%`}
              sublabel="Score"
            />
            <div className="mt-6 grid grid-cols-2 gap-4 w-full text-center">
              <div>
                <p className="text-2xl font-bold text-neon-green">
                  {connectionStatus?.connected ? "A+" : "—"}
                </p>
                <p className="text-xs text-gray-400">CRM Status</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neon-cyan">
                  {totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-400">Win Rate</p>
              </div>
            </div>
          </div>
        </HoloCard>
      </div>

      {/* AI Insights */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "purple"}
        glow
        animated
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${isGodMode ? "bg-god-primary/20" : isUltraMode ? "bg-ultra-secondary/20" : "bg-neon-purple/20"}`}>
              <Sparkles className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-purple"}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">NEXUS AI INSIGHTS</h3>
              <p className="text-xs text-gray-400">Automatische Analyse basierend auf HubSpot-Daten</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-800/50 border border-neon-green/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-neon-green" />
                <span className="text-neon-green text-sm font-medium">Pipeline</span>
              </div>
              <p className="text-gray-300 text-sm">
                {totalDeals > 0
                  ? `${totalDeals.toLocaleString("de-DE")} aktive Deals mit ${formatCurrency(totalValue)} Pipeline-Wert.`
                  : "Keine aktiven Deals in der Pipeline."}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/50 border border-neon-gold/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-neon-gold" />
                <span className="text-neon-gold text-sm font-medium">Provision</span>
              </div>
              <p className="text-gray-300 text-sm">
                {wonTotalCommission > 0
                  ? `${formatCurrency(wonTotalCommission)} Provision aus ${wonCount} gewonnenen Deals (3.5% Rate).`
                  : "Noch keine Provisionen aus gewonnenen Deals."}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/50 border border-neon-cyan/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-neon-cyan" />
                <span className="text-neon-cyan text-sm font-medium">Empfehlung</span>
              </div>
              <p className="text-gray-300 text-sm">
                {avgDealValue > 0
                  ? `Durchschnittlicher Deal-Wert: ${formatCurrency(avgDealValue)}. Fokus auf größere Deals kann ROI steigern.`
                  : "Mehr Daten erforderlich für Empfehlungen."}
              </p>
            </div>
          </div>
        </div>
      </HoloCard>
    </div>
  );
}
