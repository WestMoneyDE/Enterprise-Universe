"use client";

import { useState } from "react";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Zap,
  Shield,
  Receipt,
  Users,
} from "lucide-react";
import {
  HoloCard,
  StatsGrid,
  MetricRing,
  DataBar,
  ActivityIndicator,
  LiveCounter,
  StatItem,
  NeonButton,
  usePowerMode,
} from "@/components/scifi";
import { cn } from "@/lib/utils";

// =============================================================================
// PAYMENT TYPES
// =============================================================================

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  customer: string;
  description: string;
  createdAt: Date;
  paymentMethod: string;
}

interface Subscription {
  id: string;
  customer: string;
  plan: string;
  amount: number;
  interval: "month" | "year";
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodEnd: Date;
}

// =============================================================================
// DEMO DATA (Replace with real Stripe API calls)
// =============================================================================

const demoTransactions: Transaction[] = [
  {
    id: "pi_3Qw4",
    amount: 4999,
    currency: "EUR",
    status: "succeeded",
    customer: "West Money Bau GmbH",
    description: "Enterprise Plan - Monthly",
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    paymentMethod: "Visa •••• 4242",
  },
  {
    id: "pi_3Qw3",
    amount: 12500,
    currency: "EUR",
    status: "succeeded",
    customer: "AutoHaus Schmidt",
    description: "Custom Integration",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    paymentMethod: "Mastercard •••• 5555",
  },
  {
    id: "pi_3Qw2",
    amount: 2999,
    currency: "EUR",
    status: "pending",
    customer: "Tech Solutions AG",
    description: "Professional Plan",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    paymentMethod: "SEPA Lastschrift",
  },
  {
    id: "pi_3Qw1",
    amount: 999,
    currency: "EUR",
    status: "failed",
    customer: "Startup XYZ",
    description: "Starter Plan",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    paymentMethod: "Visa •••• 1234",
  },
  {
    id: "pi_3Qw0",
    amount: 4999,
    currency: "EUR",
    status: "refunded",
    customer: "Old Customer Ltd",
    description: "Enterprise Plan - Refund",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    paymentMethod: "Visa •••• 9999",
  },
];

const demoSubscriptions: Subscription[] = [
  {
    id: "sub_1",
    customer: "West Money Bau GmbH",
    plan: "Enterprise",
    amount: 4999,
    interval: "month",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25),
  },
  {
    id: "sub_2",
    customer: "Tech Solutions AG",
    plan: "Professional",
    amount: 2999,
    interval: "month",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
  },
  {
    id: "sub_3",
    customer: "AutoHaus Schmidt",
    plan: "Enterprise",
    amount: 49990,
    interval: "year",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180),
  },
  {
    id: "sub_4",
    customer: "Demo Company",
    plan: "Starter",
    amount: 999,
    interval: "month",
    status: "past_due",
    currentPeriodEnd: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    id: "sub_5",
    customer: "Trial User",
    plan: "Professional",
    amount: 2999,
    interval: "month",
    status: "trialing",
    currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
  },
];

const revenueStats = {
  mrr: 16995, // Monthly Recurring Revenue in cents
  arr: 203940, // Annual Recurring Revenue in cents
  ltv: 24500, // Lifetime Value in cents
  churn: 2.3, // Churn rate percentage
};

// =============================================================================
// PAYMENTS PAGE COMPONENT
// =============================================================================

export default function PaymentsPage() {
  const { mode } = usePowerMode();
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24h" | "7d" | "30d" | "90d">("30d");
  const [viewMode, setViewMode] = useState<"transactions" | "subscriptions">("transactions");

  const isGodMode = mode === "god";
  const isUltraMode = mode === "ultra";

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Gerade eben";
    if (minutes < 60) return `vor ${minutes}m`;
    if (hours < 24) return `vor ${hours}h`;
    if (days < 7) return `vor ${days}d`;
    return date.toLocaleDateString("de-DE");
  };

  const getStatusConfig = (status: Transaction["status"] | Subscription["status"]) => {
    switch (status) {
      case "succeeded":
      case "active":
        return { color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/30", icon: CheckCircle };
      case "pending":
      case "trialing":
        return { color: "text-neon-orange", bg: "bg-neon-orange/10", border: "border-neon-orange/30", icon: Clock };
      case "failed":
      case "past_due":
        return { color: "text-neon-red", bg: "bg-neon-red/10", border: "border-neon-red/30", icon: XCircle };
      case "refunded":
      case "canceled":
        return { color: "text-white/50", bg: "bg-white/5", border: "border-white/20", icon: RefreshCw };
      default:
        return { color: "text-neon-cyan", bg: "bg-neon-cyan/10", border: "border-neon-cyan/30", icon: CreditCard };
    }
  };

  // Calculate stats
  const totalRevenue = demoTransactions
    .filter((t) => t.status === "succeeded")
    .reduce((sum, t) => sum + t.amount, 0);

  const successRate = Math.round(
    (demoTransactions.filter((t) => t.status === "succeeded").length / demoTransactions.length) * 100
  );

  const activeSubscriptions = demoSubscriptions.filter((s) => s.status === "active" || s.status === "trialing").length;

  const paymentStats: StatItem[] = [
    {
      id: "revenue",
      label: "Revenue (30d)",
      value: formatCurrency(totalRevenue),
      trend: "up",
      trendValue: "+12.5%",
      status: "online",
    },
    {
      id: "mrr",
      label: "MRR",
      value: formatCurrency(revenueStats.mrr),
      trend: "up",
      trendValue: "+8.2%",
      status: "online",
    },
    {
      id: "subscriptions",
      label: "Active Subscriptions",
      value: activeSubscriptions.toString(),
      trend: "up",
      trendValue: `${activeSubscriptions} aktiv`,
      status: "online",
    },
    {
      id: "success",
      label: "Success Rate",
      value: `${successRate}%`,
      trend: successRate > 90 ? "up" : "neutral",
      trendValue: successRate > 90 ? "Excellent" : "Needs attention",
      status: successRate > 90 ? "online" : "warning",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-lg",
            isGodMode ? "bg-god-primary/20" : isUltraMode ? "bg-ultra-secondary/20" : "bg-neon-green/20"
          )}>
            <CreditCard className={cn(
              "h-8 w-8",
              isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-green"
            )} />
          </div>
          <div>
            <h1 className={cn(
              "text-2xl font-display font-bold tracking-wider",
              isGodMode ? "text-god-primary" : isUltraMode ? "text-ultra-secondary" : "text-neon-green"
            )}>
              PAYMENT NEXUS
            </h1>
            <p className="text-sm text-white/50 font-mono">
              Stripe Integration • Live Payment Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex gap-1 p-1 rounded-lg bg-void-surface/50 border border-white/10">
            {(["24h", "7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono uppercase transition-all",
                  selectedTimeRange === range
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/30"
                    : "text-white/50 hover:text-white"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          <NeonButton variant="cyan" size="sm">
            Stripe Dashboard
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={paymentStats} columns={4} animated variant="cyan" />

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Transactions/Subscriptions List */}
        <div className="col-span-12 lg:col-span-8">
          <HoloCard
            title={viewMode === "transactions" ? "RECENT TRANSACTIONS" : "ACTIVE SUBSCRIPTIONS"}
            subtitle={`${viewMode === "transactions" ? demoTransactions.length : demoSubscriptions.length} entries`}
            icon="◈"
            variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
          >
            {/* View Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setViewMode("transactions")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all",
                  viewMode === "transactions"
                    ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                    : "bg-void-surface/50 text-white/50 border border-white/10 hover:border-white/30"
                )}
              >
                <Receipt className="w-4 h-4" />
                Transactions
              </button>
              <button
                onClick={() => setViewMode("subscriptions")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all",
                  viewMode === "subscriptions"
                    ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
                    : "bg-void-surface/50 text-white/50 border border-white/10 hover:border-white/30"
                )}
              >
                <Users className="w-4 h-4" />
                Subscriptions
              </button>
            </div>

            {/* Content */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {viewMode === "transactions" ? (
                demoTransactions.map((tx) => {
                  const statusConfig = getStatusConfig(tx.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={tx.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        "bg-void-surface/30 border-white/10 hover:border-neon-cyan/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", statusConfig.bg)}>
                            <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
                          </div>
                          <div>
                            <div className="font-display text-sm text-white font-bold">
                              {tx.customer}
                            </div>
                            <div className="text-xs text-white/50 font-mono">
                              {tx.description} • {tx.paymentMethod}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-sm font-mono font-bold",
                            tx.status === "succeeded" ? "text-neon-green" :
                            tx.status === "refunded" ? "text-white/50 line-through" :
                            "text-white"
                          )}>
                            {formatCurrency(tx.amount)}
                          </div>
                          <div className="text-[10px] text-white/30 font-mono">
                            {formatDate(tx.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-mono rounded border uppercase",
                          statusConfig.bg, statusConfig.border, statusConfig.color
                        )}>
                          {tx.status}
                        </span>
                        <span className="text-[10px] text-white/30 font-mono">
                          ID: {tx.id}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                demoSubscriptions.map((sub) => {
                  const statusConfig = getStatusConfig(sub.status);
                  const StatusIcon = statusConfig.icon;
                  const daysUntilRenewal = Math.ceil(
                    (sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={sub.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        "bg-void-surface/30 border-white/10 hover:border-neon-purple/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", statusConfig.bg)}>
                            <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
                          </div>
                          <div>
                            <div className="font-display text-sm text-white font-bold">
                              {sub.customer}
                            </div>
                            <div className="text-xs text-white/50 font-mono">
                              {sub.plan} Plan • {sub.interval === "month" ? "Monatlich" : "Jährlich"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-bold text-neon-purple">
                            {formatCurrency(sub.amount)}/{sub.interval === "month" ? "mo" : "yr"}
                          </div>
                          <div className="text-[10px] text-white/30 font-mono">
                            {daysUntilRenewal > 0
                              ? `Erneuert in ${daysUntilRenewal} Tagen`
                              : `Überfällig seit ${Math.abs(daysUntilRenewal)} Tagen`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-mono rounded border uppercase",
                          statusConfig.bg, statusConfig.border, statusConfig.color
                        )}>
                          {sub.status}
                        </span>
                        <span className="text-[10px] text-white/30 font-mono">
                          ID: {sub.id}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </HoloCard>
        </div>

        {/* Right Column - Metrics & Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Revenue Metrics */}
          <HoloCard title="REVENUE METRICS" subtitle="Key Performance" icon="◆" variant="cyan" glow>
            <div className="space-y-4">
              <div className="flex justify-around py-4">
                <MetricRing
                  value={successRate}
                  label="Success"
                  color="green"
                  size="md"
                />
                <MetricRing
                  value={100 - revenueStats.churn}
                  label="Retention"
                  color="cyan"
                  size="md"
                />
              </div>
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/50 font-mono">ARR</span>
                  <span className="text-sm font-mono text-neon-green font-bold">
                    {formatCurrency(revenueStats.arr)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/50 font-mono">LTV</span>
                  <span className="text-sm font-mono text-neon-cyan font-bold">
                    {formatCurrency(revenueStats.ltv)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/50 font-mono">Churn Rate</span>
                  <span className={cn(
                    "text-sm font-mono font-bold",
                    revenueStats.churn < 5 ? "text-neon-green" : "text-neon-orange"
                  )}>
                    {revenueStats.churn}%
                  </span>
                </div>
              </div>
            </div>
          </HoloCard>

          {/* Payment Methods */}
          <HoloCard title="PAYMENT METHODS" subtitle="Distribution" icon="◇">
            <div className="space-y-3">
              <DataBar label="Visa / Mastercard" value={65} max={100} color="cyan" />
              <DataBar label="SEPA Lastschrift" value={25} max={100} color="purple" />
              <DataBar label="PayPal" value={8} max={100} color="gold" />
              <DataBar label="Andere" value={2} max={100} color="green" />
            </div>
          </HoloCard>

          {/* Stripe Status */}
          <HoloCard title="STRIPE STATUS" subtitle="API Connection" icon="⬡" variant="cyan">
            <div className="space-y-3">
              <ActivityIndicator status="active" label="API Connected" />
              <ActivityIndicator status="active" label="Webhooks Active" />
              <ActivityIndicator status="active" label="PCI Compliant" />
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
                  <Shield className="w-3 h-3 text-neon-green" />
                  <span>Live Mode Enabled</span>
                </div>
              </div>
            </div>
          </HoloCard>

          {/* Quick Actions */}
          <HoloCard title="QUICK ACTIONS" icon="▣">
            <div className="space-y-2">
              <NeonButton variant="green" size="sm" className="w-full">
                <Zap className="w-4 h-4 mr-2" />
                Create Invoice
              </NeonButton>
              <NeonButton variant="cyan" size="sm" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Payments
              </NeonButton>
              <NeonButton variant="purple" size="sm" className="w-full">
                <DollarSign className="w-4 h-4 mr-2" />
                Issue Refund
              </NeonButton>
            </div>
          </HoloCard>
        </div>
      </div>
    </div>
  );
}
