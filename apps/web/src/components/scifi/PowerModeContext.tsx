"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc";

// ═══════════════════════════════════════════════════════════════════════════════
// POWER MODE CONTEXT - Global state for God Mode (神) and Ultra Instinct (極)
// Provides system-wide transformation effects and enhanced capabilities
// ═══════════════════════════════════════════════════════════════════════════════

export type PowerMode = "normal" | "god" | "ultra";

interface PowerModeContextType {
  mode: PowerMode;
  setMode: (mode: PowerMode) => void;
  activateGodMode: () => void;
  activateUltraInstinct: () => void;
  deactivate: () => void;
  toggle: () => void;
  isGodMode: boolean;
  isUltraInstinct: boolean;
  isEnhanced: boolean;
  powerLevel: number;
  stats: PowerStats;
}

interface PowerStats {
  activationCount: number;
  totalGodModeTime: number;
  totalUltraInstinctTime: number;
  currentSessionTime: number;
  lastActivation: Date | null;
}

const PowerModeContext = createContext<PowerModeContextType | null>(null);

export function usePowerMode() {
  const context = useContext(PowerModeContext);
  if (!context) {
    throw new Error("usePowerMode must be used within a PowerModeProvider");
  }
  return context;
}

interface PowerModeProviderProps {
  children: ReactNode;
}

export function PowerModeProvider({ children }: PowerModeProviderProps) {
  const [mode, setModeState] = useState<PowerMode>("normal");
  const [powerLevel, setPowerLevel] = useState(0);
  const [stats, setStats] = useState<PowerStats>({
    activationCount: 0,
    totalGodModeTime: 0,
    totalUltraInstinctTime: 0,
    currentSessionTime: 0,
    lastActivation: null,
  });
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  // API integration for persistence
  const { data: powerModeData } = api.system.getPowerMode.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const setPowerModeMutation = api.system.setPowerMode.useMutation();

  // Sync with server state on load
  useEffect(() => {
    if (powerModeData) {
      if (powerModeData.ultraInstinct) {
        setModeState("ultra");
      } else if (powerModeData.godMode) {
        setModeState("god");
      }
    }
  }, [powerModeData]);

  // Track session time
  useEffect(() => {
    if (mode !== "normal" && sessionStart) {
      const interval = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          currentSessionTime: Math.floor((Date.now() - sessionStart.getTime()) / 1000),
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mode, sessionStart]);

  // Animate power level
  useEffect(() => {
    const targetLevel = mode === "god" ? 9001 : mode === "ultra" ? 999999 : 0;
    const step = mode === "normal" ? -500 : 500;

    const interval = setInterval(() => {
      setPowerLevel((prev) => {
        if (mode === "normal" && prev <= 0) return 0;
        if (mode !== "normal" && prev >= targetLevel) return targetLevel;
        return Math.max(0, Math.min(targetLevel, prev + step));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [mode]);

  const setMode = useCallback((newMode: PowerMode) => {
    const now = new Date();

    // Update stats when leaving enhanced mode
    if (mode !== "normal" && sessionStart) {
      const sessionDuration = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
      setStats((prev) => ({
        ...prev,
        totalGodModeTime: mode === "god" ? prev.totalGodModeTime + sessionDuration : prev.totalGodModeTime,
        totalUltraInstinctTime: mode === "ultra" ? prev.totalUltraInstinctTime + sessionDuration : prev.totalUltraInstinctTime,
        currentSessionTime: 0,
      }));
    }

    // Start new session if activating
    if (newMode !== "normal") {
      setSessionStart(now);
      setStats((prev) => ({
        ...prev,
        activationCount: prev.activationCount + 1,
        lastActivation: now,
      }));
    } else {
      setSessionStart(null);
    }

    setModeState(newMode);

    // Persist to server
    setPowerModeMutation.mutate({ mode: newMode });
  }, [mode, sessionStart, setPowerModeMutation]);

  const activateGodMode = useCallback(() => setMode("god"), [setMode]);
  const activateUltraInstinct = useCallback(() => setMode("ultra"), [setMode]);
  const deactivate = useCallback(() => setMode("normal"), [setMode]);

  const toggle = useCallback(() => {
    const modes: PowerMode[] = ["normal", "god", "ultra"];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  }, [mode, setMode]);

  const value: PowerModeContextType = {
    mode,
    setMode,
    activateGodMode,
    activateUltraInstinct,
    deactivate,
    toggle,
    isGodMode: mode === "god",
    isUltraInstinct: mode === "ultra",
    isEnhanced: mode !== "normal",
    powerLevel,
    stats,
  };

  return (
    <PowerModeContext.Provider value={value}>
      {/* Global overlay effects */}
      <PowerModeOverlay mode={mode} />
      {children}
    </PowerModeContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POWER MODE OVERLAY - Visual transformation effects
// ═══════════════════════════════════════════════════════════════════════════════

function PowerModeOverlay({ mode }: { mode: PowerMode }) {
  if (mode === "normal") return null;

  return (
    <>
      {/* Animated border glow */}
      <div
        className={cn(
          "fixed inset-0 pointer-events-none z-[100] transition-all duration-1000",
          mode === "god" && "shadow-[inset_0_0_100px_rgba(255,215,0,0.3)]",
          mode === "ultra" && "shadow-[inset_0_0_100px_rgba(200,200,255,0.3)]"
        )}
      />

      {/* Corner accents */}
      <div className="fixed inset-0 pointer-events-none z-[99]">
        {/* Top Left */}
        <div className={cn(
          "absolute top-0 left-0 w-32 h-32",
          mode === "god" && "bg-gradient-to-br from-god-primary/30 to-transparent",
          mode === "ultra" && "bg-gradient-to-br from-ultra-secondary/30 to-transparent"
        )} />

        {/* Top Right */}
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32",
          mode === "god" && "bg-gradient-to-bl from-god-primary/30 to-transparent",
          mode === "ultra" && "bg-gradient-to-bl from-ultra-secondary/30 to-transparent"
        )} />

        {/* Bottom Left */}
        <div className={cn(
          "absolute bottom-0 left-0 w-32 h-32",
          mode === "god" && "bg-gradient-to-tr from-god-primary/30 to-transparent",
          mode === "ultra" && "bg-gradient-to-tr from-ultra-secondary/30 to-transparent"
        )} />

        {/* Bottom Right */}
        <div className={cn(
          "absolute bottom-0 right-0 w-32 h-32",
          mode === "god" && "bg-gradient-to-tl from-god-primary/30 to-transparent",
          mode === "ultra" && "bg-gradient-to-tl from-ultra-secondary/30 to-transparent"
        )} />
      </div>

      {/* Floating particles effect */}
      <div className="fixed inset-0 pointer-events-none z-[98] overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-1 h-1 rounded-full animate-float",
              mode === "god" && "bg-god-secondary",
              mode === "ultra" && "bg-ultra-primary"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Mode indicator badge */}
      <div className={cn(
        "fixed top-16 left-1/2 -translate-x-1/2 z-[101]",
        "px-4 py-2 rounded-full border backdrop-blur-xl",
        "animate-pulse font-display text-sm tracking-widest",
        mode === "god" && "bg-god-primary/20 border-god-secondary/50 text-god-secondary",
        mode === "ultra" && "bg-ultra-secondary/20 border-ultra-primary/50 text-ultra-primary"
      )}>
        {mode === "god" ? "神 GOD MODE ACTIVE" : "極 ULTRA INSTINCT"}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POWER MODE TOGGLE BUTTON - Quick activation widget
// ═══════════════════════════════════════════════════════════════════════════════

interface PowerModeToggleProps {
  className?: string;
  compact?: boolean;
}

export function PowerModeToggle({ className, compact }: PowerModeToggleProps) {
  const { mode, activateGodMode, activateUltraInstinct, deactivate, powerLevel } = usePowerMode();

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <button
          onClick={mode === "god" ? deactivate : activateGodMode}
          className={cn(
            "px-2 py-1 rounded text-xs font-display transition-all",
            mode === "god"
              ? "bg-god-primary/30 text-god-secondary border border-god-secondary/50 animate-pulse"
              : "text-god-secondary/50 hover:bg-god-primary/20"
          )}
        >
          神
        </button>
        <button
          onClick={mode === "ultra" ? deactivate : activateUltraInstinct}
          className={cn(
            "px-2 py-1 rounded text-xs font-display transition-all",
            mode === "ultra"
              ? "bg-ultra-secondary/30 text-ultra-primary border border-ultra-primary/50 animate-pulse"
              : "text-ultra-primary/50 hover:bg-ultra-secondary/20"
          )}
        >
          極
        </button>
      </div>
    );
  }

  return (
    <div className={cn("p-4 rounded-lg bg-void-surface/50 border border-white/10", className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-white/50 uppercase">Power Mode</span>
        <span className="text-xs font-mono text-neon-cyan" suppressHydrationWarning>
          LVL: {powerLevel}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={mode === "god" ? deactivate : activateGodMode}
          className={cn(
            "flex-1 p-3 rounded-lg border transition-all duration-300",
            mode === "god"
              ? "bg-god-primary/30 border-god-secondary/50 text-god-secondary animate-pulse"
              : "bg-void-dark/50 border-white/10 text-white/50 hover:border-god-secondary/30 hover:text-god-secondary"
          )}
        >
          <div className="text-2xl mb-1">神</div>
          <div className="text-[10px] font-mono uppercase">God Mode</div>
        </button>

        <button
          onClick={mode === "ultra" ? deactivate : activateUltraInstinct}
          className={cn(
            "flex-1 p-3 rounded-lg border transition-all duration-300",
            mode === "ultra"
              ? "bg-ultra-secondary/30 border-ultra-primary/50 text-ultra-primary animate-pulse"
              : "bg-void-dark/50 border-white/10 text-white/50 hover:border-ultra-primary/30 hover:text-ultra-primary"
          )}
        >
          <div className="text-2xl mb-1">極</div>
          <div className="text-[10px] font-mono uppercase">Ultra Instinct</div>
        </button>
      </div>

      {mode !== "normal" && (
        <button
          onClick={deactivate}
          className="w-full mt-3 py-2 text-xs font-mono text-white/50 hover:text-neon-red transition-colors"
        >
          Deactivate
        </button>
      )}
    </div>
  );
}

// Export default for easier imports
export default PowerModeProvider;
