"use client";

// =============================================================================
// CUSTOMIZABLE DASHBOARD - Drag-and-drop widget dashboard with react-grid-layout
// =============================================================================

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Layout } from "react-grid-layout";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/trpc/client";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  DollarSign,
  TrendingUp,
  Briefcase,
  Activity,
  Target,
  Zap,
  Plus,
  X,
  GripVertical,
  Settings,
  LayoutGrid,
  Mail,
  Calendar,
  LucideIcon,
  RefreshCw,
} from "lucide-react";

import "react-grid-layout/css/styles.css";
import "react-grid-layout/css/resizable.css";

// =============================================================================
// CONSTANTS & TYPES
// =============================================================================

const STORAGE_KEY = "nexus-dashboard-layout";

// WidthProvider is a HOC - use require pattern for compatibility
const WidthProvider = require("react-grid-layout").WidthProvider;
const Responsive = require("react-grid-layout").Responsive;
const ResponsiveGridLayout = WidthProvider(Responsive);

// Layout type for multiple breakpoints
type Layouts = { [breakpoint: string]: Layout[] };

// Widget type definition
export type WidgetType =
  | "stats"
  | "activity"
  | "leadScore"
  | "pipeline"
  | "quickActions";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  icon: LucideIcon;
  description: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
}

// Available widgets configuration
const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  stats: {
    id: "stats",
    type: "stats",
    title: "Key Metrics",
    icon: TrendingUp,
    description: "Shows contacts, deals, and revenue stats",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  activity: {
    id: "activity",
    type: "activity",
    title: "Activity Feed",
    icon: Activity,
    description: "Recent activity timeline",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
  },
  leadScore: {
    id: "leadScore",
    type: "leadScore",
    title: "Lead Score Distribution",
    icon: Target,
    description: "Lead score distribution chart",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
  },
  pipeline: {
    id: "pipeline",
    type: "pipeline",
    title: "Pipeline Summary",
    icon: Briefcase,
    description: "Deals pipeline overview",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 },
  },
  quickActions: {
    id: "quickActions",
    type: "quickActions",
    title: "Quick Actions",
    icon: Zap,
    description: "Common action buttons",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
};

// Default layout for different breakpoints
const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: "stats", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "quickActions", x: 4, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "leadScore", x: 7, y: 0, w: 5, h: 3, minW: 3, minH: 2 },
    { i: "activity", x: 0, y: 2, w: 4, h: 3, minW: 3, minH: 2 },
    { i: "pipeline", x: 4, y: 2, w: 8, h: 3, minW: 4, minH: 2 },
  ],
  md: [
    { i: "stats", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2 },
    { i: "quickActions", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2 },
    { i: "leadScore", x: 0, y: 2, w: 5, h: 3, minW: 3, minH: 2 },
    { i: "activity", x: 5, y: 2, w: 5, h: 3, minW: 3, minH: 2 },
    { i: "pipeline", x: 0, y: 5, w: 10, h: 3, minW: 4, minH: 2 },
  ],
  sm: [
    { i: "stats", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
    { i: "quickActions", x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
    { i: "leadScore", x: 0, y: 4, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "activity", x: 0, y: 7, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "pipeline", x: 0, y: 10, w: 6, h: 3, minW: 4, minH: 2 },
  ],
};

// Default active widgets
const DEFAULT_WIDGETS: WidgetType[] = [
  "stats",
  "activity",
  "leadScore",
  "pipeline",
  "quickActions",
];

// Chart colors
const CHART_COLORS = {
  cyan: "#00F0FF",
  purple: "#A855F7",
  green: "#00FF88",
  gold: "#FFD700",
  red: "#FF3366",
  orange: "#FF6B00",
};

const GRADE_COLORS: Record<string, string> = {
  A: CHART_COLORS.green,
  B: CHART_COLORS.cyan,
  C: CHART_COLORS.gold,
  D: CHART_COLORS.orange,
};

// =============================================================================
// WIDGET WRAPPER COMPONENT
// =============================================================================

interface WidgetWrapperProps {
  id: string;
  title: string;
  icon: LucideIcon;
  editable: boolean;
  onRemove: (id: string) => void;
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

function WidgetWrapper({
  id,
  title,
  icon: Icon,
  editable,
  onRemove,
  children,
  className,
  isLoading,
  onRefresh,
}: WidgetWrapperProps) {
  return (
    <div
      className={cn(
        "h-full w-full relative",
        "rounded-holo overflow-hidden",
        "bg-void-surface/90 backdrop-blur-holo",
        "border border-neon-cyan/30",
        "shadow-holo",
        "transition-all duration-300",
        editable && "hover:border-neon-cyan/60 hover:shadow-neon-cyan",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neon-cyan/20">
        <div className="flex items-center gap-2">
          {editable && (
            <div className="drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-neon-cyan/10 rounded">
              <GripVertical className="h-4 w-4 text-neon-cyan/50" />
            </div>
          )}
          <Icon className="h-4 w-4 text-neon-cyan" />
          <span className="font-display text-sm uppercase tracking-wider text-neon-cyan">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={cn(
                "p-1.5 rounded hover:bg-neon-cyan/10 transition-colors",
                isLoading && "animate-spin"
              )}
            >
              <RefreshCw className="h-3.5 w-3.5 text-neon-cyan/50 hover:text-neon-cyan" />
            </button>
          )}
          {editable && (
            <button
              onClick={() => onRemove(id)}
              className="p-1.5 rounded hover:bg-neon-red/10 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-neon-red/50 hover:text-neon-red" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100%-52px)] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin" />
              <span className="text-xs text-neon-cyan/50 font-mono">LOADING...</span>
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-neon-cyan/40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-neon-cyan/40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-neon-cyan/40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-neon-cyan/40 pointer-events-none" />
    </div>
  );
}

// =============================================================================
// STATS WIDGET
// =============================================================================

function StatsWidget() {
  const { data, isLoading } = api.dashboard.getStats.useQuery(undefined, {
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const stats = useMemo(() => {
    if (!data) {
      return {
        contacts: 0,
        deals: 0,
        revenue: 0,
        openDeals: 0,
      };
    }
    return {
      contacts: data.contacts ?? 0,
      deals: data.deals ?? 0,
      revenue: data.revenue ?? 0,
      openDeals: data.openDeals ?? 0,
    };
  }, [data]);

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      <StatItem
        label="Contacts"
        value={stats.contacts.toLocaleString("de-DE")}
        icon={Users}
        color="cyan"
        trend="+12%"
        trendUp
      />
      <StatItem
        label="Deals"
        value={stats.deals.toLocaleString("de-DE")}
        icon={Briefcase}
        color="purple"
        trend="+8%"
        trendUp
      />
      <StatItem
        label="Revenue"
        value={formatCurrency(stats.revenue)}
        icon={DollarSign}
        color="green"
        trend="+23%"
        trendUp
      />
      <StatItem
        label="Open Deals"
        value={stats.openDeals.toLocaleString("de-DE")}
        icon={TrendingUp}
        color="gold"
        trend="-3%"
        trendUp={false}
      />
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: "cyan" | "purple" | "green" | "gold";
  trend?: string;
  trendUp?: boolean;
}

function StatItem({ label, value, icon: Icon, color, trend, trendUp }: StatItemProps) {
  const colorStyles = {
    cyan: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30",
    purple: "text-neon-purple bg-neon-purple/10 border-neon-purple/30",
    green: "text-neon-green bg-neon-green/10 border-neon-green/30",
    gold: "text-neon-gold bg-neon-gold/10 border-neon-gold/30",
  };

  return (
    <div className={cn("rounded-lg border p-3", colorStyles[color])}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-4 w-4 opacity-70" />
        {trend && (
          <span
            className={cn(
              "text-[10px] font-mono",
              trendUp ? "text-neon-green" : "text-neon-red"
            )}
          >
            {trendUp ? "▲" : "▼"} {trend}
          </span>
        )}
      </div>
      <div className="font-display text-xl font-bold truncate">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider opacity-60">
        {label}
      </div>
    </div>
  );
}

// =============================================================================
// ACTIVITY WIDGET
// =============================================================================

interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  type: "contact" | "deal" | "message" | "system";
}

function ActivityWidget() {
  // Mock activity data - in real use would come from API
  const [activities] = useState<ActivityItem[]>([
    {
      id: "1",
      title: "New lead registered",
      description: "Max Mustermann from Munich",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      type: "contact",
    },
    {
      id: "2",
      title: "Deal moved to negotiation",
      description: "Project Sonnenschein - 125.000 EUR",
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      type: "deal",
    },
    {
      id: "3",
      title: "WhatsApp message received",
      description: "From +49 171 1234567",
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      type: "message",
    },
    {
      id: "4",
      title: "Lead score updated",
      description: "Anna Schmidt upgraded to Grade A",
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      type: "system",
    },
    {
      id: "5",
      title: "New deal created",
      description: "Renovation Berlin - 85.000 EUR",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: "deal",
    },
  ]);

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "contact":
        return Users;
      case "deal":
        return Briefcase;
      case "message":
        return Mail;
      default:
        return Activity;
    }
  };

  const getColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "contact":
        return "text-neon-cyan bg-neon-cyan/10";
      case "deal":
        return "text-neon-purple bg-neon-purple/10";
      case "message":
        return "text-neon-green bg-neon-green/10";
      default:
        return "text-neon-gold bg-neon-gold/10";
    }
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-3 h-full overflow-auto">
      {activities.map((activity, index) => {
        const Icon = getIcon(activity.type);
        return (
          <div
            key={activity.id}
            className={cn(
              "flex items-start gap-3 p-2 rounded-lg transition-all",
              "hover:bg-neon-cyan/5",
              index !== activities.length - 1 && "border-b border-neon-cyan/10 pb-3"
            )}
          >
            <div className={cn("rounded-full p-2", getColor(activity.type))}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 font-medium truncate">
                {activity.title}
              </p>
              {activity.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {activity.description}
                </p>
              )}
            </div>
            <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
              {formatTime(activity.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// LEAD SCORE WIDGET
// =============================================================================

function LeadScoreWidget() {
  const { data, isLoading } = api.leadScoring.getDistribution.useQuery(undefined, {
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const chartData = useMemo(() => {
    if (!data) {
      // Fallback demo data
      return [
        { name: "Grade A", value: 45, color: GRADE_COLORS.A },
        { name: "Grade B", value: 120, color: GRADE_COLORS.B },
        { name: "Grade C", value: 280, color: GRADE_COLORS.C },
        { name: "Grade D", value: 155, color: GRADE_COLORS.D },
      ];
    }
    return [
      { name: "Grade A", value: data.A ?? 0, color: GRADE_COLORS.A },
      { name: "Grade B", value: data.B ?? 0, color: GRADE_COLORS.B },
      { name: "Grade C", value: data.C ?? 0, color: GRADE_COLORS.C },
      { name: "Grade D", value: data.D ?? 0, color: GRADE_COLORS.D },
    ];
  }, [data]);

  const total = chartData.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="flex h-full items-center">
      <div className="w-1/2 h-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              dataKey="value"
              stroke="transparent"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-void-surface/95 border border-neon-cyan/30 rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-sm font-medium" style={{ color: data.color }}>
                      {data.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {data.value} leads ({((data.value / total) * 100).toFixed(1)}%)
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-1/2 space-y-2">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-mono text-gray-300">{item.name}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: item.color }}>
              {item.value}
            </span>
          </div>
        ))}
        <div className="pt-2 border-t border-neon-cyan/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">TOTAL</span>
            <span className="text-sm font-bold text-neon-cyan">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PIPELINE WIDGET
// =============================================================================

function PipelineWidget() {
  // Demo pipeline data
  const pipelineData = useMemo(
    () => [
      { stage: "Lead", count: 45, value: 890000, color: CHART_COLORS.cyan },
      { stage: "Qualified", count: 28, value: 650000, color: CHART_COLORS.purple },
      { stage: "Proposal", count: 15, value: 420000, color: CHART_COLORS.gold },
      { stage: "Negotiation", count: 8, value: 280000, color: CHART_COLORS.orange },
      { stage: "Won", count: 12, value: 380000, color: CHART_COLORS.green },
    ],
    []
  );

  const totalValue = pipelineData.reduce((acc, item) => acc + item.value, 0);
  const totalDeals = pipelineData.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Summary Stats */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-neon-cyan/20">
        <div>
          <div className="text-2xl font-display font-bold text-white">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
            Total Pipeline Value
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-display font-bold text-neon-cyan">{totalDeals}</div>
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
            Active Deals
          </div>
        </div>
      </div>

      {/* Pipeline Bar Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pipelineData} layout="vertical" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
            <XAxis
              type="number"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={{ stroke: "rgba(0, 240, 255, 0.2)" }}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value
              }
            />
            <YAxis
              dataKey="stage"
              type="category"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "rgba(0, 240, 255, 0.2)" }}
              width={80}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-void-surface/95 border border-neon-cyan/30 rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-sm font-medium text-white">{data.stage}</p>
                    <p className="text-xs text-neon-cyan">
                      {data.count} deals - {formatCurrency(data.value)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {pipelineData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// =============================================================================
// QUICK ACTIONS WIDGET
// =============================================================================

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  color: "cyan" | "purple" | "green" | "gold";
}

function QuickActionsWidget() {
  const actions: QuickAction[] = [
    {
      id: "new-contact",
      label: "New Contact",
      icon: Users,
      onClick: () => console.log("Create new contact"),
      color: "cyan",
    },
    {
      id: "new-deal",
      label: "New Deal",
      icon: Briefcase,
      onClick: () => console.log("Create new deal"),
      color: "purple",
    },
    {
      id: "send-email",
      label: "Send Email",
      icon: Mail,
      onClick: () => console.log("Send email"),
      color: "green",
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: Calendar,
      onClick: () => console.log("Open scheduler"),
      color: "gold",
    },
  ];

  const colorStyles = {
    cyan: "bg-neon-cyan/5 hover:bg-neon-cyan/15 border-neon-cyan/30 hover:border-neon-cyan/50 text-neon-cyan",
    purple:
      "bg-neon-purple/5 hover:bg-neon-purple/15 border-neon-purple/30 hover:border-neon-purple/50 text-neon-purple",
    green:
      "bg-neon-green/5 hover:bg-neon-green/15 border-neon-green/30 hover:border-neon-green/50 text-neon-green",
    gold: "bg-neon-gold/5 hover:bg-neon-gold/15 border-neon-gold/30 hover:border-neon-gold/50 text-neon-gold",
  };

  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all",
              colorStyles[action.color]
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-mono uppercase tracking-wider">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// WIDGET SELECTOR MODAL
// =============================================================================

interface WidgetSelectorProps {
  activeWidgets: WidgetType[];
  onAdd: (type: WidgetType) => void;
  onClose: () => void;
}

function WidgetSelector({ activeWidgets, onAdd, onClose }: WidgetSelectorProps) {
  const availableWidgets = Object.values(WIDGET_CONFIGS).filter(
    (config) => !activeWidgets.includes(config.type)
  );

  if (availableWidgets.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
        <div className="bg-void-surface border border-neon-cyan/30 rounded-holo p-6 max-w-md shadow-neon-cyan">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-neon-cyan uppercase tracking-wider">
              Add Widget
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-neon-cyan/10 rounded">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">All widgets are already active.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-void-surface border border-neon-cyan/30 rounded-holo p-6 max-w-lg w-full mx-4 shadow-neon-cyan"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg text-neon-cyan uppercase tracking-wider">
            Add Widget
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-neon-cyan/10 rounded">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {availableWidgets.map((config) => {
            const Icon = config.icon;
            return (
              <button
                key={config.id}
                onClick={() => {
                  onAdd(config.type);
                  onClose();
                }}
                className="flex flex-col items-start gap-3 p-4 rounded-lg border border-neon-cyan/20 bg-neon-cyan/5 hover:bg-neon-cyan/10 hover:border-neon-cyan/40 transition-all text-left"
              >
                <div className="p-2 rounded-lg bg-neon-cyan/10">
                  <Icon className="h-5 w-5 text-neon-cyan" />
                </div>
                <div>
                  <p className="font-medium text-gray-200">{config.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CUSTOMIZABLE DASHBOARD COMPONENT
// =============================================================================

interface CustomizableDashboardProps {
  className?: string;
}

export function CustomizableDashboard({ className }: CustomizableDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [editable, setEditable] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(DEFAULT_WIDGETS);
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.layouts) setLayouts(parsed.layouts);
        if (parsed.activeWidgets) setActiveWidgets(parsed.activeWidgets);
      } catch (e) {
        console.error("Failed to parse saved layout:", e);
      }
    }
  }, []);

  // Save to localStorage
  const saveLayout = useCallback((newLayouts: Layouts, newWidgets: WidgetType[]) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ layouts: newLayouts, activeWidgets: newWidgets })
    );
  }, []);

  // Handle layout change
  const handleLayoutChange = useCallback(
    (_currentLayout: Layout[], allLayouts: Layouts) => {
      setLayouts(allLayouts);
      saveLayout(allLayouts, activeWidgets);
    },
    [activeWidgets, saveLayout]
  );

  // Add widget
  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      if (activeWidgets.includes(type)) return;

      const config = WIDGET_CONFIGS[type];
      const newWidget: Layout = {
        i: type,
        x: 0,
        y: Infinity, // Add at bottom
        w: config.defaultSize.w,
        h: config.defaultSize.h,
        minW: config.minSize.w,
        minH: config.minSize.h,
      };

      const newLayouts = { ...layouts };
      Object.keys(newLayouts).forEach((breakpoint) => {
        newLayouts[breakpoint] = [...(newLayouts[breakpoint] || []), newWidget];
      });

      const newWidgets = [...activeWidgets, type];
      setActiveWidgets(newWidgets);
      setLayouts(newLayouts);
      saveLayout(newLayouts, newWidgets);
    },
    [activeWidgets, layouts, saveLayout]
  );

  // Remove widget
  const handleRemoveWidget = useCallback(
    (id: string) => {
      const newWidgets = activeWidgets.filter((w) => w !== id);
      const newLayouts = { ...layouts };
      Object.keys(newLayouts).forEach((breakpoint) => {
        newLayouts[breakpoint] = (newLayouts[breakpoint] || []).filter(
          (l) => l.i !== id
        );
      });

      setActiveWidgets(newWidgets);
      setLayouts(newLayouts);
      saveLayout(newLayouts, newWidgets);
    },
    [activeWidgets, layouts, saveLayout]
  );

  // Reset layout
  const handleResetLayout = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS);
    setActiveWidgets(DEFAULT_WIDGETS);
    saveLayout(DEFAULT_LAYOUTS, DEFAULT_WIDGETS);
  }, [saveLayout]);

  // Render widget content
  const renderWidget = (type: WidgetType) => {
    switch (type) {
      case "stats":
        return <StatsWidget />;
      case "activity":
        return <ActivityWidget />;
      case "leadScore":
        return <LeadScoreWidget />;
      case "pipeline":
        return <PipelineWidget />;
      case "quickActions":
        return <QuickActionsWidget />;
      default:
        return null;
    }
  };

  if (!mounted) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin" />
          <span className="text-sm text-neon-cyan/50 font-mono uppercase tracking-wider">
            Initializing Dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Dashboard Header / Controls */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-neon-cyan" />
          <h2 className="font-display text-lg uppercase tracking-wider text-white">
            Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <>
              <button
                onClick={() => setShowWidgetSelector(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 hover:bg-neon-cyan/10 text-neon-cyan text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="font-mono text-xs uppercase tracking-wider">
                  Add Widget
                </span>
              </button>
              <button
                onClick={handleResetLayout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neon-purple/30 bg-neon-purple/5 hover:bg-neon-purple/10 text-neon-purple text-sm transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="font-mono text-xs uppercase tracking-wider">Reset</span>
              </button>
            </>
          )}
          <button
            onClick={() => setEditable(!editable)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors",
              editable
                ? "border-neon-green/50 bg-neon-green/10 text-neon-green"
                : "border-gray-600 bg-gray-800/50 text-gray-400 hover:text-gray-200"
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-wider">
              {editable ? "Done" : "Edit"}
            </span>
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <style jsx global>{`
        .customizable-dashboard .react-grid-layout {
          position: relative;
        }
        .customizable-dashboard .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        .customizable-dashboard .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }
        .customizable-dashboard .react-grid-item.react-grid-placeholder {
          background: rgba(0, 240, 255, 0.1);
          border: 2px dashed rgba(0, 240, 255, 0.4);
          border-radius: 12px;
          opacity: 0.8;
          z-index: 2;
        }
        .customizable-dashboard .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        .customizable-dashboard .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-right: 2px solid rgba(0, 240, 255, 0.5);
          border-bottom: 2px solid rgba(0, 240, 255, 0.5);
        }
        .customizable-dashboard .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.9;
        }
        .customizable-dashboard .react-grid-item > .react-resizable-handle {
          display: ${editable ? "block" : "none"};
        }
      `}</style>

      <div className="customizable-dashboard">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={100}
          isDraggable={editable}
          isResizable={editable}
          draggableHandle=".drag-handle"
          onLayoutChange={handleLayoutChange}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
        >
          {activeWidgets.map((type) => {
            const config = WIDGET_CONFIGS[type];
            return (
              <div key={type} className="relative">
                <WidgetWrapper
                  id={type}
                  title={config.title}
                  icon={config.icon}
                  editable={editable}
                  onRemove={handleRemoveWidget}
                >
                  {renderWidget(type)}
                </WidgetWrapper>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>

      {/* Widget Selector Modal */}
      {showWidgetSelector && (
        <WidgetSelector
          activeWidgets={activeWidgets}
          onAdd={handleAddWidget}
          onClose={() => setShowWidgetSelector(false)}
        />
      )}
    </div>
  );
}

export default CustomizableDashboard;
