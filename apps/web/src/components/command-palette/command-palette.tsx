"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  Users,
  BarChart3,
  Settings,
  Home,
  MessageSquare,
  Target,
  Briefcase,
  Bot,
  FileText,
  Plus,
  ArrowRight,
  Zap,
  Moon,
  Sun,
  LogOut,
  User,
  Building,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// COMMAND PALETTE - Global search and quick actions (Cmd+K)
// =============================================================================

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string[];
  action: () => void;
  category: "navigation" | "actions" | "settings" | "search";
  keywords?: string[];
}

export interface CommandPaletteProps {
  className?: string;
}

export function CommandPalette({ className }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset search when closed
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const runCommand = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  // Define command items
  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        description: "Main overview page",
        icon: Home,
        shortcut: ["G", "D"],
        action: () => router.push("/scifi"),
        category: "navigation",
        keywords: ["home", "overview", "main"],
      },
      {
        id: "nav-contacts",
        label: "Go to Contacts",
        description: "CRM contact management",
        icon: Users,
        shortcut: ["G", "C"],
        action: () => router.push("/scifi/contacts"),
        category: "navigation",
        keywords: ["crm", "people", "customers"],
      },
      {
        id: "nav-deals",
        label: "Go to Deals",
        description: "Sales pipeline",
        icon: Briefcase,
        shortcut: ["G", "P"],
        action: () => router.push("/scifi/deals"),
        category: "navigation",
        keywords: ["sales", "pipeline", "opportunities"],
      },
      {
        id: "nav-analytics",
        label: "Go to Analytics",
        description: "Performance metrics",
        icon: BarChart3,
        shortcut: ["G", "A"],
        action: () => router.push("/scifi/analytics"),
        category: "navigation",
        keywords: ["stats", "metrics", "reports"],
      },
      {
        id: "nav-ai",
        label: "Go to AI Agent",
        description: "MAX AI configuration",
        icon: Bot,
        shortcut: ["G", "I"],
        action: () => router.push("/scifi/ai"),
        category: "navigation",
        keywords: ["bot", "assistant", "automation"],
      },
      {
        id: "nav-scoring",
        label: "Go to Lead Scoring",
        description: "Lead qualification scores",
        icon: Target,
        shortcut: ["G", "L"],
        action: () => router.push("/scifi/lead-scoring"),
        category: "navigation",
        keywords: ["leads", "grades", "qualification"],
      },
      {
        id: "nav-whatsapp",
        label: "Go to WhatsApp",
        description: "Message center",
        icon: MessageSquare,
        shortcut: ["G", "W"],
        action: () => router.push("/scifi/whatsapp"),
        category: "navigation",
        keywords: ["chat", "messages", "conversations"],
      },

      // Actions
      {
        id: "action-new-contact",
        label: "New Contact",
        description: "Create a new contact",
        icon: Plus,
        shortcut: ["N", "C"],
        action: () => {
          router.push("/scifi/contacts?action=new");
        },
        category: "actions",
        keywords: ["create", "add", "person"],
      },
      {
        id: "action-new-deal",
        label: "New Deal",
        description: "Create a new deal",
        icon: Plus,
        shortcut: ["N", "D"],
        action: () => {
          router.push("/scifi/deals?action=new");
        },
        category: "actions",
        keywords: ["create", "add", "opportunity"],
      },
      {
        id: "action-export",
        label: "Export Data",
        description: "Export current view to CSV/Excel",
        icon: FileText,
        action: () => {
          // Trigger export modal
          window.dispatchEvent(new CustomEvent("nexus:export"));
        },
        category: "actions",
        keywords: ["download", "csv", "excel", "pdf"],
      },
      {
        id: "action-refresh",
        label: "Refresh Data",
        description: "Reload current page data",
        icon: Zap,
        shortcut: ["R"],
        action: () => {
          window.location.reload();
        },
        category: "actions",
        keywords: ["reload", "update"],
      },

      // Settings
      {
        id: "settings-profile",
        label: "Profile Settings",
        description: "Edit your profile",
        icon: User,
        action: () => router.push("/settings/profile"),
        category: "settings",
        keywords: ["account", "user"],
      },
      {
        id: "settings-organization",
        label: "Organization Settings",
        description: "Manage organization",
        icon: Building,
        action: () => router.push("/settings/organization"),
        category: "settings",
        keywords: ["company", "team"],
      },
      {
        id: "settings-logout",
        label: "Sign Out",
        description: "Log out of your account",
        icon: LogOut,
        action: () => {
          window.location.href = "/api/auth/signout";
        },
        category: "settings",
        keywords: ["logout", "exit"],
      },
    ],
    [router]
  );

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      actions: [],
      settings: [],
      search: [],
    };

    commands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [commands]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Command Dialog */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl">
        <Command
          className={cn(
            "rounded-xl border border-cyan-500/30 bg-gray-900/95 shadow-2xl shadow-cyan-500/10",
            "overflow-hidden",
            className
          )}
          loop
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-cyan-500/20 px-4">
            <Search className="h-4 w-4 text-cyan-500" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search commands, pages, or actions..."
              className="flex-1 bg-transparent py-4 px-3 text-white placeholder:text-gray-500 outline-none"
            />
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-gray-700 bg-gray-800 px-2 font-mono text-xs text-gray-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            {groupedCommands.navigation.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-xs font-semibold text-cyan-500 uppercase tracking-wider">
                    Navigation
                  </span>
                }
              >
                {groupedCommands.navigation.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                    onSelect={() => runCommand(item.action)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-300 hover:bg-cyan-500/10 hover:text-white data-[selected=true]:bg-cyan-500/20 data-[selected=true]:text-white transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-cyan-500" />
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500">{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <div className="flex gap-1">
                        {item.shortcut.map((key) => (
                          <kbd
                            key={key}
                            className="h-5 min-w-5 flex items-center justify-center rounded bg-gray-800 px-1.5 font-mono text-[10px] text-gray-400"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Actions */}
            {groupedCommands.actions.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Quick Actions
                  </span>
                }
              >
                {groupedCommands.actions.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                    onSelect={() => runCommand(item.action)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-300 hover:bg-purple-500/10 hover:text-white data-[selected=true]:bg-purple-500/20 data-[selected=true]:text-white transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-purple-400" />
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500">{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <div className="flex gap-1">
                        {item.shortcut.map((key) => (
                          <kbd
                            key={key}
                            className="h-5 min-w-5 flex items-center justify-center rounded bg-gray-800 px-1.5 font-mono text-[10px] text-gray-400"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Settings */}
            {groupedCommands.settings.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Settings
                  </span>
                }
              >
                {groupedCommands.settings.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                    onSelect={() => runCommand(item.action)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-300 hover:bg-gray-700/50 hover:text-white data-[selected=true]:bg-gray-700 data-[selected=true]:text-white transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500">{item.description}</div>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-cyan-500/20 px-4 py-2 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-gray-800 px-1.5 py-0.5">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-gray-800 px-1.5 py-0.5">↵</kbd>
                Select
              </span>
            </div>
            <span className="text-cyan-500/70">NEXUS Command</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

// Hook for opening command palette programmatically
export function useCommandPalette() {
  const open = useCallback(() => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, []);

  return { open };
}
