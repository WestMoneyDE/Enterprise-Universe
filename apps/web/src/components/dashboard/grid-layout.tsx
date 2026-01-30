"use client";

import * as React from "react";
import RGL from "react-grid-layout";
import type { Layout } from "react-grid-layout";

// WidthProvider is a HOC that provides width to grid
const WidthProvider = require("react-grid-layout").WidthProvider;
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

import "react-grid-layout/css/styles.css";

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD GRID LAYOUT - Drag and drop grid layout for widgets
// ═══════════════════════════════════════════════════════════════════════════════

const ResponsiveGridLayout = WidthProvider(RGL);

export interface DashboardWidget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

interface DashboardGridLayoutProps {
  widgets: DashboardWidget[];
  children: React.ReactNode;
  onLayoutChange?: (layout: Layout[]) => void;
  editable?: boolean;
  className?: string;
  rowHeight?: number;
  cols?: number;
}

export function DashboardGridLayout({
  widgets,
  children,
  onLayoutChange,
  editable = false,
  className,
  rowHeight = 100,
  cols = 12,
}: DashboardGridLayoutProps) {
  const layout = widgets.map((widget) => ({
    i: widget.id,
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
    ...(widget.minW !== undefined && { minW: widget.minW }),
    ...(widget.minH !== undefined && { minH: widget.minH }),
    ...(widget.maxW !== undefined && { maxW: widget.maxW }),
    ...(widget.maxH !== undefined && { maxH: widget.maxH }),
    ...(widget.static !== undefined && { static: widget.static }),
  })) as unknown as Layout[];

  const childArray = React.Children.toArray(children);

  return (
    <div className={cn("dashboard-grid", className)}>
      <style jsx global>{`
        .dashboard-grid .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        .dashboard-grid .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }
        .dashboard-grid .react-grid-item.react-grid-placeholder {
          background: rgba(0, 240, 255, 0.1);
          border: 2px dashed rgba(0, 240, 255, 0.4);
          border-radius: 12px;
          opacity: 0.8;
          transition-duration: 100ms;
          z-index: 2;
        }
        .dashboard-grid .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        .dashboard-grid .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-right: 2px solid rgba(0, 240, 255, 0.5);
          border-bottom: 2px solid rgba(0, 240, 255, 0.5);
        }
        .dashboard-grid .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.9;
        }
        .dashboard-grid .react-grid-item.react-grid-item > .react-resizable-handle {
          display: ${editable ? "block" : "none"};
        }
      `}</style>
      <ResponsiveGridLayout
        layout={layout}
        cols={cols}
        rowHeight={rowHeight}
        isDraggable={editable}
        isResizable={editable}
        onLayoutChange={onLayoutChange}
        draggableHandle=".drag-handle"
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        {widgets.map((widget, index) => (
          <div key={widget.id} className="relative">
            {editable && (
              <div className="drag-handle absolute top-2 right-2 z-10 cursor-grab rounded p-1 hover:bg-neon-cyan/10 active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-neon-cyan/50" />
              </div>
            )}
            {childArray[index]}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}

// Save/Load layout utilities
export function saveLayoutToStorage(layout: Layout[], key = "dashboard-layout") {
  localStorage.setItem(key, JSON.stringify(layout));
}

export function loadLayoutFromStorage(key = "dashboard-layout"): Layout[] | null {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
}
