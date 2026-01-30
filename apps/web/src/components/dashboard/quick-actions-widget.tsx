"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LucideIcon, ChevronRight } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS WIDGET - Grid of action buttons
// ═══════════════════════════════════════════════════════════════════════════════

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "cyan" | "purple" | "green" | "gold" | "red";
  badge?: string;
}

interface QuickActionsWidgetProps {
  actions: QuickAction[];
  title?: string;
  columns?: 2 | 3;
  className?: string;
}

const variantStyles = {
  cyan: {
    bg: "bg-neon-cyan/5 hover:bg-neon-cyan/10",
    border: "border-neon-cyan/20 hover:border-neon-cyan/40",
    icon: "text-neon-cyan",
    badge: "bg-neon-cyan/20 text-neon-cyan",
  },
  purple: {
    bg: "bg-neon-purple/5 hover:bg-neon-purple/10",
    border: "border-neon-purple/20 hover:border-neon-purple/40",
    icon: "text-neon-purple",
    badge: "bg-neon-purple/20 text-neon-purple",
  },
  green: {
    bg: "bg-neon-green/5 hover:bg-neon-green/10",
    border: "border-neon-green/20 hover:border-neon-green/40",
    icon: "text-neon-green",
    badge: "bg-neon-green/20 text-neon-green",
  },
  gold: {
    bg: "bg-neon-gold/5 hover:bg-neon-gold/10",
    border: "border-neon-gold/20 hover:border-neon-gold/40",
    icon: "text-neon-gold",
    badge: "bg-neon-gold/20 text-neon-gold",
  },
  red: {
    bg: "bg-neon-red/5 hover:bg-neon-red/10",
    border: "border-neon-red/20 hover:border-neon-red/40",
    icon: "text-neon-red",
    badge: "bg-neon-red/20 text-neon-red",
  },
};

export function QuickActionsWidget({
  actions,
  title = "Schnellaktionen",
  columns = 2,
  className,
}: QuickActionsWidgetProps) {
  const gridCols = columns === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <Card variant="holo" className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-neon-cyan font-display text-sm uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-3", gridCols)}>
          {actions.map((action) => {
            const styles = variantStyles[action.variant || "cyan"];
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className={cn(
                  "group relative flex flex-col items-start gap-2 rounded-lg border p-4 transition-all",
                  styles.bg,
                  styles.border
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className={cn("rounded-md p-2", styles.bg)}>
                    <Icon className={cn("h-5 w-5", styles.icon)} />
                  </div>
                  {action.badge && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        styles.badge
                      )}
                    >
                      {action.badge}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-200">
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {action.description}
                    </p>
                  )}
                </div>
                <ChevronRight
                  className={cn(
                    "absolute bottom-4 right-4 h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1",
                    styles.icon
                  )}
                />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
