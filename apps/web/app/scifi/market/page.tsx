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
  LiveCounter,
} from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL MARKET - Market Analytics & Financial Tracking
// Real-time market data visualization and financial insights
// ═══════════════════════════════════════════════════════════════════════════════

interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  category: "real-estate" | "stocks" | "crypto" | "commodities";
}

interface MarketTrend {
  region: string;
  growth: number;
  sentiment: "bullish" | "bearish" | "neutral";
  volume: string;
}

const DEMO_ASSETS: MarketAsset[] = [
  { id: "re1", symbol: "DEU-RE", name: "German Real Estate Index", price: 142.85, change24h: 2.3, volume24h: 15200000, marketCap: 892000000000, category: "real-estate" },
  { id: "re2", symbol: "EUR-PROP", name: "EU Property Fund", price: 89.45, change24h: 1.8, volume24h: 8500000, marketCap: 245000000000, category: "real-estate" },
  { id: "st1", symbol: "VOW3", name: "Volkswagen AG", price: 112.30, change24h: -0.5, volume24h: 45000000, marketCap: 56000000000, category: "stocks" },
  { id: "st2", symbol: "SAP", name: "SAP SE", price: 178.92, change24h: 3.2, volume24h: 32000000, marketCap: 210000000000, category: "stocks" },
  { id: "cr1", symbol: "BTC", name: "Bitcoin", price: 98452.30, change24h: 4.5, volume24h: 52000000000, marketCap: 1920000000000, category: "crypto" },
  { id: "cr2", symbol: "ETH", name: "Ethereum", price: 3845.20, change24h: 2.8, volume24h: 18500000000, marketCap: 462000000000, category: "crypto" },
  { id: "co1", symbol: "GOLD", name: "Gold (XAU)", price: 2089.50, change24h: 0.8, volume24h: 125000000, marketCap: 13500000000000, category: "commodities" },
  { id: "co2", symbol: "BRENT", name: "Brent Crude Oil", price: 82.45, change24h: -1.2, volume24h: 89000000, marketCap: 0, category: "commodities" },
];

const MARKET_TRENDS: MarketTrend[] = [
  { region: "Germany", growth: 4.2, sentiment: "bullish", volume: "€2.8B" },
  { region: "EU Central", growth: 2.8, sentiment: "bullish", volume: "€5.4B" },
  { region: "UK", growth: -0.5, sentiment: "bearish", volume: "£1.2B" },
  { region: "USA", growth: 3.1, sentiment: "bullish", volume: "$12.3B" },
  { region: "Asia Pacific", growth: 5.8, sentiment: "bullish", volume: "¥18.7T" },
];

const categoryConfig = {
  "real-estate": { color: "text-neon-cyan", bg: "bg-neon-cyan/20", icon: "⬡" },
  stocks: { color: "text-neon-green", bg: "bg-neon-green/20", icon: "◆" },
  crypto: { color: "text-neon-purple", bg: "bg-neon-purple/20", icon: "◎" },
  commodities: { color: "text-neon-orange", bg: "bg-neon-orange/20", icon: "⊕" },
};

export default function MarketPage() {
  const { mode } = usePowerMode();
  const [assets] = useState<MarketAsset[]>(DEMO_ASSETS);
  const [trends] = useState<MarketTrend[]>(MARKET_TRENDS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [marketIndex, setMarketIndex] = useState(14523.45);

  // Simulate live market updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketIndex((prev) => prev + (Math.random() - 0.48) * 10);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredAssets = selectedCategory
    ? assets.filter((a) => a.category === selectedCategory)
    : assets;

  const totalMarketCap = assets.reduce((sum, a) => sum + a.marketCap, 0);
  const avgChange = assets.reduce((sum, a) => sum + a.change24h, 0) / assets.length;
  const gainers = assets.filter((a) => a.change24h > 0).length;
  const losers = assets.filter((a) => a.change24h < 0).length;

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-neon-cyan">⊕</span> GLOBAL MARKET
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Real-time Market Analytics & Financial Tracking
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-mono text-white/40">NEXUS INDEX</p>
            <p className={cn("text-lg font-mono font-bold", marketIndex > 14500 ? "text-neon-green" : "text-neon-red")}>
              {marketIndex.toFixed(2)}
            </p>
          </div>
          <NeonButton variant="gold" size="md">
            PORTFOLIO
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid
        variant="gold"
        stats={[
          { id: "cap", label: "Total Market Cap", value: `€${formatNumber(totalMarketCap)}`, trend: "up", trendValue: "+2.5%" },
          { id: "change", label: "Avg. Change 24h", value: `${avgChange > 0 ? "+" : ""}${avgChange.toFixed(2)}%`, trend: avgChange > 0 ? "up" : "down", trendValue: "24h" },
          { id: "gainers", label: "Gainers", value: gainers.toString(), trend: "up", trendValue: `/${assets.length}` },
          { id: "losers", label: "Losers", value: losers.toString(), trend: losers > gainers ? "down" : "neutral", trendValue: `/${assets.length}` },
        ]}
      />

      {/* Category Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-white/50">KATEGORIE:</span>
        {["all", "real-estate", "stocks", "crypto", "commodities"].map((cat) => {
          const config = cat !== "all" ? categoryConfig[cat as keyof typeof categoryConfig] : null;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === "all" ? null : cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all",
                "border flex items-center gap-2",
                (cat === "all" && !selectedCategory) || selectedCategory === cat
                  ? "bg-gold-primary/20 border-gold-primary/50 text-gold-primary"
                  : "bg-void-surface/50 border-white/10 text-white/50 hover:border-white/30"
              )}
            >
              {config && <span className={config.color}>{config.icon}</span>}
              {cat === "all" ? "ALLE" : cat.replace("-", " ").toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets List */}
        <div className="lg:col-span-2 space-y-4">
          <HoloCard variant="default" className="p-4">
            <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider mb-4">
              Market Assets
            </h3>
            <div className="space-y-2">
              {filteredAssets.map((asset) => {
                const config = categoryConfig[asset.category];
                return (
                  <div
                    key={asset.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-void/50 hover:bg-void/70 transition-colors cursor-pointer"
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
                      <span className={cn("text-lg", config.color)}>{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display font-bold text-white">{asset.symbol}</span>
                        <span className="text-[10px] text-white/40">{asset.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-white/30">
                        Vol: €{formatNumber(asset.volume24h)} | MCap: €{formatNumber(asset.marketCap)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-white">
                        €{asset.price.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </p>
                      <p className={cn(
                        "text-xs font-mono",
                        asset.change24h > 0 ? "text-neon-green" : asset.change24h < 0 ? "text-neon-red" : "text-white/50"
                      )}>
                        {asset.change24h > 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </HoloCard>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Regional Trends */}
          <HoloCard variant="default" className="p-4">
            <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider mb-4">
              Regional Trends
            </h3>
            <div className="space-y-3">
              {trends.map((trend) => (
                <div key={trend.region} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      trend.sentiment === "bullish" ? "bg-neon-green" :
                      trend.sentiment === "bearish" ? "bg-neon-red" :
                      "bg-white/30"
                    )} />
                    <span className="text-xs text-white/70">{trend.region}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-white/40">{trend.volume}</span>
                    <span className={cn(
                      "text-xs font-mono",
                      trend.growth > 0 ? "text-neon-green" : "text-neon-red"
                    )}>
                      {trend.growth > 0 ? "+" : ""}{trend.growth}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </HoloCard>

          {/* Market Sentiment */}
          <HoloCard variant="default" className="p-4">
            <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider mb-4">
              Market Sentiment
            </h3>
            <div className="flex justify-center">
              <MetricRing
                value={65}
                size="md"
                color="green"
                label="65%"
                sublabel="BULLISH"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-neon-green/10 rounded p-2 text-center">
                <p className="text-xs font-mono text-neon-green">BUYERS</p>
                <p className="text-sm font-bold text-white">65%</p>
              </div>
              <div className="bg-neon-red/10 rounded p-2 text-center">
                <p className="text-xs font-mono text-neon-red">SELLERS</p>
                <p className="text-sm font-bold text-white">35%</p>
              </div>
            </div>
          </HoloCard>

          {/* Quick Actions */}
          <HoloCard variant="default" className="p-4">
            <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <NeonButton variant="purple" size="sm" className="w-full">
                📊 ANALYSE
              </NeonButton>
              <NeonButton variant="ghost" size="sm" className="w-full">
                🔔 ALERTS SETZEN
              </NeonButton>
              <NeonButton variant="ghost" size="sm" className="w-full">
                📈 REPORTS
              </NeonButton>
            </div>
          </HoloCard>
        </div>
      </div>

      {/* Terminal */}
      <HoloCard variant="default" className="p-0">
        <Terminal
          title="MARKET CONSOLE"
          lines={[
            { id: "1", type: "system", content: "Global Market Terminal v2.1 connected", timestamp: new Date() },
            { id: "2", type: "success", content: `Tracking ${assets.length} assets across 4 categories`, timestamp: new Date() },
            { id: "3", type: "output", content: `NEXUS INDEX: ${marketIndex.toFixed(2)} | Trend: ${marketIndex > 14500 ? "↑ Bullish" : "↓ Bearish"}`, timestamp: new Date() },
            { id: "4", type: "success", content: "Real-time data feed: ACTIVE", timestamp: new Date() },
          ]}
        />
      </HoloCard>
    </div>
  );
}
