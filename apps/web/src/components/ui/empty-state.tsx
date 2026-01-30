import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY STATE - Placeholder for empty data views
// ═══════════════════════════════════════════════════════════════════════════════

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "cyber";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        variant === "cyber" && "bg-void-surface/30 rounded-xl border border-neon-cyan/10",
        className
      )}
      {...props}
    >
      {Icon && (
        <div
          className={cn(
            "mb-4 rounded-full p-4",
            variant === "cyber"
              ? "bg-neon-cyan/10 text-neon-cyan"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3
        className={cn(
          "text-lg font-semibold",
          variant === "cyber" ? "text-neon-cyan font-display" : "text-foreground"
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
