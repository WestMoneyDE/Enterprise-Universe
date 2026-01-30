"use client";

import { useState, useRef, useEffect, forwardRef, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL - Cyberpunk Command Line Interface
// Interactive terminal with typing effects and command history
// ═══════════════════════════════════════════════════════════════════════════════

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "success" | "warning" | "system";
  content: string;
  timestamp?: Date;
}

export interface TerminalProps {
  className?: string;
  title?: string;
  subtitle?: string;
  lines?: TerminalLine[];
  onCommand?: (command: string) => void;
  prompt?: string;
  maxLines?: number;
  readOnly?: boolean;
  autoScroll?: boolean;
  showTimestamps?: boolean;
  variant?: "default" | "cyan" | "purple" | "god" | "ultra";
}

const Terminal = forwardRef<HTMLDivElement, TerminalProps>(
  (
    {
      className,
      title = "NEURAL TERMINAL",
      subtitle = "v3.0.1",
      lines = [],
      onCommand,
      prompt = "nexus@command:~$",
      maxLines = 100,
      readOnly = false,
      autoScroll = true,
      showTimestamps = false,
      variant = "default",
    },
    ref
  ) => {
    const [input, setInput] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new lines are added
    useEffect(() => {
      if (autoScroll && outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    }, [lines, autoScroll]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && input.trim()) {
        onCommand?.(input.trim());
        setHistory((prev) => [...prev, input.trim()]);
        setHistoryIndex(-1);
        setInput("");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length > 0) {
          const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
          setHistoryIndex(newIndex);
          setInput(history[history.length - 1 - newIndex] || "");
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(history[history.length - 1 - newIndex] || "");
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInput("");
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        // Tab completion could be implemented here
      }
    };

    const focusInput = () => {
      inputRef.current?.focus();
    };

    const lineTypeStyles = {
      input: "text-neon-cyan",
      output: "text-white/80",
      error: "text-neon-red",
      success: "text-neon-green",
      warning: "text-neon-orange",
      system: "text-neon-purple",
    };

    const variantStyles = {
      default: "border-neon-cyan/30",
      cyan: "border-neon-cyan/50 shadow-neon-cyan",
      purple: "border-neon-purple/50 shadow-neon-purple",
      god: "border-god-primary/50 shadow-god",
      ultra: "border-ultra-secondary/50 shadow-ultra",
    };

    const promptColors = {
      default: "text-neon-cyan",
      cyan: "text-neon-cyan",
      purple: "text-neon-purple",
      god: "text-god-secondary",
      ultra: "text-ultra-primary",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col rounded-terminal overflow-hidden",
          "bg-void-dark/95 backdrop-blur-xl",
          "border",
          variantStyles[variant],
          className
        )}
        onClick={focusInput}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-void-surface/50">
          <div className="flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-neon-red/80 hover:bg-neon-red transition-colors" />
              <div className="w-3 h-3 rounded-full bg-neon-orange/80 hover:bg-neon-orange transition-colors" />
              <div className="w-3 h-3 rounded-full bg-neon-green/80 hover:bg-neon-green transition-colors" />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold text-white tracking-wider">
                {title}
              </span>
              <span className="text-[10px] font-mono text-white/40">{subtitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-[10px] font-mono text-neon-green">CONNECTED</span>
          </div>
        </div>

        {/* Output area */}
        <div
          ref={outputRef}
          className={cn(
            "flex-1 overflow-y-auto p-4 font-mono text-sm",
            "scrollbar-thin scrollbar-track-void scrollbar-thumb-neon-cyan/20",
            "min-h-[200px] max-h-[500px]"
          )}
        >
          {/* Boot sequence animation */}
          {lines.length === 0 && (
            <div className="space-y-1 text-white/50 animate-fade-in">
              <p>NEXUS TERMINAL v3.0.1</p>
              <p>Initializing neural interface...</p>
              <p className="text-neon-green">System ready.</p>
              <p className="text-white/30">Type 'help' for available commands.</p>
            </div>
          )}

          {/* Terminal lines */}
          {lines.slice(-maxLines).map((line) => (
            <div
              key={line.id}
              className={cn(
                "flex gap-2 py-0.5 animate-slide-up",
                lineTypeStyles[line.type]
              )}
            >
              {showTimestamps && line.timestamp && (
                <span className="text-white/30 text-xs" suppressHydrationWarning>
                  [{line.timestamp.toLocaleTimeString("de-DE")}]
                </span>
              )}
              {line.type === "input" && (
                <span className={promptColors[variant]}>{prompt}</span>
              )}
              {line.type === "error" && <span>✗</span>}
              {line.type === "success" && <span>✓</span>}
              {line.type === "warning" && <span>⚠</span>}
              {line.type === "system" && <span>◆</span>}
              <span className="whitespace-pre-wrap break-all">{line.content}</span>
            </div>
          ))}
        </div>

        {/* Input area */}
        {!readOnly && (
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-3",
              "border-t border-white/10 bg-void-surface/30",
              isFocused && "bg-void-surface/50"
            )}
          >
            <span className={cn("font-mono text-sm", promptColors[variant])}>
              {prompt}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={cn(
                "flex-1 bg-transparent outline-none",
                "font-mono text-sm text-white",
                "caret-neon-cyan"
              )}
              placeholder={isFocused ? "" : "Enter command..."}
              autoComplete="off"
              spellCheck={false}
            />
            <div
              className={cn(
                "w-2 h-4 bg-neon-cyan",
                isFocused && "animate-blink-caret"
              )}
            />
          </div>
        )}
      </div>
    );
  }
);

Terminal.displayName = "Terminal";

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL OUTPUT - Pre-formatted output display
// ═══════════════════════════════════════════════════════════════════════════════

export interface TerminalOutputProps {
  className?: string;
  children: string;
  variant?: "default" | "cyan" | "purple" | "god" | "ultra";
  title?: string;
  animated?: boolean;
}

export const TerminalOutput = forwardRef<HTMLPreElement, TerminalOutputProps>(
  ({ className, children, variant = "default", title, animated = false }, ref) => {
    const variantStyles = {
      default: "border-neon-cyan/20 text-neon-cyan/80",
      cyan: "border-neon-cyan/30 text-neon-cyan",
      purple: "border-neon-purple/30 text-neon-purple",
      god: "border-god-primary/30 text-god-secondary",
      ultra: "border-ultra-secondary/30 text-ultra-primary",
    };

    return (
      <div className={cn("rounded-terminal overflow-hidden", className)}>
        {title && (
          <div className="px-3 py-1.5 bg-void-surface/50 border-b border-white/10">
            <span className="font-mono text-xs text-white/50">{title}</span>
          </div>
        )}
        <pre
          ref={ref}
          className={cn(
            "p-4 bg-void-dark/90 backdrop-blur-xl",
            "font-mono text-sm overflow-x-auto",
            "border",
            variantStyles[variant],
            animated && "animate-typing overflow-hidden whitespace-nowrap"
          )}
        >
          {children}
        </pre>
      </div>
    );
  }
);

TerminalOutput.displayName = "TerminalOutput";

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND BADGE - Styled command display
// ═══════════════════════════════════════════════════════════════════════════════

export interface CommandBadgeProps {
  command: string;
  className?: string;
  copyable?: boolean;
}

export function CommandBadge({ command, className, copyable = true }: CommandBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-terminal",
        "bg-void-dark/80 border border-neon-cyan/20",
        "font-mono text-sm text-neon-cyan",
        copyable && "cursor-pointer hover:border-neon-cyan/40 transition-colors",
        className
      )}
      onClick={copyable ? handleCopy : undefined}
    >
      <span className="text-neon-cyan/50">$</span>
      <span>{command}</span>
      {copyable && (
        <span className="text-xs text-white/30">
          {copied ? "✓" : "⎘"}
        </span>
      )}
    </div>
  );
}

export default Terminal;
