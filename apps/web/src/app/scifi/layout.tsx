"use client";

import { useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SciFiSidebar, PowerModeProvider, PowerModeToggle, usePowerMode } from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// SCIFI DASHBOARD LAYOUT
// Cyberpunk command center with sidebar, taskbar and AI status
// ═══════════════════════════════════════════════════════════════════════════════

interface SciFiLayoutProps {
  children: ReactNode;
}

export default function SciFiLayout({ children }: SciFiLayoutProps) {
  return (
    <PowerModeProvider>
      <SciFiLayoutInner>{children}</SciFiLayoutInner>
    </PowerModeProvider>
  );
}

function SciFiLayoutInner({ children }: SciFiLayoutProps) {
  const { isGodMode, isUltraInstinct, isEnhanced, powerLevel } = usePowerMode();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uptime, setUptime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [systemLoad, setSystemLoad] = useState(42);
  const [activeConnections, setActiveConnections] = useState(128);
  // Command palette disabled pending cmdk package installation
  // const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Calculate uptime from a fixed start date (simulated system boot)
  useEffect(() => {
    const bootTime = new Date();
    bootTime.setDate(bootTime.getDate() - 7); // Simulated 7 days uptime

    const updateUptime = () => {
      const now = new Date();
      const diff = now.getTime() - bootTime.getTime();

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setUptime({ days, hours, minutes, seconds });
    };

    updateUptime();
    const interval = setInterval(updateUptime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate live system metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemLoad((prev) => Math.max(20, Math.min(80, prev + (Math.random() - 0.5) * 10)));
      setActiveConnections((prev) => Math.max(100, Math.min(200, prev + Math.floor((Math.random() - 0.5) * 20))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-void overflow-hidden">
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 bg-cyber-grid bg-cyber-grid opacity-30 pointer-events-none" />

      {/* Sidebar */}
      <SciFiSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Taskbar */}
        <header className="h-12 bg-void-dark/90 backdrop-blur-xl border-b border-neon-cyan/10 flex items-center justify-between px-4 z-50">
          {/* Left: System Status */}
          <div className="flex items-center gap-6">
            {/* Uptime */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[10px] font-mono text-white/50 uppercase">Uptime</span>
              <span className="text-xs font-mono text-neon-green" suppressHydrationWarning>
                {uptime.days}d {String(uptime.hours).padStart(2, "0")}:
                {String(uptime.minutes).padStart(2, "0")}:
                {String(uptime.seconds).padStart(2, "0")}
              </span>
            </div>

            {/* System Load */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/50 uppercase">Load</span>
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    systemLoad < 50 ? "bg-neon-green" : systemLoad < 70 ? "bg-neon-orange" : "bg-neon-red"
                  )}
                  style={{ width: `${systemLoad}%` }}
                />
              </div>
              <span className="text-xs font-mono text-white/70">{Math.round(systemLoad)}%</span>
            </div>

            {/* Connections */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/50 uppercase">Connections</span>
              <span className="text-xs font-mono text-neon-cyan">{activeConnections}</span>
            </div>
          </div>

          {/* Center: AI Bots Status */}
          <div className="flex items-center gap-4">
            <AIBotIndicator name="HAIKU" status="active" model="claude-3" />
            <AIBotIndicator name="SONNET" status="standby" model="claude-3.5" />
            <AIBotIndicator name="OPUS" status="active" model="claude-3" />
            <AIBotIndicator name="GPT-4" status="idle" model="openai" />
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 text-white/50 hover:text-neon-cyan transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-neon-red text-[8px] font-bold flex items-center justify-center rounded-full">
                3
              </span>
            </button>

            {/* Power Mode Toggle */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded border transition-all",
              isGodMode && "bg-god-primary/20 border-god-secondary/50",
              isUltraInstinct && "bg-ultra-secondary/20 border-ultra-primary/50",
              !isEnhanced && "bg-void-surface/50 border-white/10"
            )}>
              <PowerModeToggle compact />
              {isEnhanced && (
                <span className="text-[8px] font-mono text-white/50 ml-1" suppressHydrationWarning>
                  LVL:{powerLevel}
                </span>
              )}
            </div>

            {/* Current Time */}
            <div className="text-xs font-mono text-white/50">
              <CurrentTime />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20">
          {children}
        </main>

        {/* Bottom Status Bar */}
        <footer className="h-6 bg-void-dark/90 backdrop-blur-xl border-t border-neon-cyan/10 flex items-center justify-between px-4">
          <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
            <span>NEXUS COMMAND CENTER v3.0.1</span>
            <span>|</span>
            <span>Protocol: SECURE</span>
            <span>|</span>
            <span>Region: EU-WEST</span>
            <span>|</span>
            <span className="text-neon-cyan">⌘K Command Palette</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
            <span className="text-neon-green">● API: ONLINE</span>
            <span className="text-neon-green">● DB: CONNECTED</span>
            <span className="text-neon-cyan">● WS: ACTIVE</span>
          </div>
        </footer>
      </div>

      {/* Command Palette - disabled pending cmdk package installation */}
      {/* <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} /> */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI BOT INDICATOR - Shows status of each AI assistant
// ═══════════════════════════════════════════════════════════════════════════════

interface AIBotIndicatorProps {
  name: string;
  status: "active" | "standby" | "idle" | "offline";
  model: string;
}

function AIBotIndicator({ name, status, model }: AIBotIndicatorProps) {
  const statusColors = {
    active: "bg-neon-green",
    standby: "bg-neon-cyan",
    idle: "bg-neon-orange",
    offline: "bg-white/30",
  };

  const statusText = {
    active: "ACTIVE",
    standby: "STANDBY",
    idle: "IDLE",
    offline: "OFFLINE",
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-void-surface/30 border border-white/5 hover:border-neon-cyan/30 transition-colors cursor-pointer">
      <div className={cn("w-1.5 h-1.5 rounded-full", statusColors[status], status === "active" && "animate-pulse")} />
      <span className="text-[10px] font-display font-bold text-white/80">{name}</span>
      <span className="text-[8px] font-mono text-white/30">{statusText[status]}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENT TIME - Live clock display
// ═══════════════════════════════════════════════════════════════════════════════

function CurrentTime() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client - immediately set time
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Always render placeholder on server (time will be null)
  // useEffect will update to real time only on client
  return <span suppressHydrationWarning>{time ?? "--:--:--"}</span>;
}
