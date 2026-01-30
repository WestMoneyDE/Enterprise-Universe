"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc";
import {
  HoloCard,
  NeonButton,
  Terminal,
  TerminalLine,
  TerminalOutput,
  CommandBadge,
  ActivityIndicator,
} from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// NEURAL TERMINAL - Full Command Line Interface
// Advanced terminal for system operations and AI interactions
// ═══════════════════════════════════════════════════════════════════════════════

const COMMAND_HELP = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        NEXUS COMMAND CENTER - TERMINAL                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  SYSTEM COMMANDS:                                                             ║
║    status          - Show system status                                       ║
║    modules         - List all modules                                         ║
║    uptime          - Display system uptime                                    ║
║    health          - Run live health check (API)                              ║
║    system          - Show system info (database, memory)                      ║
║    queue           - Show job queue statistics                                ║
║    cache clear     - Clear system caches                                      ║
║    clear           - Clear terminal                                           ║
║                                                                               ║
║  DATA COMMANDS:                                                               ║
║    contacts        - List WhatsApp contacts                                   ║
║    deals           - Show CRM deals                                           ║
║    stats [module]  - Display statistics                                       ║
║    export [type]   - Export data (csv/json)                                   ║
║    notifications   - Show unread notifications                                ║
║    activity        - Show recent activity feed                                ║
║                                                                               ║
║  AUTOMATION COMMANDS:                                                         ║
║    workflows       - List automation workflows                                ║
║    sync [provider] - Trigger data sync (hubspot/stripe/all)                   ║
║                                                                               ║
║  AI COMMANDS:                                                                 ║
║    ai ask [query]  - Ask AI assistant                                         ║
║    ai analyze      - Run AI analysis                                          ║
║    ai suggest      - Get AI suggestions                                       ║
║                                                                               ║
║  POWER MODES:                                                                 ║
║    god             - Activate God Mode 神                                     ║
║    ultra           - Activate Ultra Instinct 極                               ║
║    normal          - Return to normal mode                                    ║
║                                                                               ║
║  Type 'man [command]' for detailed help on a specific command                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

const MODULES_LIST = `
╔══════════════════════════════════════════════════════════════╗
║                     ACTIVE MODULES                            ║
╠══════════════════════════════════════════════════════════════╣
║  [●] COMMAND DECK      Main Dashboard         ONLINE          ║
║  [●] WHATSAPP          Messaging Console      ONLINE          ║
║  [●] CRM NEXUS         Customer Relations     ONLINE          ║
║  [●] WEST MONEY BAU    Construction Mgmt      ONLINE          ║
║  [○] AUTOMATION        Process Engine         STANDBY         ║
║  [●] ANALYTICS         Data Processing        ONLINE          ║
║  [●] DEDSEC SHIELD     Security Module        ACTIVE          ║
║  [○] GLOBAL MARKET     Market Data            IDLE            ║
║  [●] PAYMENT HUB       Transactions           ONLINE          ║
║  [●] NEURAL TERMINAL   Command Interface      ACTIVE          ║
║  [●] AI ASSISTANT      Neural Network         PROCESSING      ║
╚══════════════════════════════════════════════════════════════╝
`;

const SAMPLE_COMMANDS = [
  "health",
  "queue",
  "workflows",
  "notifications",
  "activity",
  "sync hubspot",
  "system",
  "god",
];

export default function NeuralTerminalPage() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [powerMode, setPowerMode] = useState<"normal" | "god" | "ultra">("normal");
  const [aiProcessing, setAiProcessing] = useState(false);
  const utils = api.useUtils();

  // API Mutations
  const syncMutation = api.system.triggerSync.useMutation();
  const clearCacheMutation = api.system.clearCache.useMutation();
  const setPowerModeMutation = api.system.setPowerMode.useMutation();

  // Initialize boot lines only on client to prevent hydration mismatch
  useEffect(() => {
    setTerminalLines([
      { id: "boot-1", type: "system", content: "NEURAL TERMINAL v3.0.1 initialized", timestamp: new Date() },
      { id: "boot-2", type: "success", content: "Connection established to NEXUS mainframe", timestamp: new Date() },
      { id: "boot-3", type: "output", content: "Type 'help' for available commands", timestamp: new Date() },
    ]);
  }, []);

  const addLine = useCallback((line: Omit<TerminalLine, "id" | "timestamp">) => {
    setTerminalLines((prev) => [
      ...prev,
      { ...line, id: `line-${Date.now()}-${Math.random()}`, timestamp: new Date() },
    ]);
  }, []);

  const processCommand = useCallback((command: string) => {
    // Add input line
    addLine({ type: "input", content: command });

    const [cmd, ...args] = command.toLowerCase().trim().split(" ");

    // Process commands
    setTimeout(() => {
      switch (cmd) {
        case "help":
          addLine({ type: "output", content: COMMAND_HELP });
          break;

        case "status":
          addLine({ type: "output", content: `
╔═══════════════════════════════════════════════════════════════╗
║                     SYSTEM STATUS                              ║
╠═══════════════════════════════════════════════════════════════╣
║  CPU Usage:      42%  [████████░░░░░░░░░░░░]                  ║
║  Memory:         67%  [█████████████░░░░░░░]                  ║
║  Network:        23%  [█████░░░░░░░░░░░░░░░]                  ║
║  Storage:        58%  [████████████░░░░░░░░]                  ║
║                                                                ║
║  Active Users:   128                                           ║
║  Open Sessions:  47                                            ║
║  API Requests:   15,892/day                                    ║
║  Uptime:         7d 14h 32m 15s                                ║
╚═══════════════════════════════════════════════════════════════╝
          ` });
          addLine({ type: "success", content: "System operating within normal parameters" });
          break;

        case "modules":
          addLine({ type: "output", content: MODULES_LIST });
          break;

        case "uptime":
          addLine({ type: "success", content: "System uptime: 7 days, 14 hours, 32 minutes, 15 seconds" });
          break;

        case "health":
          addLine({ type: "system", content: "Running live health check via API..." });
          utils.system.health.fetch().then((health) => {
            Object.entries(health.checks).forEach(([name, status]) => {
              const icon = status === "ok" ? "✓" : status === "degraded" ? "⚠" : "✗";
              const type = status === "ok" ? "success" : status === "degraded" ? "warning" : "error";
              addLine({ type, content: `${icon} ${name.toUpperCase()}: ${status.toUpperCase()}` });
            });
            addLine({
              type: health.status === "healthy" ? "success" : "warning",
              content: `Health check completed. System status: ${health.status.toUpperCase()}`
            });
          }).catch(() => {
            addLine({ type: "error", content: "Failed to fetch health data" });
          });
          break;

        case "queue":
          addLine({ type: "system", content: "Fetching queue statistics..." });
          utils.system.queueStats.fetch().then((stats) => {
            addLine({ type: "output", content: `
╔═══════════════════════════════════════════════════════════════╗
║                      JOB QUEUE STATISTICS                      ║
╠═══════════════════════════════════════════════════════════════╣
║  QUEUE          WAITING   ACTIVE    COMPLETED   FAILED        ║
║  ───────────────────────────────────────────────────────────  ║
║  Automation     ${String(stats.automation.waiting).padEnd(9)} ${String(stats.automation.active).padEnd(9)} ${String(stats.automation.completed).padEnd(11)} ${stats.automation.failed}         ║
║  Email          ${String(stats.email.waiting).padEnd(9)} ${String(stats.email.active).padEnd(9)} ${String(stats.email.completed).padEnd(11)} ${stats.email.failed}         ║
║  Sync           ${String(stats.sync.waiting).padEnd(9)} ${String(stats.sync.active).padEnd(9)} ${String(stats.sync.completed).padEnd(11)} ${stats.sync.failed}         ║
║  Webhook        ${String(stats.webhook.waiting).padEnd(9)} ${String(stats.webhook.active).padEnd(9)} ${String(stats.webhook.completed).padEnd(11)} ${stats.webhook.failed}         ║
╚═══════════════════════════════════════════════════════════════╝
            ` });
          }).catch(() => {
            addLine({ type: "error", content: "Failed to fetch queue statistics" });
          });
          break;

        case "system":
          addLine({ type: "system", content: "Fetching system information..." });
          utils.system.info.fetch().then((info) => {
            const memMB = Math.round(info.memory.heapUsed / 1024 / 1024);
            addLine({ type: "output", content: `
╔═══════════════════════════════════════════════════════════════╗
║                      SYSTEM INFORMATION                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Database Size:    ${info.database.size.padEnd(40)}║
║  Node Version:     ${info.nodeVersion.padEnd(40)}║
║  Platform:         ${info.platform.padEnd(40)}║
║  Memory Used:      ${(memMB + " MB").padEnd(40)}║
║  Uptime:           ${(Math.round(info.uptime) + " seconds").padEnd(40)}║
╠═══════════════════════════════════════════════════════════════╣
║  Table Records:                                               ║
${Object.entries(info.database.tables).map(([table, count]) =>
  `║    ${table.padEnd(18)} ${String(count).padEnd(38)}║`
).join("\n")}
╚═══════════════════════════════════════════════════════════════╝
            ` });
          }).catch(() => {
            addLine({ type: "error", content: "Failed to fetch system information" });
          });
          break;

        case "workflows":
          addLine({ type: "system", content: "Fetching automation workflows..." });
          utils.automation.list.fetch({ limit: 10 }).then((data) => {
            if (data.items.length === 0) {
              addLine({ type: "warning", content: "No workflows found" });
              return;
            }
            addLine({ type: "output", content: `
Automation Workflows (${data.items.length} of ${data.total}):

  ID                                    NAME                     STATUS      TRIGGERS
  ───────────────────────────────────────────────────────────────────────────────────
${data.items.map(w =>
  `  ${w.id.slice(0, 8)}...  ${w.name.slice(0, 24).padEnd(24)} ${(w.isActive ? "ACTIVE" : "PAUSED").padEnd(11)} ${w.type || "cron"}`
).join("\n")}

Use 'workflow [id]' for details or 'workflow trigger [id]' to manually trigger.
            ` });
          }).catch(() => {
            addLine({ type: "error", content: "Failed to fetch workflows" });
          });
          break;

        case "notifications":
          addLine({ type: "system", content: "Fetching notifications..." });
          utils.notifications.unread.fetch({ limit: 5 }).then((notifications) => {
            if (notifications.length === 0) {
              addLine({ type: "success", content: "No unread notifications" });
              return;
            }
            addLine({ type: "output", content: `
Unread Notifications (${notifications.length}):

${notifications.map(n =>
  `  [${n.type.toUpperCase()}] ${n.title}
     ${n.message.slice(0, 60)}${n.message.length > 60 ? "..." : ""}`
).join("\n\n")}

Use 'notifications --all' to see all or 'notifications --mark-read' to clear.
            ` });
          }).catch(() => {
            addLine({ type: "error", content: "Failed to fetch notifications" });
          });
          break;

        case "activity":
          addLine({ type: "system", content: "Fetching recent activity..." });
          utils.activity.recent.fetch({ limit: 8 }).then((activities) => {
            if (activities.length === 0) {
              addLine({ type: "warning", content: "No recent activity" });
              return;
            }
            addLine({ type: "output", content: `
Recent Activity Feed:

${activities.map(a =>
  `  ${a.icon} [${a.categoryLabel}] ${a.title}
     ${a.user?.name || "System"} - ${new Date(a.timestamp).toLocaleString("de-DE")}`
).join("\n\n")}
            ` });
          }).catch(() => {
            addLine({ type: "error", content: "Failed to fetch activity" });
          });
          break;

        case "sync":
          const provider = (args[0] || "all") as "hubspot" | "stripe" | "all";
          addLine({ type: "system", content: `Triggering ${provider} sync...` });
          syncMutation.mutate({ provider, fullSync: false }, {
            onSuccess: (result) => {
              addLine({ type: "success", content: `✓ ${result.message}` });
              addLine({ type: "output", content: `  Job ID: ${result.jobId}` });
            },
            onError: () => {
              addLine({ type: "error", content: "Failed to trigger sync" });
            },
          });
          break;

        case "cache":
          if (args[0] === "clear") {
            const cacheType = args[1] as "all" | "api" | "static" | "sessions" | undefined;
            addLine({ type: "system", content: `Clearing cache: ${cacheType || "all"}...` });
            clearCacheMutation.mutate({ type: cacheType || "all" }, {
              onSuccess: (result) => {
                addLine({ type: "success", content: `✓ ${result.message}` });
              },
              onError: () => {
                addLine({ type: "error", content: "Failed to clear cache" });
              },
            });
          } else {
            addLine({ type: "output", content: "Usage: cache clear [all|api|static|sessions]" });
          }
          break;

        case "contacts":
          addLine({ type: "output", content: `
Displaying WhatsApp contacts (showing 5 of 4,892):

  ID      NAME                 PHONE            CONSENT    LAST ACTIVE
  ─────────────────────────────────────────────────────────────────────
  001     Max Mustermann       +49 170 1234567  OPTED_IN   2 min ago
  002     Anna Schmidt         +49 171 2345678  PENDING    1 hour ago
  003     Thomas Weber         +49 172 3456789  OPTED_OUT  1 day ago
  004     Julia Bauer          +49 173 4567890  OPTED_IN   30 min ago
  005     Michael König        +49 174 5678901  OPTED_IN   5 min ago

Use 'contacts --all' to display full list or 'contacts --export' to export.
          ` });
          break;

        case "deals":
          addLine({ type: "output", content: `
CRM NEXUS - Active Deals:

  PIPELINE       DEALS    TOTAL VALUE     AVG. SIZE
  ───────────────────────────────────────────────────
  Lead           12       €48,000         €4,000
  Qualified      8        €156,000        €19,500
  Proposal       5        €245,000        €49,000
  Negotiation    3        €180,000        €60,000
  Closed Won     22       €892,000        €40,545
  ───────────────────────────────────────────────────
  TOTAL          50       €1,521,000      €30,420

Top Deal: "Enterprise Universe Platform" - €125,000 (Negotiation)
          ` });
          break;

        case "stats":
          const module = args[0] || "all";
          addLine({ type: "output", content: `
Statistics for: ${module.toUpperCase()}

  ┌─────────────────────────────────────────────────────────────┐
  │  Messages Today:     1,247    │  API Calls:      15,892    │
  │  New Contacts:       127      │  Automation:     342       │
  │  Deals Created:      8        │  Revenue:        €12,450   │
  │  Consent Rate:       78.6%    │  Response Time:  142ms     │
  └─────────────────────────────────────────────────────────────┘
          ` });
          break;

        case "ai":
          if (args[0] === "ask" && args.length > 1) {
            const query = args.slice(1).join(" ");
            addLine({ type: "system", content: "Processing AI query..." });
            setAiProcessing(true);
            setTimeout(() => {
              addLine({ type: "output", content: `
AI RESPONSE:
────────────────────────────────────────────────────────────────

Based on your query: "${query}"

The AI assistant suggests the following approach:

1. Analyze your current data patterns
2. Identify optimization opportunities
3. Implement incremental improvements
4. Monitor results and iterate

For more detailed analysis, use 'ai analyze' command.

────────────────────────────────────────────────────────────────
              ` });
              setAiProcessing(false);
            }, 1500);
          } else if (args[0] === "analyze") {
            addLine({ type: "system", content: "Running AI analysis..." });
            setAiProcessing(true);
            setTimeout(() => {
              addLine({ type: "success", content: "Analysis complete. 3 optimization opportunities found." });
              setAiProcessing(false);
            }, 2000);
          } else {
            addLine({ type: "output", content: "Usage: ai ask [query] | ai analyze | ai suggest" });
          }
          break;

        case "god":
          setPowerMode("god");
          setPowerModeMutation.mutate({ mode: "god" });
          addLine({ type: "warning", content: `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     ██████╗  ██████╗ ██████╗     ███╗   ███╗ ██████╗ ██████╗ ███████╗ ║
║    ██╔════╝ ██╔═══██╗██╔══██╗    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝ ║
║    ██║  ███╗██║   ██║██║  ██║    ██╔████╔██║██║   ██║██║  ██║█████╗   ║
║    ██║   ██║██║   ██║██║  ██║    ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝   ║
║    ╚██████╔╝╚██████╔╝██████╔╝    ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗ ║
║     ╚═════╝  ╚═════╝ ╚═════╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ║
║                                                               ║
║                      神 ACTIVATED 神                          ║
║                                                               ║
║              Power Level: MAXIMUM                             ║
║              All limiters: REMOVED                            ║
║              Processing: UNLIMITED                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
          ` });
          break;

        case "ultra":
          setPowerMode("ultra");
          setPowerModeMutation.mutate({ mode: "ultra" });
          addLine({ type: "system", content: `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    ██╗   ██╗██╗  ████████╗██████╗  █████╗                     ║
║    ██║   ██║██║  ╚══██╔══╝██╔══██╗██╔══██╗                    ║
║    ██║   ██║██║     ██║   ██████╔╝███████║                    ║
║    ██║   ██║██║     ██║   ██╔══██╗██╔══██║                    ║
║    ╚██████╔╝███████╗██║   ██║  ██║██║  ██║                    ║
║     ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝                    ║
║                                                               ║
║           ██╗███╗   ██╗███████╗████████╗██╗███╗   ██╗ ██████╗████████╗║
║           ██║████╗  ██║██╔════╝╚══██╔══╝██║████╗  ██║██╔════╝╚══██╔══╝║
║           ██║██╔██╗ ██║███████╗   ██║   ██║██╔██╗ ██║██║        ██║   ║
║           ██║██║╚██╗██║╚════██║   ██║   ██║██║╚██╗██║██║        ██║   ║
║           ██║██║ ╚████║███████║   ██║   ██║██║ ╚████║╚██████╗   ██║   ║
║           ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ║
║                                                               ║
║                      極 ENGAGED 極                            ║
║                                                               ║
║              Autonomous Mode: ENABLED                         ║
║              Reaction Time: INSTANT                           ║
║              Decision Making: AUTOMATIC                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
          ` });
          break;

        case "normal":
          setPowerMode("normal");
          setPowerModeMutation.mutate({ mode: "normal" });
          addLine({ type: "success", content: "Returned to normal operating mode" });
          break;

        case "clear":
          setTerminalLines([]);
          break;

        default:
          addLine({ type: "error", content: `Command not found: ${command}. Type 'help' for available commands.` });
      }
    }, 100);
  }, [addLine]);

  const terminalVariant = powerMode === "god" ? "god" : powerMode === "ultra" ? "ultra" : "cyan";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider flex items-center gap-3">
            <span className="text-neon-cyan">▣</span>
            NEURAL TERMINAL
            {powerMode !== "normal" && (
              <span className={cn(
                "ml-2 px-3 py-1 text-sm rounded animate-pulse",
                powerMode === "god" ? "bg-god-primary/20 text-god-secondary" : "bg-ultra-secondary/20 text-ultra-primary"
              )}>
                {powerMode === "god" ? "神 GOD MODE" : "極 ULTRA INSTINCT"}
              </span>
            )}
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Advanced Command Interface • v3.0.1
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ActivityIndicator status={aiProcessing ? "active" : "idle"} label={aiProcessing ? "AI PROCESSING" : "AI READY"} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main Terminal */}
        <div className="col-span-12 lg:col-span-9">
          <Terminal
            title="NEURAL TERMINAL"
            subtitle="v3.0.1"
            lines={terminalLines}
            onCommand={processCommand}
            showTimestamps
            variant={terminalVariant}
            className="h-[650px]"
          />
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Quick Commands */}
          <HoloCard title="QUICK COMMANDS" icon="⚡" variant="cyan">
            <div className="space-y-2">
              {SAMPLE_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => processCommand(cmd)}
                  className="w-full text-left"
                >
                  <CommandBadge command={cmd} copyable={false} className="w-full justify-start hover:border-neon-cyan/50" />
                </button>
              ))}
            </div>
          </HoloCard>

          {/* Power Modes */}
          <HoloCard title="POWER MODES" icon="◎">
            <div className="space-y-2">
              <button
                onClick={() => processCommand("god")}
                className={cn(
                  "w-full p-3 rounded-lg border transition-all",
                  powerMode === "god"
                    ? "bg-god-primary/20 border-god-primary text-god-secondary animate-pulse"
                    : "bg-god-primary/5 border-god-primary/30 text-god-secondary/70 hover:bg-god-primary/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">神</span>
                  <div className="text-left">
                    <div className="font-display text-sm font-bold">GOD MODE</div>
                    <div className="text-[10px] font-mono opacity-70">Maximum Power</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => processCommand("ultra")}
                className={cn(
                  "w-full p-3 rounded-lg border transition-all",
                  powerMode === "ultra"
                    ? "bg-ultra-secondary/20 border-ultra-secondary text-ultra-primary animate-pulse"
                    : "bg-ultra-secondary/5 border-ultra-secondary/30 text-ultra-primary/70 hover:bg-ultra-secondary/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">極</span>
                  <div className="text-left">
                    <div className="font-display text-sm font-bold">ULTRA INSTINCT</div>
                    <div className="text-[10px] font-mono opacity-70">Autonomous Mode</div>
                  </div>
                </div>
              </button>

              {powerMode !== "normal" && (
                <button
                  onClick={() => processCommand("normal")}
                  className="w-full p-2 rounded-lg border border-white/20 text-white/50 hover:bg-white/5 transition-all"
                >
                  <span className="text-xs font-mono">Return to Normal</span>
                </button>
              )}
            </div>
          </HoloCard>

          {/* Session Info */}
          <HoloCard title="SESSION INFO" icon="◆">
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-white/50">
                <span>Session ID:</span>
                <span className="text-neon-cyan">NX-{Date.now().toString(36).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>User:</span>
                <span className="text-white">HAIKU 神</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Access Level:</span>
                <span className="text-neon-gold">ADMINISTRATOR</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Commands:</span>
                <span className="text-white">{terminalLines.filter(l => l.type === "input").length}</span>
              </div>
            </div>
          </HoloCard>
        </div>
      </div>
    </div>
  );
}
