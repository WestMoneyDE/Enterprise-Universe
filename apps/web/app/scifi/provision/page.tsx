"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  HoloCard,
  StatsGrid,
  DataBar,
  NeonButton,
  Terminal,
  usePowerMode,
  ActivityIndicator,
} from "@/components/scifi";
import type { StatItem } from "@/components/scifi";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Building2,
  RefreshCw,
  ExternalLink,
  Wallet,
  ArrowRightCircle,
  Calendar,
  Landmark,
} from "lucide-react";

// =============================================================================
// PROVISION CONTROL - Commission Tracking & Payout Management
// SciFi themed dashboard for managing sales provisions and payouts
// =============================================================================

// Type definitions
interface PendingPayout {
  id: string;
  dealName: string;
  dealValue: number;
  provisionAmount: number;
  provisionRate: number;
  status: "pending" | "processing" | "ready";
  createdAt: Date;
  customerName: string;
}

interface PayoutHistory {
  id: string;
  dealName: string;
  amount: number;
  paidDate: Date;
  method: "stripe" | "sepa";
  reference: string;
}

interface PayoutMethod {
  id: string;
  type: "stripe" | "sepa";
  status: "connected" | "pending" | "disconnected";
  details: string;
  lastUsed?: Date;
}

// =============================================================================
// DEMO DATA (Replace with real API calls later)
// =============================================================================

const demoPendingPayouts: PendingPayout[] = [
  {
    id: "prov_001",
    dealName: "Luxusvilla Projekt Alpha",
    dealValue: 850000,
    provisionAmount: 21250,
    provisionRate: 2.5,
    status: "ready",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    customerName: "West Money Bau GmbH",
  },
  {
    id: "prov_002",
    dealName: "Mehrfamilienhaus Berlin",
    dealValue: 1200000,
    provisionAmount: 30000,
    provisionRate: 2.5,
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    customerName: "Immobilien Schmidt AG",
  },
  {
    id: "prov_003",
    dealName: "Gewerbepark Munich",
    dealValue: 2500000,
    provisionAmount: 62500,
    provisionRate: 2.5,
    status: "processing",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    customerName: "Bayern Development GmbH",
  },
  {
    id: "prov_004",
    dealName: "Wohnanlage Hamburg",
    dealValue: 680000,
    provisionAmount: 17000,
    provisionRate: 2.5,
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    customerName: "Hanseatic Builders",
  },
  {
    id: "prov_005",
    dealName: "Penthouse Frankfurt",
    dealValue: 1450000,
    provisionAmount: 36250,
    provisionRate: 2.5,
    status: "ready",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    customerName: "Maintor Properties",
  },
];

const demoPayoutHistory: PayoutHistory[] = [
  {
    id: "pay_001",
    dealName: "Stadthaus Dresden",
    amount: 18500,
    paidDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    method: "stripe",
    reference: "py_3Qw4X2Kj8nM",
  },
  {
    id: "pay_002",
    dealName: "Industriehalle Ruhr",
    amount: 45000,
    paidDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
    method: "sepa",
    reference: "SEPA-2024-00892",
  },
  {
    id: "pay_003",
    dealName: "Wellness Hotel Alpen",
    amount: 87500,
    paidDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28),
    method: "stripe",
    reference: "py_3Qv9Y7Lm2pN",
  },
  {
    id: "pay_004",
    dealName: "Office Tower Stuttgart",
    amount: 125000,
    paidDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35),
    method: "sepa",
    reference: "SEPA-2024-00756",
  },
  {
    id: "pay_005",
    dealName: "Einkaufszentrum Hannover",
    amount: 67500,
    paidDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42),
    method: "stripe",
    reference: "py_3Qu3Z8Kn4qR",
  },
];

const demoPayoutMethods: PayoutMethod[] = [
  {
    id: "pm_stripe",
    type: "stripe",
    status: "connected",
    details: "Stripe Connect - acct_1Qw4X2Kj8nM",
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
  },
  {
    id: "pm_sepa",
    type: "sepa",
    status: "connected",
    details: "DE89 3704 0044 0532 0130 00 - Nexus GmbH",
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
  },
];

// Commission rate constant
const COMMISSION_RATE = 2.5;

// =============================================================================
// PROVISION CONTROL PAGE COMPONENT
// =============================================================================

export default function ProvisionPage() {
  const { mode } = usePowerMode();
  const [selectedTab, setSelectedTab] = useState<"pending" | "history">("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isGodMode = mode === "god";
  const isUltraMode = mode === "ultra";

  // Calculate stats from demo data
  const totalPending = demoPendingPayouts.reduce((sum, p) => sum + p.provisionAmount, 0);
  const totalPaid = demoPayoutHistory.reduce((sum, p) => sum + p.amount, 0);
  const readyForPayout = demoPendingPayouts
    .filter((p) => p.status === "ready")
    .reduce((sum, p) => sum + p.provisionAmount, 0);

  // This month's provisions (mock calculation)
  const thisMonthProvision = demoPendingPayouts
    .filter((p) => {
      const now = new Date();
      return (
        p.createdAt.getMonth() === now.getMonth() &&
        p.createdAt.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, p) => sum + p.provisionAmount, 0);

  // Average per deal
  const avgPerDeal =
    demoPendingPayouts.length > 0
      ? demoPendingPayouts.reduce((sum, p) => sum + p.provisionAmount, 0) /
        demoPendingPayouts.length
      : 0;

  // Conversion rate (deals with provision vs total)
  const conversionRate = 87.5; // Mock value

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Heute";
    if (days === 1) return "Gestern";
    if (days < 7) return `vor ${days} Tagen`;
    if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
    return formatDate(date);
  };

  const getStatusConfig = (status: PendingPayout["status"]) => {
    switch (status) {
      case "ready":
        return {
          color: "text-neon-green",
          bg: "bg-neon-green/10",
          border: "border-neon-green/30",
          icon: CheckCircle,
          label: "Auszahlungsbereit",
        };
      case "processing":
        return {
          color: "text-neon-orange",
          bg: "bg-neon-orange/10",
          border: "border-neon-orange/30",
          icon: RefreshCw,
          label: "In Bearbeitung",
        };
      case "pending":
        return {
          color: "text-neon-cyan",
          bg: "bg-neon-cyan/10",
          border: "border-neon-cyan/30",
          icon: Clock,
          label: "Ausstehend",
        };
      default:
        return {
          color: "text-white/50",
          bg: "bg-white/10",
          border: "border-white/20",
          icon: AlertCircle,
          label: "Unbekannt",
        };
    }
  };

  const getMethodConfig = (method: "stripe" | "sepa") => {
    if (method === "stripe") {
      return {
        color: "text-neon-purple",
        bg: "bg-neon-purple/10",
        border: "border-neon-purple/30",
        icon: CreditCard,
        label: "Stripe",
      };
    }
    return {
      color: "text-neon-cyan",
      bg: "bg-neon-cyan/10",
      border: "border-neon-cyan/30",
      icon: Landmark,
      label: "SEPA",
    };
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const handlePayout = (payoutId: string) => {
    console.log("Initiating payout for:", payoutId);
    // TODO: Implement real payout logic
  };

  // Stats for the grid
  const provisionStats: StatItem[] = [
    {
      id: "pending",
      label: "Ausstehende Provision",
      value: formatCurrency(totalPending),
      trend: "up",
      trendValue: `${demoPendingPayouts.length} Deals`,
      status: "online",
    },
    {
      id: "paid",
      label: "Ausgezahlt (Gesamt)",
      value: formatCurrency(totalPaid),
      trend: "up",
      trendValue: `${demoPayoutHistory.length} Auszahlungen`,
      status: "online",
    },
    {
      id: "rate",
      label: "Provisionsrate",
      value: `${COMMISSION_RATE}%`,
      trend: "neutral",
      trendValue: "Standard Rate",
      status: "online",
    },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "p-3 rounded-lg",
              isGodMode
                ? "bg-god-primary/20"
                : isUltraMode
                  ? "bg-ultra-secondary/20"
                  : "bg-neon-green/20"
            )}
          >
            <DollarSign
              className={cn(
                "h-8 w-8",
                isGodMode
                  ? "text-god-primary"
                  : isUltraMode
                    ? "text-ultra-secondary"
                    : "text-neon-green"
              )}
            />
          </div>
          <div>
            <h1
              className={cn(
                "text-2xl font-display font-bold tracking-wider",
                isGodMode
                  ? "text-god-primary"
                  : isUltraMode
                    ? "text-ultra-secondary"
                    : "text-neon-green"
              )}
            >
              PROVISION CONTROL
            </h1>
            <p className="text-sm text-white/50 font-mono mt-1">
              Provisionsrate:{" "}
              <span className="text-neon-green">{COMMISSION_RATE}%</span> |
              Ausstehend:{" "}
              <span className="text-neon-cyan">{formatCurrency(totalPending)}</span> |
              Ausgezahlt:{" "}
              <span className="text-neon-purple">{formatCurrency(totalPaid)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NeonButton
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className={cn(isRefreshing && "animate-pulse")}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Aktualisieren
          </NeonButton>
          <NeonButton variant="cyan" size="sm" glow>
            <Wallet className="w-4 h-4 mr-2" />
            Auszahlung anfordern
          </NeonButton>
        </div>
      </div>

      {/* Main Stats Grid */}
      <StatsGrid stats={provisionStats} columns={3} animated variant="cyan" />

      {/* Secondary Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <HoloCard variant="default" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-white/50 uppercase">
              Diesen Monat
            </span>
            <Calendar className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-mono font-bold text-neon-cyan">
            {formatCurrency(thisMonthProvision)}
          </p>
          <DataBar
            value={(thisMonthProvision / totalPending) * 100}
            max={100}
            label="vom Gesamten"
            color="cyan"
          />
        </HoloCard>

        <HoloCard variant="default" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-white/50 uppercase">
              Durchschnitt pro Deal
            </span>
            <TrendingUp className="w-4 h-4 text-neon-purple" />
          </div>
          <p className="text-2xl font-mono font-bold text-neon-purple">
            {formatCurrency(avgPerDeal)}
          </p>
          <DataBar value={avgPerDeal / 1000} max={100} label="in Tausend" color="purple" />
        </HoloCard>

        <HoloCard variant="default" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-white/50 uppercase">
              Conversion Rate
            </span>
            <Percent className="w-4 h-4 text-neon-green" />
          </div>
          <p className="text-2xl font-mono font-bold text-neon-green">
            {conversionRate}%
          </p>
          <DataBar value={conversionRate} max={100} label="Deals mit Provision" color="green" />
        </HoloCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Tables */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-4 border-b border-white/10 pb-2">
            <button
              onClick={() => setSelectedTab("pending")}
              className={cn(
                "px-4 py-2 text-sm font-mono uppercase transition-all border-b-2 -mb-[10px]",
                selectedTab === "pending"
                  ? "text-neon-green border-neon-green"
                  : "text-white/50 border-transparent hover:text-white/70"
              )}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Ausstehende Provisionen ({demoPendingPayouts.length})
            </button>
            <button
              onClick={() => setSelectedTab("history")}
              className={cn(
                "px-4 py-2 text-sm font-mono uppercase transition-all border-b-2 -mb-[10px]",
                selectedTab === "history"
                  ? "text-neon-purple border-neon-purple"
                  : "text-white/50 border-transparent hover:text-white/70"
              )}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Auszahlungshistorie ({demoPayoutHistory.length})
            </button>
          </div>

          {/* Pending Payouts Table */}
          {selectedTab === "pending" && (
            <HoloCard
              variant="default"
              className="p-0 overflow-hidden"
              title="AUSSTEHENDE PROVISIONEN"
              subtitle={`${demoPendingPayouts.length} Deals | ${formatCurrency(totalPending)} Gesamt`}
              icon="$"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-void-surface/50 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-[10px] font-mono text-white/50 uppercase">
                        Deal
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">
                        Deal-Wert
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">
                        Provision
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-mono text-white/50 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">
                        Aktion
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoPendingPayouts.map((payout) => {
                      const statusConfig = getStatusConfig(payout.status);
                      const StatusIcon = statusConfig.icon;

                      return (
                        <tr
                          key={payout.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-neon-cyan/10">
                                <Building2 className="w-4 h-4 text-neon-cyan" />
                              </div>
                              <div>
                                <div className="text-sm text-white font-medium truncate max-w-[200px]">
                                  {payout.dealName}
                                </div>
                                <div className="text-[10px] text-white/40 font-mono">
                                  {payout.customerName} | {formatRelativeDate(payout.createdAt)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-mono text-white/70">
                              {formatCurrency(payout.dealValue)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div>
                              <span className="text-sm font-mono text-neon-green font-bold">
                                {formatCurrency(payout.provisionAmount)}
                              </span>
                              <div className="text-[10px] text-white/30 font-mono">
                                {payout.provisionRate}%
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono uppercase",
                                statusConfig.bg,
                                statusConfig.border,
                                statusConfig.color,
                                "border"
                              )}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {payout.status === "ready" ? (
                              <NeonButton
                                variant="cyan"
                                size="sm"
                                onClick={() => handlePayout(payout.id)}
                              >
                                <ArrowRightCircle className="w-3 h-3 mr-1" />
                                Auszahlen
                              </NeonButton>
                            ) : (
                              <NeonButton variant="ghost" size="sm" disabled>
                                <Clock className="w-3 h-3 mr-1" />
                                Warten
                              </NeonButton>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-void-surface/30 border-t border-white/10">
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-right text-xs font-mono text-white/50 uppercase"
                      >
                        Gesamt ({demoPendingPayouts.length} Deals):
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-mono text-neon-green font-bold">
                          {formatCurrency(totalPending)}
                        </span>
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </HoloCard>
          )}

          {/* Payout History Table */}
          {selectedTab === "history" && (
            <HoloCard
              variant="default"
              className="p-0 overflow-hidden"
              title="AUSZAHLUNGSHISTORIE"
              subtitle={`${demoPayoutHistory.length} Auszahlungen | ${formatCurrency(totalPaid)} Gesamt`}
              icon="$"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-void-surface/50 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-[10px] font-mono text-white/50 uppercase">
                        Deal
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">
                        Betrag
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-mono text-white/50 uppercase">
                        Datum
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-mono text-white/50 uppercase">
                        Methode
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">
                        Referenz
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoPayoutHistory.map((history) => {
                      const methodConfig = getMethodConfig(history.method);
                      const MethodIcon = methodConfig.icon;

                      return (
                        <tr
                          key={history.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-neon-purple/10">
                                <CheckCircle className="w-4 h-4 text-neon-purple" />
                              </div>
                              <span className="text-sm text-white font-medium truncate max-w-[200px]">
                                {history.dealName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-mono text-neon-green font-bold">
                              {formatCurrency(history.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-mono text-white/70">
                              {formatDate(history.paidDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono uppercase",
                                methodConfig.bg,
                                methodConfig.border,
                                methodConfig.color,
                                "border"
                              )}
                            >
                              <MethodIcon className="w-3 h-3" />
                              {methodConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-mono text-white/50">
                              {history.reference}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-void-surface/30 border-t border-white/10">
                      <td className="px-4 py-3 text-right text-xs font-mono text-white/50 uppercase">
                        Gesamt ({demoPayoutHistory.length} Auszahlungen):
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-mono text-neon-green font-bold">
                          {formatCurrency(totalPaid)}
                        </span>
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </HoloCard>
          )}
        </div>

        {/* Right Column - Payout Methods & Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Ready for Payout Summary */}
          <HoloCard
            title="AUSZAHLUNGSBEREIT"
            subtitle="Sofort verfügbar"
            icon="$"
            variant="cyan"
            glow
          >
            <div className="text-center py-6">
              <div className="text-4xl font-mono text-neon-green font-bold">
                {formatCurrency(readyForPayout)}
              </div>
              <div className="text-xs text-white/50 font-mono mt-2">
                {demoPendingPayouts.filter((p) => p.status === "ready").length} Deals
                auszahlungsbereit
              </div>
            </div>
            <NeonButton variant="cyan" size="md" className="w-full" glow>
              <Wallet className="w-4 h-4 mr-2" />
              Jetzt auszahlen
            </NeonButton>
          </HoloCard>

          {/* Payout Methods */}
          <HoloCard
            title="AUSZAHLUNGSMETHODEN"
            subtitle="Verbundene Konten"
            icon="&"
            variant="cyan"
          >
            <div className="space-y-4">
              {demoPayoutMethods.map((method) => {
                const config = getMethodConfig(method.type);
                const MethodIcon = config.icon;
                const isConnected = method.status === "connected";

                return (
                  <div
                    key={method.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      isConnected
                        ? "bg-void-surface/30 border-white/10 hover:border-neon-cyan/30"
                        : "bg-void-surface/10 border-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", config.bg)}>
                          <MethodIcon className={cn("w-4 h-4", config.color)} />
                        </div>
                        <span className={cn("text-sm font-display font-bold", config.color)}>
                          {method.type === "stripe" ? "Stripe Connect" : "SEPA Bankverbindung"}
                        </span>
                      </div>
                      <ActivityIndicator
                        status={isConnected ? "active" : "offline"}
                        label={isConnected ? "Verbunden" : "Nicht verbunden"}
                      />
                    </div>
                    <div className="text-xs font-mono text-white/50 truncate">
                      {method.details}
                    </div>
                    {method.lastUsed && (
                      <div className="text-[10px] font-mono text-white/30 mt-2">
                        Zuletzt verwendet: {formatRelativeDate(method.lastUsed)}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <NeonButton
                        variant={method.type === "stripe" ? "purple" : "cyan"}
                        size="sm"
                        className="flex-1"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Verwalten
                      </NeonButton>
                    </div>
                  </div>
                );
              })}

              {/* Add new method */}
              <button className="w-full p-4 rounded-lg border border-dashed border-white/20 hover:border-neon-cyan/30 transition-all text-center">
                <span className="text-xs font-mono text-white/50">
                  + Neue Auszahlungsmethode hinzufügen
                </span>
              </button>
            </div>
          </HoloCard>

          {/* Commission Info */}
          <HoloCard title="PROVISIONS-INFO" subtitle="Regelwerk" icon="i">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-void-surface/30 rounded-lg">
                <span className="text-xs text-white/50 font-mono">Standard Rate</span>
                <span className="text-sm font-mono text-neon-green font-bold">
                  {COMMISSION_RATE}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-void-surface/30 rounded-lg">
                <span className="text-xs text-white/50 font-mono">Mindestbetrag</span>
                <span className="text-sm font-mono text-white">
                  {formatCurrency(100)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-void-surface/30 rounded-lg">
                <span className="text-xs text-white/50 font-mono">Auszahlung Zyklus</span>
                <span className="text-sm font-mono text-white">Monatlich</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-void-surface/30 rounded-lg">
                <span className="text-xs text-white/50 font-mono">Bearbeitungszeit</span>
                <span className="text-sm font-mono text-white">1-3 Werktage</span>
              </div>
            </div>
          </HoloCard>
        </div>
      </div>

      {/* Terminal Console */}
      <HoloCard variant="default" className="p-0">
        <Terminal
          title="PROVISION CONSOLE"
          lines={[
            {
              id: "1",
              type: "system",
              content: "Provision Control System v1.0 - Initialized",
              timestamp: new Date(),
            },
            {
              id: "2",
              type: "success",
              content: `${demoPendingPayouts.length} ausstehende Provisionen geladen | ${demoPayoutHistory.length} Auszahlungen in Historie`,
              timestamp: new Date(),
            },
            {
              id: "3",
              type: "output",
              content: `Provisionsrate: ${COMMISSION_RATE}% | Ausstehend: ${formatCurrency(totalPending)} | Ausgezahlt: ${formatCurrency(totalPaid)}`,
              timestamp: new Date(),
            },
            {
              id: "4",
              type: "output",
              content: `Stripe Connect: VERBUNDEN | SEPA: VERBUNDEN`,
              timestamp: new Date(),
            },
            {
              id: "5",
              type: "success",
              content: `${formatCurrency(readyForPayout)} auszahlungsbereit - Klicken Sie auf "Jetzt auszahlen" zum Starten`,
              timestamp: new Date(),
            },
          ]}
        />
      </HoloCard>
    </div>
  );
}
