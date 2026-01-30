"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode } from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS CODE - Advanced Development Terminal
// AI-Powered Code Execution & Project Management
// ═══════════════════════════════════════════════════════════════════════════════

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
  language?: string;
}

interface Tab {
  id: string;
  name: string;
  type: "terminal" | "file" | "output";
  content: string;
  language?: string;
}

const SAMPLE_PROJECT: FileNode[] = [
  {
    name: "nexus-command-center",
    type: "folder",
    path: "/nexus-command-center",
    children: [
      {
        name: "apps",
        type: "folder",
        path: "/nexus-command-center/apps",
        children: [
          {
            name: "web",
            type: "folder",
            path: "/nexus-command-center/apps/web",
            children: [
              { name: "package.json", type: "file", path: "/nexus-command-center/apps/web/package.json", language: "json" },
              { name: "next.config.js", type: "file", path: "/nexus-command-center/apps/web/next.config.js", language: "javascript" },
              {
                name: "src",
                type: "folder",
                path: "/nexus-command-center/apps/web/src",
                children: [
                  { name: "app", type: "folder", path: "/nexus-command-center/apps/web/src/app", children: [] },
                  { name: "components", type: "folder", path: "/nexus-command-center/apps/web/src/components", children: [] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "packages",
        type: "folder",
        path: "/nexus-command-center/packages",
        children: [
          { name: "ui", type: "folder", path: "/nexus-command-center/packages/ui", children: [] },
          { name: "api", type: "folder", path: "/nexus-command-center/packages/api", children: [] },
          { name: "db", type: "folder", path: "/nexus-command-center/packages/db", children: [] },
        ],
      },
      { name: "package.json", type: "file", path: "/nexus-command-center/package.json", language: "json" },
      { name: "turbo.json", type: "file", path: "/nexus-command-center/turbo.json", language: "json" },
      { name: ".env", type: "file", path: "/nexus-command-center/.env", language: "env" },
    ],
  },
];

const QUICK_COMMANDS = [
  { label: "Build", command: "pnpm build", icon: "⚙️" },
  { label: "Dev", command: "pnpm dev", icon: "▶️" },
  { label: "Test", command: "pnpm test", icon: "🧪" },
  { label: "Lint", command: "pnpm lint", icon: "🔍" },
  { label: "Deploy", command: "pnpm deploy", icon: "🚀" },
  { label: "Git Status", command: "git status", icon: "📊" },
  { label: "Git Pull", command: "git pull", icon: "⬇️" },
  { label: "PM2 List", command: "pm2 list", icon: "📋" },
];

export default function NexusCodePage() {
  const { isGodMode, isUltraInstinct, powerLevel } = usePowerMode();
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "term-1", name: "Terminal 1", type: "terminal", content: "" },
  ]);
  const [activeTab, setActiveTab] = useState("term-1");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<Array<{ type: "input" | "output" | "error" | "system"; content: string }>>([
    { type: "system", content: "╔══════════════════════════════════════════════════════════════╗" },
    { type: "system", content: "║     NEXUS CODE TERMINAL v2.0 - AI-POWERED DEVELOPMENT      ║" },
    { type: "system", content: "║     Type 'help' for commands • 'ai' for AI assistance       ║" },
    { type: "system", content: "╚══════════════════════════════════════════════════════════════╝" },
    { type: "output", content: "" },
    { type: "output", content: "System initialized. Connected to HAIKU Core Engine." },
    { type: "output", content: "Project: nexus-command-center" },
    { type: "output", content: "Environment: production" },
    { type: "output", content: "" },
  ]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["/nexus-command-center"]));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCommand = async (cmd?: string) => {
    const command = cmd || terminalInput.trim();
    if (!command) return;

    setTerminalHistory((prev) => [...prev, { type: "input", content: `$ ${command}` }]);
    setTerminalInput("");
    setIsProcessing(true);

    // Simulate command processing
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    let output: Array<{ type: "output" | "error" | "system"; content: string }> = [];

    // Command handling
    if (command === "help") {
      output = [
        { type: "output", content: "NEXUS CODE COMMANDS:" },
        { type: "output", content: "  help              Show this help message" },
        { type: "output", content: "  clear             Clear terminal" },
        { type: "output", content: "  ls [path]         List directory contents" },
        { type: "output", content: "  pwd               Print working directory" },
        { type: "output", content: "  cat [file]        Display file contents" },
        { type: "output", content: "  git [cmd]         Git operations" },
        { type: "output", content: "  pnpm [cmd]        Package manager commands" },
        { type: "output", content: "  pm2 [cmd]         Process manager commands" },
        { type: "output", content: "" },
        { type: "output", content: "AI COMMANDS:" },
        { type: "output", content: "  ai help           AI assistance for current context" },
        { type: "output", content: "  ai fix [error]    AI error resolution" },
        { type: "output", content: "  ai optimize       AI code optimization" },
        { type: "output", content: "  ai generate       AI code generation" },
        { type: "output", content: "" },
        { type: "output", content: "GOD MODE COMMANDS:" },
        { type: "output", content: "  神 deploy         Divine deployment" },
        { type: "output", content: "  神 heal           Auto-fix all errors" },
        { type: "output", content: "  神 scale          Auto-scale infrastructure" },
      ];
    } else if (command === "clear") {
      setTerminalHistory([]);
      setIsProcessing(false);
      return;
    } else if (command === "pwd") {
      output = [{ type: "output", content: "/home/administrator/nexus-command-center" }];
    } else if (command.startsWith("ls")) {
      output = [
        { type: "output", content: "drwxr-xr-x  apps/" },
        { type: "output", content: "drwxr-xr-x  packages/" },
        { type: "output", content: "-rw-r--r--  package.json" },
        { type: "output", content: "-rw-r--r--  turbo.json" },
        { type: "output", content: "-rw-r--r--  pnpm-workspace.yaml" },
        { type: "output", content: "-rw-r--r--  .env" },
      ];
    } else if (command === "git status") {
      output = [
        { type: "output", content: "On branch main" },
        { type: "output", content: "Your branch is up to date with 'origin/main'." },
        { type: "output", content: "" },
        { type: "output", content: "Changes not staged for commit:" },
        { type: "output", content: "  modified:   apps/web/src/app/scifi/nexus-ai/page.tsx" },
        { type: "output", content: "  modified:   apps/web/src/app/scifi/nexus-code/page.tsx" },
        { type: "output", content: "" },
        { type: "output", content: "no changes added to commit" },
      ];
    } else if (command === "pnpm build") {
      output = [
        { type: "output", content: "> nexus-command-center@1.0.0 build" },
        { type: "output", content: "> turbo build" },
        { type: "output", content: "" },
        { type: "output", content: "• Packages in scope: @nexus/api, @nexus/db, @nexus/ui, web" },
        { type: "output", content: "• Running build in 4 packages" },
        { type: "output", content: "• Remote caching enabled" },
        { type: "output", content: "" },
        { type: "system", content: "@nexus/ui:build: cache hit, replaying output" },
        { type: "system", content: "@nexus/db:build: cache hit, replaying output" },
        { type: "system", content: "@nexus/api:build: cache hit, replaying output" },
        { type: "output", content: "" },
        { type: "output", content: "web:build: ▲ Next.js 15.3.1" },
        { type: "output", content: "web:build: Creating an optimized production build..." },
        { type: "output", content: "web:build: ✓ Compiled successfully" },
        { type: "output", content: "web:build: ✓ Linting and checking validity of types" },
        { type: "output", content: "web:build: ✓ Collecting page data" },
        { type: "output", content: "web:build: ✓ Generating static pages" },
        { type: "output", content: "" },
        { type: "system", content: " Tasks:    4 successful, 4 total" },
        { type: "system", content: " Cached:   3 cached, 4 total" },
        { type: "system", content: " Time:     12.4s" },
      ];
    } else if (command === "pm2 list") {
      output = [
        { type: "output", content: "┌────┬────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┐" },
        { type: "output", content: "│ id │ name               │ namespace   │ version │ mode    │ pid      │ uptime │" },
        { type: "output", content: "├────┼────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┤" },
        { type: "output", content: "│ 0  │ scifi-dashboard    │ default     │ 1.0.0   │ fork    │ 1234     │ 7d     │" },
        { type: "output", content: "│ 1  │ enterprise         │ default     │ 1.0.0   │ fork    │ 1235     │ 7d     │" },
        { type: "output", content: "│ 2  │ west-money-bau     │ default     │ 1.0.0   │ fork    │ 1236     │ 3d     │" },
        { type: "output", content: "└────┴────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┘" },
      ];
    } else if (command.startsWith("ai ")) {
      const aiCmd = command.substring(3);
      setAiSuggestion("Analyzing...");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (aiCmd === "help") {
        output = [
          { type: "system", content: "🤖 HAIKU AI ASSISTANT" },
          { type: "output", content: "" },
          { type: "output", content: "I can help you with:" },
          { type: "output", content: "• Code optimization and refactoring" },
          { type: "output", content: "• Error diagnosis and fixes" },
          { type: "output", content: "• Best practices suggestions" },
          { type: "output", content: "• Architecture decisions" },
          { type: "output", content: "" },
          { type: "output", content: "Try: 'ai fix [error]' or 'ai optimize [file]'" },
        ];
        setAiSuggestion(null);
      } else if (aiCmd.startsWith("fix")) {
        output = [
          { type: "system", content: "🔧 AI ERROR ANALYSIS" },
          { type: "output", content: "" },
          { type: "output", content: "Scanning codebase for issues..." },
          { type: "output", content: "Found 3 potential issues:" },
          { type: "output", content: "" },
          { type: "output", content: "1. TypeScript strict null check in api/router.ts:47" },
          { type: "output", content: "   Fix: Add optional chaining (?.) operator" },
          { type: "output", content: "" },
          { type: "output", content: "2. Missing error boundary in components/Dashboard.tsx" },
          { type: "output", content: "   Fix: Wrap with ErrorBoundary component" },
          { type: "output", content: "" },
          { type: "output", content: "3. Deprecated API usage in hooks/useAuth.ts" },
          { type: "output", content: "   Fix: Update to new auth pattern" },
          { type: "output", content: "" },
          { type: "system", content: "Apply fixes? Run '神 heal' for auto-fix" },
        ];
        setAiSuggestion("3 issues found. Use '神 heal' to auto-fix all.");
      } else if (aiCmd === "optimize") {
        output = [
          { type: "system", content: "⚡ AI OPTIMIZATION ANALYSIS" },
          { type: "output", content: "" },
          { type: "output", content: "Performance opportunities found:" },
          { type: "output", content: "" },
          { type: "output", content: "• Bundle size can be reduced by 23% with code splitting" },
          { type: "output", content: "• 5 components can benefit from React.memo()" },
          { type: "output", content: "• Database queries can be optimized with proper indexing" },
          { type: "output", content: "• API response caching could improve load times by 40%" },
          { type: "output", content: "" },
          { type: "system", content: "Estimated improvement: +35% overall performance" },
        ];
        setAiSuggestion("Performance boost available: +35%");
      } else {
        output = [
          { type: "system", content: "🤖 HAIKU AI" },
          { type: "output", content: `Processing: "${aiCmd}"` },
          { type: "output", content: "I'm ready to help. Please be more specific or try 'ai help'." },
        ];
        setAiSuggestion(null);
      }
    } else if (command === "神 heal" || command === "god heal") {
      output = [
        { type: "system", content: "神 DIVINE HEALING INITIATED" },
        { type: "output", content: "" },
        { type: "output", content: "Scanning entire codebase..." },
        { type: "output", content: "Applying divine fixes..." },
        { type: "output", content: "" },
        { type: "system", content: "✓ Fixed TypeScript error in api/router.ts" },
        { type: "system", content: "✓ Added ErrorBoundary to Dashboard.tsx" },
        { type: "system", content: "✓ Updated deprecated auth pattern" },
        { type: "system", content: "✓ Resolved 12 minor linting issues" },
        { type: "output", content: "" },
        { type: "system", content: "神 All issues resolved. Codebase is now perfect." },
      ];
      setAiSuggestion(null);
    } else if (command === "神 deploy" || command === "god deploy") {
      output = [
        { type: "system", content: "神 DIVINE DEPLOYMENT SEQUENCE" },
        { type: "output", content: "" },
        { type: "output", content: "Phase 1: Pre-flight checks..." },
        { type: "system", content: "✓ All tests passing" },
        { type: "system", content: "✓ No security vulnerabilities" },
        { type: "system", content: "✓ Build optimized" },
        { type: "output", content: "" },
        { type: "output", content: "Phase 2: Deploying to production..." },
        { type: "system", content: "✓ Docker image built" },
        { type: "system", content: "✓ Kubernetes pods updated" },
        { type: "system", content: "✓ CDN cache purged" },
        { type: "output", content: "" },
        { type: "output", content: "Phase 3: Verification..." },
        { type: "system", content: "✓ Health checks passing" },
        { type: "system", content: "✓ All services online" },
        { type: "output", content: "" },
        { type: "system", content: "神 Deployment complete. Your will is done." },
      ];
    } else {
      output = [
        { type: "error", content: `Command not found: ${command}` },
        { type: "output", content: "Type 'help' for available commands." },
      ];
    }

    setTerminalHistory((prev) => [...prev, ...output]);
    setIsProcessing(false);
  };

  const addNewTab = () => {
    const newId = `term-${tabs.length + 1}`;
    setTabs([...tabs, { id: newId, name: `Terminal ${tabs.length + 1}`, type: "terminal", content: "" }]);
    setActiveTab(newId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex">
      {/* File Explorer - Left */}
      <div className="w-64 bg-void-dark/80 backdrop-blur-xl border-r border-neon-cyan/10 flex flex-col">
        <div className="p-3 border-b border-neon-cyan/10">
          <h2 className="text-xs font-display font-bold text-white/80 flex items-center gap-2">
            <span className="text-neon-cyan">📁</span> EXPLORER
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20">
          {SAMPLE_PROJECT.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              depth={0}
            />
          ))}
        </div>

        {/* Quick Commands */}
        <div className="p-3 border-t border-neon-cyan/10">
          <h3 className="text-[10px] font-mono text-white/40 uppercase mb-2">Quick Commands</h3>
          <div className="grid grid-cols-2 gap-1">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => handleCommand(cmd.command)}
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-mono bg-void-surface/50 hover:bg-neon-cyan/10 border border-white/5 hover:border-neon-cyan/30 rounded text-white/60 hover:text-neon-cyan transition-all"
              >
                <span>{cmd.icon}</span>
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Editor/Terminal Area */}
      <div className="flex-1 flex flex-col bg-void-dark/60">
        {/* Tabs */}
        <div className="flex items-center bg-void-dark/80 border-b border-neon-cyan/10">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-mono cursor-pointer border-r border-white/5 transition-all",
                activeTab === tab.id
                  ? "bg-void-surface/50 text-neon-cyan border-b-2 border-b-neon-cyan"
                  : "text-white/50 hover:text-white hover:bg-void-surface/30"
              )}
            >
              <span>▣</span>
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-2 text-white/30 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addNewTab}
            className="px-3 py-2 text-white/30 hover:text-neon-cyan transition-colors"
          >
            +
          </button>

          {/* AI Suggestion Badge */}
          {aiSuggestion && (
            <div className="ml-auto mr-4 flex items-center gap-2 px-3 py-1 bg-neon-purple/20 border border-neon-purple/30 rounded-full">
              <span className="text-neon-purple animate-pulse">🤖</span>
              <span className="text-[10px] font-mono text-neon-purple">{aiSuggestion}</span>
            </div>
          )}
        </div>

        {/* Terminal Content */}
        <div className="flex-1 flex flex-col p-4">
          <div
            ref={terminalRef}
            className="flex-1 bg-void/90 rounded-lg p-4 font-mono text-sm overflow-y-auto scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20"
          >
            {terminalHistory.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "whitespace-pre-wrap",
                  line.type === "input" && "text-neon-cyan",
                  line.type === "output" && "text-white/70",
                  line.type === "error" && "text-neon-red",
                  line.type === "system" && "text-neon-green"
                )}
              >
                {line.content}
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-neon-cyan animate-pulse">
                <span>⟳</span> Processing...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="mt-4 flex items-center gap-2">
            <span className={cn(
              "font-mono text-sm",
              isGodMode && "text-god-secondary",
              isUltraInstinct && "text-ultra-primary",
              !isGodMode && !isUltraInstinct && "text-neon-cyan"
            )}>
              {isGodMode ? "神" : isUltraInstinct ? "極" : "$"}
            </span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleCommand()}
              disabled={isProcessing}
              placeholder="Enter command..."
              className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-white placeholder:text-white/30"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Status */}
      <div className="w-64 bg-void-dark/80 backdrop-blur-xl border-l border-neon-cyan/10 flex flex-col">
        <div className="p-3 border-b border-neon-cyan/10">
          <h2 className="text-xs font-display font-bold text-white/80 flex items-center gap-2">
            <span className="text-neon-green">◉</span> SYSTEM STATUS
          </h2>
        </div>

        <div className="p-3 space-y-4">
          {/* Environment */}
          <div>
            <h3 className="text-[10px] font-mono text-white/40 uppercase mb-2">Environment</h3>
            <div className="space-y-1">
              <StatusRow label="Node" value="v20.11.0" status="ok" />
              <StatusRow label="pnpm" value="9.15.2" status="ok" />
              <StatusRow label="TypeScript" value="5.7.2" status="ok" />
              <StatusRow label="Next.js" value="15.3.1" status="ok" />
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-[10px] font-mono text-white/40 uppercase mb-2">Services</h3>
            <div className="space-y-1">
              <StatusRow label="Database" value="Connected" status="ok" />
              <StatusRow label="Redis" value="Connected" status="ok" />
              <StatusRow label="WhatsApp" value="Active" status="ok" />
              <StatusRow label="HubSpot" value="Synced" status="ok" />
            </div>
          </div>

          {/* Git Info */}
          <div>
            <h3 className="text-[10px] font-mono text-white/40 uppercase mb-2">Git</h3>
            <div className="space-y-1">
              <StatusRow label="Branch" value="main" status="ok" />
              <StatusRow label="Commits" value="+2 ahead" status="warning" />
              <StatusRow label="Changes" value="2 files" status="warning" />
            </div>
          </div>

          {/* AI Status */}
          <div className={cn(
            "p-3 rounded-lg border",
            isGodMode && "bg-god-primary/10 border-god-secondary/30",
            isUltraInstinct && "bg-ultra-secondary/10 border-ultra-primary/30",
            !isGodMode && !isUltraInstinct && "bg-neon-purple/10 border-neon-purple/30"
          )}>
            <h3 className="text-[10px] font-mono text-white/40 uppercase mb-2">HAIKU AI</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-xs font-mono text-white/70">Online & Ready</span>
            </div>
            <div className="text-[10px] font-mono text-white/40">
              Power Level: {powerLevel.toLocaleString()}
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

function FileTreeNode({
  node,
  expandedFolders,
  toggleFolder,
  selectedFile,
  onSelectFile,
  depth,
}: {
  node: FileNode;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  depth: number;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;

  const getFileIcon = (name: string, type: "file" | "folder") => {
    if (type === "folder") return isExpanded ? "📂" : "📁";
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return "📘";
    if (name.endsWith(".js") || name.endsWith(".jsx")) return "📙";
    if (name.endsWith(".json")) return "📋";
    if (name.endsWith(".env")) return "🔐";
    if (name.endsWith(".md")) return "📝";
    return "📄";
  };

  return (
    <div>
      <div
        onClick={() => {
          if (node.type === "folder") {
            toggleFolder(node.path);
          } else {
            onSelectFile(node.path);
          }
        }}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs font-mono transition-all",
          isSelected
            ? "bg-neon-cyan/20 text-neon-cyan"
            : "text-white/60 hover:text-white hover:bg-white/5"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="text-xs">{getFileIcon(node.name, node.type)}</span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === "folder" && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, value, status }: { label: string; value: string; status: "ok" | "warning" | "error" }) {
  const statusColors = {
    ok: "text-neon-green",
    warning: "text-neon-orange",
    error: "text-neon-red",
  };

  return (
    <div className="flex items-center justify-between text-[10px] font-mono">
      <span className="text-white/40">{label}</span>
      <span className={statusColors[status]}>{value}</span>
    </div>
  );
}
