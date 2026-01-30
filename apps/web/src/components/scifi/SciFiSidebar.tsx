"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// SCIFI SIDEBAR - Navigation Component
// Cyberpunk design with module icons and glow effects
// ═══════════════════════════════════════════════════════════════════════════════

// Module definitions
export interface NavModule {
  id: string;
  name: string;
  icon: string;
  route: string;
  badge?: string | number;
  status?: "online" | "offline" | "warning";
}

const NEXUS_MODULES: NavModule[] = [
  { id: "command-deck", name: "COMMAND DECK", icon: "◈", route: "/scifi", status: "online" },
  { id: "systems", name: "SYSTEMS MONITOR", icon: "◎", route: "/scifi/systems", badge: "NEW", status: "online" },
  { id: "nexus-ai", name: "NEXUS AI", icon: "神", route: "/scifi/nexus-ai", badge: "NEW", status: "online" },
  { id: "nexus-code", name: "NEXUS CODE", icon: "▣", route: "/scifi/nexus-code", badge: "DEV", status: "online" },
  { id: "whatsapp", name: "WHATSAPP CONSOLE", icon: "◉", route: "/scifi/whatsapp", status: "online" },
  { id: "crm", name: "CRM NEXUS", icon: "◆", route: "/scifi/crm" },
  { id: "construction", name: "WEST MONEY BAU", icon: "⬡", route: "/scifi/construction", badge: "NEW" },
  { id: "bauherren-pass", name: "BAUHERREN PASS", icon: "◈", route: "/scifi/bauherren-pass", badge: "VIP", status: "online" },
  { id: "kundenkarte", name: "KUNDENKARTE", icon: "◎", route: "/scifi/kundenkarte", badge: "NEU", status: "online" },
  { id: "money-machine", name: "MONEY MACHINE", icon: "⚙", route: "/scifi/money-machine", badge: "AUTO", status: "online" },
  { id: "automation", name: "AUTOMATION", icon: "⚡", route: "/scifi/automation" },
  { id: "analytics", name: "ANALYTICS", icon: "◇", route: "/scifi/analytics" },
  { id: "security", name: "DEDSEC SHIELD", icon: "◐", route: "/scifi/security", status: "online" },
  { id: "market", name: "GLOBAL MARKET", icon: "⊕", route: "/scifi/market" },
  { id: "payments", name: "PAYMENT HUB", icon: "⬢", route: "/scifi/payments" },
  { id: "invoices", name: "INVOICES", icon: "◈", route: "/scifi/invoices", badge: "NEU" },
  { id: "terminal", name: "NEURAL TERMINAL", icon: "▣", route: "/scifi/terminal" },
  { id: "power", name: "POWER MODE", icon: "⚡", route: "/scifi/power", badge: "神極", status: "online" },
  { id: "ai", name: "MAX AI AGENT", icon: "◎", route: "/scifi/ai", badge: "AI", status: "online" },
  { id: "lead-scoring", name: "LEAD SCORING", icon: "★", route: "/scifi/lead-scoring", badge: "AI" },
];

export interface SciFiSidebarProps {
  modules?: NavModule[];
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  header?: ReactNode;
  footer?: ReactNode;
}

export function SciFiSidebar({
  modules = NEXUS_MODULES,
  collapsed = false,
  onCollapsedChange,
  header,
  footer,
}: SciFiSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapsedChange?.(newState);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full",
        "bg-void-dark/95 backdrop-blur-xl",
        "border-r border-neon-cyan/10",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neon-cyan/10">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                <span className="text-neon-cyan font-display text-lg">N</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-white tracking-wider">
                NEXUS
              </span>
              <span className="text-[10px] text-neon-cyan/60 font-mono">
                COMMAND CENTER
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
              <span className="text-neon-cyan font-display text-lg">N</span>
            </div>
          </div>
        )}

        {!isCollapsed && header}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20">
        <ul className="space-y-1">
          {modules.map((module) => {
            const isActive = pathname === module.route ||
              (module.route !== "/scifi" && pathname?.startsWith(module.route));

            return (
              <li key={module.id}>
                <Link
                  href={module.route}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg",
                    "transition-all duration-200",
                    "hover:bg-neon-cyan/10",
                    isActive && "bg-neon-cyan/15 border border-neon-cyan/30"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg",
                      "text-lg transition-all duration-200",
                      isActive
                        ? "bg-neon-cyan/20 text-neon-cyan shadow-neon-cyan"
                        : "bg-void-surface text-white/50 group-hover:text-neon-cyan group-hover:bg-neon-cyan/10"
                    )}
                  >
                    {module.icon}
                  </div>

                  {/* Text */}
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span
                        className={cn(
                          "text-xs font-display font-medium tracking-wider truncate",
                          isActive ? "text-neon-cyan" : "text-white/70 group-hover:text-white"
                        )}
                      >
                        {module.name}
                      </span>

                      {/* Badge */}
                      {module.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-neon-purple/20 text-neon-purple rounded">
                          {module.badge}
                        </span>
                      )}

                      {/* Status indicator */}
                      {module.status && (
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            module.status === "online" && "bg-neon-green",
                            module.status === "offline" && "bg-white/30",
                            module.status === "warning" && "bg-neon-orange animate-pulse"
                          )}
                        />
                      )}
                    </div>
                  )}

                  {/* Active indicator line */}
                  {isActive && (
                    <div className="absolute left-0 w-1 h-8 bg-neon-cyan rounded-r shadow-neon-cyan" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Power Mode Section */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-neon-cyan/10">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">
            Power Mode
          </div>
          <div className="flex gap-2">
            <button
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-xs font-display",
                "bg-god-primary/10 border border-god-primary/30 text-god-secondary",
                "hover:bg-god-primary/20 hover:border-god-primary/50",
                "transition-all duration-200"
              )}
            >
              神 GOD
            </button>
            <button
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-xs font-display",
                "bg-ultra-secondary/10 border border-ultra-secondary/30 text-ultra-primary",
                "hover:bg-ultra-secondary/20 hover:border-ultra-secondary/50",
                "transition-all duration-200"
              )}
            >
              極 ULTRA
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-neon-cyan/10">
        {footer || (
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center">
                  <span className="text-neon-purple text-sm">神</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-white font-medium">HAIKU</span>
                  <span className="text-[10px] text-white/40 font-mono">CEO</span>
                </div>
              </div>
            )}

            {/* Collapse toggle */}
            <button
              onClick={handleToggle}
              className={cn(
                "p-2 rounded-lg",
                "text-white/50 hover:text-neon-cyan",
                "hover:bg-neon-cyan/10",
                "transition-all duration-200",
                isCollapsed && "w-full flex justify-center"
              )}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  isCollapsed && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default SciFiSidebar;
