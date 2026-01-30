"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc";
import {
  HoloCard,
  NeonButton,
  NotificationsPanel,
  NotificationToast,
  ActivityFeed,
  SystemHealthMonitor,
  QuickActions,
  FloatingActionButton,
} from "@/components/scifi";
import type { Notification, Activity, SystemMetric, ServiceStatus } from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEMS MONITORING PAGE - Showcases new dashboard components
// Real-time notifications, AI activity, system health, and quick actions
// ═══════════════════════════════════════════════════════════════════════════════

export default function SystemsMonitoringPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);
  const [currentTime, setCurrentTime] = useState("--:--:--");

  // API hooks for real data
  const { data: notificationsData, refetch: refetchNotifications } = api.notifications.list.useQuery({
    limit: 20,
  });
  const { data: activityData } = api.activity.recent.useQuery({ limit: 10 });
  const { data: healthData, refetch: refetchHealth } = api.system.health.useQuery();
  const { data: queueStats } = api.system.queueStats.useQuery();

  const markAsReadMutation = api.notifications.markAsRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });
  const dismissMutation = api.notifications.dismiss.useMutation({
    onSuccess: () => refetchNotifications(),
  });

  // Transform API notifications to UI format
  const mapNotificationType = (apiType: string): Notification["type"] => {
    switch (apiType) {
      case "error":
      case "action_required":
        return "critical";
      case "warning":
        return "warning";
      case "success":
        return "success";
      case "info":
      default:
        return "info";
    }
  };

  const notifications: Notification[] = (notificationsData?.items || []).map((n) => ({
    id: n.id,
    type: mapNotificationType(n.type),
    title: n.title,
    message: n.message,
    timestamp: new Date(n.createdAt),
    source: n.category || undefined,
    read: n.isRead ?? false,
  }));

  // Update time only on client
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString("de-DE"));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Transform activity data from API
  useEffect(() => {
    if (activityData) {
      setActivities(activityData.map((a) => ({
        id: a.id,
        agentName: a.user?.name || "System",
        agentModel: "system" as const,
        action: a.action as Activity["action"],
        description: a.description || a.title,
        timestamp: new Date(a.timestamp),
      })));
    }
  }, [activityData]);

  // Update services based on health data
  useEffect(() => {
    if (healthData) {
      setServices([
        { id: "api", name: "API Gateway", status: healthData.checks.api === "ok" ? "online" : "offline", latency: 12 },
        { id: "db", name: "PostgreSQL", status: healthData.checks.db === "ok" ? "online" : "offline", latency: 3 },
        { id: "redis", name: "Redis Cache", status: healthData.checks.redis === "ok" ? "online" : "offline", latency: 1 },
        { id: "workers", name: "Job Workers", status: healthData.checks.workers === "ok" ? "online" : healthData.checks.workers === "degraded" ? "degraded" : "offline", latency: 0 },
      ]);
    }
  }, [healthData]);

  // Initialize metrics (these would come from a real metrics API)
  useEffect(() => {
    setMetrics([
      { id: "cpu", label: "CPU", value: 42, status: "healthy", trend: "stable" },
      { id: "memory", label: "Memory", value: 68, status: "warning", trend: "up" },
      { id: "network", label: "Network", value: 23, unit: "MB/s", status: "healthy", trend: "down" },
      { id: "disk", label: "Disk I/O", value: 15, status: "healthy", trend: "stable" },
    ]);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update metrics with random variations
      setMetrics((prev) =>
        prev.map((m) => ({
          ...m,
          value: Math.max(5, Math.min(95, m.value + (Math.random() - 0.5) * 10)),
          status:
            m.value > 80
              ? "critical"
              : m.value > 60
              ? "warning"
              : "healthy",
        }))
      );

      // Occasionally add new activity
      if (Math.random() > 0.7) {
        const agents = ["haiku", "sonnet", "opus", "gpt4", "system"] as const;
        const actions = ["thinking", "generating", "completed", "analyzing"] as const;
        const descriptions = [
          "Processing incoming message",
          "Analyzing customer sentiment",
          "Generating lead score update",
          "Preparing email response",
          "Running data validation",
        ];

        setActivities((prev) => [
          {
            id: `a-${Date.now()}`,
            agentName: agents[Math.floor(Math.random() * agents.length)].toUpperCase(),
            agentModel: agents[Math.floor(Math.random() * agents.length)],
            action: actions[Math.floor(Math.random() * actions.length)],
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            timestamp: new Date(),
          },
          ...prev.slice(0, 9),
        ]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleDismissNotification = (id: string) => {
    dismissMutation.mutate({ id });
  };

  const handleMarkRead = (id: string) => {
    markAsReadMutation.mutate({ id });
  };

  const handleRefreshHealth = () => {
    refetchHealth();
    refetchNotifications();
    // Also update metrics simulation
    setMetrics((prev) =>
      prev.map((m) => ({
        ...m,
        value: Math.max(10, Math.min(90, 30 + Math.random() * 40)),
        status: "healthy",
      }))
    );
  };

  const showDemoToast = () => {
    setToastNotification({
      id: `toast-${Date.now()}`,
      type: "success",
      title: "Action Completed",
      message: "Your command was executed successfully",
      timestamp: new Date(),
    });
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            SYSTEMS MONITORING
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Real-time status: <span className="text-neon-green">OPERATIONAL</span>
            {" "}| Last update: {currentTime}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NeonButton variant="cyan" size="sm" onClick={showDemoToast}>
            Test Alert
          </NeonButton>
          <NeonButton variant="purple" size="sm" glow>
            Export Data
          </NeonButton>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - System Health & Quick Actions */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* System Health Monitor */}
          <SystemHealthMonitor
            metrics={metrics}
            services={services}
            onRefresh={handleRefreshHealth}
          />

          {/* Quick Actions */}
          <QuickActions showCategories showShortcuts />
        </div>

        {/* Center Column - Notifications & Activity */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Notifications Panel */}
          <NotificationsPanel
            notifications={notifications}
            maxVisible={5}
            onDismiss={handleDismissNotification}
            onMarkRead={handleMarkRead}
          />

          {/* AI Activity Feed */}
          <ActivityFeed
            activities={activities}
            maxVisible={10}
            showTimestamps
            autoScroll
          />
        </div>

        {/* Right Column - Stats & Info */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Live Stats */}
          <HoloCard
            title="LIVE METRICS"
            subtitle="Real-time data"
            icon="◈"
            variant="cyan"
          >
            <div className="space-y-4 py-2">
              <StatRow label="Active Sessions" value="1,247" trend="up" />
              <StatRow label="API Requests/s" value="342" trend="stable" />
              <StatRow label="Queue Length" value="12" trend="down" />
              <StatRow label="Cache Hit Rate" value="94.2%" trend="up" />
              <StatRow label="Uptime" value="99.97%" trend="stable" />
            </div>
          </HoloCard>

          {/* Component Info */}
          <HoloCard
            title="NEW FEATURES"
            subtitle="Recent additions"
            icon="★"
            variant="gold"
            glow
          >
            <div className="space-y-3 py-2">
              <FeatureItem
                icon="◉"
                title="Notifications Panel"
                description="Real-time alerts with severity levels"
              />
              <FeatureItem
                icon="◎"
                title="AI Activity Feed"
                description="Live stream of agent activities"
              />
              <FeatureItem
                icon="◆"
                title="Health Monitor"
                description="Animated gauges for system metrics"
              />
              <FeatureItem
                icon="⚡"
                title="Quick Actions"
                description="Keyboard shortcuts for commands"
              />
            </div>
          </HoloCard>

          {/* Network Status */}
          <HoloCard title="NETWORK STATUS" icon="⬡" variant="purple">
            <div className="space-y-3 py-2">
              <NetworkNode name="EU-WEST-1" status="healthy" latency={12} />
              <NetworkNode name="US-EAST-1" status="healthy" latency={78} />
              <NetworkNode name="ASIA-PACIFIC" status="warning" latency={156} />
              <NetworkNode name="EDGE-CDN" status="healthy" latency={5} />
            </div>
          </HoloCard>
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon="⚡"
        label="Quick Command"
        onClick={showDemoToast}
        variant="primary"
        position="bottom-right"
      />

      {/* Toast Notification */}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={() => setToastNotification(null)}
          duration={4000}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface StatRowProps {
  label: string;
  value: string;
  trend?: "up" | "down" | "stable";
}

function StatRow({ label, value, trend }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/50 font-mono">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-neon-cyan font-bold">{value}</span>
        {trend && (
          <span className={cn(
            "text-[10px]",
            trend === "up" && "text-neon-green",
            trend === "down" && "text-neon-red",
            trend === "stable" && "text-white/40"
          )}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
    </div>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg bg-void/30 border border-white/5">
      <span className="text-neon-cyan text-lg">{icon}</span>
      <div>
        <div className="text-xs font-display font-bold text-white">{title}</div>
        <div className="text-[10px] text-white/50 font-mono">{description}</div>
      </div>
    </div>
  );
}

interface NetworkNodeProps {
  name: string;
  status: "healthy" | "warning" | "critical";
  latency: number;
}

function NetworkNode({ name, status, latency }: NetworkNodeProps) {
  const statusColors = {
    healthy: "bg-neon-green",
    warning: "bg-neon-orange animate-pulse",
    critical: "bg-neon-red animate-pulse",
  };

  return (
    <div className="flex items-center justify-between p-2 rounded bg-void/30 border border-white/5">
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
        <span className="text-xs font-mono text-white/70">{name}</span>
      </div>
      <span className="text-[10px] font-mono text-white/40">{latency}ms</span>
    </div>
  );
}
