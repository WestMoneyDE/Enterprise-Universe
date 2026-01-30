"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode } from "@/components/scifi";
import {
  HoloCard,
  NeonButton,
  StatsGrid,
  Terminal,
  MetricRing,
} from "@/components/scifi";
import { api } from "@/trpc";

// ═══════════════════════════════════════════════════════════════════════════════
// KUNDENKARTE - Customer Card Management with Real Data
// Digital customer cards with project tracking and status management
// ═══════════════════════════════════════════════════════════════════════════════

type KundenkarteStatus = "draft" | "pending_review" | "approved" | "active" | "on_hold" | "completed" | "archived";

const statusColors: Record<KundenkarteStatus, string> = {
  draft: "text-gray-400",
  pending_review: "text-yellow-500",
  approved: "text-cyan-400",
  active: "text-green-500",
  on_hold: "text-orange-500",
  completed: "text-purple-500",
  archived: "text-gray-600",
};

const statusMetricColors: Record<KundenkarteStatus, "gold" | "cyan" | "purple" | "orange" | "green" | "red"> = {
  draft: "cyan",
  pending_review: "orange",
  approved: "cyan",
  active: "green",
  on_hold: "orange",
  completed: "purple",
  archived: "cyan",
};

const statusBg: Record<KundenkarteStatus, string> = {
  draft: "bg-gray-400/20 border-gray-400/40",
  pending_review: "bg-yellow-500/20 border-yellow-500/40",
  approved: "bg-cyan-400/20 border-cyan-400/40",
  active: "bg-green-500/20 border-green-500/40",
  on_hold: "bg-orange-500/20 border-orange-500/40",
  completed: "bg-purple-500/20 border-purple-500/40",
  archived: "bg-gray-600/20 border-gray-600/40",
};

const statusLabels: Record<KundenkarteStatus, string> = {
  draft: "ENTWURF",
  pending_review: "PRÜFUNG",
  approved: "GENEHMIGT",
  active: "AKTIV",
  on_hold: "PAUSIERT",
  completed: "ABGESCHLOSSEN",
  archived: "ARCHIVIERT",
};

export default function KundenKartePage() {
  const { mode } = usePowerMode();
  const [selectedStatus, setSelectedStatus] = useState<KundenkarteStatus | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Real data from API
  const { data: cardsData, isLoading: cardsLoading, error: cardsError } = api.kundenkarte.list.useQuery({
    page: currentPage,
    limit: 20,
    status: selectedStatus ?? undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { data: stats, isLoading: statsLoading } = api.kundenkarte.getStats.useQuery();

  const cards = cardsData?.items ?? [];
  const pagination = cardsData?.pagination;

  // Calculate display stats
  const totalCards = stats?.total ?? 0;
  const totalBudget = stats?.totalBudget ?? 0;
  const activeCount = stats?.active ?? 0;
  const pendingCount = stats?.pending ?? 0;

  const formatBudget = (amount: number) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
    return `€${amount.toLocaleString("de-DE")}`;
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wider">
            KUNDENKARTE
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Customer Card Management System
          </p>
        </div>
        <NeonButton variant="cyan" size="md">
          + NEUE KARTE
        </NeonButton>
      </div>

      {/* Stats Grid - Real Data */}
      <StatsGrid
        variant="cyan"
        stats={[
          {
            id: "cards",
            label: "Aktive Karten",
            value: statsLoading ? "..." : totalCards.toString(),
            trend: "up",
            trendValue: `${activeCount} aktiv`
          },
          {
            id: "pending",
            label: "In Prüfung",
            value: statsLoading ? "..." : pendingCount.toString(),
            trend: pendingCount > 0 ? "neutral" : "up",
            trendValue: "offen"
          },
          {
            id: "budget",
            label: "Gesamtbudget",
            value: statsLoading ? "..." : formatBudget(Number(totalBudget)),
            trend: "up",
            trendValue: "Projekte"
          },
          {
            id: "active",
            label: "Aktive Projekte",
            value: statsLoading ? "..." : activeCount.toString(),
            trend: "up",
            trendValue: "laufend"
          },
        ]}
      />

      {/* Status Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-white/50">FILTER:</span>
        {(["all", "draft", "pending_review", "approved", "active", "completed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status === "all" ? null : status as KundenkarteStatus)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all",
              "border",
              (status === "all" && !selectedStatus) || selectedStatus === status
                ? "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan"
                : "bg-void-surface/50 border-white/10 text-white/50 hover:border-white/30"
            )}
          >
            {status === "all" ? "ALLE" : statusLabels[status as KundenkarteStatus] || status}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {cardsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-neon-cyan animate-pulse font-mono">Lade Kundenkarten...</div>
        </div>
      )}

      {/* Error State */}
      {cardsError && (
        <HoloCard variant="default" className="p-6">
          <div className="text-center text-neon-red">
            <p className="font-mono">Fehler beim Laden der Kundenkarten</p>
            <p className="text-sm text-white/50 mt-2">{cardsError.message}</p>
          </div>
        </HoloCard>
      )}

      {/* Empty State */}
      {!cardsLoading && !cardsError && cards.length === 0 && (
        <HoloCard variant="default" className="p-6">
          <div className="text-center text-white/50">
            <p className="font-mono">Keine Kundenkarten gefunden</p>
            <p className="text-sm mt-2">
              {selectedStatus
                ? `Keine Karten mit Status "${statusLabels[selectedStatus]}"`
                : "Erstellen Sie Ihre erste Kundenkarte"}
            </p>
          </div>
        </HoloCard>
      )}

      {/* Cards Grid - Real Data */}
      {!cardsLoading && !cardsError && cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const status = card.status as KundenkarteStatus;
            const budget = Number(card.gesamtbudget) || 0;
            const budgetProgress = budget > 0 ? Math.min(100, (budget / 500000) * 100) : 0;

            return (
              <HoloCard key={card.id} variant="default" className="p-4">
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-display font-bold text-white">
                        {card.vorname} {card.nachname}
                      </h3>
                      <p className="text-[10px] font-mono text-white/40 mt-0.5">
                        {card.kundenNummer}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-mono uppercase border",
                        statusBg[status],
                        statusColors[status]
                      )}
                    >
                      {statusLabels[status]}
                    </span>
                  </div>

                  {/* Budget Display */}
                  <div className="flex items-center justify-center py-4">
                    <MetricRing
                      value={budgetProgress}
                      size="md"
                      color={statusMetricColors[status]}
                      label={formatBudget(budget)}
                      sublabel="BUDGET"
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-void/50 rounded p-2">
                      <p className="text-[10px] font-mono text-white/40">PROJEKT</p>
                      <p className="text-sm font-mono text-neon-cyan truncate">
                        {card.bauvorhabenTyp || "Nicht definiert"}
                      </p>
                    </div>
                    <div className="bg-void/50 rounded p-2">
                      <p className="text-[10px] font-mono text-white/40">ORT</p>
                      <p className="text-sm font-mono text-white/70 truncate">
                        {card.ort || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-white/40">KONTAKT:</p>
                    <div className="flex flex-wrap gap-1">
                      {card.email && (
                        <span className="px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan text-[9px] font-mono rounded truncate max-w-full">
                          {card.email}
                        </span>
                      )}
                      {card.telefon && (
                        <span className="px-2 py-0.5 bg-neon-purple/10 text-neon-purple text-[9px] font-mono rounded">
                          {card.telefon}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="text-[9px] font-mono text-white/30 text-right">
                    Erstellt: {card.createdAt ? new Date(card.createdAt).toLocaleDateString("de-DE") : "—"}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <NeonButton variant="ghost" size="sm" className="flex-1">
                      DETAILS
                    </NeonButton>
                    <NeonButton variant="purple" size="sm" className="flex-1">
                      BEARBEITEN
                    </NeonButton>
                  </div>
                </div>
              </HoloCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <NeonButton
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← ZURÜCK
          </NeonButton>
          <span className="text-xs font-mono text-white/50">
            Seite {currentPage} von {pagination.totalPages}
          </span>
          <NeonButton
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
          >
            WEITER →
          </NeonButton>
        </div>
      )}

      {/* Terminal */}
      <HoloCard variant="default" className="p-0">
        <Terminal
          title="KUNDENKARTE CONSOLE"
          lines={[
            { id: "1", type: "system", content: "Kundenkarte System v2.0 initialized", timestamp: new Date() },
            { id: "2", type: "success", content: `${totalCards} Kundenkarten in Datenbank`, timestamp: new Date() },
            { id: "3", type: "output", content: `Gesamtbudget: ${formatBudget(Number(totalBudget))}`, timestamp: new Date() },
            { id: "4", type: statsLoading ? "warning" : "success", content: statsLoading ? "Lade Statistiken..." : `${activeCount} aktive Projekte | ${pendingCount} in Prüfung`, timestamp: new Date() },
          ]}
        />
      </HoloCard>
    </div>
  );
}
