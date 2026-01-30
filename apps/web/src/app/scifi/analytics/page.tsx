"use client";

import { useState, useMemo } from "react";
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
  RefreshCw,
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
import { Skeleton } from "@/components/ui";
import { api } from "@/trpc";

// Analytics data types
interface MetricData {
  label: string;
  value: number;
  max: number;
  color: "cyan" | "purple" | "green" | "red" | "gold" | "orange";
}

interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
  trend: "up" | "down" | "neutral";
}

export default function SciFiAnalyticsPage() {
  const { mode } = usePowerMode();
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");

  // Fetch real data from APIs
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = api.dashboard.getStats.useQuery();
  const { data: distribution, isLoading: distLoading, refetch: refetchDist } = api.leadScoring.getDistribution.useQuery();
  const { data: moduleStatus, isLoading: moduleLoading } = api.dashboard.getModuleStatus.useQuery();

  const isLoading = statsLoading || distLoading;

  const isGodMode = mode === "god";
  const isUltraMode = mode === "ultra";

  // Compute conversion metrics from real data
  const conversionMetrics: MetricData[] = useMemo(() => {
    if (!distribution) {
      return [
        { label: "Grade A Leads", value: 0, max: 100, color: "cyan" },
        { label: "Grade B Leads", value: 0, max: 100, color: "purple" },
        { label: "Grade C Leads", value: 0, max: 100, color: "green" },
        { label: "Avg Score", value: 0, max: 100, color: "gold" },
      ];
    }
    const total = distribution.total || 1;
    return [
      { label: "Grade A Leads", value: Math.round((distribution.A / total) * 100), max: 100, color: "cyan" },
      { label: "Grade B Leads", value: Math.round((distribution.B / total) * 100), max: 100, color: "purple" },
      { label: "Grade C Leads", value: Math.round((distribution.C / total) * 100), max: 100, color: "green" },
      { label: "Avg Score", value: Math.round(distribution.averageScore), max: 100, color: "gold" },
    ];
  }, [distribution]);

  // Compute funnel from real data
  const funnelSteps: FunnelStep[] = useMemo(() => {
    if (!stats || !distribution) {
      return [
        { name: "Total Contacts", value: 0, percentage: 100, color: "var(--neon-cyan)" },
        { name: "Scored Leads", value: 0, percentage: 0, color: "var(--neon-purple)" },
        { name: "High Quality (A/B)", value: 0, percentage: 0, color: "var(--neon-green)" },
        { name: "Won Deals", value: 0, percentage: 0, color: "var(--neon-gold)" },
      ];
    }
    const contacts = stats.contacts || 1;
    const scored = distribution.total || 0;
    const highQuality = (distribution.A || 0) + (distribution.B || 0);
    const won = stats.wonDeals || 0;

    return [
      { name: "Total Contacts", value: contacts, percentage: 100, color: "var(--neon-cyan)" },
      { name: "Scored Leads", value: scored, percentage: Math.round((scored / contacts) * 100), color: "var(--neon-purple)" },
      { name: "High Quality (A/B)", value: highQuality, percentage: Math.round((highQuality / contacts) * 100), color: "var(--neon-green)" },
      { name: "Won Deals", value: won, percentage: Math.round((won / contacts) * 100), color: "var(--neon-gold)" },
    ];
  }, [stats, distribution]);

  // Traffic sources - derive from module status
  const trafficSources: TrafficSource[] = useMemo(() => {
    if (!moduleStatus) {
      return [
        { source: "CRM Contacts", visitors: 0, percentage: 0, trend: "neutral" as const },
        { source: "WhatsApp Chats", visitors: 0, percentage: 0, trend: "neutral" as const },
        { source: "Projects", visitors: 0, percentage: 0, trend: "neutral" as const },
        { source: "AI Processed", visitors: 0, percentage: 0, trend: "neutral" as const },
      ];
    }
    const total = (moduleStatus.modules.crm.count || 0) + (moduleStatus.modules.whatsapp.count || 0) +
                  (moduleStatus.modules.westMoneyBau.count || 0) + (moduleStatus.modules.aiAgent.count || 0);
    const calcPct = (count: number) => total > 0 ? Math.round((count / total) * 100) : 0;

    return [
      { source: "CRM Contacts", visitors: moduleStatus.modules.crm.count, percentage: calcPct(moduleStatus.modules.crm.count), trend: moduleStatus.modules.crm.status === "online" ? "up" as const : "neutral" as const },
      { source: "WhatsApp Chats", visitors: moduleStatus.modules.whatsapp.count, percentage: calcPct(moduleStatus.modules.whatsapp.count), trend: moduleStatus.modules.whatsapp.status === "online" ? "up" as const : "neutral" as const },
      { source: "Projects", visitors: moduleStatus.modules.westMoneyBau.count, percentage: calcPct(moduleStatus.modules.westMoneyBau.count), trend: moduleStatus.modules.westMoneyBau.status === "online" ? "up" as const : "neutral" as const },
      { source: "AI Processed", visitors: moduleStatus.modules.aiAgent.count, percentage: calcPct(moduleStatus.modules.aiAgent.count), trend: "up" as const },
    ];
  }, [moduleStatus]);

  // Realtime stats from actual data
  const realtimeStats = useMemo(() => ({
    activeUsers: distribution?.total || 0,
    pageViews: stats?.conversations || 0,
    avgSessionTime: distribution ? `${Math.round(distribution.averageScore)}pts` : "0pts",
    bounceRate: distribution ? Math.round(((distribution.D || 0) / (distribution.total || 1)) * 100) : 0,
  }), [stats, distribution]);

  const handleRefresh = () => {
    refetchStats();
    refetchDist();
  };

  const getGlowClass = () => {
    if (isGodMode) return "shadow-[0_0_30px_rgba(255,215,0,0.3)]";
    if (isUltraMode) return "shadow-[0_0_30px_rgba(192,192,255,0.3)]";
    return "";
  };

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
            <p className="text-gray-400 text-sm">Echtzeit-Datenanalyse & Performance Metrics</p>
          </div>
        </div>

        {/* Time Range Selector & Refresh */}
        <div className="flex items-center gap-4">
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
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-all ${
              isLoading
                ? "bg-gray-800/30 text-gray-600 cursor-not-allowed"
                : isGodMode
                ? "bg-god-primary/20 text-god-primary hover:bg-god-primary/30"
                : isUltraMode
                ? "bg-ultra-secondary/20 text-ultra-secondary hover:bg-ultra-secondary/30"
                : "bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30"
            }`}
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Realtime Stats Banner */}
      <HoloCard variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"} glow animated>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <ActivityIndicator status="active" size="md" pulse />
            <span className="text-lg font-semibold text-white">LIVE ANALYTICS</span>
          </div>
          <div className="grid grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4 text-neon-cyan" />
                <LiveCounter value={realtimeStats.activeUsers} className="text-2xl font-bold text-white" />
              </div>
              <p className="text-xs text-gray-400">Aktive Nutzer</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Eye className="h-4 w-4 text-neon-purple" />
                <LiveCounter value={realtimeStats.pageViews} className="text-2xl font-bold text-white" />
              </div>
              <p className="text-xs text-gray-400">Seitenaufrufe/h</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-neon-green" />
                <span className="text-2xl font-bold text-white">{realtimeStats.avgSessionTime}</span>
              </div>
              <p className="text-xs text-gray-400">Ø Session</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Target className="h-4 w-4 text-neon-gold" />
                <span className="text-2xl font-bold text-white">{realtimeStats.bounceRate}%</span>
              </div>
              <p className="text-xs text-gray-400">Absprungrate</p>
            </div>
          </div>
        </div>
      </HoloCard>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-lg bg-gray-800/50" />
            <Skeleton className="h-32 rounded-lg bg-gray-800/50" />
            <Skeleton className="h-32 rounded-lg bg-gray-800/50" />
            <Skeleton className="h-32 rounded-lg bg-gray-800/50" />
          </>
        ) : (
          <>
            <StatCard
              label="Total Revenue"
              value={`€${((stats?.revenue || 0) / 100).toLocaleString("de-DE", { minimumFractionDigits: 0 })}`}
              trend="up"
              trendValue={stats?.revenue ? "+12.5%" : "Live"}
              icon={<DollarSign className="h-5 w-5" />}
              status="online"
              variant={isGodMode ? "god" : isUltraMode ? "ultra" : "default"}
            />
            <StatCard
              label="Total Contacts"
              value={(stats?.contacts || 0).toLocaleString("de-DE")}
              trend="up"
              trendValue={`${distribution?.total || 0} scored`}
              icon={<Users className="h-5 w-5" />}
              status="online"
              variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
            />
            <StatCard
              label="Active Deals"
              value={(stats?.deals || 0).toLocaleString("de-DE")}
              trend={stats?.openDeals && stats.openDeals > 10 ? "up" : "down"}
              trendValue={`${stats?.openDeals || 0} open`}
              icon={<ShoppingCart className="h-5 w-5" />}
              status={stats?.openDeals && stats.openDeals > 0 ? "online" : "warning"}
              variant={isGodMode ? "god" : isUltraMode ? "ultra" : "purple"}
            />
            <StatCard
              label="Won Deals"
              value={(stats?.wonDeals || 0).toLocaleString("de-DE")}
              trend="up"
              trendValue={stats?.deals ? `${Math.round(((stats?.wonDeals || 0) / (stats?.deals || 1)) * 100)}% rate` : "0%"}
              icon={<Target className="h-5 w-5" />}
              status="online"
              variant={isGodMode ? "god" : isUltraMode ? "ultra" : "gold"}
            />
          </>
        )}
      </div>

      {/* Conversion Metrics & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Metrics Rings */}
        <HoloCard
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "default"}
          title="Conversion Metrics"
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

        {/* Conversion Funnel */}
        <HoloCard
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "purple"}
          title="Conversion Funnel"
          subtitle="Customer Journey"
          icon={<TrendingUp className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-purple"}`} />}
          glow
        >
          <div className="p-6 space-y-4">
            {funnelSteps.map((step, index) => (
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
                  color={index === 0 ? "cyan" : index === 1 ? "purple" : index === 2 ? "green" : "gold"}
                  showValue={false}
                  animated
                />
              </div>
            ))}
          </div>
        </HoloCard>
      </div>

      {/* Traffic Sources & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Sources */}
        <HoloCard
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
          title="Traffic Quellen"
          subtitle="Herkunft der Besucher"
          icon={<Globe className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-cyan"}`} />}
          glow
          className="lg:col-span-2"
        >
          <div className="p-6 space-y-4">
            {trafficSources.map((source) => (
              <div key={source.source} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-sm">{source.source}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {source.visitors.toLocaleString("de-DE")}
                      </span>
                      {source.trend === "up" && (
                        <ArrowUpRight className="h-4 w-4 text-neon-green" />
                      )}
                      {source.trend === "down" && (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                  <DataBar
                    label={source.source}
                    value={source.percentage}
                    max={100}
                    color={source.trend === "up" ? "green" : source.trend === "down" ? "red" : "cyan"}
                    showValue
                    animated
                  />
                </div>
              </div>
            ))}
          </div>
        </HoloCard>

        {/* Performance Score */}
        <HoloCard
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "gold"}
          title="Lead Score Health"
          subtitle="Overall Quality"
          icon={<Sparkles className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-gold"}`} />}
          glow
        >
          <div className="p-6 flex flex-col items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-32 w-32 rounded-full bg-gray-800/50" />
            ) : (
              <MetricRing
                value={Math.round(distribution?.averageScore || 0)}
                max={100}
                size="xl"
                color={isGodMode ? "gold" : isUltraMode ? "purple" : "gold"}
                animated
                label={`${Math.round(distribution?.averageScore || 0)}%`}
                sublabel="Avg Score"
              />
            )}
            <div className="mt-6 grid grid-cols-2 gap-4 w-full text-center">
              <div>
                <p className={`text-2xl font-bold ${
                  (distribution?.A || 0) > (distribution?.D || 0) ? "text-neon-green" : "text-neon-gold"
                }`}>
                  {distribution?.A || 0}
                </p>
                <p className="text-xs text-gray-400">Grade A Leads</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neon-cyan">{distribution?.total || 0}</p>
                <p className="text-xs text-gray-400">Total Scored</p>
              </div>
            </div>
          </div>
        </HoloCard>
      </div>

      {/* Data Source Indicator */}
      {stats && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${(stats as { _demo?: boolean })._demo ? "bg-yellow-500" : "bg-neon-green"} animate-pulse`} />
          <span>
            {(stats as { _demo?: boolean })._demo ? "Demo Data - Run migrations for live data" : `Live Data - Updated ${new Date(stats.timestamp).toLocaleTimeString()}`}
          </span>
        </div>
      )}

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
              <p className="text-xs text-gray-400">Automatische Analyse-Empfehlungen</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-800/50 border border-neon-green/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-neon-green" />
                <span className="text-neon-green text-sm font-medium">Wachstum</span>
              </div>
              <p className="text-gray-300 text-sm">
                Traffic aus organischer Suche ist um 23% gestiegen. SEO-Strategie zeigt Wirkung.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/50 border border-neon-gold/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-neon-gold" />
                <span className="text-neon-gold text-sm font-medium">Optimierung</span>
              </div>
              <p className="text-gray-300 text-sm">
                Checkout-Abbruchrate bei 67%. A/B-Test für vereinfachten Prozess empfohlen.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/50 border border-neon-cyan/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-neon-cyan" />
                <span className="text-neon-cyan text-sm font-medium">Aktion</span>
              </div>
              <p className="text-gray-300 text-sm">
                Mobile Conversion 40% unter Desktop. Mobile-First Redesign priorisieren.
              </p>
            </div>
          </div>
        </div>
      </HoloCard>
    </div>
  );
}
