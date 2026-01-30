"use client";

import { useState } from "react";
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

// =============================================================================
// AUTO LEAD GENERATOR - Lead Generation & Verification Dashboard
// Tracks leads from multiple sources with email verification pipeline
// =============================================================================

// Verification pipeline stages
const VERIFICATION_STAGES = [
  { id: "incoming", name: "Incoming", icon: "◎", color: "cyan" },
  { id: "pattern", name: "Pattern Check", icon: "◈", color: "cyan" },
  { id: "mx", name: "MX Check", icon: "◇", color: "purple" },
  { id: "smtp", name: "SMTP Check", icon: "◆", color: "gold" },
  { id: "verified", name: "Verified", icon: "★", color: "green" },
] as const;

type VerificationStage = typeof VERIFICATION_STAGES[number]["id"];

// Lead source types
type LeadSource = "webform" | "hubspot" | "google_places" | "manual";

interface Lead {
  id: string;
  email: string;
  name: string;
  company?: string;
  source: LeadSource;
  score: number;
  verificationStatus: VerificationStage;
  createdAt: Date;
}

// Placeholder data for demonstration
const PLACEHOLDER_LEADS: Lead[] = [
  {
    id: "lead-001",
    email: "max.mueller@techcorp.de",
    name: "Max Mueller",
    company: "TechCorp GmbH",
    source: "webform",
    score: 92,
    verificationStatus: "verified",
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: "lead-002",
    email: "anna.schmidt@bauhaus.de",
    name: "Anna Schmidt",
    company: "Bauhaus AG",
    source: "hubspot",
    score: 85,
    verificationStatus: "verified",
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: "lead-003",
    email: "thomas.weber@invalid",
    name: "Thomas Weber",
    company: "Weber Solutions",
    source: "google_places",
    score: 45,
    verificationStatus: "pattern",
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: "lead-004",
    email: "lisa.braun@startup.io",
    name: "Lisa Braun",
    company: "StartUp.io",
    source: "webform",
    score: 78,
    verificationStatus: "smtp",
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
  },
  {
    id: "lead-005",
    email: "frank.koch@enterprise.com",
    name: "Frank Koch",
    company: "Enterprise Ltd",
    source: "hubspot",
    score: 88,
    verificationStatus: "verified",
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: "lead-006",
    email: "sarah.meyer@consulting.de",
    name: "Sarah Meyer",
    company: "Meyer Consulting",
    source: "google_places",
    score: 72,
    verificationStatus: "mx",
    createdAt: new Date(Date.now() - 1000 * 60 * 180),
  },
  {
    id: "lead-007",
    email: "peter.hoffmann@industrie.de",
    name: "Peter Hoffmann",
    company: "Industrie GmbH",
    source: "manual",
    score: 65,
    verificationStatus: "incoming",
    createdAt: new Date(Date.now() - 1000 * 60 * 240),
  },
  {
    id: "lead-008",
    email: "julia.wagner@digital.com",
    name: "Julia Wagner",
    company: "Digital Solutions",
    source: "webform",
    score: 95,
    verificationStatus: "verified",
    createdAt: new Date(Date.now() - 1000 * 60 * 300),
  },
];

const PIPELINE_STATS = {
  incoming: { passed: 156, failed: 0 },
  pattern: { passed: 142, failed: 14 },
  mx: { passed: 128, failed: 14 },
  smtp: { passed: 118, failed: 10 },
  verified: { passed: 118, failed: 0 },
};

const SOURCE_STATS = {
  webform: { today: 23, week: 156, month: 487 },
  hubspot: { imported: 1247, lastSync: new Date(Date.now() - 1000 * 60 * 30) },
  google_places: { searches: 89, found: 342 },
};

export default function LeadGeneratorPage() {
  const [selectedSource, setSelectedSource] = useState<LeadSource | "all">("all");
  const [showGooglePlacesModal, setShowGooglePlacesModal] = useState(false);
  const [isHubSpotSyncing, setIsHubSpotSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter leads based on selected source
  const filteredLeads = PLACEHOLDER_LEADS.filter((lead) => {
    const matchesSource = selectedSource === "all" || lead.source === selectedSource;
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

  // Calculate stats
  const totalLeads = PLACEHOLDER_LEADS.length;
  const verifiedLeads = PLACEHOLDER_LEADS.filter((l) => l.verificationStatus === "verified").length;
  const avgScore = Math.round(
    PLACEHOLDER_LEADS.reduce((sum, l) => sum + l.score, 0) / totalLeads
  );

  const stats: StatItem[] = [
    {
      id: "total",
      label: "Total Leads",
      value: totalLeads.toString(),
      trend: "up",
      trendValue: "+12 today",
      status: "online",
    },
    {
      id: "verified",
      label: "Verified",
      value: verifiedLeads.toString(),
      trend: "up",
      trendValue: `${Math.round((verifiedLeads / totalLeads) * 100)}%`,
      status: "online",
    },
    {
      id: "score",
      label: "Avg Score",
      value: avgScore.toString(),
      trend: avgScore > 70 ? "up" : "neutral",
      trendValue: avgScore > 70 ? "Good" : "Fair",
      status: avgScore > 70 ? "online" : "warning",
    },
    {
      id: "pipeline",
      label: "In Pipeline",
      value: (totalLeads - verifiedLeads).toString(),
      trend: "neutral",
      trendValue: "Processing",
      status: "warning",
    },
  ];

  const handleHubSpotSync = () => {
    setIsHubSpotSyncing(true);
    // Simulate sync
    setTimeout(() => setIsHubSpotSyncing(false), 3000);
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getSourceIcon = (source: LeadSource): string => {
    const icons: Record<LeadSource, string> = {
      webform: "◉",
      hubspot: "⬡",
      google_places: "◎",
      manual: "◇",
    };
    return icons[source];
  };

  const getSourceLabel = (source: LeadSource): string => {
    const labels: Record<LeadSource, string> = {
      webform: "Web Form",
      hubspot: "HubSpot",
      google_places: "Google Places",
      manual: "Manual",
    };
    return labels[source];
  };

  const getVerificationColor = (status: VerificationStage): string => {
    const colors: Record<VerificationStage, string> = {
      incoming: "text-neon-cyan",
      pattern: "text-neon-cyan",
      mx: "text-neon-purple",
      smtp: "text-neon-gold",
      verified: "text-neon-green",
    };
    return colors[status];
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-neon-green";
    if (score >= 60) return "text-neon-cyan";
    if (score >= 40) return "text-neon-gold";
    return "text-neon-red";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            AUTO LEAD GENERATOR
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-white/50 font-mono">
              Status: <span className="text-neon-green">ACTIVE</span>
            </p>
            <ActivityIndicator status="active" label="Pipeline Running" pulse size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NeonButton
            variant="cyan"
            size="sm"
            onClick={handleHubSpotSync}
            loading={isHubSpotSyncing}
          >
            {isHubSpotSyncing ? "Syncing..." : "Run HubSpot Sync"}
          </NeonButton>
          <NeonButton
            variant="purple"
            size="sm"
            glow
            onClick={() => setShowGooglePlacesModal(true)}
          >
            Search Google Places
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} columns={4} animated variant="cyan" />

      {/* Sources Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Web Forms Card */}
        <HoloCard
          title="WEB FORMS"
          subtitle="Form submissions"
          icon="◉"
          variant="cyan"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-void/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono text-neon-cyan font-bold">
                  {SOURCE_STATS.webform.today}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase">Today</div>
              </div>
              <div className="bg-void/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono text-neon-cyan font-bold">
                  {SOURCE_STATS.webform.week}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase">Week</div>
              </div>
              <div className="bg-void/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono text-neon-cyan font-bold">
                  {SOURCE_STATS.webform.month}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase">Month</div>
              </div>
            </div>
            <DataBar
              label="Conversion Rate"
              value={73}
              max={100}
              color="cyan"
              showValue
            />
          </div>
        </HoloCard>

        {/* HubSpot Sync Card */}
        <HoloCard
          title="HUBSPOT SYNC"
          subtitle="Imported contacts"
          icon="⬡"
          variant="purple"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-mono text-neon-purple font-bold">
                  {SOURCE_STATS.hubspot.imported.toLocaleString()}
                </div>
                <div className="text-xs font-mono text-white/40">Total Imported</div>
              </div>
              <MetricRing value={87} label="Sync Rate" color="purple" size="sm" />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/50">Last Sync</span>
              <span className={cn(
                isHubSpotSyncing ? "text-neon-orange animate-pulse" : "text-neon-green"
              )}>
                {isHubSpotSyncing ? "Syncing..." : formatTimeAgo(SOURCE_STATS.hubspot.lastSync)}
              </span>
            </div>
          </div>
        </HoloCard>

        {/* Google Places Card */}
        <HoloCard
          title="GOOGLE PLACES"
          subtitle="Business searches"
          icon="◎"
          variant="gold"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-void/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono text-neon-gold font-bold">
                  {SOURCE_STATS.google_places.searches}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase">Searches</div>
              </div>
              <div className="bg-void/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono text-neon-gold font-bold">
                  {SOURCE_STATS.google_places.found}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase">Found</div>
              </div>
            </div>
            <DataBar
              label="Match Quality"
              value={68}
              max={100}
              color="gold"
              showValue
            />
          </div>
        </HoloCard>
      </div>

      {/* Verification Pipeline */}
      <HoloCard
        title="VERIFICATION PIPELINE"
        subtitle="Email validation stages"
        icon="◈"
        variant="cyan"
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex items-center gap-2 min-w-max">
            {VERIFICATION_STAGES.map((stage, index) => {
              const stageStats = PIPELINE_STATS[stage.id];
              const passRate = stageStats.passed / (stageStats.passed + stageStats.failed) * 100;

              return (
                <div key={stage.id} className="flex items-center">
                  <div
                    className={cn(
                      "relative flex flex-col items-center p-4 rounded-lg border transition-all min-w-[140px]",
                      "bg-void-surface/30 border-white/10 hover:border-white/30"
                    )}
                  >
                    {/* Stage Number */}
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-void-dark border border-white/20 flex items-center justify-center">
                      <span className="text-[10px] font-mono text-white/50">{index + 1}</span>
                    </div>

                    {/* Icon */}
                    <span className={cn(
                      "text-2xl mb-2",
                      stage.color === "cyan" && "text-neon-cyan",
                      stage.color === "purple" && "text-neon-purple",
                      stage.color === "gold" && "text-neon-gold",
                      stage.color === "green" && "text-neon-green"
                    )}>
                      {stage.icon}
                    </span>

                    {/* Name */}
                    <span className="text-xs font-display text-white/80 uppercase whitespace-nowrap mb-2">
                      {stage.name}
                    </span>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="text-neon-green">{stageStats.passed} passed</span>
                      {stageStats.failed > 0 && (
                        <span className="text-neon-red">{stageStats.failed} failed</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1 bg-void/50 rounded-full mt-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          passRate >= 90 ? "bg-neon-green" :
                          passRate >= 70 ? "bg-neon-cyan" : "bg-neon-orange"
                        )}
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Arrow connector */}
                  {index < VERIFICATION_STAGES.length - 1 && (
                    <div className="flex items-center px-2">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-neon-cyan/50 to-neon-cyan/20" />
                      <div className="text-neon-cyan/50 text-sm">{">"}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </HoloCard>

      {/* Recent Leads Table */}
      <HoloCard
        title="RECENT LEADS"
        subtitle={`${filteredLeads.length} leads`}
        icon="◆"
        header={
          <div className="flex items-center gap-2">
            {/* Source Filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-void-surface/50 border border-white/10">
              <button
                onClick={() => setSelectedSource("all")}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-mono uppercase transition-all",
                  selectedSource === "all"
                    ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                    : "text-white/50 hover:text-white"
                )}
              >
                All
              </button>
              {(["webform", "hubspot", "google_places"] as LeadSource[]).map((source) => (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono uppercase transition-all flex items-center gap-1",
                    selectedSource === source
                      ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  <span>{getSourceIcon(source)}</span>
                  {source === "google_places" ? "Places" : getSourceLabel(source)}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search leads by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-[10px] font-mono text-white/50 uppercase p-3">Email</th>
                <th className="text-left text-[10px] font-mono text-white/50 uppercase p-3">Name</th>
                <th className="text-left text-[10px] font-mono text-white/50 uppercase p-3">Source</th>
                <th className="text-center text-[10px] font-mono text-white/50 uppercase p-3">Score</th>
                <th className="text-left text-[10px] font-mono text-white/50 uppercase p-3">Status</th>
                <th className="text-right text-[10px] font-mono text-white/50 uppercase p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-white/30 text-sm font-mono">
                    No leads found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const stageInfo = VERIFICATION_STAGES.find((s) => s.id === lead.verificationStatus);
                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-3">
                        <div className="text-sm font-mono text-white">{lead.email}</div>
                        {lead.company && (
                          <div className="text-[10px] font-mono text-white/40">{lead.company}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-display text-white/80">{lead.name}</span>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase",
                          lead.source === "webform" && "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30",
                          lead.source === "hubspot" && "bg-neon-purple/10 text-neon-purple border border-neon-purple/30",
                          lead.source === "google_places" && "bg-neon-gold/10 text-neon-gold border border-neon-gold/30",
                          lead.source === "manual" && "bg-white/10 text-white/50 border border-white/20"
                        )}>
                          {getSourceIcon(lead.source)} {getSourceLabel(lead.source)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "text-lg font-mono font-bold",
                          getScoreColor(lead.score)
                        )}>
                          {lead.score}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase",
                          lead.verificationStatus === "verified"
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/30"
                            : "bg-void/50 border border-white/10",
                          getVerificationColor(lead.verificationStatus)
                        )}>
                          {stageInfo?.icon} {stageInfo?.name}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-xs font-mono text-white/40">
                          {formatTimeAgo(lead.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </HoloCard>

      {/* Google Places Search Modal */}
      {showGooglePlacesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={() => setShowGooglePlacesModal(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg">
            <HoloCard
              title="GOOGLE PLACES SEARCH"
              subtitle="Find business leads"
              icon="◎"
              variant="gold"
              glow
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase mb-2">
                    Business Type / Keyword
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Restaurant, Dentist, Plumber..."
                    className="w-full px-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase mb-2">
                    Location / City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Munich, Berlin, Hamburg..."
                    className="w-full px-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase mb-2">
                    Radius (km)
                  </label>
                  <input
                    type="number"
                    defaultValue={25}
                    className="w-full px-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-gold/50"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <NeonButton
                    variant="gold"
                    className="flex-1"
                    glow
                    onClick={() => setShowGooglePlacesModal(false)}
                  >
                    Start Search
                  </NeonButton>
                  <NeonButton
                    variant="ghost"
                    onClick={() => setShowGooglePlacesModal(false)}
                  >
                    Cancel
                  </NeonButton>
                </div>
              </div>
            </HoloCard>
          </div>
        </div>
      )}
    </div>
  );
}
