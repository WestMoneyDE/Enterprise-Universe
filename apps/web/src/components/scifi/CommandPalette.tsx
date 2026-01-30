"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BarChart3,
  Bot,
  Braces,
  Calendar,
  Code2,
  CreditCard,
  FileText,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  Terminal,
  User,
  Users,
  Zap,
  Search,
  Cpu,
  Shield,
  Globe,
  Database,
  Rocket,
  Brain,
  Wand2,
  X,
} from "lucide-react";
import { usePowerMode } from "./PowerModeContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group: string;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { mode: powerMode } = usePowerMode();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isGodMode = powerMode === "god";
  const isUltraMode = powerMode === "ultra";

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard shortcut to open
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  const getAccentColor = () => {
    if (isGodMode) return "text-god-primary";
    if (isUltraMode) return "text-ultra-secondary";
    return "text-neon-cyan";
  };

  const getBorderColor = () => {
    if (isGodMode) return "border-god-primary/50";
    if (isUltraMode) return "border-ultra-secondary/50";
    return "border-neon-cyan/50";
  };

  const getGlowColor = () => {
    if (isGodMode) return "shadow-[0_0_50px_rgba(255,215,0,0.3)]";
    if (isUltraMode) return "shadow-[0_0_50px_rgba(192,192,255,0.3)]";
    return "shadow-[0_0_50px_rgba(0,255,255,0.2)]";
  };

  const commands: CommandItem[] = [
    // Nexus AI
    {
      id: "ai-hub",
      label: "NEXUS AI Hub öffnen",
      icon: <Sparkles className="h-4 w-4" />,
      shortcut: "⌘A",
      action: () => router.push("/scifi/nexus-ai"),
      group: "NEXUS AI",
    },
    {
      id: "ai-chat",
      label: "Neuer AI Chat",
      icon: <MessageSquare className="h-4 w-4" />,
      action: () => router.push("/scifi/nexus-ai?tab=chat"),
      group: "NEXUS AI",
    },
    {
      id: "ai-analyze",
      label: "Daten mit AI analysieren",
      icon: <Brain className="h-4 w-4" />,
      action: () => router.push("/scifi/nexus-ai?tab=analyze"),
      group: "NEXUS AI",
    },
    {
      id: "ai-generate",
      label: "Content generieren",
      icon: <Wand2 className="h-4 w-4" />,
      action: () => router.push("/scifi/nexus-ai?tab=generate"),
      group: "NEXUS AI",
    },
    // Nexus Code
    {
      id: "code-editor",
      label: "Code Terminal öffnen",
      icon: <Code2 className="h-4 w-4" />,
      shortcut: "⌘E",
      action: () => router.push("/scifi/nexus-code"),
      group: "NEXUS CODE",
    },
    {
      id: "code-terminal",
      label: "Neues Terminal",
      icon: <Terminal className="h-4 w-4" />,
      shortcut: "⌘T",
      action: () => router.push("/scifi/nexus-code?new=terminal"),
      group: "NEXUS CODE",
    },
    {
      id: "code-snippets",
      label: "Code Snippets",
      icon: <Braces className="h-4 w-4" />,
      action: () => router.push("/scifi/nexus-code?tab=snippets"),
      group: "NEXUS CODE",
    },
    // Navigation
    {
      id: "nav-dashboard",
      label: "Command Center",
      icon: <Cpu className="h-4 w-4" />,
      shortcut: "⌘D",
      action: () => router.push("/scifi"),
      group: "NAVIGATION",
    },
    {
      id: "nav-analytics",
      label: "Analytics Hub",
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => router.push("/scifi/analytics"),
      group: "NAVIGATION",
    },
    {
      id: "nav-customers",
      label: "Kunden Matrix",
      icon: <Users className="h-4 w-4" />,
      action: () => router.push("/scifi/customers"),
      group: "NAVIGATION",
    },
    {
      id: "nav-products",
      label: "Produkt Arsenal",
      icon: <Package className="h-4 w-4" />,
      action: () => router.push("/scifi/products"),
      group: "NAVIGATION",
    },
    {
      id: "nav-invoices",
      label: "Rechnungen",
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push("/scifi/invoices"),
      group: "NAVIGATION",
    },
    // Quick Actions
    {
      id: "action-new-customer",
      label: "Neuer Kunde",
      icon: <User className="h-4 w-4" />,
      shortcut: "⌘N",
      action: () => router.push("/scifi/customers/new"),
      group: "SCHNELLAKTIONEN",
    },
    {
      id: "action-new-invoice",
      label: "Neue Rechnung",
      icon: <CreditCard className="h-4 w-4" />,
      action: () => router.push("/scifi/invoices/new"),
      group: "SCHNELLAKTIONEN",
    },
    {
      id: "action-deploy",
      label: "Deployment starten",
      icon: <Rocket className="h-4 w-4" />,
      action: () => router.push("/scifi/nexus-code?action=deploy"),
      group: "SCHNELLAKTIONEN",
    },
    // System
    {
      id: "sys-settings",
      label: "System Einstellungen",
      icon: <Settings className="h-4 w-4" />,
      shortcut: "⌘,",
      action: () => router.push("/scifi/settings"),
      group: "SYSTEM",
    },
    {
      id: "sys-security",
      label: "Sicherheit & Zugriff",
      icon: <Shield className="h-4 w-4" />,
      action: () => router.push("/scifi/settings/security"),
      group: "SYSTEM",
    },
    {
      id: "sys-database",
      label: "Datenbank Monitor",
      icon: <Database className="h-4 w-4" />,
      action: () => router.push("/scifi/system/database"),
      group: "SYSTEM",
    },
  ];

  // Group commands
  const groupedCommands = commands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.group]) {
      acc[cmd.group] = [];
    }
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Dialog */}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-2xl">
        <Command
          className={`
            rounded-xl border ${getBorderColor()} bg-gray-900/95 backdrop-blur-xl
            ${getGlowColor()} overflow-hidden
          `}
        >
          {/* Header */}
          <div className={`flex items-center gap-3 border-b ${getBorderColor()} px-4 py-3`}>
            <Search className={`h-5 w-5 ${getAccentColor()}`} />
            <Command.Input
              ref={inputRef}
              placeholder="Befehle suchen, navigieren, AI starten..."
              className="flex-1 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Command List */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-gray-500 text-sm">
              Keine Ergebnisse gefunden.
            </Command.Empty>

            {Object.entries(groupedCommands).map(([group, items]) => (
              <Command.Group
                key={group}
                heading={
                  <div className={`px-2 py-2 text-xs font-semibold ${getAccentColor()} uppercase tracking-wider`}>
                    {group}
                  </div>
                }
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.group}`}
                    onSelect={() => runCommand(item.action)}
                    className={`
                      flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer
                      text-gray-300 text-sm
                      hover:bg-gray-800/80 hover:text-white
                      data-[selected=true]:bg-gray-800 data-[selected=true]:text-white
                      transition-colors
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className={getAccentColor()}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <kbd className="px-2 py-1 rounded bg-gray-800 text-gray-400 text-xs font-mono">
                        {item.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className={`flex items-center justify-between border-t ${getBorderColor()} px-4 py-2 text-xs text-gray-500`}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800">↑↓</kbd>
                navigieren
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800">↵</kbd>
                ausführen
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800">esc</kbd>
                schließen
              </span>
            </div>
            <div className={`flex items-center gap-1 ${getAccentColor()}`}>
              <Zap className="h-3 w-3" />
              <span>NEXUS COMMAND</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}

export default CommandPalette;
