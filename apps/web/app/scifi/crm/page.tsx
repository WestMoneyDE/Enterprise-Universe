"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  HoloCard,
  NeonButton,
  StatsGrid,
  MetricRing,
  DataBar,
  ActivityIndicator,
  StatItem,
} from "@/components/scifi";
import { api } from "@/trpc/client";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM NEXUS - Advanced Deal Pipeline with Live HubSpot Integration
// Real-time data from HubSpot CRM (3.4M+ deals)
// ═══════════════════════════════════════════════════════════════════════════════

// HubSpot pipeline stages mapping
const HUBSPOT_STAGES = [
  { id: "appointmentscheduled", name: "Termin vereinbart", icon: "◉", color: "cyan" },
  { id: "qualifiedtobuy", name: "Für Kauf qualifiziert", icon: "◈", color: "cyan" },
  { id: "presentationscheduled", name: "Präsentation vereinbart", icon: "◇", color: "purple" },
  { id: "decisionmakerboughtin", name: "Entscheidungsträger zugestimmt", icon: "◆", color: "purple" },
  { id: "contractsent", name: "Vertrag gesendet", icon: "⬡", color: "gold" },
  { id: "stage_0", name: "Kunde", icon: "★", color: "green" },
  { id: "closedwon", name: "Gewonnen", icon: "◎", color: "god" },
  { id: "closedlost", name: "Verloren", icon: "◐", color: "red" },
] as const;

type HubSpotStageId = typeof HUBSPOT_STAGES[number]["id"];

interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: string | null;
  pipeline: string | null;
  closeDate: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
}

export default function CRMNexusPage() {
  const [selectedStage, setSelectedStage] = useState<HubSpotStageId | "all">("all");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [viewMode, setViewMode] = useState<"pipeline" | "list" | "kanban">("pipeline");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state for loading all deals
  const [allStageDeals, setAllStageDeals] = useState<Deal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [loadedAllDeals, setLoadedAllDeals] = useState(false);

  // Fetch real HubSpot data
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } =
    api.hubspotStats.getDashboardStats.useQuery(undefined, {
      refetchInterval: 30000, // Refresh every 30s
    });

  // Use searchDeals when a stage is selected for server-side filtering
  // Use getRecentDeals only when viewing "all" stages
  const { data: recentDealsData, isLoading: recentDealsLoading, refetch: refetchRecentDeals } =
    api.hubspotStats.getRecentDeals.useQuery(
      { limit: 50 },
      {
        enabled: selectedStage === "all",
        refetchInterval: 30000,
      }
    );

  const { data: stageDealsData, isLoading: stageDealsLoading, refetch: refetchStageDeals } =
    api.hubspotStats.searchDeals.useQuery(
      { stage: selectedStage as string, limit: 100 },
      {
        enabled: selectedStage !== "all",
        refetchInterval: loadedAllDeals ? false : 30000, // Stop auto-refresh if we loaded all
      }
    );

  const { data: connectionStatus } = api.hubspotStats.getConnectionStatus.useQuery();

  // tRPC utils for manual fetching
  const utils = api.useUtils();

  // Reset pagination state when stage changes
  useEffect(() => {
    setAllStageDeals([]);
    setNextCursor(null);
    setLoadedAllDeals(false);
  }, [selectedStage]);

  // Initialize pagination state when first page loads
  useEffect(() => {
    if (stageDealsData && selectedStage !== "all" && !loadedAllDeals) {
      setAllStageDeals(stageDealsData.data || []);
      setNextCursor(stageDealsData.nextCursor || null);
    }
  }, [stageDealsData, selectedStage, loadedAllDeals]);

  // Load more deals (one page)
  const loadMoreDeals = useCallback(async () => {
    if (!nextCursor || isLoadingMore || selectedStage === "all") return;

    setIsLoadingMore(true);
    try {
      const result = await utils.hubspotStats.searchDeals.fetch({
        stage: selectedStage,
        limit: 100,
        after: nextCursor,
      });

      if (result.success && result.data) {
        setAllStageDeals(prev => [...prev, ...result.data]);
        setNextCursor(result.nextCursor || null);
      }
    } catch (error) {
      console.error("Failed to load more deals:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, selectedStage, utils]);

  // Load ALL deals (fetch all pages)
  const loadAllDeals = useCallback(async () => {
    if (selectedStage === "all" || isLoadingAll) return;

    setIsLoadingAll(true);
    try {
      let cursor = nextCursor;
      let allDeals = [...allStageDeals];
      let pageCount = 0;
      const maxPages = 50; // Safety limit (5000 deals max)

      while (cursor && pageCount < maxPages) {
        const result = await utils.hubspotStats.searchDeals.fetch({
          stage: selectedStage,
          limit: 100,
          after: cursor,
        });

        if (result.success && result.data) {
          allDeals = [...allDeals, ...result.data];
          cursor = result.nextCursor || null;
          setAllStageDeals(allDeals);
          setNextCursor(cursor);
          pageCount++;
        } else {
          break;
        }
      }

      setLoadedAllDeals(true);
    } catch (error) {
      console.error("Failed to load all deals:", error);
    } finally {
      setIsLoadingAll(false);
    }
  }, [selectedStage, isLoadingAll, nextCursor, allStageDeals, utils]);

  const dealsLoading = selectedStage === "all" ? recentDealsLoading : stageDealsLoading;
  const hubspotSync = statsLoading || dealsLoading ? "syncing" :
    (statsData?.success ? "synced" : "error");

  // Get deals from the appropriate API based on selected stage
  // Use accumulated deals for stage view, or recent deals for "all"
  const deals: Deal[] = selectedStage === "all"
    ? (recentDealsData?.data || [])
    : allStageDeals.length > 0 ? allStageDeals : (stageDealsData?.data || []);

  // Total count for the selected stage (from searchDeals response)
  const stageDealsTotal = selectedStage !== "all" ? (stageDealsData?.total || 0) : deals.length;

  // Check if there are more deals to load
  const hasMoreDeals = selectedStage !== "all" && nextCursor !== null;

  // Filter deals only by search query (stage filtering is now server-side)
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const refetchDeals = () => {
    if (selectedStage === "all") {
      refetchRecentDeals();
    } else {
      // Reset pagination state when refreshing
      setAllStageDeals([]);
      setNextCursor(null);
      setLoadedAllDeals(false);
      refetchStageDeals();
    }
  };

  // Calculate pipeline stats from HubSpot data
  const pipelineStats = HUBSPOT_STAGES.map((stage) => {
    const stageData = statsData?.data?.dealsByStage?.[stage.id];
    return {
      ...stage,
      count: stageData?.count || 0,
      value: stageData?.value || 0,
    };
  });

  // Stats from HubSpot
  const totalDeals = statsData?.data?.totalDeals || 0;
  const totalValue = statsData?.data?.totalValue || 0;
  const avgDealValue = statsData?.data?.avgDealValue || 0;
  const totalContacts = statsData?.data?.totalContacts || 0;

  // Format large numbers
  const formatValue = (value: number): string => {
    if (value >= 1_000_000_000) return `€${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
    return `€${value.toFixed(0)}`;
  };

  const formatCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  // CRM Stats
  const crmStats: StatItem[] = [
    {
      id: "deals",
      label: "Total Deals",
      value: formatCount(totalDeals),
      trend: "up",
      trendValue: "Live",
      status: statsData?.success ? "online" : "offline"
    },
    {
      id: "pipeline",
      label: "Pipeline Value",
      value: formatValue(totalValue),
      trend: "up",
      trendValue: "HubSpot",
      status: "online"
    },
    {
      id: "contacts",
      label: "Total Contacts",
      value: formatCount(totalContacts),
      trend: "up",
      trendValue: "Live",
      status: "online"
    },
    {
      id: "avg",
      label: "Avg Deal Size",
      value: formatValue(avgDealValue),
      trend: "neutral",
      trendValue: "Calculated",
      status: "warning"
    },
  ];

  const handleSyncAll = () => {
    refetchStats();
    refetchRecentDeals();
    if (selectedStage !== "all") {
      refetchStageDeals();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            CRM NEXUS
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            HubSpot Live: <span className="text-neon-green">{formatCount(totalDeals)} DEALS</span>
            {" • "}
            <span className="text-neon-cyan">{formatCount(totalContacts)} CONTACTS</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* HubSpot Sync Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono",
            hubspotSync === "synced" && "border-neon-green/30 text-neon-green bg-neon-green/10",
            hubspotSync === "syncing" && "border-neon-orange/30 text-neon-orange bg-neon-orange/10",
            hubspotSync === "error" && "border-neon-red/30 text-neon-red bg-neon-red/10"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              hubspotSync === "synced" && "bg-neon-green",
              hubspotSync === "syncing" && "bg-neon-orange animate-pulse",
              hubspotSync === "error" && "bg-neon-red"
            )} />
            HubSpot {hubspotSync === "syncing" ? "Loading..." : hubspotSync === "synced" ? "Live" : "Error"}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-void-surface/50 border border-white/10">
            {(["pipeline", "kanban", "list"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono uppercase transition-all",
                  viewMode === mode
                    ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                    : "text-white/50 hover:text-white"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <NeonButton variant="cyan" size="sm">
            + New Deal
          </NeonButton>
          <NeonButton variant="purple" size="sm" glow onClick={handleSyncAll}>
            Refresh
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={crmStats} columns={4} animated variant="cyan" />

      {/* Pipeline Visualization */}
      <HoloCard title="DEAL PIPELINE" subtitle="HubSpot Live Pipeline Stages" icon="◈" variant="cyan">
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {pipelineStats.map((stage, index) => (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(selectedStage === stage.id ? "all" : stage.id)}
                className={cn(
                  "relative flex flex-col items-center p-3 rounded-lg border transition-all min-w-[100px]",
                  selectedStage === stage.id
                    ? "bg-neon-cyan/20 border-neon-cyan/50"
                    : "bg-void-surface/30 border-white/10 hover:border-white/30"
                )}
              >
                {/* Stage Number */}
                <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-void-dark border border-white/20 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-white/50">{index + 1}</span>
                </div>

                {/* Icon */}
                <span className={cn(
                  "text-xl mb-1",
                  stage.color === "cyan" && "text-neon-cyan",
                  stage.color === "purple" && "text-neon-purple",
                  stage.color === "gold" && "text-neon-gold",
                  stage.color === "green" && "text-neon-green",
                  stage.color === "red" && "text-neon-red",
                  stage.color === "god" && "text-god-secondary"
                )}>
                  {stage.icon}
                </span>

                {/* Name */}
                <span className="text-[10px] font-display text-white/80 uppercase whitespace-nowrap max-w-[80px] truncate">
                  {stage.name}
                </span>

                {/* Count */}
                <span className="text-lg font-mono text-white font-bold mt-1">
                  {formatCount(stage.count)}
                </span>

                {/* Arrow connector */}
                {index < pipelineStats.length - 1 && (
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-white/20">→</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </HoloCard>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Deals List */}
        <div className="col-span-12 lg:col-span-8">
          <HoloCard
            title={selectedStage === "all" ? "RECENT DEALS" : loadedAllDeals ? "ALL STAGE DEALS" : "STAGE DEALS"}
            subtitle={`${selectedStage === "all" ? filteredDeals.length : loadedAllDeals ? `${filteredDeals.length} deals` : `${deals.length} of ${stageDealsTotal} loaded`} • ${selectedStage === "all" ? "All Stages" : HUBSPOT_STAGES.find(s => s.id === selectedStage)?.name || selectedStage}`}
            icon="◆"
          >
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50"
              />
            </div>

            {/* Loading State */}
            {dealsLoading && !isLoadingMore && !isLoadingAll ? (
              <div className="py-12 text-center">
                <div className="inline-block w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                <p className="text-white/50 text-sm font-mono mt-4">Loading HubSpot deals...</p>
              </div>
            ) : (
              <>
                {/* Deals Table */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {filteredDeals.length === 0 ? (
                    <div className="py-8 text-center text-white/30 text-sm font-mono">
                      No deals found
                    </div>
                  ) : (
                    filteredDeals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        isSelected={selectedDeal?.id === deal.id}
                        onClick={() => setSelectedDeal(deal)}
                      />
                    ))
                  )}
                </div>

                {/* Load More / Load All Buttons */}
                {selectedStage !== "all" && hasMoreDeals && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                    <NeonButton
                      variant="cyan"
                      size="sm"
                      onClick={loadMoreDeals}
                      disabled={isLoadingMore || isLoadingAll}
                      className="flex-1"
                    >
                      {isLoadingMore ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        `Load More (${deals.length}/${stageDealsTotal})`
                      )}
                    </NeonButton>
                    <NeonButton
                      variant="purple"
                      size="sm"
                      glow
                      onClick={loadAllDeals}
                      disabled={isLoadingMore || isLoadingAll}
                      className="flex-1"
                    >
                      {isLoadingAll ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin mr-2" />
                          Loading {deals.length}/{stageDealsTotal}...
                        </>
                      ) : (
                        `Load All ${stageDealsTotal} Deals`
                      )}
                    </NeonButton>
                  </div>
                )}

                {/* Loaded All Indicator */}
                {selectedStage !== "all" && loadedAllDeals && (
                  <div className="mt-4 pt-4 border-t border-white/10 text-center">
                    <span className="text-neon-green text-xs font-mono">
                      ✓ All {stageDealsTotal} deals loaded
                    </span>
                  </div>
                )}
              </>
            )}
          </HoloCard>
        </div>

        {/* Right Column - Deal Details & Metrics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Selected Deal Details */}
          {selectedDeal ? (
            <HoloCard
              title="DEAL DETAILS"
              subtitle={selectedDeal.name}
              icon="◎"
              variant="purple"
              glow
            >
              <div className="space-y-4">
                {/* Value Display */}
                <div className="text-center py-4">
                  <div className="text-3xl font-mono text-neon-green font-bold">
                    {formatValue(selectedDeal.amount)}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase mt-1">Deal Value</div>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <DetailRow label="Deal ID" value={selectedDeal.id} />
                  <DetailRow
                    label="Stage"
                    value={HUBSPOT_STAGES.find(s => s.id === selectedDeal.stage)?.name || selectedDeal.stage || "Unknown"}
                    highlight
                  />
                  <DetailRow label="Pipeline" value={selectedDeal.pipeline || "Default"} />
                  {selectedDeal.closeDate && (
                    <DetailRow label="Close Date" value={new Date(selectedDeal.closeDate).toLocaleDateString("de-DE")} />
                  )}
                  {selectedDeal.createdAt && (
                    <DetailRow label="Created" value={new Date(selectedDeal.createdAt).toLocaleDateString("de-DE")} />
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <NeonButton variant="cyan" size="sm" className="flex-1">
                    View in HubSpot
                  </NeonButton>
                  <NeonButton variant="purple" size="sm" className="flex-1">
                    Edit
                  </NeonButton>
                </div>
              </div>
            </HoloCard>
          ) : (
            <HoloCard title="DEAL DETAILS" icon="◎" variant="purple">
              <div className="py-8 text-center text-white/30 text-sm font-mono">
                Select a deal to view details
              </div>
            </HoloCard>
          )}

          {/* Connection Status */}
          <HoloCard title="HUBSPOT STATUS" subtitle="API Connection" icon="⬡" variant="cyan">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50 font-mono">Connection</span>
                <span className={cn(
                  "text-xs font-mono",
                  connectionStatus?.connected ? "text-neon-green" : "text-neon-red"
                )}>
                  {connectionStatus?.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {connectionStatus?.portalId && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-mono">Portal ID</span>
                  <span className="text-xs font-mono text-white">{connectionStatus.portalId}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50 font-mono">Total Deals</span>
                <span className="text-xs font-mono text-neon-cyan">{formatCount(totalDeals)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50 font-mono">Last Updated</span>
                <span className="text-xs font-mono text-white/70">
                  {statsData?.data?.lastUpdated
                    ? new Date(statsData.data.lastUpdated).toLocaleTimeString("de-DE")
                    : "—"
                  }
                </span>
              </div>
            </div>
          </HoloCard>

          {/* AI Insights */}
          <HoloCard title="AI INSIGHTS" subtitle="Automated Analysis" icon="神" variant="ultra" glow>
            <div className="space-y-3">
              <InsightItem
                icon="⚡"
                title="Massive Pipeline"
                description={`${formatCount(totalDeals)} total deals tracked`}
                priority="high"
              />
              <InsightItem
                icon="◐"
                title="Pipeline Value"
                description={`Estimated ${formatValue(totalValue)} total`}
                priority="medium"
              />
              <InsightItem
                icon="★"
                title="Avg Deal"
                description={`${formatValue(avgDealValue)} per deal`}
                priority="low"
              />
              <InsightItem
                icon="◇"
                title="Contacts"
                description={`${formatCount(totalContacts)} in database`}
                priority="low"
              />
            </div>
          </HoloCard>

          {/* Stage Distribution */}
          <HoloCard title="STAGE DISTRIBUTION" icon="◈">
            <div className="space-y-3">
              {pipelineStats.slice(0, 5).map((stage) => {
                const percentage = totalDeals > 0 ? (stage.count / totalDeals) * 100 : 0;
                return (
                  <DataBar
                    key={stage.id}
                    label={stage.name.slice(0, 15)}
                    value={Math.round(percentage)}
                    color={stage.color === "god" ? "gold" : stage.color as "cyan" | "purple" | "gold" | "green" | "red"}
                  />
                );
              })}
            </div>
          </HoloCard>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface DealCardProps {
  deal: Deal;
  isSelected: boolean;
  onClick: () => void;
}

function DealCard({ deal, isSelected, onClick }: DealCardProps) {
  const stage = HUBSPOT_STAGES.find((s) => s.id === deal.stage);

  const formatValue = (value: number): string => {
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
    return `€${value.toFixed(0)}`;
  };

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
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm text-white font-bold truncate">
              {deal.name}
            </span>
          </div>
          <div className="text-xs text-white/50 font-mono truncate">
            ID: {deal.id.slice(0, 12)}...
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-neon-green font-bold">
            {formatValue(deal.amount)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {/* Stage Badge */}
          <span className={cn(
            "px-2 py-0.5 text-[10px] font-mono rounded border",
            stage?.color === "cyan" && "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan",
            stage?.color === "purple" && "bg-neon-purple/10 border-neon-purple/30 text-neon-purple",
            stage?.color === "gold" && "bg-neon-gold/10 border-neon-gold/30 text-neon-gold",
            stage?.color === "green" && "bg-neon-green/10 border-neon-green/30 text-neon-green",
            stage?.color === "red" && "bg-neon-red/10 border-neon-red/30 text-neon-red",
            stage?.color === "god" && "bg-god-primary/10 border-god-primary/30 text-god-secondary",
            !stage && "bg-white/10 border-white/30 text-white/50"
          )}>
            {stage?.icon || "◇"} {stage?.name || deal.stage}
          </span>
        </div>

        {deal.createdAt && (
          <span className="text-[10px] text-white/30 font-mono">
            {new Date(deal.createdAt).toLocaleDateString("de-DE")}
          </span>
        )}
      </div>
    </button>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function DetailRow({ label, value, highlight }: DetailRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-white/50 font-mono uppercase">{label}</span>
      <span className={cn(
        "text-sm font-mono truncate max-w-[180px]",
        highlight ? "text-neon-cyan" : "text-white"
      )}>
        {value}
      </span>
    </div>
  );
}

interface InsightItemProps {
  icon: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

function InsightItem({ icon, title, description, priority }: InsightItemProps) {
  const priorityColors = {
    high: "text-neon-red border-neon-red/30 bg-neon-red/10",
    medium: "text-neon-orange border-neon-orange/30 bg-neon-orange/10",
    low: "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10",
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors hover:bg-white/5",
      priorityColors[priority]
    )}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-display font-bold">{title}</div>
          <div className="text-[10px] text-white/50 font-mono truncate">{description}</div>
        </div>
      </div>
    </div>
  );
}
