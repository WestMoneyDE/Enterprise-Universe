"use client";

import { ReactNode } from "react";
import { PowerModeProvider } from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// SCIFI LOGIN LAYOUT
// Minimal layout for login - no sidebar, no taskbar
// ═══════════════════════════════════════════════════════════════════════════════

export default function SciFiLoginLayout({ children }: { children: ReactNode }) {
  return (
    <PowerModeProvider>
      <div className="min-h-screen bg-void relative overflow-hidden">
        {/* Cyber Grid Background */}
        <div className="fixed inset-0 bg-cyber-grid bg-cyber-grid opacity-30 pointer-events-none" />

        {/* Animated scanlines effect */}
        <div className="fixed inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/5 to-transparent animate-scan" />
        </div>

        {/* Main content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </PowerModeProvider>
  );
}
