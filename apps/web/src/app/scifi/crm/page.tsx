"use client";

import { useState, useEffect } from "react";
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

// ═══════════════════════════════════════════════════════════════════════════════
// CRM NEXUS - Advanced Deal Pipeline & Contact Management
// 12-Stage Pipeline integrated with West Money Bau
// ═══════════════════════════════════════════════════════════════════════════════

// Pipeline stages based on West Money Bau construction/sales process
const PIPELINE_STAGES = [
  { id: "lead", name: "Lead", icon: "◉", color: "cyan" },
  { id: "qualified", name: "Qualified", icon: "◈", color: "cyan" },
  { id: "contacted", name: "Contacted", icon: "◇", color: "purple" },
  { id: "meeting", name: "Meeting", icon: "◆", color: "purple" },
  { id: "proposal", name: "Proposal", icon: "⬡", color: "gold" },
  { id: "negotiation", name: "Negotiation", icon: "⬢", color: "gold" },
  { id: "contract", name: "Contract", icon: "◎", color: "orange" },
  { id: "deposit", name: "Deposit", icon: "◐", color: "orange" },
  { id: "construction", name: "Construction", icon: "▣", color: "green" },
  { id: "inspection", name: "Inspection", icon: "◧", color: "green" },
  { id: "handover", name: "Handover", icon: "◨", color: "green" },
  { id: "closed_won", name: "Closed Won", icon: "★", color: "god" },
] as const;

type PipelineStage = typeof PIPELINE_STAGES[number]["id"];

interface Deal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: PipelineStage;
  probability: number;
  assignee: string;
  lastActivity: string;
  createdAt: Date;
  tags: string[];
  source: "whatsapp" | "website" | "referral" | "cold_call" | "hubspot";
}

// Mock deals data
const MOCK_DEALS: Deal[] = [
  {
    id: "deal-001",
    name: "Villa Projekt München",
    company: "Müller GmbH",
    value: 450000,
    stage: "construction",
    probability: 90,
    assignee: "HAIKU",
    lastActivity: "2 hours ago",
    createdAt: new Date("2024-01-15"),
    tags: ["premium", "loxone"],
    source: "referral",
  },
  {
    id: "deal-002",
    name: "Smart Home Retrofit",
    company: "Schmidt Familie",
    value: 85000,
    stage: "proposal",
    probability: 60,
    assignee: "SONNET",
    lastActivity: "1 day ago",
    createdAt: new Date("2024-02-20"),
    tags: ["smart-home", "retrofit"],
    source: "whatsapp",
  },
  {
    id: "deal-003",
    name: "Gewerbebau Komplex",
    company: "Tech Park AG",
    value: 1200000,
    stage: "negotiation",
    probability: 75,
    assignee: "OPUS",
    lastActivity: "4 hours ago",
    createdAt: new Date("2024-01-08"),
    tags: ["commercial", "large-scale"],
    source: "website",
  },
  {
    id: "deal-004",
    name: "Einfamilienhaus Augsburg",
    company: "Weber Familie",
    value: 320000,
    stage: "meeting",
    probability: 40,
    assignee: "HAIKU",
    lastActivity: "3 days ago",
    createdAt: new Date("2024-03-01"),
    tags: ["residential"],
    source: "cold_call",
  },
  {
    id: "deal-005",
    name: "Luxus Penthouse",
    company: "Investment Group",
    value: 890000,
    stage: "deposit",
    probability: 95,
    assignee: "HAIKU",
    lastActivity: "6 hours ago",
    createdAt: new Date("2023-12-10"),
    tags: ["luxury", "investment"],
    source: "hubspot",
  },
  {
    id: "deal-006",
    name: "Sanierung Altbau",
    company: "Becker Immobilien",
    value: 175000,
    stage: "qualified",
    probability: 25,
    assignee: "SONNET",
    lastActivity: "1 week ago",
    createdAt: new Date("2024-03-10"),
    tags: ["renovation"],
    source: "whatsapp",
  },
  {
    id: "deal-007",
    name: "Mehrfamilienhaus Projekt",
    company: "Bauträger Plus",
    value: 2100000,
    stage: "contract",
    probability: 85,
    assignee: "OPUS",
    lastActivity: "12 hours ago",
    createdAt: new Date("2023-11-20"),
    tags: ["multi-family", "large-scale"],
    source: "referral",
  },
  {
    id: "deal-008",
    name: "Tiny House Konzept",
    company: "Green Living",
    value: 65000,
    stage: "lead",
    probability: 15,
    assignee: "HAIKU",
    lastActivity: "2 days ago",
    createdAt: new Date("2024-03-15"),
    tags: ["eco", "tiny"],
    source: "website",
  },
  {
    id: "deal-009",
    name: "Bürogebäude Erweiterung",
    company: "Digital Solutions",
    value: 560000,
    stage: "inspection",
    probability: 98,
    assignee: "OPUS",
    lastActivity: "1 hour ago",
    createdAt: new Date("2023-09-05"),
    tags: ["commercial", "expansion"],
    source: "hubspot",
  },
  {
    id: "deal-010",
    name: "Ferienhaus Nordsee",
    company: "Küstenwohnen GmbH",
    value: 410000,
    stage: "handover",
    probability: 100,
    assignee: "SONNET",
    lastActivity: "30 min ago",
    createdAt: new Date("2023-08-15"),
    tags: ["vacation", "coastal"],
    source: "referral",
  },
];

export default function CRMNexusPage() {
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | "all">("all");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [viewMode, setViewMode] = useState<"pipeline" | "list" | "kanban">("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [hubspotSync, setHubspotSync] = useState<"synced" | "syncing" | "error">("synced");

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    const matchesStage = selectedStage === "all" || deal.stage === selectedStage;
    const matchesSearch =
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  // Calculate pipeline stats
  const pipelineStats = PIPELINE_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.id);
    return {
      ...stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + d.value, 0),
    };
  });

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = deals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
  const avgDealSize = totalValue / deals.length;

  // CRM Stats
  const crmStats: StatItem[] = [
    { id: "deals", label: "Active Deals", value: deals.length.toString(), trend: "up", trendValue: "+3", status: "online" },
    { id: "pipeline", label: "Pipeline Value", value: `€${(totalValue / 1000000).toFixed(2)}M`, trend: "up", trendValue: "+12%", status: "online" },
    { id: "weighted", label: "Weighted Value", value: `€${(weightedValue / 1000000).toFixed(2)}M`, trend: "up", trendValue: "+8%", status: "online" },
    { id: "avg", label: "Avg Deal Size", value: `€${(avgDealSize / 1000).toFixed(0)}K`, trend: "neutral", trendValue: "±0%", status: "warning" },
  ];

  // Simulate HubSpot sync
  useEffect(() => {
    const interval = setInterval(() => {
      setHubspotSync("syncing");
      setTimeout(() => setHubspotSync("synced"), 2000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            CRM NEXUS
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Pipeline Status: <span className="text-neon-green">12 STAGES ACTIVE</span>
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
            HubSpot {hubspotSync === "syncing" ? "Syncing..." : hubspotSync === "synced" ? "Synced" : "Error"}
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
          <NeonButton variant="purple" size="sm" glow>
            Sync All
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={crmStats} columns={4} animated variant="cyan" />

      {/* Pipeline Visualization */}
      <HoloCard title="DEAL PIPELINE" subtitle="12-Stage West Money Bau Process" icon="◈" variant="cyan">
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
                  stage.color === "orange" && "text-neon-orange",
                  stage.color === "green" && "text-neon-green",
                  stage.color === "god" && "text-god-secondary"
                )}>
                  {stage.icon}
                </span>

                {/* Name */}
                <span className="text-[10px] font-display text-white/80 uppercase whitespace-nowrap">
                  {stage.name}
                </span>

                {/* Count */}
                <span className="text-lg font-mono text-white font-bold mt-1">
                  {stage.count}
                </span>

                {/* Value */}
                <span className="text-[9px] font-mono text-white/40">
                  €{(stage.value / 1000).toFixed(0)}K
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
            title="ACTIVE DEALS"
            subtitle={`${filteredDeals.length} deals • ${selectedStage === "all" ? "All Stages" : PIPELINE_STAGES.find(s => s.id === selectedStage)?.name}`}
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

            {/* Deals Table */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  isSelected={selectedDeal?.id === deal.id}
                  onClick={() => setSelectedDeal(deal)}
                />
              ))}
            </div>
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
                {/* Value & Probability */}
                <div className="flex justify-around">
                  <div className="text-center">
                    <div className="text-2xl font-mono text-neon-green font-bold">
                      €{(selectedDeal.value / 1000).toFixed(0)}K
                    </div>
                    <div className="text-[10px] text-white/50 uppercase">Value</div>
                  </div>
                  <MetricRing
                    value={selectedDeal.probability}
                    label="Probability"
                    color={selectedDeal.probability >= 75 ? "green" : selectedDeal.probability >= 50 ? "gold" : "orange"}
                    size="md"
                  />
                </div>

                {/* Details */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <DetailRow label="Company" value={selectedDeal.company} />
                  <DetailRow label="Stage" value={PIPELINE_STAGES.find(s => s.id === selectedDeal.stage)?.name || ""} />
                  <DetailRow label="Assignee" value={selectedDeal.assignee} highlight />
                  <DetailRow label="Source" value={selectedDeal.source.replace("_", " ")} />
                  <DetailRow label="Last Activity" value={selectedDeal.lastActivity} />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedDeal.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[10px] font-mono bg-neon-purple/20 border border-neon-purple/30 rounded text-neon-purple"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <NeonButton variant="cyan" size="sm" className="flex-1">
                    Contact
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

          {/* AI Insights */}
          <HoloCard title="AI INSIGHTS" subtitle="HAIKU Analysis" icon="神" variant="ultra" glow>
            <div className="space-y-3">
              <InsightItem
                icon="⚡"
                title="Hot Lead Alert"
                description="3 deals ready for next stage"
                priority="high"
              />
              <InsightItem
                icon="◐"
                title="Follow-up Required"
                description="Weber Familie - 3 days inactive"
                priority="medium"
              />
              <InsightItem
                icon="★"
                title="Closing Opportunity"
                description="Ferienhaus Nordsee - Ready for handover"
                priority="high"
              />
              <InsightItem
                icon="◇"
                title="Value Optimization"
                description="Upsell potential: €45K identified"
                priority="low"
              />
            </div>
          </HoloCard>

          {/* Source Analytics */}
          <HoloCard title="LEAD SOURCES" icon="◈">
            <div className="space-y-3">
              <DataBar label="Referral" value={30} color="green" />
              <DataBar label="WhatsApp" value={25} color="cyan" />
              <DataBar label="HubSpot" value={20} color="orange" />
              <DataBar label="Website" value={15} color="purple" />
              <DataBar label="Cold Call" value={10} color="red" />
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
  const stage = PIPELINE_STAGES.find((s) => s.id === deal.stage);

  const sourceIcons: Record<Deal["source"], string> = {
    whatsapp: "◉",
    website: "◇",
    referral: "★",
    cold_call: "◈",
    hubspot: "⬡",
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
            <span className="text-white/30">{sourceIcons[deal.source]}</span>
          </div>
          <div className="text-xs text-white/50 font-mono truncate">{deal.company}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-neon-green font-bold">
            €{(deal.value / 1000).toFixed(0)}K
          </div>
          <div className="text-[10px] text-white/40 font-mono">{deal.probability}%</div>
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
            stage?.color === "orange" && "bg-neon-orange/10 border-neon-orange/30 text-neon-orange",
            stage?.color === "green" && "bg-neon-green/10 border-neon-green/30 text-neon-green",
            stage?.color === "god" && "bg-god-primary/10 border-god-primary/30 text-god-secondary"
          )}>
            {stage?.icon} {stage?.name}
          </span>

          {/* Assignee */}
          <span className="text-[10px] font-mono text-white/40">
            → {deal.assignee}
          </span>
        </div>

        <span className="text-[10px] text-white/30 font-mono">{deal.lastActivity}</span>
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
        "text-sm font-mono",
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
