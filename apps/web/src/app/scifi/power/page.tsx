"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  HoloCard,
  NeonButton,
  MetricRing,
  DataBar,
} from "@/components/scifi";
import { usePowerMode, PowerModeToggle } from "@/components/scifi/PowerModeContext";

// ═══════════════════════════════════════════════════════════════════════════════
// POWER MODE CONTROL CENTER
// Transformation management for God Mode (神) and Ultra Instinct (極)
// ═══════════════════════════════════════════════════════════════════════════════

export default function PowerModePage() {
  const {
    mode,
    activateGodMode,
    activateUltraInstinct,
    deactivate,
    powerLevel,
    stats,
    isGodMode,
    isUltraInstinct,
    isEnhanced,
  } = usePowerMode();

  const [isActivating, setIsActivating] = useState(false);
  const [activationProgress, setActivationProgress] = useState(0);

  // Activation sequence animation
  const handleActivation = async (targetMode: "god" | "ultra") => {
    if (isActivating) return;

    setIsActivating(true);
    setActivationProgress(0);

    // Simulate power-up sequence
    for (let i = 0; i <= 100; i += 2) {
      await new Promise((r) => setTimeout(r, 30));
      setActivationProgress(i);
    }

    if (targetMode === "god") {
      activateGodMode();
    } else {
      activateUltraInstinct();
    }

    setIsActivating(false);
    setActivationProgress(0);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-6 space-y-6 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "font-display text-2xl font-bold tracking-wider transition-colors",
            isGodMode && "text-god-secondary",
            isUltraInstinct && "text-ultra-primary",
            !isEnhanced && "text-white"
          )}>
            POWER MODE CONTROL
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Current State:{" "}
            <span className={cn(
              isGodMode && "text-god-secondary",
              isUltraInstinct && "text-ultra-primary",
              !isEnhanced && "text-neon-green"
            )}>
              {mode === "god" ? "神 GOD MODE" : mode === "ultra" ? "極 ULTRA INSTINCT" : "NORMAL"}
            </span>
          </p>
        </div>
        {isEnhanced && (
          <NeonButton variant="cyan" size="sm" onClick={deactivate}>
            Deactivate
          </NeonButton>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Power Activation */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Activation Cards */}
          <div className="grid grid-cols-2 gap-6">
            {/* God Mode Card */}
            <div
              className={cn(
                "relative overflow-hidden rounded-xl border-2 transition-all duration-500",
                isGodMode
                  ? "border-god-secondary bg-god-primary/20 shadow-[0_0_50px_rgba(255,215,0,0.3)]"
                  : "border-god-primary/30 bg-void-surface/50 hover:border-god-secondary/50"
              )}
            >
              {/* Background Effect */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-god-primary/20 to-transparent transition-opacity",
                isGodMode ? "opacity-100" : "opacity-0"
              )} />

              <div className="relative p-6 space-y-6">
                {/* Title */}
                <div className="text-center">
                  <div className={cn(
                    "text-6xl font-display transition-all",
                    isGodMode ? "animate-pulse text-god-secondary" : "text-god-secondary/50"
                  )}>
                    神
                  </div>
                  <h2 className="font-display text-xl font-bold text-god-secondary mt-2">
                    GOD MODE
                  </h2>
                  <p className="text-xs text-white/50 font-mono mt-1">
                    Maximum Power Override
                  </p>
                </div>

                {/* Power Level */}
                <div className="text-center">
                  <div className="text-3xl font-mono text-god-secondary font-bold">
                    {isGodMode ? "9,001+" : "0"}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase">Power Level</div>
                </div>

                {/* Capabilities */}
                <div className="space-y-2 text-xs font-mono">
                  <CapabilityItem text="Unlimited API Requests" active={isGodMode} color="god" />
                  <CapabilityItem text="Priority Processing" active={isGodMode} color="god" />
                  <CapabilityItem text="Enhanced Analytics" active={isGodMode} color="god" />
                  <CapabilityItem text="All Features Unlocked" active={isGodMode} color="god" />
                </div>

                {/* Activation Button */}
                <button
                  onClick={() => handleActivation("god")}
                  disabled={isActivating || isGodMode}
                  className={cn(
                    "w-full py-4 rounded-lg font-display font-bold uppercase tracking-wider transition-all",
                    isGodMode
                      ? "bg-god-secondary text-void-dark cursor-default"
                      : "bg-god-primary/20 border border-god-secondary/50 text-god-secondary hover:bg-god-primary/40"
                  )}
                >
                  {isGodMode ? "ACTIVE" : isActivating ? "POWERING UP..." : "ACTIVATE"}
                </button>
              </div>
            </div>

            {/* Ultra Instinct Card */}
            <div
              className={cn(
                "relative overflow-hidden rounded-xl border-2 transition-all duration-500",
                isUltraInstinct
                  ? "border-ultra-primary bg-ultra-secondary/20 shadow-[0_0_50px_rgba(200,200,255,0.3)]"
                  : "border-ultra-secondary/30 bg-void-surface/50 hover:border-ultra-primary/50"
              )}
            >
              {/* Background Effect */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-ultra-secondary/20 to-transparent transition-opacity",
                isUltraInstinct ? "opacity-100" : "opacity-0"
              )} />

              <div className="relative p-6 space-y-6">
                {/* Title */}
                <div className="text-center">
                  <div className={cn(
                    "text-6xl font-display transition-all",
                    isUltraInstinct ? "animate-pulse text-ultra-primary" : "text-ultra-primary/50"
                  )}>
                    極
                  </div>
                  <h2 className="font-display text-xl font-bold text-ultra-primary mt-2">
                    ULTRA INSTINCT
                  </h2>
                  <p className="text-xs text-white/50 font-mono mt-1">
                    Autonomous Intelligence
                  </p>
                </div>

                {/* Power Level */}
                <div className="text-center">
                  <div className="text-3xl font-mono text-ultra-primary font-bold">
                    {isUltraInstinct ? "∞" : "0"}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase">Power Level</div>
                </div>

                {/* Capabilities */}
                <div className="space-y-2 text-xs font-mono">
                  <CapabilityItem text="Autonomous Operations" active={isUltraInstinct} color="ultra" />
                  <CapabilityItem text="Predictive AI" active={isUltraInstinct} color="ultra" />
                  <CapabilityItem text="Self-Healing Systems" active={isUltraInstinct} color="ultra" />
                  <CapabilityItem text="Zero Latency Mode" active={isUltraInstinct} color="ultra" />
                </div>

                {/* Activation Button */}
                <button
                  onClick={() => handleActivation("ultra")}
                  disabled={isActivating || isUltraInstinct}
                  className={cn(
                    "w-full py-4 rounded-lg font-display font-bold uppercase tracking-wider transition-all",
                    isUltraInstinct
                      ? "bg-ultra-primary text-void-dark cursor-default"
                      : "bg-ultra-secondary/20 border border-ultra-primary/50 text-ultra-primary hover:bg-ultra-secondary/40"
                  )}
                >
                  {isUltraInstinct ? "ACTIVE" : isActivating ? "TRANSCENDING..." : "ACTIVATE"}
                </button>
              </div>
            </div>
          </div>

          {/* Activation Progress */}
          {isActivating && (
            <HoloCard title="ACTIVATION SEQUENCE" icon="⚡" variant={mode === "god" ? "god" : "ultra"}>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-mono text-neon-cyan mb-2">
                    {activationProgress}%
                  </div>
                  <div className="text-xs text-white/50 font-mono uppercase">
                    Initializing Power Core...
                  </div>
                </div>
                <div className="h-4 bg-void-dark rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-100 rounded-full",
                      "bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan"
                    )}
                    style={{ width: `${activationProgress}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-center">
                  <div className={activationProgress >= 25 ? "text-neon-green" : "text-white/30"}>
                    ◉ CORE INIT
                  </div>
                  <div className={activationProgress >= 50 ? "text-neon-green" : "text-white/30"}>
                    ◉ NEURAL LINK
                  </div>
                  <div className={activationProgress >= 75 ? "text-neon-green" : "text-white/30"}>
                    ◉ POWER SURGE
                  </div>
                  <div className={activationProgress >= 100 ? "text-neon-green" : "text-white/30"}>
                    ◉ COMPLETE
                  </div>
                </div>
              </div>
            </HoloCard>
          )}

          {/* Power Level Visualization */}
          <HoloCard
            title="POWER VISUALIZATION"
            subtitle="Real-time energy metrics"
            icon="◎"
            variant={isEnhanced ? (isGodMode ? "god" : "ultra") : "cyan"}
            glow={isEnhanced}
          >
            <div className="grid grid-cols-3 gap-6 py-4">
              <MetricRing
                value={isEnhanced ? 100 : 0}
                label="Core Power"
                color={isGodMode ? "gold" : isUltraInstinct ? "purple" : "cyan"}
                size="lg"
              />
              <MetricRing
                value={isEnhanced ? 100 : 0}
                label="Neural Sync"
                color={isGodMode ? "gold" : isUltraInstinct ? "purple" : "cyan"}
                size="lg"
              />
              <MetricRing
                value={isEnhanced ? 100 : 0}
                label="System Load"
                color={isGodMode ? "gold" : isUltraInstinct ? "purple" : "cyan"}
                size="lg"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <DataBar label="Energy Output" value={isEnhanced ? 100 : 15} color={isGodMode ? "gold" : isUltraInstinct ? "purple" : "cyan"} />
              <DataBar label="Processing Speed" value={isEnhanced ? 100 : 45} color={isGodMode ? "gold" : isUltraInstinct ? "purple" : "cyan"} />
              <DataBar label="Memory Allocation" value={isEnhanced ? 100 : 67} color={isGodMode ? "gold" : isUltraInstinct ? "purple" : "cyan"} />
            </div>
          </HoloCard>
        </div>

        {/* Right Column - Stats & Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Current Session */}
          <HoloCard
            title="SESSION DATA"
            icon="◆"
            variant={isEnhanced ? (isGodMode ? "god" : "ultra") : "purple"}
          >
            <div className="space-y-4">
              <div className="text-center">
                <div className={cn(
                  "text-3xl font-mono font-bold",
                  isGodMode && "text-god-secondary",
                  isUltraInstinct && "text-ultra-primary",
                  !isEnhanced && "text-white/50"
                )}>
                  {formatTime(stats.currentSessionTime)}
                </div>
                <div className="text-[10px] text-white/40 uppercase">Current Session</div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <StatBox label="Total Activations" value={stats.activationCount.toString()} />
                <StatBox label="Last Active" value={stats.lastActivation ? "Just now" : "Never"} />
                <StatBox label="God Mode Time" value={formatTime(stats.totalGodModeTime)} color="god" />
                <StatBox label="Ultra Time" value={formatTime(stats.totalUltraInstinctTime)} color="ultra" />
              </div>
            </div>
          </HoloCard>

          {/* Quick Toggle */}
          <HoloCard title="QUICK TOGGLE" icon="⚡">
            <PowerModeToggle />
          </HoloCard>

          {/* System Info */}
          <HoloCard title="SYSTEM INFO" icon="◈" variant="cyan">
            <div className="space-y-3 text-xs font-mono">
              <InfoRow label="Mode" value={mode.toUpperCase()} />
              <InfoRow label="Power Level" value={powerLevel.toLocaleString()} />
              <InfoRow label="Status" value={isEnhanced ? "ENHANCED" : "NORMAL"} />
              <InfoRow label="AI Assistants" value="3 READY" />
              <InfoRow label="System Health" value="OPTIMAL" color="green" />
            </div>
          </HoloCard>

          {/* Warning */}
          {isEnhanced && (
            <div className={cn(
              "p-4 rounded-lg border text-xs font-mono",
              isGodMode && "bg-god-primary/10 border-god-secondary/30 text-god-secondary/80",
              isUltraInstinct && "bg-ultra-secondary/10 border-ultra-primary/30 text-ultra-primary/80"
            )}>
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠</span>
                <div>
                  <div className="font-bold uppercase mb-1">Enhanced Mode Active</div>
                  <div className="text-white/50">
                    System resources are elevated. Extended use may increase API costs.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface CapabilityItemProps {
  text: string;
  active: boolean;
  color: "god" | "ultra";
}

function CapabilityItem({ text, active, color }: CapabilityItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 transition-colors",
      active
        ? color === "god" ? "text-god-secondary" : "text-ultra-primary"
        : "text-white/30"
    )}>
      <span>{active ? "◉" : "○"}</span>
      <span>{text}</span>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  color?: "god" | "ultra";
}

function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <div className="text-center p-2 rounded bg-void-dark/50">
      <div className={cn(
        "text-sm font-mono font-bold",
        color === "god" && "text-god-secondary",
        color === "ultra" && "text-ultra-primary",
        !color && "text-white"
      )}>
        {value}
      </div>
      <div className="text-[9px] text-white/40 uppercase">{label}</div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  color?: "green" | "red" | "orange";
}

function InfoRow({ label, value, color }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50">{label}</span>
      <span className={cn(
        color === "green" && "text-neon-green",
        color === "red" && "text-neon-red",
        color === "orange" && "text-neon-orange",
        !color && "text-white"
      )}>
        {value}
      </span>
    </div>
  );
}
