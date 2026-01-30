"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc";
import {
  HoloCard,
  NeonButton,
  Terminal,
  TerminalLine,
  StatsGrid,
  MetricRing,
  DataBar,
  ActivityIndicator,
  LiveCounter,
  StatItem,
} from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND DECK - Main Dashboard Page
// Central hub for NEXUS COMMAND CENTER - Connected to Live tRPC APIs
// ═══════════════════════════════════════════════════════════════════════════════

export default function CommandDeckPage() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [currentTime, setCurrentTime] = useState("--:--:--");

  // Update current time only on client to prevent hydration mismatch
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString("de-DE"));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Stable date range for API queries
  const dateRange = useMemo(() => ({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  }), []);

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-TIME tRPC DATA QUERIES - Using HubSpot Live Data
  // ═══════════════════════════════════════════════════════════════════════════

  // HubSpot Dashboard Stats (main data source)
  const { data: hubspotStats, isLoading: hubspotLoading } = api.hubspotStats.getDashboardStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Recent deals from HubSpot
  const { data: recentDealsData, isLoading: dealsLoading } = api.hubspotStats.getRecentDeals.useQuery({ limit: 10 });

  // Won deals for revenue - calculateTotalRevenue paginates through ALL won deals
  const { data: wonDealsData, isLoading: wonDealsLoading } = api.hubspotStats.getWonDeals.useQuery({
    limit: 10,
    calculateTotalRevenue: true, // Get accurate total from all 3K+ won deals
  });

  // Extract HubSpot data
  const totalContacts = hubspotStats?.data?.totalContacts ?? 0;
  const totalDeals = hubspotStats?.data?.totalDeals ?? 0;
  const totalValue = hubspotStats?.data?.totalValue ?? 0;
  const avgDealValue = hubspotStats?.data?.avgDealValue ?? 0;
  const dealsByStage = hubspotStats?.data?.dealsByStage ?? {};

  // Calculate open deals (not won/lost)
  const openDealsCount = useMemo(() => {
    if (!dealsByStage) return 0;
    const closedWon = dealsByStage["closedwon"]?.count ?? 0;
    const closedLost = dealsByStage["closedlost"]?.count ?? 0;
    return totalDeals - closedWon - closedLost;
  }, [dealsByStage, totalDeals]);

  // Won deals revenue
  const wonRevenue = wonDealsData?.data?.totalValue ?? 0;
  const wonDealsCount = wonDealsData?.data?.count ?? 0;

  // AI Agent Stats (using stable dateRange to prevent hydration mismatch)
  const { data: aiStats, isLoading: aiLoading } = api.aiAgent.getStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Lead Scoring Distribution
  const { data: leadDistribution, isLoading: leadLoading } = api.leadScoring.getDistribution.useQuery();

  // Lead Scoring Leaderboard (top 3 for today's display)
  const { data: leadLeaderboard, isLoading: leaderboardLoading } = api.leadScoring.getLeaderboard.useQuery({
    limit: 3,
  });

  // Project Stats
  const { data: projectStats, isLoading: projectsLoading } = api.projects.stats.useQuery({});

  // Activity Feed - Use recent deals as activity
  const activityFeed = useMemo(() => {
    if (!recentDealsData?.data) return [];
    return recentDealsData.data.slice(0, 5).map((deal) => ({
      id: deal.id,
      icon: "◆",
      title: deal.name,
      description: `€${deal.amount.toLocaleString()} • ${deal.stage || "New"}`,
      timestamp: deal.createdAt || new Date().toISOString(),
      action: "create" as const,
    }));
  }, [recentDealsData]);

  // Notifications
  const { data: notificationsData } = api.notifications.unread.useQuery({ limit: 5 });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED DASHBOARD STATS - Using HubSpot Data
  // ═══════════════════════════════════════════════════════════════════════════

  const isDataLoading = hubspotLoading || dealsLoading;

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

  // Dashboard stats from HubSpot API data
  const dashboardStats: StatItem[] = useMemo(() => [
    {
      id: "contacts",
      label: "Total Contacts",
      value: totalContacts > 0 ? formatCount(totalContacts) : "—",
      trend: "up",
      trendValue: "HubSpot Live",
      status: hubspotLoading ? "warning" : totalContacts > 0 ? "online" : "warning",
    },
    {
      id: "revenue",
      label: "Revenue (Won)",
      value: wonRevenue > 0 ? formatValue(wonRevenue) : "—",
      trend: "up",
      trendValue: `${formatCount(wonDealsCount)} deals`,
      status: wonDealsLoading ? "warning" : wonRevenue > 0 ? "online" : "warning",
    },
    {
      id: "pipeline",
      label: "Pipeline Value",
      value: totalValue > 0 ? formatValue(totalValue) : "—",
      trend: "up",
      trendValue: "Estimated",
      status: hubspotLoading ? "warning" : "online",
    },
    {
      id: "deals",
      label: "Open Deals",
      value: openDealsCount > 0 ? formatCount(openDealsCount) : "0",
      trend: openDealsCount > 0 ? "up" : "neutral",
      trendValue: openDealsCount > 0 ? `${formatCount(totalDeals)} total` : "±0%",
      status: hubspotLoading ? "warning" : openDealsCount > 10 ? "online" : "warning",
    },
  ], [totalContacts, wonRevenue, wonDealsCount, totalValue, openDealsCount, totalDeals, hubspotLoading, wonDealsLoading]);

  // Boot sequence simulation
  useEffect(() => {
    const bootMessages = [
      { type: "system" as const, content: "NEXUS COMMAND CENTER initializing..." },
      { type: "system" as const, content: "Loading neural interface..." },
      { type: "success" as const, content: "Database connection established" },
      { type: "success" as const, content: "WhatsApp API connected" },
      { type: "success" as const, content: "CRM Nexus online" },
      { type: "success" as const, content: "Security protocols active" },
      { type: "system" as const, content: "All systems operational. Welcome, HAIKU 神" },
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < bootMessages.length) {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `boot-${index}`,
            ...bootMessages[index],
            timestamp: new Date(),
          },
        ]);
        index++;
      } else {
        clearInterval(interval);
        setIsBooting(false);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const handleCommand = (command: string) => {
    // Add user input
    setTerminalLines((prev) => [
      ...prev,
      { id: `input-${Date.now()}`, type: "input", content: command, timestamp: new Date() },
    ]);

    // Process command with real data
    setTimeout(() => {
      let response: TerminalLine;

      switch (command.toLowerCase()) {
        case "help":
          response = {
            id: `output-${Date.now()}`,
            type: "output",
            content: `Available commands:
  status    - Show system status
  stats     - Display HubSpot statistics
  pipeline  - Show pipeline stages
  revenue   - Revenue analytics
  clear     - Clear terminal
  god       - Activate God Mode 神
  ultra     - Activate Ultra Instinct 極`,
            timestamp: new Date(),
          };
          break;
        case "status":
          response = {
            id: `output-${Date.now()}`,
            type: "success",
            content: `All systems operational. ${formatCount(totalContacts)} contacts | ${formatCount(totalDeals)} deals | ${formatValue(wonRevenue)} won`,
            timestamp: new Date(),
          };
          break;
        case "stats":
          response = {
            id: `output-${Date.now()}`,
            type: "output",
            content: `📊 HUBSPOT LIVE STATISTICS
  Total Contacts:  ${formatCount(totalContacts)}
  Total Deals:     ${formatCount(totalDeals)}
  Open Deals:      ${formatCount(openDealsCount)}
  Won Deals:       ${formatCount(wonDealsCount)}
  Won Revenue:     ${formatValue(wonRevenue)}
  Pipeline Value:  ${formatValue(totalValue)}
  Avg Deal:        ${formatValue(avgDealValue)}`,
            timestamp: new Date(),
          };
          break;
        case "leads":
        case "pipeline":
          response = {
            id: `output-${Date.now()}`,
            type: "output",
            content: `🎯 HUBSPOT PIPELINE STAGES
  Won:             ${formatCount(dealsByStage["closedwon"]?.count ?? 0)} deals
  Contract Sent:   ${formatCount(dealsByStage["contractsent"]?.count ?? 0)} deals
  Qualified:       ${formatCount(dealsByStage["qualifiedtobuy"]?.count ?? 0)} deals
  Appointment:     ${formatCount(dealsByStage["appointmentscheduled"]?.count ?? 0)} deals
  Lost:            ${formatCount(dealsByStage["closedlost"]?.count ?? 0)} deals
  Total Pipeline:  ${formatCount(totalDeals)} deals`,
            timestamp: new Date(),
          };
          break;
        case "ai":
        case "revenue":
          response = {
            id: `output-${Date.now()}`,
            type: "output",
            content: `💰 REVENUE ANALYTICS
  Won Revenue:     ${formatValue(wonRevenue)}
  Won Deals:       ${formatCount(wonDealsCount)}
  Win Rate:        ${totalDeals > 0 ? ((wonDealsCount / totalDeals) * 100).toFixed(1) : 0}%
  Pipeline Value:  ${formatValue(totalValue)}
  Avg Deal Size:   ${formatValue(avgDealValue)}`,
            timestamp: new Date(),
          };
          break;
        case "god":
          response = {
            id: `output-${Date.now()}`,
            type: "warning",
            content: "神 GOD MODE ACTIVATED - Power level: MAXIMUM",
            timestamp: new Date(),
          };
          break;
        case "ultra":
          response = {
            id: `output-${Date.now()}`,
            type: "system",
            content: "極 ULTRA INSTINCT ENGAGED - Autonomous mode: ON",
            timestamp: new Date(),
          };
          break;
        case "clear":
          setTerminalLines([]);
          return;
        default:
          response = {
            id: `output-${Date.now()}`,
            type: "error",
            content: `Command not recognized: ${command}. Type 'help' for available commands.`,
            timestamp: new Date(),
          };
      }

      setTerminalLines((prev) => [...prev, response]);
    }, 200);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            COMMAND DECK
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            System Status:{" "}
            {isDataLoading ? (
              <span className="text-neon-orange animate-pulse">SYNCING...</span>
            ) : (
              <span className="text-neon-green">OPERATIONAL</span>
            )}
            {" "}| Live Data Connected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-white/40 mr-2">
            {currentTime}
          </div>
          <NeonButton variant="cyan" size="sm">
            Refresh
          </NeonButton>
          <NeonButton variant="purple" size="sm" glow>
            Deploy
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={dashboardStats} columns={4} animated variant="cyan" />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Metrics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Pipeline Health - HubSpot Metrics */}
          <HoloCard
            title="PIPELINE HEALTH"
            subtitle="HubSpot Live Metrics"
            icon="◈"
            variant="cyan"
          >
            <div className="flex justify-around py-4">
              <MetricRing
                value={totalDeals > 0 ? Math.round((wonDealsCount / totalDeals) * 100) : 0}
                label="Win Rate"
                color="green"
                size="md"
              />
              <MetricRing
                value={totalDeals > 0 ? Math.round((openDealsCount / totalDeals) * 100) : 0}
                label="Open"
                color="cyan"
                size="md"
              />
              <MetricRing
                value={hubspotStats?.success ? 100 : 0}
                label="Synced"
                color="purple"
                size="md"
              />
            </div>
            <div className="text-center text-xs text-white/40 font-mono">
              {formatCount(totalDeals)} deals tracked in HubSpot
            </div>
          </HoloCard>

          {/* Module Status - HubSpot Live Data */}
          <HoloCard
            title="MODULE STATUS"
            subtitle="HubSpot Live Connections"
            icon="◆"
            variant="purple"
          >
            <div className="space-y-3">
              <ActivityIndicator
                status={hubspotLoading ? "idle" : totalContacts > 0 ? "active" : "warning"}
                label={`Contacts (${formatCount(totalContacts)})`}
              />
              <ActivityIndicator
                status={hubspotLoading ? "idle" : totalDeals > 0 ? "active" : "warning"}
                label={`CRM Deals (${formatCount(totalDeals)})`}
              />
              <ActivityIndicator
                status={wonDealsLoading ? "idle" : wonDealsCount > 0 ? "active" : "warning"}
                label={`Won Deals (${formatCount(wonDealsCount)})`}
              />
              <ActivityIndicator
                status={hubspotLoading ? "idle" : openDealsCount > 0 ? "active" : "warning"}
                label={`Open Pipeline (${formatCount(openDealsCount)})`}
              />
              <ActivityIndicator
                status={hubspotStats?.success ? "active" : "warning"}
                label={`HubSpot API (${hubspotStats?.success ? "Connected" : "Offline"})`}
              />
            </div>
          </HoloCard>

          {/* Pipeline Distribution - HubSpot Data */}
          <HoloCard title="PIPELINE STAGES" icon="◇" variant="gold">
            <div className="space-y-4">
              <DataBar
                label="Won"
                value={dealsByStage["closedwon"]?.count ?? 0}
                max={Math.max(totalDeals, 1)}
                color="green"
              />
              <DataBar
                label="Contract Sent"
                value={dealsByStage["contractsent"]?.count ?? 0}
                max={Math.max(totalDeals, 1)}
                color="cyan"
              />
              <DataBar
                label="Qualified"
                value={dealsByStage["qualifiedtobuy"]?.count ?? 0}
                max={Math.max(totalDeals, 1)}
                color="purple"
              />
              <DataBar
                label="Lost"
                value={dealsByStage["closedlost"]?.count ?? 0}
                max={Math.max(totalDeals, 1)}
                color="red"
              />
            </div>
            <div className="mt-3 text-center text-xs text-white/40 font-mono">
              {formatCount(totalDeals)} total deals in HubSpot
            </div>
          </HoloCard>
        </div>

        {/* Center Column - Terminal & Activity */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Neural Terminal */}
          <Terminal
            title="NEURAL TERMINAL"
            lines={terminalLines}
            onCommand={handleCommand}
            showTimestamps
            variant="cyan"
            className="h-[400px]"
          />

          {/* Recent Activity - Real API Data */}
          <HoloCard title="RECENT ACTIVITY" subtitle="Live feed" icon="◎">
            <div className="space-y-3">
              {activityFeed && activityFeed.length > 0 ? (
                activityFeed.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    icon={activity.icon}
                    title={activity.title}
                    description={activity.description}
                    time={formatTimeAgo(new Date(activity.timestamp))}
                    status={getActivityStatus(activity.action)}
                  />
                ))
              ) : (
                <>
                  <div className="text-center py-4 text-white/40 text-sm font-mono">
                    No recent activity
                  </div>
                </>
              )}
            </div>
          </HoloCard>
        </div>

        {/* Right Column - AI & Widgets */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* AI Assistants - HubSpot Stats */}
          <HoloCard
            title="AI AGENTS"
            subtitle="Neural Network Status"
            icon="◎"
            variant="ultra"
            glow
          >
            <div className="space-y-4">
              <AIAssistantCard
                name="CRM SYNC"
                role="HubSpot Agent"
                status={hubspotStats?.success ? "active" : "standby"}
                tasks={totalDeals}
                avatar="神"
              />
              <AIAssistantCard
                name="DEAL AI"
                role="Pipeline Engine"
                status={openDealsCount > 0 ? "active" : "standby"}
                tasks={openDealsCount}
                avatar="★"
              />
              <AIAssistantCard
                name="NEXUS"
                role="Command Center"
                status="processing"
                tasks={totalContacts + totalDeals + wonDealsCount}
                avatar="極"
              />
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs text-white/40 font-mono">
                {formatValue(wonRevenue)} won revenue
              </span>
            </div>
          </HoloCard>

          {/* Power Modes */}
          <HoloCard
            title="POWER MODES"
            subtitle="System Enhancement"
            icon="⚡"
          >
            <div className="space-y-3">
              <button className={cn(
                "w-full p-4 rounded-lg border transition-all duration-300",
                "bg-god-primary/10 border-god-primary/30 hover:bg-god-primary/20 hover:border-god-primary/60",
                "group"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-god-secondary group-hover:animate-pulse">神</span>
                    <div className="text-left">
                      <div className="font-display text-sm font-bold text-god-secondary">GOD MODE</div>
                      <div className="text-[10px] text-white/50 font-mono">Maximum Power</div>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-god-primary/50" />
                </div>
              </button>

              <button className={cn(
                "w-full p-4 rounded-lg border transition-all duration-300",
                "bg-ultra-secondary/10 border-ultra-secondary/30 hover:bg-ultra-secondary/20 hover:border-ultra-secondary/60",
                "group"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-ultra-primary group-hover:animate-pulse">極</span>
                    <div className="text-left">
                      <div className="font-display text-sm font-bold text-ultra-primary">ULTRA INSTINCT</div>
                      <div className="text-[10px] text-white/50 font-mono">Autonomous Mode</div>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-ultra-secondary/50" />
                </div>
              </button>
            </div>
          </HoloCard>

          {/* Quick Actions */}
          <HoloCard title="QUICK ACTIONS" icon="▣">
            <div className="grid grid-cols-2 gap-2">
              <QuickActionButton icon="◉" label="WhatsApp" color="green" />
              <QuickActionButton icon="◆" label="CRM" color="cyan" />
              <QuickActionButton icon="⬡" label="Bau" color="purple" />
              <QuickActionButton icon="⚡" label="Auto" color="orange" />
            </div>
          </HoloCard>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* NEW SECTIONS - Lead Scoring, Auto Lead Generator, Provision */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-12 gap-6">
        {/* LEAD SCORING LIVE */}
        <div className="col-span-12 lg:col-span-4">
          <HoloCard
            title="LEAD SCORING LIVE"
            subtitle="AI-Powered Qualification"
            icon="★"
            variant="cyan"
            glow
          >
            {/* Grade Distribution */}
            <div className="space-y-3 mb-4">
              <div className="text-xs text-white/50 font-mono uppercase tracking-wider mb-2">
                Grade Distribution
              </div>
              <GradeDistributionBar
                grade="A"
                count={leadDistribution?.A ?? 0}
                total={leadDistribution?.total ?? 1}
                color="green"
              />
              <GradeDistributionBar
                grade="B"
                count={leadDistribution?.B ?? 0}
                total={leadDistribution?.total ?? 1}
                color="cyan"
              />
              <GradeDistributionBar
                grade="C"
                count={leadDistribution?.C ?? 0}
                total={leadDistribution?.total ?? 1}
                color="gold"
              />
              <GradeDistributionBar
                grade="D"
                count={leadDistribution?.D ?? 0}
                total={leadDistribution?.total ?? 1}
                color="orange"
              />
            </div>

            {/* Top 3 Leads Today */}
            <div className="border-t border-white/10 pt-4">
              <div className="text-xs text-white/50 font-mono uppercase tracking-wider mb-3">
                Top Leads Today
              </div>
              <div className="space-y-2">
                {leaderboardLoading ? (
                  <div className="text-center py-4 text-white/30 text-xs font-mono">
                    Loading leads...
                  </div>
                ) : leadLeaderboard && leadLeaderboard.length > 0 ? (
                  leadLeaderboard.map((lead, index) => (
                    <TopLeadCard
                      key={lead.contactId}
                      rank={index + 1}
                      name={lead.contactName}
                      score={lead.score}
                      grade={lead.grade}
                      isBauherrenPassReady={lead.grade === "A"}
                    />
                  ))
                ) : (
                  <div className="text-center py-4 text-white/30 text-xs font-mono">
                    No scored leads yet
                  </div>
                )}
              </div>
            </div>
          </HoloCard>
        </div>

        {/* AUTO LEAD GENERATOR STATUS */}
        <div className="col-span-12 lg:col-span-4">
          <HoloCard
            title="AUTO LEAD GENERATOR"
            subtitle="Automated Lead Capture"
            icon="⚡"
            variant="purple"
          >
            {/* Sources Table */}
            <div className="space-y-3 mb-4">
              <div className="text-xs text-white/50 font-mono uppercase tracking-wider mb-2">
                Lead Sources
              </div>
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-3 py-2 text-white/50">Source</th>
                      <th className="text-right px-2 py-2 text-white/50">Today</th>
                      <th className="text-right px-2 py-2 text-white/50">Week</th>
                      <th className="text-right px-2 py-2 text-white/50">Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 text-white">Web Forms</td>
                      <td className="px-2 py-2 text-right text-neon-green">12</td>
                      <td className="px-2 py-2 text-right text-neon-cyan">84</td>
                      <td className="px-2 py-2 text-right text-white/70">312</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 text-white">HubSpot Sync</td>
                      <td className="px-2 py-2 text-right text-neon-green">8</td>
                      <td className="px-2 py-2 text-right text-neon-cyan">56</td>
                      <td className="px-2 py-2 text-right text-white/70">245</td>
                    </tr>
                    <tr className="hover:bg-white/5">
                      <td className="px-3 py-2 text-white">External API</td>
                      <td className="px-2 py-2 text-right text-neon-green">5</td>
                      <td className="px-2 py-2 text-right text-neon-cyan">32</td>
                      <td className="px-2 py-2 text-right text-white/70">128</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verification Stats */}
            <div className="border-t border-white/10 pt-4">
              <div className="text-xs text-white/50 font-mono uppercase tracking-wider mb-3">
                Verification Status
              </div>
              <div className="grid grid-cols-3 gap-3">
                <VerificationStatCard
                  label="Valid"
                  value={428}
                  icon="✓"
                  color="green"
                />
                <VerificationStatCard
                  label="Rejected"
                  value={47}
                  icon="✗"
                  color="red"
                />
                <VerificationStatCard
                  label="Pending"
                  value={25}
                  icon="◐"
                  color="orange"
                />
              </div>
            </div>

            {/* Status Indicator */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <ActivityIndicator status="active" label="Generator Online" pulse />
              <span className="text-[10px] text-white/30 font-mono">Last sync: 2m ago</span>
            </div>
          </HoloCard>
        </div>

        {/* PROVISION */}
        <div className="col-span-12 lg:col-span-4">
          <HoloCard
            title="PROVISION"
            subtitle="Commission Tracking"
            icon="◈"
            variant="gold"
            glow
          >
            {/* Total Provision Stat */}
            <div className="mb-4 p-4 rounded-lg bg-neon-gold/10 border border-neon-gold/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/50 font-mono uppercase tracking-wider">
                    Total Provision (2.5%)
                  </div>
                  <div className="text-3xl font-display font-bold text-neon-gold mt-1">
                    {formatValue(wonRevenue * 0.025)}
                  </div>
                  <div className="text-xs text-white/40 font-mono mt-1">
                    Based on {formatValue(wonRevenue)} won revenue
                  </div>
                </div>
                <div className="text-4xl text-neon-gold/50">◈</div>
              </div>
            </div>

            {/* Active Bauherren-Passes */}
            <div className="mb-4 p-3 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-white/50 font-mono uppercase">
                  Active Bauherren-Passes
                </div>
                <div className="text-2xl font-display font-bold text-neon-green">
                  {leadDistribution?.A ?? 0}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-neon-green/20 flex items-center justify-center">
                <span className="text-2xl text-neon-green">✓</span>
              </div>
            </div>

            {/* Recent Conversions */}
            <div className="border-t border-white/10 pt-4">
              <div className="text-xs text-white/50 font-mono uppercase tracking-wider mb-3">
                Recent Conversions
              </div>
              <div className="space-y-2">
                <ConversionItem
                  name="Schmidt Baugruppe"
                  value={85000}
                  provision={2125}
                  time="2h ago"
                />
                <ConversionItem
                  name="Weber Immobilien"
                  value={120000}
                  provision={3000}
                  time="5h ago"
                />
                <ConversionItem
                  name="Muller & Partner"
                  value={65000}
                  provision={1625}
                  time="1d ago"
                />
              </div>
            </div>
          </HoloCard>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function getActivityStatus(action: string): "success" | "info" | "warning" | "alert" {
  switch (action) {
    case "create":
    case "complete":
    case "send":
      return "success";
    case "update":
    case "sync":
    case "trigger":
      return "info";
    case "delete":
    case "fail":
      return "alert";
    default:
      return "warning";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ActivityItemProps {
  icon: string;
  title: string;
  description: string;
  time: string;
  status: "success" | "info" | "warning" | "alert";
}

function ActivityItem({ icon, title, description, time, status }: ActivityItemProps) {
  const statusColors = {
    success: "text-neon-green",
    info: "text-neon-cyan",
    warning: "text-neon-orange",
    alert: "text-neon-red",
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
      <span className={cn("text-lg", statusColors[status])}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-sm text-white">{title}</div>
        <div className="text-xs text-white/50 font-mono truncate">{description}</div>
      </div>
      <span className="text-[10px] text-white/30 font-mono whitespace-nowrap">{time}</span>
    </div>
  );
}

interface AIAssistantCardProps {
  name: string;
  role: string;
  status: "active" | "standby" | "processing" | "offline";
  tasks: number;
  avatar: string;
}

function AIAssistantCard({ name, role, status, tasks, avatar }: AIAssistantCardProps) {
  const statusColors = {
    active: "bg-neon-green",
    standby: "bg-neon-cyan",
    processing: "bg-neon-orange animate-pulse",
    offline: "bg-white/30",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-void-surface/50 border border-white/5 hover:border-neon-cyan/30 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
        <span className="text-neon-purple text-lg">{avatar}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-white">{name}</span>
          <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
        </div>
        <div className="text-[10px] text-white/50 font-mono">{role}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono text-neon-cyan">{tasks}</div>
        <div className="text-[8px] text-white/30 uppercase">Tasks</div>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: string;
  label: string;
  color: "cyan" | "purple" | "green" | "orange";
}

function QuickActionButton({ icon, label, color }: QuickActionButtonProps) {
  const colorStyles = {
    cyan: "border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10",
    purple: "border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10",
    green: "border-neon-green/30 text-neon-green hover:bg-neon-green/10",
    orange: "border-neon-orange/30 text-neon-orange hover:bg-neon-orange/10",
  };

  return (
    <button className={cn(
      "p-3 rounded-lg border transition-all duration-200",
      "flex flex-col items-center gap-1",
      colorStyles[color]
    )}>
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] font-mono uppercase">{label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD SCORING COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface GradeDistributionBarProps {
  grade: "A" | "B" | "C" | "D";
  count: number;
  total: number;
  color: "green" | "cyan" | "gold" | "orange";
}

function GradeDistributionBar({ grade, count, total, color }: GradeDistributionBarProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  const colorStyles = {
    green: { bg: "bg-neon-green", text: "text-neon-green" },
    cyan: { bg: "bg-neon-cyan", text: "text-neon-cyan" },
    gold: { bg: "bg-neon-gold", text: "text-neon-gold" },
    orange: { bg: "bg-neon-orange", text: "text-neon-orange" },
  };

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm",
        `${colorStyles[color].bg}/20`,
        colorStyles[color].text
      )}>
        {grade}
      </div>
      <div className="flex-1">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", colorStyles[color].bg)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="text-right min-w-[60px]">
        <span className={cn("text-sm font-mono font-bold", colorStyles[color].text)}>
          {count}
        </span>
        <span className="text-xs text-white/40 font-mono ml-1">
          ({percentage}%)
        </span>
      </div>
    </div>
  );
}

interface TopLeadCardProps {
  rank: number;
  name: string;
  score: number;
  grade: string;
  isBauherrenPassReady: boolean;
}

function TopLeadCard({ rank, name, score, grade, isBauherrenPassReady }: TopLeadCardProps) {
  const gradeColors: Record<string, string> = {
    A: "text-neon-green bg-neon-green/20",
    B: "text-neon-cyan bg-neon-cyan/20",
    C: "text-neon-gold bg-neon-gold/20",
    D: "text-neon-orange bg-neon-orange/20",
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      isBauherrenPassReady
        ? "bg-neon-green/10 border-neon-green/30"
        : "bg-white/5 border-white/10"
    )}>
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono text-white/50">
          #{rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-display text-white truncate">{name}</div>
          {isBauherrenPassReady && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-neon-green font-mono">Bauherren-Pass Ready</span>
              <span className="text-neon-green">✓</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={cn(
            "text-lg font-mono font-bold",
            score >= 80 ? "text-neon-green" : score >= 60 ? "text-neon-cyan" : "text-neon-gold"
          )}>
            {score}
          </div>
        </div>
        <div className={cn(
          "w-7 h-7 rounded flex items-center justify-center text-xs font-bold",
          gradeColors[grade] || gradeColors["D"]
        )}>
          {grade}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO LEAD GENERATOR COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface VerificationStatCardProps {
  label: string;
  value: number;
  icon: string;
  color: "green" | "red" | "orange";
}

function VerificationStatCard({ label, value, icon, color }: VerificationStatCardProps) {
  const colorStyles = {
    green: { bg: "bg-neon-green/10", border: "border-neon-green/30", text: "text-neon-green" },
    red: { bg: "bg-neon-red/10", border: "border-neon-red/30", text: "text-neon-red" },
    orange: { bg: "bg-neon-orange/10", border: "border-neon-orange/30", text: "text-neon-orange" },
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border text-center",
      colorStyles[color].bg,
      colorStyles[color].border
    )}>
      <div className={cn("text-lg mb-1", colorStyles[color].text)}>{icon}</div>
      <div className={cn("text-xl font-display font-bold", colorStyles[color].text)}>
        {value}
      </div>
      <div className="text-[10px] text-white/50 font-mono uppercase">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVISION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ConversionItemProps {
  name: string;
  value: number;
  provision: number;
  time: string;
}

function ConversionItem({ name, value, provision, time }: ConversionItemProps) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-neon-gold/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-display text-white truncate">{name}</div>
          <div className="text-[10px] text-white/40 font-mono">
            Deal: €{value.toLocaleString("de-DE")}
          </div>
        </div>
        <div className="text-right ml-3">
          <div className="text-sm font-mono font-bold text-neon-gold">
            +€{provision.toLocaleString("de-DE")}
          </div>
          <div className="text-[10px] text-white/30 font-mono">{time}</div>
        </div>
      </div>
    </div>
  );
}
