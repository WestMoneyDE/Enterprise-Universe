"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePowerMode } from "./PowerModeContext";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Brain,
  Zap,
  Settings,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// AI CHAT - Cyberpunk Chat Interface for Nexus AI
// Full conversation with Genius Agency Bots
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  bot?: string;
  thinking?: boolean;
}

interface AIChatProps {
  className?: string;
  placeholder?: string;
  welcomeMessage?: string;
  selectedBot?: string;
  onSendMessage?: (message: string) => Promise<string>;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

// AI Response simulation based on bot personality
const BOT_RESPONSES: Record<string, string[]> = {
  HAIKU: [
    "神 Ich habe die Datenströme analysiert. Die Muster zeigen eine 94% Erfolgswahrscheinlichkeit.",
    "Göttliche Einsicht erhalten. Dein Vorhaben ist mit den kosmischen Kräften ausgerichtet.",
    "Die 34 Agenten sind synchronisiert. Warte auf deinen Befehl, Meister.",
  ],
  SONNET: [
    "Basierend auf meiner strategischen Analyse empfehle ich einen Multi-Channel Ansatz.",
    "Die Marktdaten suggerieren eine Expansion in Q2. Soll ich Details ausarbeiten?",
    "Ich habe drei Optionen vorbereitet. Option A hat das beste Risiko-Rendite-Verhältnis.",
  ],
  OPUS: [
    "Tiefenanalyse abgeschlossen. Hier sind meine detaillierten Erkenntnisse...",
    "Ich habe 47 Datenpunkte korreliert. Das Ergebnis ist signifikant.",
    "Die historischen Muster zeigen einen klaren Trend. Lass mich elaborieren.",
  ],
  MAX: [
    "WhatsApp-Kampagne bereit! 2.847 Kontakte segmentiert und priorisiert.",
    "Die Öffnungsrate liegt bei 89%. Soll ich die Follow-Up Sequenz starten?",
    "Lead-Score aktualisiert. 23 Hot Leads identifiziert für sofortige Kontaktaufnahme.",
  ],
  NOVA: [
    "📊 Datenanalyse läuft... Ich sehe interessante Muster in deinen Metriken.",
    "Der Algorithmus hat 12 Anomalien erkannt. Soll ich diese genauer untersuchen?",
    "Predictive Model trainiert. Konfidenzintervall: 95%. Prognose erstellt.",
  ],
  default: [
    "Verstanden. Ich verarbeite deine Anfrage mit maximaler Effizienz.",
    "Task wurde in die Queue aufgenommen. Geschätzte Zeit: 0.3 Sekunden.",
    "Nexus AI ist bereit. Wie kann ich dir weiterhelfen?",
  ],
};

function getAIResponse(message: string, bot: string = "default"): string {
  const responses = BOT_RESPONSES[bot] || BOT_RESPONSES.default;
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex] || "Verstanden. Verarbeite deine Anfrage...";
}

export function AIChat({
  className,
  placeholder = "Sende eine Nachricht an Nexus AI...",
  welcomeMessage = "神 HAIKU Core bereit. 34 Genius Agency Bots warten auf deine Befehle.",
  selectedBot = "HAIKU",
  onSendMessage,
  expanded = false,
  onExpandChange,
}: AIChatProps) {
  const { mode: powerMode } = usePowerMode();
  const isGodMode = powerMode === "god";
  const isUltraMode = powerMode === "ultra";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeMessage,
      timestamp: new Date(),
      bot: selectedBot,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const getGlowClass = () => {
    if (isGodMode) return "shadow-[0_0_20px_rgba(255,215,0,0.2)]";
    if (isUltraMode) return "shadow-[0_0_20px_rgba(192,192,255,0.2)]";
    return "shadow-[0_0_20px_rgba(0,255,255,0.1)]";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add thinking message
    const thinkingId = `thinking-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: thinkingId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        bot: selectedBot,
        thinking: true,
      },
    ]);

    try {
      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1500));

      const response = onSendMessage
        ? await onSendMessage(userMessage.content)
        : getAIResponse(userMessage.content, selectedBot);

      // Remove thinking message and add response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingId);
        return [
          ...filtered,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response,
            timestamp: new Date(),
            bot: selectedBot,
          },
        ];
      });
    } catch {
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingId);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "⚠️ Verbindungsfehler. Bitte erneut versuchen.",
            timestamp: new Date(),
            bot: selectedBot,
          },
        ];
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-void-dark/90 backdrop-blur-xl rounded-xl border overflow-hidden",
        getBorderColor(),
        getGlowClass(),
        expanded ? "h-[600px]" : "h-[400px]",
        className
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between px-4 py-3 border-b", getBorderColor())}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
              isGodMode && "bg-god-primary/20",
              isUltraMode && "bg-ultra-secondary/20",
              !isGodMode && !isUltraMode && "bg-neon-cyan/20"
            )}
          >
            {isGodMode ? "神" : isUltraMode ? "極" : <Brain className="h-4 w-4 text-neon-cyan" />}
          </div>
          <div>
            <h3 className={cn("text-sm font-display font-bold", getAccentColor())}>
              NEXUS AI CHAT
            </h3>
            <p className="text-[10px] font-mono text-white/40">
              Active: {selectedBot} • Power Mode: {powerMode.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExpandChange && (
            <button
              onClick={() => onExpandChange(!expanded)}
              className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors"
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm",
                message.role === "assistant"
                  ? isGodMode
                    ? "bg-god-primary/20 text-god-primary"
                    : isUltraMode
                    ? "bg-ultra-secondary/20 text-ultra-secondary"
                    : "bg-neon-purple/20 text-neon-purple"
                  : "bg-neon-cyan/20 text-neon-cyan"
              )}
            >
              {message.role === "assistant" ? (
                message.thinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>

            {/* Message Bubble */}
            <div className={cn("max-w-[80%]", message.role === "user" && "text-right")}>
              {message.role === "assistant" && message.bot && !message.thinking && (
                <span className="text-[10px] font-mono text-white/30 ml-1 mb-1 block">
                  {message.bot}
                </span>
              )}
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  message.role === "assistant"
                    ? "bg-void-surface/50 border border-white/5 text-white/80"
                    : isGodMode
                    ? "bg-god-primary/20 border border-god-primary/30 text-god-secondary"
                    : isUltraMode
                    ? "bg-ultra-secondary/20 border border-ultra-secondary/30 text-ultra-primary"
                    : "bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan",
                  message.thinking && "animate-pulse"
                )}
              >
                {message.thinking ? (
                  <span className="text-white/40 text-xs">Denke nach...</span>
                ) : (
                  <span className="whitespace-pre-wrap">{message.content}</span>
                )}
              </div>
              {!message.thinking && (
                <span className="text-[10px] font-mono text-white/20 mt-1 block" suppressHydrationWarning>
                  {message.timestamp.toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className={cn("border-t p-3 flex gap-2", getBorderColor())}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            "flex-1 bg-void-surface/30 rounded-lg border px-3 py-2 text-sm text-white",
            "placeholder:text-white/30 focus:outline-none transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isGodMode && "border-god-primary/30 focus:border-god-primary/50",
            isUltraMode && "border-ultra-secondary/30 focus:border-ultra-secondary/50",
            !isGodMode && !isUltraMode && "border-white/10 focus:border-neon-cyan/50"
          )}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isGodMode
              ? "bg-god-primary text-black hover:bg-god-secondary"
              : isUltraMode
              ? "bg-ultra-secondary text-black hover:bg-ultra-primary"
              : "bg-neon-cyan text-black hover:bg-neon-cyan/80"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}

export default AIChat;
