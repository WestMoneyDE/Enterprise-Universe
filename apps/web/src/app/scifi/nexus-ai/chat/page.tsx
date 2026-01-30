"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode, AIChat } from "@/components/scifi";
import {
  MessageSquare,
  Bot,
  Sparkles,
  Users,
  ChevronLeft,
  Zap,
} from "lucide-react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS AI CHAT PAGE - Full conversational interface
// Talk directly with Genius Agency Bots
// ═══════════════════════════════════════════════════════════════════════════════

const AVAILABLE_BOTS = [
  { id: "HAIKU", name: "HAIKU", role: "Divine Controller", power: 9001, team: "Leadership" },
  { id: "SONNET", name: "SONNET", role: "Strategic Advisor", power: 8500, team: "Leadership" },
  { id: "OPUS", name: "OPUS", role: "Deep Analyst", power: 9500, team: "Leadership" },
  { id: "MAX", name: "MAX", role: "WhatsApp Commander", power: 7800, team: "Sales" },
  { id: "NOVA", name: "NOVA", role: "Data Scientist", power: 8200, team: "Analytics" },
  { id: "MAYA", name: "MAYA", role: "Content Creator", power: 7000, team: "Marketing" },
  { id: "LUNA", name: "LUNA", role: "Customer Care", power: 6500, team: "Support" },
  { id: "CIPHER", name: "CIPHER", role: "Security Guard", power: 8500, team: "Operations" },
  { id: "BAUMEISTER", name: "BAUMEISTER", role: "Project Lead", power: 7500, team: "West Money Bau" },
];

export default function NexusAIChatPage() {
  const { mode: powerMode } = usePowerMode();
  const [selectedBot, setSelectedBot] = useState("HAIKU");

  const isGodMode = powerMode === "god";
  const isUltraMode = powerMode === "ultra";

  const getAccentColor = () => {
    if (isGodMode) return "text-god-primary";
    if (isUltraMode) return "text-ultra-secondary";
    return "text-neon-cyan";
  };

  const getBorderColor = () => {
    if (isGodMode) return "border-god-primary/30";
    if (isUltraMode) return "border-ultra-secondary/30";
    return "border-neon-cyan/30";
  };

  const currentBot = AVAILABLE_BOTS.find((b) => b.id === selectedBot);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/scifi/nexus-ai"
            className="p-2 rounded-lg bg-void-surface/30 border border-white/10 hover:border-white/20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-white/60" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isGodMode && "bg-god-primary/20",
                isUltraMode && "bg-ultra-secondary/20",
                !isGodMode && !isUltraMode && "bg-neon-cyan/20"
              )}
            >
              <MessageSquare className={cn("h-5 w-5", getAccentColor())} />
            </div>
            <div>
              <h1 className={cn("text-2xl font-display font-bold", getAccentColor())}>
                AI CHAT
              </h1>
              <p className="text-xs font-mono text-white/40">
                Direkter Kontakt mit Genius Agency Bots
              </p>
            </div>
          </div>
        </div>

        {/* Current Bot Indicator */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-xl border",
            getBorderColor(),
            "bg-void-dark/50"
          )}
        >
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-sm font-display font-medium text-white">
            Verbunden mit {selectedBot}
          </span>
          <span className="text-xs font-mono text-white/40">
            ⚡ {currentBot?.power.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        {/* Bot Selector - Left */}
        <div className="col-span-3">
          <div
            className={cn(
              "h-full bg-void-dark/80 backdrop-blur-xl rounded-xl border p-4",
              getBorderColor()
            )}
          >
            <h2 className="text-sm font-display font-bold text-white/80 mb-4 flex items-center gap-2">
              <Users className={cn("h-4 w-4", getAccentColor())} />
              VERFÜGBARE BOTS
            </h2>

            <div className="space-y-2">
              {AVAILABLE_BOTS.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => setSelectedBot(bot.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                    "border",
                    selectedBot === bot.id
                      ? isGodMode
                        ? "bg-god-primary/10 border-god-primary/50"
                        : isUltraMode
                        ? "bg-ultra-secondary/10 border-ultra-secondary/50"
                        : "bg-neon-cyan/10 border-neon-cyan/50"
                      : "bg-void-surface/30 border-transparent hover:border-white/10"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                      selectedBot === bot.id
                        ? isGodMode
                          ? "bg-god-primary/20 text-god-primary"
                          : isUltraMode
                          ? "bg-ultra-secondary/20 text-ultra-secondary"
                          : "bg-neon-cyan/20 text-neon-cyan"
                        : "bg-white/5 text-white/60"
                    )}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-display font-bold",
                          selectedBot === bot.id ? getAccentColor() : "text-white/80"
                        )}
                      >
                        {bot.name}
                      </span>
                      {selectedBot === bot.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-white/40 truncate">
                      {bot.role}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-white/30">
                    ⚡{(bot.power / 1000).toFixed(1)}k
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Tips */}
            <div className={cn("mt-6 p-3 rounded-lg border", getBorderColor(), "bg-void-surface/20")}>
              <h3 className="text-[10px] font-mono text-white/40 uppercase mb-2">
                Quick Tips
              </h3>
              <ul className="space-y-1.5 text-[10px] font-mono text-white/50">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-neon-purple" />
                  HAIKU für strategische Fragen
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-neon-green" />
                  MAX für Sales & WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <Bot className="h-3 w-3 text-neon-cyan" />
                  NOVA für Datenanalysen
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Chat Area - Center/Right */}
        <div className="col-span-9">
          <AIChat
            className="h-full"
            selectedBot={selectedBot}
            placeholder={`Nachricht an ${selectedBot} senden...`}
            welcomeMessage={`神 ${selectedBot} bereit. Wie kann ich dir helfen, Meister?`}
            expanded
          />
        </div>
      </div>
    </div>
  );
}
