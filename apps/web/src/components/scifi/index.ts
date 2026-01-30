// ═══════════════════════════════════════════════════════════════════════════════
// SCIFI COMPONENT LIBRARY - Cyberpunk Neon Design System
// Export all SciFi components from a single entry point
// ═══════════════════════════════════════════════════════════════════════════════

// Cards
export { default as HoloCard, StatCard } from "./HoloCard";
export type { HoloCardProps, StatCardProps } from "./HoloCard";

// Buttons
export { default as NeonButton, IconButton, PowerButton } from "./NeonButton";
export type { NeonButtonProps, IconButtonProps, PowerButtonProps } from "./NeonButton";

// Navigation
export { default as SciFiSidebar } from "./SciFiSidebar";
export type { SciFiSidebarProps, NavModule } from "./SciFiSidebar";

// Terminal
export { default as Terminal, TerminalOutput, CommandBadge } from "./Terminal";
export type { TerminalProps, TerminalLine, TerminalOutputProps, CommandBadgeProps } from "./Terminal";

// Stats & Metrics
export {
  default as StatsGrid,
  MetricRing,
  DataBar,
  ActivityIndicator,
  LiveCounter,
} from "./StatsGrid";
export type {
  StatsGridProps,
  StatItem,
  MetricRingProps,
  DataBarProps,
  ActivityIndicatorProps,
  LiveCounterProps,
} from "./StatsGrid";

// Power Mode System
export {
  PowerModeProvider,
  PowerModeToggle,
  usePowerMode,
} from "./PowerModeContext";
export type { PowerMode } from "./PowerModeContext";

// Command Palette - disabled pending cmdk package installation
// export { default as CommandPalette } from "./CommandPalette";

// AI Chat
export { default as AIChat } from "./AIChat";

// Notifications
export { default as NotificationsPanel, NotificationToast } from "./NotificationsPanel";
export type { Notification, NotificationsPanelProps, NotificationToastProps } from "./NotificationsPanel";

// Activity Feed
export { default as ActivityFeed, MiniActivityIndicator } from "./ActivityFeed";
export type { Activity, ActivityFeedProps, MiniActivityIndicatorProps } from "./ActivityFeed";

// System Health Monitor
export { default as SystemHealthMonitor, MiniHealthIndicator } from "./SystemHealthMonitor";
export type { SystemMetric, ServiceStatus, SystemHealthMonitorProps, MiniHealthIndicatorProps } from "./SystemHealthMonitor";

// Quick Actions
export { default as QuickActions, FloatingActionButton } from "./QuickActions";
export type { QuickAction, QuickActionsProps, FloatingActionButtonProps } from "./QuickActions";
