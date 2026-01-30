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

// Sample analytics data
const conversionMetrics: MetricData[] = [
  { label: "Besucher → Leads", value: 24, max: 100, color: "cyan" },
  { label: "Leads → Kunden", value: 18, max: 100, color: "purple" },
  { label: "Wiederkehrende", value: 67, max: 100, color: "green" },
  { label: "Absprungrate", value: 32, max: 100, color: "red" },
];

const funnelSteps: FunnelStep[] = [
  { name: "Seitenaufrufe", value: 125000, percentage: 100, color: "var(--neon-cyan)" },
  { name: "Engagement", value: 89000, percentage: 71, color: "var(--neon-purple)" },
  { name: "Leads", value: 30000, percentage: 24, color: "var(--neon-green)" },
  { name: "Conversions", value: 5400, percentage: 4.3, color: "var(--neon-gold)" },
];

const trafficSources: TrafficSource[] = [
  { source: "Organische Suche", visitors: 45000, percentage: 36, trend: "up" },
  { source: "Direkter Traffic", visitors: 32000, percentage: 26, trend: "up" },
  { source: "Social Media", visitors: 28000, percentage: 22, trend: "down" },
  { source: "Referrals", visitors: 12000, percentage: 10, trend: "neutral" },
  { source: "Email Marketing", visitors: 8000, percentage: 6, trend: "up" },
];

const realtimeStats = {
  activeUsers: 1247,
  pageViews: 3891,
  avgSessionTime: "4:32",
  bounceRate: 32.4,
};

export default function SciFiAnalyticsPage() {
  const { mode } = usePowerMode();
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");

  const isGodMode = mode === "god";
  const isUltraMode = mode === "ultra";

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
        <StatCard
          label="Gesamtumsatz"
          value="€847.234"
          trend="up"
          trendValue="+12.5%"
          icon={<DollarSign className="h-5 w-5" />}
          status="online"
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "default"}
        />
        <StatCard
          label="Neue Kunden"
          value="2.847"
          trend="up"
          trendValue="+8.3%"
          icon={<Users className="h-5 w-5" />}
          status="online"
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
        />
        <StatCard
          label="Bestellungen"
          value="12.453"
          trend="down"
          trendValue="-3.2%"
          icon={<ShoppingCart className="h-5 w-5" />}
          status="warning"
          variant={isGodMode ? "god" : isUltraMode ? "ultra" : "purple"}
        />
        <StatCard
          label="Conversion Rate"
          value="4.32%"
          trend="up"
          trendValue="+0.8%"
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
          title="Performance Score"
          subtitle="Gesamtbewertung"
          icon={<Sparkles className={`h-5 w-5 ${isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-gold"}`} />}
          glow
        >
          <div className="p-6 flex flex-col items-center justify-center">
            <MetricRing
              value={87}
              max={100}
              size="xl"
              color={isGodMode ? "gold" : isUltraMode ? "purple" : "gold"}
              animated
              label="87%"
              sublabel="Score"
            />
            <div className="mt-6 grid grid-cols-2 gap-4 w-full text-center">
              <div>
                <p className="text-2xl font-bold text-neon-green">A+</p>
                <p className="text-xs text-gray-400">SEO Rating</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neon-cyan">98%</p>
                <p className="text-xs text-gray-400">Uptime</p>
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
