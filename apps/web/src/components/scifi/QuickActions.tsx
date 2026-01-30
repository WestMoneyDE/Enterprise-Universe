"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS - Command bar for rapid access to common operations
// Cyberpunk-styled action buttons with keyboard shortcuts
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  category?: "navigation" | "ai" | "system" | "data";
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger" | "success";
  badge?: string | number;
}

export interface QuickActionsProps {
  actions?: QuickAction[];
  showShortcuts?: boolean;
  showCategories?: boolean;
  compact?: boolean;
  className?: string;
}

const categoryConfig = {
  navigation: { label: "Navigate", icon: "⬡", color: "text-neon-cyan" },
  ai: { label: "AI Tools", icon: "◎", color: "text-neon-purple" },
  system: { label: "System", icon: "⚙", color: "text-neon-orange" },
  data: { label: "Data", icon: "◈", color: "text-neon-green" },
};

const variantConfig = {
  default: {
    bg: "bg-void-surface/50 hover:bg-void-surface",
    border: "border-white/10 hover:border-neon-cyan/30",
    text: "text-white/70 hover:text-white",
    glow: "",
  },
  primary: {
    bg: "bg-neon-cyan/10 hover:bg-neon-cyan/20",
    border: "border-neon-cyan/30 hover:border-neon-cyan/50",
    text: "text-neon-cyan",
    glow: "hover:shadow-lg hover:shadow-neon-cyan/20",
  },
  danger: {
    bg: "bg-neon-red/10 hover:bg-neon-red/20",
    border: "border-neon-red/30 hover:border-neon-red/50",
    text: "text-neon-red",
    glow: "hover:shadow-lg hover:shadow-neon-red/20",
  },
  success: {
    bg: "bg-neon-green/10 hover:bg-neon-green/20",
    border: "border-neon-green/30 hover:border-neon-green/50",
    text: "text-neon-green",
    glow: "hover:shadow-lg hover:shadow-neon-green/20",
  },
};

export default function QuickActions({
  actions = defaultActions,
  showShortcuts = true,
  showCategories = true,
  compact = false,
  className,
}: QuickActionsProps) {
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      const action = actions.find(a => {
        if (!a.shortcut) return false;
        const key = a.shortcut.toLowerCase().replace(/[⌘⌥⇧]/g, "").trim();
        return e.key.toLowerCase() === key;
      });

      if (action && !action.disabled) {
        e.preventDefault();
        setActiveShortcut(action.id);
        setTimeout(() => setActiveShortcut(null), 200);
        action.onClick?.();
      }
    }
  }, [actions]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Group actions by category
  const groupedActions = showCategories
    ? actions.reduce((groups, action) => {
        const category = action.category || "navigation";
        if (!groups[category]) groups[category] = [];
        groups[category].push(action);
        return groups;
      }, {} as Record<string, QuickAction[]>)
    : { all: actions };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {actions.slice(0, 5).map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            isActive={activeShortcut === action.id}
            showShortcut={false}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-void-surface/80 backdrop-blur-xl rounded-xl",
      "border border-white/10 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-lg">⚡</span>
          <h3 className="text-sm font-display font-bold text-white/90 uppercase tracking-wider">
            Quick Actions
          </h3>
        </div>
        <div className="text-[10px] font-mono text-white/40">
          {actions.length} available
        </div>
      </div>

      {/* Action Groups */}
      <div className="p-3 space-y-4">
        {Object.entries(groupedActions).map(([category, categoryActions]) => (
          <div key={category}>
            {showCategories && category !== "all" && (
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "text-sm",
                  categoryConfig[category as keyof typeof categoryConfig]?.color || "text-white/50"
                )}>
                  {categoryConfig[category as keyof typeof categoryConfig]?.icon || "◇"}
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  {categoryConfig[category as keyof typeof categoryConfig]?.label || category}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {categoryActions.map((action) => (
                <ActionButton
                  key={action.id}
                  action={action}
                  isActive={activeShortcut === action.id}
                  showShortcut={showShortcuts}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Keyboard Hint */}
      {showShortcuts && (
        <div className="px-4 py-2 border-t border-white/5 bg-void/50">
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-white/30">
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded">⌘</kbd>
            <span>+</span>
            <span>Key for shortcuts</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION BUTTON - Individual action button with effects
// ═══════════════════════════════════════════════════════════════════════════════

interface ActionButtonProps {
  action: QuickAction;
  isActive: boolean;
  showShortcut?: boolean;
  compact?: boolean;
}

function ActionButton({ action, isActive, showShortcut = true, compact = false }: ActionButtonProps) {
  const variant = variantConfig[action.variant || "default"];

  const buttonContent = (
    <>
      {/* Icon */}
      <span className={cn(
        "text-base transition-transform",
        isActive && "scale-110"
      )}>
        {action.icon}
      </span>

      {/* Label */}
      {!compact && (
        <span className="flex-1 text-left text-xs font-medium truncate">
          {action.label}
        </span>
      )}

      {/* Badge */}
      {action.badge !== undefined && (
        <span className={cn(
          "px-1.5 py-0.5 text-[9px] font-mono rounded",
          "bg-neon-cyan/20 text-neon-cyan"
        )}>
          {action.badge}
        </span>
      )}

      {/* Shortcut */}
      {showShortcut && action.shortcut && !compact && (
        <kbd className={cn(
          "px-1.5 py-0.5 text-[9px] font-mono rounded",
          "bg-white/5 text-white/40"
        )}>
          {action.shortcut}
        </kbd>
      )}
    </>
  );

  const buttonClasses = cn(
    "relative flex items-center gap-2 rounded-lg border transition-all duration-200",
    compact ? "p-2" : "px-3 py-2",
    variant.bg,
    variant.border,
    variant.text,
    variant.glow,
    action.disabled && "opacity-50 cursor-not-allowed",
    isActive && "ring-2 ring-neon-cyan/50 scale-[0.98]"
  );

  if (action.href) {
    return (
      <a href={action.href} className={buttonClasses}>
        {buttonContent}
      </a>
    );
  }

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      className={buttonClasses}
    >
      {buttonContent}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING ACTION BUTTON - Single prominent action
// ═══════════════════════════════════════════════════════════════════════════════

export interface FloatingActionButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "success";
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
}

export function FloatingActionButton({
  icon,
  label,
  onClick,
  variant = "primary",
  position = "bottom-right",
  className,
}: FloatingActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const variantStyle = variantConfig[variant];

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed z-50 flex items-center gap-2",
        "rounded-full border transition-all duration-300",
        "shadow-lg",
        variantStyle.bg,
        variantStyle.border,
        variantStyle.text,
        variantStyle.glow,
        isHovered ? "px-4 py-3" : "p-3",
        positionClasses[position],
        className
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className={cn(
        "text-sm font-medium whitespace-nowrap transition-all duration-300",
        isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
      )}>
        {label}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT ACTIONS - Demo actions for preview
// ═══════════════════════════════════════════════════════════════════════════════

const defaultActions: QuickAction[] = [
  // Navigation
  { id: "dashboard", label: "Dashboard", icon: "◉", shortcut: "⌘D", category: "navigation", href: "/scifi" },
  { id: "terminal", label: "Terminal", icon: "⌨", shortcut: "⌘T", category: "navigation", href: "/scifi/terminal" },
  { id: "crm", label: "CRM Hub", icon: "⬡", shortcut: "⌘C", category: "navigation", href: "/scifi/crm" },
  { id: "analytics", label: "Analytics", icon: "📊", category: "navigation", href: "/scifi/analytics" },

  // AI Tools
  { id: "ai-chat", label: "AI Assistant", icon: "◎", shortcut: "⌘I", category: "ai", variant: "primary", badge: "NEW" },
  { id: "ai-analyze", label: "Analyze Data", icon: "◈", category: "ai" },

  // System
  { id: "settings", label: "Settings", icon: "⚙", shortcut: "⌘,", category: "system" },
  { id: "refresh", label: "Refresh All", icon: "↻", shortcut: "⌘R", category: "system" },

  // Data
  { id: "export", label: "Export Data", icon: "↓", category: "data", variant: "success" },
  { id: "sync", label: "Sync Now", icon: "⟳", category: "data" },
];
