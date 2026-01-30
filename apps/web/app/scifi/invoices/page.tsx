"use client";

import { useState } from "react";
import {
  FileText,
  Euro,
  Download,
  Send,
  Check,
  Clock,
  AlertCircle,
  User,
  Building2,
  Percent,
  Calendar,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  HoloCard,
  StatsGrid,
  DataBar,
  NeonButton,
  Terminal,
  usePowerMode,
} from "@/components/scifi";
import { cn } from "@/lib/utils";
import { api } from "@/trpc";

// =============================================================================
// INVOICES PAGE - Connected to HubSpot Deals & Commissions
// =============================================================================

const statusConfig = {
  paid: { color: "text-neon-green", bg: "bg-neon-green/20", icon: Check, label: "Bezahlt" },
  pending: { color: "text-neon-orange", bg: "bg-neon-orange/20", icon: Clock, label: "Ausstehend" },
  overdue: { color: "text-neon-red", bg: "bg-neon-red/20", icon: AlertCircle, label: "Überfällig" },
  draft: { color: "text-white/50", bg: "bg-white/10", icon: FileText, label: "Entwurf" },
  scheduled: { color: "text-neon-cyan", bg: "bg-neon-cyan/20", icon: Calendar, label: "Geplant" },
};

// Map deal stages to invoice status
const mapDealStageToInvoiceStatus = (stage: string | null | undefined): "paid" | "pending" | "overdue" | "draft" => {
  if (!stage) return "draft";
  const stageId = stage.toLowerCase();
  if (stageId.includes("closedwon") || stageId === "closedwon") return "paid";
  if (stageId.includes("closedlost")) return "draft"; // Treat lost deals as draft/cancelled
  return "pending";
};

export default function InvoicesPage() {
  const { mode } = usePowerMode();
  const [activeTab, setActiveTab] = useState<"invoices" | "commissions">("invoices");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Real data from HubSpot API
  const { data: recentDealsResult, isLoading: dealsLoading, error: dealsError } =
    api.hubspotStats.getRecentDeals.useQuery({ limit: 50 });

  const { data: wonDealsResult, isLoading: commissionsLoading, error: commissionsError } =
    api.hubspotStats.getWonDeals.useQuery({ limit: 50 });

  const { data: dashboardStats, isLoading: statsLoading } =
    api.hubspotStats.getDashboardStats.useQuery();

  // Transform deals to invoice format
  const invoices = (recentDealsResult?.data ?? []).map((deal, index) => {
    const status = mapDealStageToInvoiceStatus(deal.stage);
    const createdDate = deal.createdAt ? new Date(deal.createdAt) : new Date();
    const dueDate = deal.closeDate ? new Date(deal.closeDate) : new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Check if overdue (past due date and not paid)
    const isOverdue = status === "pending" && dueDate < new Date();

    return {
      id: deal.id,
      number: `INV-${createdDate.getFullYear()}-${String(index + 1).padStart(4, "0")}`,
      customer: deal.name,
      project: deal.name,
      amount: deal.amount,
      status: isOverdue ? "overdue" as const : status,
      dueDate,
      createdAt: createdDate,
    };
  });

  // Transform won deals to commission format
  const commissions = (wonDealsResult?.data?.deals ?? []).map((deal) => ({
    id: deal.id,
    dealName: deal.name,
    dealValue: deal.value,
    commissionRate: wonDealsResult?.data?.commissionRate ?? 3.5,
    commissionAmount: deal.commission,
    status: "paid" as const, // Won deals are completed
    closeDate: deal.closeDate ? new Date(deal.closeDate) : null,
  }));

  // Invoice stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter((i) => i.status === "pending").reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = invoices.filter((i) => i.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0);

  // Commission stats from API
  const totalCommissions = wonDealsResult?.data?.totalCommission ?? 0;
  const paidCommissions = totalCommissions; // All won deals are paid
  const pendingCommissions = 0;

  const filteredInvoices = statusFilter
    ? invoices.filter((i) => i.status === statusFilter)
    : invoices;

  const filteredCommissions = statusFilter && statusFilter !== "paid"
    ? []
    : commissions;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const isLoading = dealsLoading || commissionsLoading || statsLoading;
  const hasError = dealsError || commissionsError;

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wider flex items-center gap-3">
            <FileText className="w-6 h-6 text-neon-cyan" />
            INVOICES & COMMISSIONS
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Rechnungsverwaltung & Provisionsabrechnung • HubSpot Live Data
          </p>
        </div>
        <div className="flex gap-2">
          <NeonButton variant="ghost" size="md">
            <Download className="w-4 h-4 mr-2" />
            EXPORT
          </NeonButton>
          <NeonButton variant="cyan" size="md">
            + NEUE RECHNUNG
          </NeonButton>
        </div>
      </div>

      {/* Error State */}
      {hasError && (
        <HoloCard variant="default" className="p-4 border-neon-red/50">
          <div className="flex items-center gap-3 text-neon-red">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-mono text-sm">Fehler beim Laden der HubSpot-Daten</p>
              <p className="text-xs text-white/50 mt-1">{dealsError?.message || commissionsError?.message}</p>
            </div>
          </div>
        </HoloCard>
      )}

      {/* Stats Grid */}
      <StatsGrid
        variant="cyan"
        stats={[
          { id: "total", label: "Gesamtumsatz", value: isLoading ? "..." : formatCurrency(totalInvoiced), trend: "up", trendValue: `${invoices.length} Deals` },
          { id: "paid", label: "Bezahlt", value: isLoading ? "..." : formatCurrency(paidAmount), trend: "up", trendValue: "closedwon" },
          { id: "pending", label: "Ausstehend", value: isLoading ? "..." : formatCurrency(pendingAmount), trend: "neutral", trendValue: `${invoices.filter((i) => i.status === "pending").length} Rg.` },
          { id: "overdue", label: "Überfällig", value: isLoading ? "..." : formatCurrency(overdueAmount), trend: overdueAmount > 0 ? "down" : "neutral", trendValue: overdueAmount > 0 ? "!" : "OK" },
        ]}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-2">
        <button
          onClick={() => { setActiveTab("invoices"); setStatusFilter(null); }}
          className={cn(
            "px-4 py-2 text-sm font-mono uppercase transition-all border-b-2 -mb-[10px]",
            activeTab === "invoices"
              ? "text-neon-cyan border-neon-cyan"
              : "text-white/50 border-transparent hover:text-white/70"
          )}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Rechnungen ({invoices.length})
        </button>
        <button
          onClick={() => { setActiveTab("commissions"); setStatusFilter(null); }}
          className={cn(
            "px-4 py-2 text-sm font-mono uppercase transition-all border-b-2 -mb-[10px]",
            activeTab === "commissions"
              ? "text-neon-purple border-neon-purple"
              : "text-white/50 border-transparent hover:text-white/70"
          )}
        >
          <Percent className="w-4 h-4 inline mr-2" />
          Provisionen ({commissions.length})
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-white/50">STATUS:</span>
        {activeTab === "invoices" ? (
          <>
            {["all", "paid", "pending", "overdue", "draft"].map((status) => {
              const config = status !== "all" ? statusConfig[status as keyof typeof statusConfig] : null;
              const StatusIcon = config?.icon;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status === "all" ? null : status)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all",
                    "border flex items-center gap-2",
                    (status === "all" && !statusFilter) || statusFilter === status
                      ? "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan"
                      : "bg-void-surface/50 border-white/10 text-white/50 hover:border-white/30"
                  )}
                >
                  {StatusIcon && <StatusIcon className="w-3 h-3" />}
                  {status === "all" ? "ALLE" : config?.label}
                </button>
              );
            })}
          </>
        ) : (
          <>
            {["all", "paid", "pending", "scheduled"].map((status) => {
              const config = status !== "all" ? statusConfig[status as keyof typeof statusConfig] : null;
              const StatusIcon = config?.icon;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status === "all" ? null : status)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all",
                    "border flex items-center gap-2",
                    (status === "all" && !statusFilter) || statusFilter === status
                      ? "bg-neon-purple/20 border-neon-purple/50 text-neon-purple"
                      : "bg-void-surface/50 border-white/10 text-white/50 hover:border-white/30"
                  )}
                >
                  {StatusIcon && <StatusIcon className="w-3 h-3" />}
                  {status === "all" ? "ALLE" : config?.label}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Content */}
      {activeTab === "invoices" ? (
        <>
          {/* Loading State */}
          {dealsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
              <span className="ml-3 font-mono text-white/50">Lade Deals aus HubSpot...</span>
            </div>
          )}

          {/* Empty State */}
          {!dealsLoading && filteredInvoices.length === 0 && (
            <HoloCard variant="default" className="p-6">
              <div className="text-center text-white/50">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-mono">Keine Deals gefunden</p>
                <p className="text-sm mt-2">
                  {statusFilter ? `Keine Deals mit Status "${statusConfig[statusFilter as keyof typeof statusConfig]?.label}"` : "Keine Deals in HubSpot"}
                </p>
              </div>
            </HoloCard>
          )}

          {/* Invoice Table */}
          {!dealsLoading && filteredInvoices.length > 0 && (
            <HoloCard variant="default" className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-void-surface/50 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-[10px] font-mono text-white/50 uppercase">Rechnung</th>
                      <th className="px-4 py-3 text-left text-[10px] font-mono text-white/50 uppercase">Deal</th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">Betrag</th>
                      <th className="px-4 py-3 text-center text-[10px] font-mono text-white/50 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-mono text-white/50 uppercase">Fällig</th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => {
                      const status = statusConfig[invoice.status];
                      const StatusIcon = status.icon;
                      return (
                        <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono text-neon-cyan">{invoice.number}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-white/30" />
                              <span className="text-sm text-white truncate max-w-[200px]">{invoice.customer}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-mono text-neon-green font-bold">
                              {formatCurrency(invoice.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono uppercase", status.bg, status.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-mono", invoice.status === "overdue" ? "text-neon-red" : "text-white/50")}>
                              {formatDate(invoice.dueDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <NeonButton variant="ghost" size="sm">
                                <Download className="w-3 h-3" />
                              </NeonButton>
                              <NeonButton variant="ghost" size="sm">
                                <Send className="w-3 h-3" />
                              </NeonButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </HoloCard>
          )}
        </>
      ) : (
        <>
          {/* Commission Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <HoloCard variant="default" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-white/50">TOTAL PROVISIONEN</span>
                <Euro className="w-4 h-4 text-neon-green" />
              </div>
              <p className="text-2xl font-mono font-bold text-neon-green">{formatCurrency(totalCommissions)}</p>
              <DataBar value={100} max={100} label="Gesamt" color="green" />
            </HoloCard>
            <HoloCard variant="default" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-white/50">AUSGEZAHLT</span>
                <Check className="w-4 h-4 text-neon-cyan" />
              </div>
              <p className="text-2xl font-mono font-bold text-neon-cyan">{formatCurrency(paidCommissions)}</p>
              <DataBar value={(paidCommissions / totalCommissions) * 100} max={100} label="Ausgezahlt" color="cyan" />
            </HoloCard>
            <HoloCard variant="default" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-white/50">AUSSTEHEND</span>
                <Clock className="w-4 h-4 text-neon-orange" />
              </div>
              <p className="text-2xl font-mono font-bold text-neon-orange">{formatCurrency(pendingCommissions)}</p>
              <DataBar value={(pendingCommissions / totalCommissions) * 100} max={100} label="Ausstehend" color="orange" />
            </HoloCard>
          </div>

          {/* Loading State */}
          {commissionsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
              <span className="ml-3 font-mono text-white/50">Lade Provisionen aus HubSpot...</span>
            </div>
          )}

          {/* Empty State */}
          {!commissionsLoading && filteredCommissions.length === 0 && (
            <HoloCard variant="default" className="p-6">
              <div className="text-center text-white/50">
                <Percent className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-mono">Keine Provisionen gefunden</p>
                <p className="text-sm mt-2">Keine abgeschlossenen Deals mit Provisionen</p>
              </div>
            </HoloCard>
          )}

          {/* Commission Table */}
          {!commissionsLoading && filteredCommissions.length > 0 && (
            <HoloCard variant="default" className="p-0 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider">
                  Provisionstabelle • HubSpot Won Deals ({wonDealsResult?.data?.commissionRate ?? 3.5}% Rate)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-void-surface/50 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-[10px] font-mono text-white/50 uppercase">Deal</th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">Deal-Wert</th>
                      <th className="px-4 py-3 text-center text-[10px] font-mono text-white/50 uppercase">Rate</th>
                      <th className="px-4 py-3 text-right text-[10px] font-mono text-white/50 uppercase">Provision</th>
                      <th className="px-4 py-3 text-center text-[10px] font-mono text-white/50 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-mono text-white/50 uppercase">Abschluss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommissions.map((commission) => (
                      <tr key={commission.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center">
                              <Euro className="w-4 h-4 text-neon-purple" />
                            </div>
                            <span className="text-sm text-white font-medium truncate max-w-[200px]">{commission.dealName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-mono text-white/70">
                            {formatCurrency(commission.dealValue)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neon-purple/20 text-neon-purple text-xs font-mono">
                            {commission.commissionRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-mono text-neon-green font-bold">
                            {formatCurrency(commission.commissionAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono uppercase", statusConfig.paid.bg, statusConfig.paid.color)}>
                            <Check className="w-3 h-3" />
                            Bezahlt
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-white/50">
                            {commission.closeDate ? formatDate(commission.closeDate) : "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-void-surface/30 border-t border-white/10">
                      <td colSpan={3} className="px-4 py-3 text-right text-xs font-mono text-white/50 uppercase">
                        Gesamt ({filteredCommissions.length} Deals):
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-mono text-neon-green font-bold">
                          {formatCurrency(filteredCommissions.reduce((sum, c) => sum + c.commissionAmount, 0))}
                        </span>
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </HoloCard>
          )}
        </>
      )}

      {/* Terminal */}
      <HoloCard variant="default" className="p-0">
        <Terminal
          title="INVOICES CONSOLE • HUBSPOT LIVE"
          lines={[
            { id: "1", type: "system", content: "Invoices & Commissions System v2.0 - HubSpot Connected", timestamp: new Date() },
            { id: "2", type: isLoading ? "warning" : "success", content: isLoading ? "Lade Daten aus HubSpot..." : `${invoices.length} Deals geladen | ${commissions.length} Won Deals`, timestamp: new Date() },
            { id: "3", type: "output", content: `Pipeline-Wert: ${formatCurrency(totalInvoiced)} | Provisionen: ${formatCurrency(totalCommissions)}`, timestamp: new Date() },
            { id: "4", type: "output", content: `Provisionsrate: ${wonDealsResult?.data?.commissionRate ?? 3.5}% (Bauherren-Pass Gold)`, timestamp: new Date() },
            ...(overdueAmount > 0 ? [{ id: "5", type: "warning" as const, content: `⚠ ${formatCurrency(overdueAmount)} überfällig - Mahnung empfohlen`, timestamp: new Date() }] : []),
          ]}
        />
      </HoloCard>
    </div>
  );
}
