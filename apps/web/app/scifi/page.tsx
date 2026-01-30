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
  // REAL-TIME tRPC DATA QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  // Contacts (Active Users)
  const { data: contactsData, isLoading: contactsLoading } = api.contacts.list.useQuery({
    pagination: { page: 1, limit: 1 },
  });

  // Deals (Open Deals & Revenue)
  const { data: dealsData, isLoading: dealsLoading } = api.deals.list.useQuery({
    filters: { stage: "negotiation" },
    pagination: { page: 1, limit: 100 },
  });

  // All deals for revenue calculation
  const { data: allDealsData } = api.deals.list.useQuery({
    filters: { stage: "won" },
    pagination: { page: 1, limit: 100 },
  });

  // Conversations (Messages)
  const { data: conversationsData, isLoading: messagingLoading } = api.messaging.listConversations.useQuery({
    pagination: { page: 1, limit: 1 },
  });

  // AI Agent Stats (using stable dateRange to prevent hydration mismatch)
  const { data: aiStats, isLoading: aiLoading } = api.aiAgent.getStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Lead Scoring Distribution
  const { data: leadDistribution, isLoading: leadLoading } = api.leadScoring.getDistribution.useQuery();

  // Project Stats
  const { data: projectStats, isLoading: projectsLoading } = api.projects.stats.useQuery({});

  // Activity Feed - Real-time activity from audit logs
  const { data: activityFeed } = api.activity.recent.useQuery({ limit: 5 });

  // Notifications
  const { data: notificationsData } = api.notifications.unread.useQuery({ limit: 5 });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED DASHBOARD STATS
  // ═══════════════════════════════════════════════════════════════════════════

  const isDataLoading = contactsLoading || dealsLoading || messagingLoading;

  // Calculate total revenue from won deals
  const totalRevenue = useMemo(() => {
    if (!allDealsData?.items) return 0;
    return allDealsData.items.reduce((sum, deal) => {
      return sum + parseFloat(deal.amount || "0");
    }, 0);
  }, [allDealsData]);

  // Calculate open deals count
  const openDealsCount = dealsData?.total ?? 0;

  // Dashboard stats from real API data
  const dashboardStats: StatItem[] = useMemo(() => [
    {
      id: "users",
      label: "Active Contacts",
      value: contactsData?.total?.toLocaleString() ?? "—",
      trend: "up",
      trendValue: "+12.5%",
      status: contactsLoading ? "warning" : "online",
    },
    {
      id: "revenue",
      label: "Revenue (Won)",
      value: totalRevenue > 0 ? `€${totalRevenue.toLocaleString()}` : "—",
      trend: "up",
      trendValue: "+8.2%",
      status: dealsLoading ? "warning" : "online",
    },
    {
      id: "messages",
      label: "Conversations",
      value: conversationsData?.total?.toLocaleString() ?? "—",
      trend: "up",
      trendValue: "+23.1%",
      status: messagingLoading ? "warning" : "online",
    },
    {
      id: "deals",
      label: "Open Deals",
      value: openDealsCount.toString(),
      trend: openDealsCount > 0 ? "up" : "neutral",
      trendValue: openDealsCount > 0 ? `${openDealsCount} active` : "±0%",
      status: dealsLoading ? "warning" : openDealsCount > 10 ? "online" : "warning",
    },
  ], [contactsData, totalRevenue, conversationsData, openDealsCount, contactsLoading, dealsLoading, messagingLoading]);

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
  modules   - List active modules
  stats     - Display statistics (LIVE DATA)
  leads     - Show lead distribution
  ai        - AI agent performance
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
            content: `All systems operational. ${contactsData?.total ?? 0} contacts | ${conversationsData?.total ?? 0} conversations | ${openDealsCount} deals`,
            timestamp: new Date(),
          };
          break;
        case "stats":
          response = {
            id: `output-${Date.now()}`,
            type: "output",
            content: `📊 LIVE STATISTICS
  Contacts:      ${contactsData?.total?.toLocaleString() ?? "Loading..."}
  Conversations: ${conversationsData?.total?.toLocaleString() ?? "Loading..."}
  Open Deals:    ${openDealsCount}
  Revenue:       €${totalRevenue.toLocaleString()}
  AI Responses:  ${aiStats?.totalResponses ?? "N/A"}
  Projects:      ${projectStats?.total ?? "N/A"}`,
            timestamp: new Date(),
          };
          break;
        case "leads":
          const gradeA = leadDistribution?.A ?? 0;
          const gradeB = leadDistribution?.B ?? 0;
          const gradeC = leadDistribution?.C ?? 0;
          const gradeD = leadDistribution?.D ?? 0;
          response = {
            id: `output-${Date.now()}`,
            type: "output",
            content: `🎯 LEAD SCORING DISTRIBUTION
  Grade A (Hot):   ${gradeA} leads
  Grade B (Warm):  ${gradeB} leads
  Grade C (Cool):  ${gradeC} leads
  Grade D (Cold):  ${gradeD} leads
  Total Scored:    ${leadDistribution?.total ?? 0}`,
            timestamp: new Date(),
          };
          break;
        case "ai":
          response = {
            id: `output-${Date.now()}`,
            type: "output",
            content: `🤖 AI AGENT PERFORMANCE (30 days)
  Total Responses: ${aiStats?.totalResponses ?? 0}
  Success Rate:    ${((aiStats?.successRate ?? 0) * 100).toFixed(1)}%
  Escalation Rate: ${((aiStats?.escalationRate ?? 0) * 100).toFixed(1)}%
  Avg Confidence:  ${((aiStats?.averageConfidence ?? 0) * 100).toFixed(1)}%`,
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
          {/* System Health - Real AI & Lead Metrics */}
          <HoloCard
            title="AI PERFORMANCE"
            subtitle="Real-time metrics"
            icon="◈"
            variant="cyan"
          >
            <div className="flex justify-around py-4">
              <MetricRing
                value={Math.round((aiStats?.successRate ?? 0) * 100)}
                label="Success"
                color="green"
                size="md"
              />
              <MetricRing
                value={Math.round((aiStats?.averageConfidence ?? 0) * 100)}
                label="Confidence"
                color="cyan"
                size="md"
              />
              <MetricRing
                value={100 - Math.round((aiStats?.escalationRate ?? 0) * 100)}
                label="Handled"
                color="purple"
                size="md"
              />
            </div>
            <div className="text-center text-xs text-white/40 font-mono">
              {aiStats?.totalResponses ?? 0} AI responses (30 days)
            </div>
          </HoloCard>

          {/* Module Status - Real Loading States */}
          <HoloCard
            title="MODULE STATUS"
            subtitle="Live API connections"
            icon="◆"
            variant="purple"
          >
            <div className="space-y-3">
              <ActivityIndicator
                status={messagingLoading ? "idle" : (conversationsData?.total ?? 0) > 0 ? "active" : "warning"}
                label={`WhatsApp Console (${conversationsData?.total ?? 0})`}
              />
              <ActivityIndicator
                status={contactsLoading ? "idle" : (contactsData?.total ?? 0) > 0 ? "active" : "warning"}
                label={`CRM Nexus (${contactsData?.total ?? 0})`}
              />
              <ActivityIndicator
                status={aiLoading ? "idle" : (aiStats?.totalResponses ?? 0) > 0 ? "active" : "warning"}
                label={`AI Agent (${aiStats?.totalResponses ?? 0} resp)`}
              />
              <ActivityIndicator
                status={leadLoading ? "idle" : (leadDistribution?.total ?? 0) > 0 ? "active" : "warning"}
                label={`Lead Scoring (${leadDistribution?.total ?? 0})`}
              />
              <ActivityIndicator
                status={projectsLoading ? "idle" : (projectStats?.total ?? 0) > 0 ? "active" : "warning"}
                label={`West Money Bau (${projectStats?.total ?? 0})`}
              />
            </div>
          </HoloCard>

          {/* Lead Distribution - Real Data */}
          <HoloCard title="LEAD GRADES" icon="◇" variant="gold">
            <div className="space-y-4">
              <DataBar
                label="Grade A (Hot)"
                value={leadDistribution?.A ?? 0}
                max={Math.max(leadDistribution?.total ?? 100, 1)}
                color="green"
              />
              <DataBar
                label="Grade B (Warm)"
                value={leadDistribution?.B ?? 0}
                max={Math.max(leadDistribution?.total ?? 100, 1)}
                color="cyan"
              />
              <DataBar
                label="Grade C (Cool)"
                value={leadDistribution?.C ?? 0}
                max={Math.max(leadDistribution?.total ?? 100, 1)}
                color="orange"
              />
              <DataBar
                label="Grade D (Cold)"
                value={leadDistribution?.D ?? 0}
                max={Math.max(leadDistribution?.total ?? 100, 1)}
                color="red"
              />
            </div>
            <div className="mt-3 text-center text-xs text-white/40 font-mono">
              {leadDistribution?.total ?? 0} total scored leads
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
          {/* AI Assistants - Real Stats */}
          <HoloCard
            title="AI AGENTS"
            subtitle="Neural Network Status"
            icon="◎"
            variant="ultra"
            glow
          >
            <div className="space-y-4">
              <AIAssistantCard
                name="MAX"
                role="WhatsApp Agent"
                status={(aiStats?.totalResponses ?? 0) > 0 ? "active" : "standby"}
                tasks={aiStats?.totalResponses ?? 0}
                avatar="神"
              />
              <AIAssistantCard
                name="LEAD AI"
                role="Scoring Engine"
                status={(leadDistribution?.total ?? 0) > 0 ? "active" : "standby"}
                tasks={leadDistribution?.total ?? 0}
                avatar="★"
              />
              <AIAssistantCard
                name="NEXUS"
                role="Command Center"
                status="processing"
                tasks={
                  (contactsData?.total ?? 0) +
                  (conversationsData?.total ?? 0) +
                  openDealsCount
                }
                avatar="極"
              />
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs text-white/40 font-mono">
                {((aiStats?.successRate ?? 0) * 100).toFixed(0)}% success rate
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
