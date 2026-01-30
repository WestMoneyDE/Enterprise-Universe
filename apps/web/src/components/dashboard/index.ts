// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENTS - Widget library for dashboards
// ═══════════════════════════════════════════════════════════════════════════════

export { KPICard, KPIGrid } from "./kpi-card";
export {
  AreaChartWidget,
  BarChartWidget,
  LineChartWidget,
  PieChartWidget,
} from "./charts";
export { ActivityFeedWidget, RealtimeActivityFeed } from "./activity-feed-widget";
export { QuickActionsWidget } from "./quick-actions-widget";
export {
  DashboardGridLayout,
  saveLayoutToStorage,
  loadLayoutFromStorage,
} from "./grid-layout";
export type { DashboardWidget } from "./grid-layout";

// Customizable Dashboard with drag-and-drop widgets
export { CustomizableDashboard } from "./customizable-dashboard";
export type { WidgetType, WidgetConfig } from "./customizable-dashboard";
