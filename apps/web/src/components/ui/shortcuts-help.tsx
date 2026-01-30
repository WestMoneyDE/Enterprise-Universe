"use client";

import * as React from "react";
import { X, Keyboard, Navigation, Zap, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalShortcuts, formatShortcutKeys } from "@/hooks/use-global-shortcuts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";

// ═══════════════════════════════════════════════════════════════════════════════
// SHORTCUTS HELP MODAL - SciFi styled keyboard shortcuts reference
// Cyberpunk Neon Design with dark background and cyan accents
// ═══════════════════════════════════════════════════════════════════════════════

const categoryConfig = {
  navigation: {
    label: "Navigation",
    icon: Navigation,
    color: "neon-cyan",
  },
  actions: {
    label: "Actions",
    icon: Zap,
    color: "neon-purple",
  },
  general: {
    label: "General",
    icon: HelpCircle,
    color: "neon-green",
  },
} as const;

interface ShortcutKeyProps {
  children: React.ReactNode;
  variant?: "cyan" | "purple" | "green";
}

function ShortcutKey({ children, variant = "cyan" }: ShortcutKeyProps) {
  const colorClasses = {
    cyan: "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]",
    purple: "border-neon-purple/50 bg-neon-purple/10 text-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.2)]",
    green: "border-neon-green/50 bg-neon-green/10 text-neon-green shadow-[0_0_10px_rgba(0,255,136,0.2)]",
  };

  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[28px] h-7 px-2",
        "font-mono text-xs font-semibold uppercase tracking-wider",
        "rounded-md border backdrop-blur-sm",
        "transition-all duration-200",
        colorClasses[variant]
      )}
    >
      {children}
    </kbd>
  );
}

interface ShortcutRowProps {
  keys: string[];
  description: string;
  variant?: "cyan" | "purple" | "green";
}

function ShortcutRow({ keys, description, variant = "cyan" }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors group">
      <span className="text-sm text-white/70 group-hover:text-white transition-colors">
        {description}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <ShortcutKey variant={variant}>
              {key.length === 1 ? key.toUpperCase() : formatShortcutKeys([key])}
            </ShortcutKey>
            {index < keys.length - 1 && (
              <span className="text-white/30 text-xs mx-0.5">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

interface ShortcutCategoryProps {
  category: keyof typeof categoryConfig;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

function ShortcutCategory({ category, shortcuts }: ShortcutCategoryProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  const variantMap: Record<string, "cyan" | "purple" | "green"> = {
    "neon-cyan": "cyan",
    "neon-purple": "purple",
    "neon-green": "green",
  };

  const variant = variantMap[config.color] || "cyan";

  if (shortcuts.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Category Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className={cn("w-4 h-4", `text-${config.color}`)} />
        <h3 className={cn(
          "font-display text-sm font-semibold tracking-wider uppercase",
          `text-${config.color}`
        )}>
          {config.label}
        </h3>
        <div className={cn("flex-1 h-px", `bg-${config.color}/20`)} />
      </div>

      {/* Shortcuts List */}
      <div className="space-y-0.5">
        {shortcuts.map((shortcut, index) => (
          <ShortcutRow
            key={index}
            keys={shortcut.keys}
            description={shortcut.description}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ShortcutsHelp() {
  const { helpModalOpen, closeHelpModal, getShortcutsByCategory } = useGlobalShortcuts();
  const shortcutsByCategory = getShortcutsByCategory();

  return (
    <Dialog open={helpModalOpen} onOpenChange={(open) => !open && closeHelpModal()}>
      <DialogContent
        variant="cyber"
        className="max-w-lg bg-void-dark/95 border-neon-cyan/30"
      >
        {/* Custom Header with SciFi styling */}
        <DialogHeader className="pb-4 border-b border-neon-cyan/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Keyboard className="w-6 h-6 text-neon-cyan" />
              <div className="absolute inset-0 animate-ping">
                <Keyboard className="w-6 h-6 text-neon-cyan opacity-30" />
              </div>
            </div>
            <DialogTitle className="font-display text-lg font-bold tracking-wider text-neon-cyan uppercase">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
          <p className="text-xs text-white/50 font-mono mt-2">
            NEXUS COMMAND CENTER // QUICK ACCESS KEYS
          </p>
        </DialogHeader>

        {/* Shortcuts Content */}
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-track-void-surface scrollbar-thumb-neon-cyan/30">
          <ShortcutCategory
            category="navigation"
            shortcuts={shortcutsByCategory.navigation}
          />
          <ShortcutCategory
            category="actions"
            shortcuts={shortcutsByCategory.actions}
          />
          <ShortcutCategory
            category="general"
            shortcuts={shortcutsByCategory.general}
          />
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neon-cyan/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40 font-mono">
              Press <ShortcutKey variant="cyan">?</ShortcutKey> to toggle this modal
            </span>
            <span className="text-white/40 font-mono">
              <ShortcutKey variant="cyan">Esc</ShortcutKey> to close
            </span>
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-neon-cyan/40 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-neon-cyan/40 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-neon-cyan/40 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-neon-cyan/40 rounded-br-lg" />

        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/5 to-transparent animate-scan-line opacity-30" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE TRIGGER BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface ShortcutsHelpTriggerProps {
  className?: string;
}

export function ShortcutsHelpTrigger({ className }: ShortcutsHelpTriggerProps) {
  const { openHelpModal } = useGlobalShortcuts();

  return (
    <button
      onClick={openHelpModal}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-void-surface/80 border border-neon-cyan/20",
        "text-white/70 hover:text-neon-cyan",
        "hover:border-neon-cyan/40 hover:shadow-neon-cyan",
        "transition-all duration-200",
        "font-mono text-sm",
        className
      )}
    >
      <Keyboard className="w-4 h-4" />
      <span>Shortcuts</span>
      <ShortcutKey variant="cyan">?</ShortcutKey>
    </button>
  );
}

export default ShortcutsHelp;
