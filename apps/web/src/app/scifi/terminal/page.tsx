"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
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
║    health          - Run health check                                         ║
║    clear           - Clear terminal                                           ║
║                                                                               ║
║  DATA COMMANDS:                                                               ║
║    contacts        - List WhatsApp contacts                                   ║
║    deals           - Show CRM deals                                           ║
║    stats [module]  - Display statistics                                       ║
║    export [type]   - Export data (csv/json)                                   ║
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
  "status",
  "modules",
  "ai ask What is the best CRM strategy?",
  "stats whatsapp",
  "health",
  "god",
];

export default function NeuralTerminalPage() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [powerMode, setPowerMode] = useState<"normal" | "god" | "ultra">("normal");
  const [aiProcessing, setAiProcessing] = useState(false);

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
          addLine({ type: "system", content: "Running health check..." });
          setTimeout(() => {
            addLine({ type: "success", content: "✓ Database connection: OK" });
            addLine({ type: "success", content: "✓ API endpoints: OK" });
            addLine({ type: "success", content: "✓ WhatsApp connection: OK" });
            addLine({ type: "success", content: "✓ HubSpot sync: OK" });
            addLine({ type: "success", content: "✓ Security protocols: ACTIVE" });
            addLine({ type: "success", content: "Health check completed. All systems operational." });
          }, 500);
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
