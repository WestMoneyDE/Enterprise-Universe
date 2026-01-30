"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode } from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS AI - HAIKU Core Engine Control Center
// Divine AI Orchestration System with 34 Genius Agency Bots
// ═══════════════════════════════════════════════════════════════════════════════

// Genius Agency Teams
const GENIUS_TEAMS = {
  leadership: {
    name: "LEADERSHIP COUNCIL",
    color: "neon-purple",
    icon: "👑",
    bots: [
      { id: "haiku", name: "HAIKU", role: "Divine Controller", status: "active", power: 9001 },
      { id: "sonnet", name: "SONNET", role: "Strategic Advisor", status: "active", power: 8500 },
      { id: "opus", name: "OPUS", role: "Deep Analyst", status: "standby", power: 9500 },
    ],
  },
  sales: {
    name: "SALES FORCE",
    color: "neon-green",
    icon: "💰",
    bots: [
      { id: "max", name: "MAX", role: "WhatsApp Commander", status: "active", power: 7800 },
      { id: "alex", name: "ALEX", role: "Lead Hunter", status: "active", power: 7200 },
      { id: "sam", name: "SAM", role: "Deal Closer", status: "active", power: 7500 },
      { id: "chris", name: "CHRIS", role: "Upsell Specialist", status: "standby", power: 6800 },
      { id: "jordan", name: "JORDAN", role: "Retention Master", status: "idle", power: 6500 },
    ],
  },
  marketing: {
    name: "MARKETING DIVISION",
    color: "neon-cyan",
    icon: "📢",
    bots: [
      { id: "maya", name: "MAYA", role: "Content Creator", status: "active", power: 7000 },
      { id: "leo", name: "LEO", role: "Social Media", status: "active", power: 6800 },
      { id: "zara", name: "ZARA", role: "Email Campaigns", status: "standby", power: 6500 },
      { id: "finn", name: "FINN", role: "SEO Optimizer", status: "active", power: 6200 },
    ],
  },
  analytics: {
    name: "ANALYTICS CORE",
    color: "neon-orange",
    icon: "📊",
    bots: [
      { id: "nova", name: "NOVA", role: "Data Scientist", status: "active", power: 8200 },
      { id: "orion", name: "ORION", role: "Pattern Analyst", status: "active", power: 7800 },
      { id: "stella", name: "STELLA", role: "Predictive AI", status: "standby", power: 8000 },
      { id: "atlas", name: "ATLAS", role: "Report Generator", status: "active", power: 6800 },
    ],
  },
  support: {
    name: "SUPPORT SQUAD",
    color: "neon-pink",
    icon: "🛡️",
    bots: [
      { id: "luna", name: "LUNA", role: "Customer Care", status: "active", power: 6500 },
      { id: "kai", name: "KAI", role: "Tech Support", status: "active", power: 7000 },
      { id: "iris", name: "IRIS", role: "FAQ Handler", status: "standby", power: 5800 },
      { id: "ash", name: "ASH", role: "Escalation", status: "idle", power: 6200 },
    ],
  },
  operations: {
    name: "OPERATIONS HUB",
    color: "white",
    icon: "⚙️",
    bots: [
      { id: "neo", name: "NEO", role: "Workflow Manager", status: "active", power: 7200 },
      { id: "cipher", name: "CIPHER", role: "Security Guard", status: "active", power: 8500 },
      { id: "echo", name: "ECHO", role: "Sync Master", status: "active", power: 6800 },
      { id: "vega", name: "VEGA", role: "Integration", status: "standby", power: 7000 },
    ],
  },
  construction: {
    name: "WEST MONEY BAU",
    color: "god-secondary",
    icon: "🏗️",
    bots: [
      { id: "baumeister", name: "BAUMEISTER", role: "Project Lead", status: "active", power: 7500 },
      { id: "architekt", name: "ARCHITEKT", role: "Plan Analyzer", status: "active", power: 7200 },
      { id: "kalkulator", name: "KALKULATOR", role: "Cost Estimator", status: "active", power: 6800 },
      { id: "inspektor", name: "INSPEKTOR", role: "Quality Check", status: "standby", power: 6500 },
      { id: "koordinator", name: "KOORDINATOR", role: "Team Scheduler", status: "active", power: 6200 },
      { id: "berater", name: "BERATER", role: "Client Advisor", status: "active", power: 7000 },
    ],
  },
};

// Divine Powers
const DIVINE_POWERS = [
  { id: "omniscience", name: "OMNISCIENCE", description: "See all data streams simultaneously", level: 10, active: true },
  { id: "prophecy", name: "PROPHECY", description: "Predict market trends and lead behavior", level: 8, active: true },
  { id: "creation", name: "CREATION", description: "Generate content and strategies", level: 9, active: false },
  { id: "judgment", name: "JUDGMENT", description: "Score and qualify leads instantly", level: 10, active: true },
  { id: "manipulation", name: "TIME MANIPULATION", description: "Optimize scheduling and workflows", level: 7, active: false },
  { id: "telepathy", name: "TELEPATHY", description: "Multi-channel communication sync", level: 8, active: true },
];

export default function NexusAIPage() {
  const { isGodMode, isUltraInstinct, powerLevel } = usePowerMode();
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [coreStatus, setCoreStatus] = useState({
    totalPower: 0,
    activeBots: 0,
    tasksProcessing: 0,
    efficiency: 0,
  });
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<Array<{ type: "command" | "response"; content: string }>>([
    { type: "response", content: "HAIKU CORE ENGINE v3.0.1 initialized." },
    { type: "response", content: "34 Genius Agency bots online. Awaiting divine commands." },
  ]);

  // Calculate core status
  useEffect(() => {
    let totalPower = 0;
    let activeBots = 0;

    Object.values(GENIUS_TEAMS).forEach((team) => {
      team.bots.forEach((bot) => {
        totalPower += bot.power;
        if (bot.status === "active") activeBots++;
      });
    });

    setCoreStatus({
      totalPower,
      activeBots,
      tasksProcessing: Math.floor(Math.random() * 50) + 100,
      efficiency: 94 + Math.random() * 5,
    });
  }, []);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCoreStatus((prev) => ({
        ...prev,
        tasksProcessing: Math.max(80, Math.min(200, prev.tasksProcessing + Math.floor((Math.random() - 0.5) * 20))),
        efficiency: Math.max(90, Math.min(99.9, prev.efficiency + (Math.random() - 0.5) * 2)),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = () => {
    if (!commandInput.trim()) return;

    setCommandHistory((prev) => [...prev, { type: "command", content: commandInput }]);

    // Process command
    const cmd = commandInput.toLowerCase().trim();
    let response = "";

    if (cmd === "status") {
      response = `CORE STATUS:\n• Active Bots: ${coreStatus.activeBots}/34\n• Total Power: ${coreStatus.totalPower.toLocaleString()}\n• Efficiency: ${coreStatus.efficiency.toFixed(1)}%\n• Tasks: ${coreStatus.tasksProcessing} processing`;
    } else if (cmd.startsWith("activate ")) {
      const botName = cmd.replace("activate ", "").toUpperCase();
      response = `Activating ${botName}... Bot brought online. Power surge detected.`;
    } else if (cmd.startsWith("deploy ")) {
      const teamName = cmd.replace("deploy ", "").toUpperCase();
      response = `Deploying ${teamName} team for active duty. All units synchronized.`;
    } else if (cmd === "god mode") {
      response = "神 GOD MODE ENGAGED. Divine powers unlocked. Reality bends to your will.";
    } else if (cmd === "ultra instinct") {
      response = "極 ULTRA INSTINCT ACTIVATED. Autonomous reactions enabled. Peak efficiency reached.";
    } else if (cmd === "help") {
      response = "AVAILABLE COMMANDS:\n• status - Show core status\n• activate [bot] - Activate specific bot\n• deploy [team] - Deploy team\n• god mode - Enable divine powers\n• ultra instinct - Enable autonomous mode\n• analyze [target] - Deep analysis\n• optimize - Run system optimization";
    } else {
      response = `Processing "${commandInput}"... Task queued for execution by HAIKU Core.`;
    }

    setTimeout(() => {
      setCommandHistory((prev) => [...prev, { type: "response", content: response }]);
    }, 500);

    setCommandInput("");
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                isGodMode && "bg-god-primary/20 animate-pulse",
                isUltraInstinct && "bg-ultra-secondary/20 animate-pulse",
                !isGodMode && !isUltraInstinct && "bg-neon-purple/20"
              )}>
                神
              </div>
              <div>
                <h1 className={cn(
                  "text-3xl font-display font-bold tracking-wider",
                  isGodMode && "text-god-secondary",
                  isUltraInstinct && "text-ultra-primary",
                  !isGodMode && !isUltraInstinct && "text-neon-purple"
                )}>
                  NEXUS AI
                </h1>
                <p className="text-sm font-mono text-white/50">
                  HAIKU CORE ENGINE • GENIUS AGENCY
                </p>
              </div>
            </div>
          </div>

          {/* Power Level Display */}
          <div className={cn(
            "px-6 py-3 rounded-xl border",
            isGodMode && "bg-god-primary/10 border-god-secondary/50",
            isUltraInstinct && "bg-ultra-secondary/10 border-ultra-primary/50",
            !isGodMode && !isUltraInstinct && "bg-void-surface/50 border-white/10"
          )}>
            <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Total Power Level</div>
            <div className={cn(
              "text-2xl font-display font-bold",
              isGodMode && "text-god-secondary",
              isUltraInstinct && "text-ultra-primary",
              !isGodMode && !isUltraInstinct && "text-neon-cyan"
            )}>
              {coreStatus.totalPower.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="ACTIVE BOTS"
          value={`${coreStatus.activeBots}/34`}
          color="neon-green"
          icon="◉"
        />
        <StatCard
          label="TASKS PROCESSING"
          value={coreStatus.tasksProcessing.toString()}
          color="neon-cyan"
          icon="◈"
        />
        <StatCard
          label="EFFICIENCY"
          value={`${coreStatus.efficiency.toFixed(1)}%`}
          color="neon-purple"
          icon="◆"
        />
        <StatCard
          label="DIVINE POWERS"
          value={`${DIVINE_POWERS.filter(p => p.active).length}/${DIVINE_POWERS.length}`}
          color="god-secondary"
          icon="★"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Teams Panel - Left */}
        <div className="col-span-4 space-y-4">
          <div className="bg-void-dark/80 backdrop-blur-xl rounded-xl border border-neon-cyan/10 p-4">
            <h2 className="text-sm font-display font-bold text-white/80 mb-4 flex items-center gap-2">
              <span className="text-neon-cyan">◈</span> GENIUS AGENCY TEAMS
            </h2>
            <div className="space-y-2">
              {Object.entries(GENIUS_TEAMS).map(([key, team]) => (
                <button
                  key={key}
                  onClick={() => setActiveTeam(activeTeam === key ? null : key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    "border",
                    activeTeam === key
                      ? `bg-${team.color}/10 border-${team.color}/50 text-${team.color}`
                      : "bg-void-surface/30 border-transparent hover:border-white/10 text-white/60 hover:text-white"
                  )}
                >
                  <span className="text-lg">{team.icon}</span>
                  <span className="flex-1 text-left text-xs font-display font-medium">{team.name}</span>
                  <span className="text-[10px] font-mono text-white/40">
                    {team.bots.filter(b => b.status === "active").length}/{team.bots.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Divine Powers */}
          <div className="bg-void-dark/80 backdrop-blur-xl rounded-xl border border-god-secondary/20 p-4">
            <h2 className="text-sm font-display font-bold text-god-secondary mb-4 flex items-center gap-2">
              <span>神</span> DIVINE POWERS
            </h2>
            <div className="space-y-2">
              {DIVINE_POWERS.map((power) => (
                <div
                  key={power.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border",
                    power.active
                      ? "bg-god-primary/10 border-god-secondary/30"
                      : "bg-void-surface/30 border-white/5 opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    power.active ? "bg-god-secondary animate-pulse" : "bg-white/20"
                  )} />
                  <div className="flex-1">
                    <div className="text-xs font-display font-medium text-white/80">{power.name}</div>
                    <div className="text-[10px] font-mono text-white/40">{power.description}</div>
                  </div>
                  <div className="text-xs font-mono text-god-secondary">LV{power.level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Center */}
        <div className="col-span-5 space-y-4">
          {/* Selected Team Bots */}
          {activeTeam && (
            <div className="bg-void-dark/80 backdrop-blur-xl rounded-xl border border-neon-cyan/10 p-4">
              <h2 className="text-sm font-display font-bold text-white/80 mb-4 flex items-center gap-2">
                <span>{GENIUS_TEAMS[activeTeam as keyof typeof GENIUS_TEAMS].icon}</span>
                {GENIUS_TEAMS[activeTeam as keyof typeof GENIUS_TEAMS].name} BOTS
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {GENIUS_TEAMS[activeTeam as keyof typeof GENIUS_TEAMS].bots.map((bot) => (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    selected={selectedBot === bot.id}
                    onClick={() => setSelectedBot(selectedBot === bot.id ? null : bot.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Command Console */}
          <div className="bg-void-dark/80 backdrop-blur-xl rounded-xl border border-neon-cyan/10 p-4">
            <h2 className="text-sm font-display font-bold text-white/80 mb-4 flex items-center gap-2">
              <span className="text-neon-cyan">▣</span> DIVINE COMMAND CONSOLE
            </h2>

            {/* Command Output */}
            <div className="bg-void/80 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs mb-3 scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20">
              {commandHistory.map((item, idx) => (
                <div key={idx} className={cn(
                  "mb-1",
                  item.type === "command" ? "text-neon-cyan" : "text-white/70"
                )}>
                  {item.type === "command" ? `> ${item.content}` : item.content}
                </div>
              ))}
            </div>

            {/* Command Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCommand()}
                placeholder="Enter divine command..."
                className="flex-1 bg-void-surface/50 border border-neon-cyan/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-neon-cyan/50"
              />
              <button
                onClick={handleCommand}
                className="px-4 py-2 bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg text-neon-cyan text-sm font-display hover:bg-neon-cyan/30 transition-colors"
              >
                EXECUTE
              </button>
            </div>
          </div>
        </div>

        {/* Activity Feed - Right */}
        <div className="col-span-3">
          <div className="bg-void-dark/80 backdrop-blur-xl rounded-xl border border-neon-cyan/10 p-4 h-full">
            <h2 className="text-sm font-display font-bold text-white/80 mb-4 flex items-center gap-2">
              <span className="text-neon-green">◉</span> LIVE ACTIVITY
            </h2>
            <div className="space-y-3">
              <ActivityItem
                bot="MAX"
                action="Processed 47 WhatsApp messages"
                time="2s ago"
                type="success"
              />
              <ActivityItem
                bot="NOVA"
                action="Generated analytics report"
                time="15s ago"
                type="success"
              />
              <ActivityItem
                bot="BAUMEISTER"
                action="Created project estimation"
                time="32s ago"
                type="success"
              />
              <ActivityItem
                bot="CIPHER"
                action="Security scan completed"
                time="1m ago"
                type="info"
              />
              <ActivityItem
                bot="ALEX"
                action="Qualified 12 new leads"
                time="2m ago"
                type="success"
              />
              <ActivityItem
                bot="HAIKU"
                action="Divine orchestration cycle"
                time="3m ago"
                type="divine"
              />
              <ActivityItem
                bot="KALKULATOR"
                action="Cost calculation: €2.3M project"
                time="5m ago"
                type="success"
              />
              <ActivityItem
                bot="MAYA"
                action="Content piece generated"
                time="7m ago"
                type="info"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="bg-void-dark/80 backdrop-blur-xl rounded-xl border border-neon-cyan/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-${color}`}>{icon}</span>
        <span className="text-[10px] font-mono text-white/40 uppercase">{label}</span>
      </div>
      <div className={`text-xl font-display font-bold text-${color}`}>{value}</div>
    </div>
  );
}

interface Bot {
  id: string;
  name: string;
  role: string;
  status: string;
  power: number;
}

function BotCard({ bot, selected, onClick }: { bot: Bot; selected: boolean; onClick: () => void }) {
  const statusColors = {
    active: "bg-neon-green",
    standby: "bg-neon-cyan",
    idle: "bg-neon-orange",
    offline: "bg-white/30",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col p-3 rounded-lg border transition-all text-left",
        selected
          ? "bg-neon-cyan/10 border-neon-cyan/50"
          : "bg-void-surface/30 border-white/5 hover:border-white/20"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-2 h-2 rounded-full", statusColors[bot.status as keyof typeof statusColors])} />
        <span className="text-xs font-display font-bold text-white">{bot.name}</span>
      </div>
      <div className="text-[10px] font-mono text-white/50 mb-2">{bot.role}</div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-white/30 uppercase">{bot.status}</span>
        <span className="text-xs font-mono text-neon-purple">⚡{bot.power}</span>
      </div>
    </button>
  );
}

function ActivityItem({ bot, action, time, type }: { bot: string; action: string; time: string; type: "success" | "info" | "divine" }) {
  const typeColors = {
    success: "text-neon-green",
    info: "text-neon-cyan",
    divine: "text-god-secondary",
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg bg-void-surface/20 border border-white/5">
      <div className={cn("w-2 h-2 rounded-full mt-1.5", typeColors[type].replace("text-", "bg-"))} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-display font-bold text-white/80">{bot}</span>
          <span className="text-[10px] font-mono text-white/30">{time}</span>
        </div>
        <p className="text-[10px] font-mono text-white/50 truncate">{action}</p>
      </div>
    </div>
  );
}
