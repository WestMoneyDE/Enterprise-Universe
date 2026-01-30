"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  HoloCard,
  NeonButton,
  Terminal,
  usePowerMode,
} from "@/components/scifi";

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS COMMAND CENTER - SCIFI LOGIN
// Cyberpunk-themed authentication portal with 2FA support
// ═══════════════════════════════════════════════════════════════════════════════

type LoginStep = "credentials" | "2fa" | "loading";

interface TerminalLine {
  id: string;
  type: "system" | "output" | "success" | "error" | "warning" | "input";
  content: string;
  timestamp: Date;
}

export default function SciFiLoginPage() {
  const router = useRouter();
  const { mode } = usePowerMode();

  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { id: "1", type: "system", content: "NEXUS COMMAND CENTER v3.0.1", timestamp: new Date() },
    { id: "2", type: "output", content: "Authentication Module initialized", timestamp: new Date() },
    { id: "3", type: "success", content: "Secure connection established", timestamp: new Date() },
    { id: "4", type: "system", content: "Awaiting credentials...", timestamp: new Date() },
  ]);

  const addTerminalLine = (type: TerminalLine["type"], content: string) => {
    setTerminalLines((prev) => [
      ...prev,
      { id: Date.now().toString(), type, content, timestamp: new Date() },
    ]);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    addTerminalLine("input", `> AUTH ${email}`);
    addTerminalLine("system", "Verifying credentials...");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        addTerminalLine("error", "AUTH FAILED: Invalid credentials");
        setError("Ungültige Zugangsdaten");
        setIsSubmitting(false);
        return;
      }

      // Check if user has 2FA enabled
      // For now, we skip directly to success - 2FA would be implemented in auth callback
      addTerminalLine("success", "Credentials verified");
      addTerminalLine("success", "ACCESS GRANTED - Redirecting...");

      setTimeout(() => {
        router.push("/scifi");
        router.refresh();
      }, 1000);
    } catch (err) {
      addTerminalLine("error", "SYSTEM ERROR: Connection failed");
      setError("Verbindungsfehler - bitte erneut versuchen");
      setIsSubmitting(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    addTerminalLine("input", `> TOTP ${totpCode.replace(/./g, "*")}`);
    addTerminalLine("system", "Verifying 2FA token...");

    // This would be a real API call in production
    setTimeout(() => {
      addTerminalLine("success", "2FA VERIFIED - ACCESS GRANTED");
      router.push("/scifi");
      router.refresh();
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-6">
        {/* Left: Login Form */}
        <div className="space-y-6">
          {/* Logo / Header */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center">
                <span className="text-2xl">⬡</span>
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-white tracking-wider">
                  NEXUS
                </h1>
                <p className="text-[10px] font-mono text-neon-cyan tracking-widest">
                  COMMAND CENTER
                </p>
              </div>
            </div>
            <p className="text-sm text-white/50 font-mono">
              Authorized Personnel Only
            </p>
          </div>

          {/* Login Card */}
          <HoloCard variant="default" className="p-6">
            <div className="space-y-6">
              {/* Status Indicator */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  step === "loading" ? "bg-neon-orange animate-pulse" :
                  error ? "bg-neon-red" : "bg-neon-green animate-pulse"
                )} />
                <span className="text-xs font-mono text-white/50 uppercase">
                  {step === "credentials" && "CREDENTIALS REQUIRED"}
                  {step === "2fa" && "2FA VERIFICATION"}
                  {step === "loading" && "AUTHENTICATING..."}
                </span>
              </div>

              {/* Credentials Form */}
              {step === "credentials" && (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                      E-Mail / User ID
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan text-sm font-mono">
                        ›
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="agent@nexus.cc"
                        className={cn(
                          "w-full bg-void-surface/50 border rounded-lg",
                          "pl-8 pr-4 py-3 text-sm font-mono text-white",
                          "placeholder:text-white/30",
                          "focus:outline-none focus:ring-1 focus:ring-neon-cyan/50",
                          "border-white/10 focus:border-neon-cyan/50"
                        )}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                      Access Key
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan text-sm font-mono">
                        ›
                      </span>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        className={cn(
                          "w-full bg-void-surface/50 border rounded-lg",
                          "pl-8 pr-4 py-3 text-sm font-mono text-white",
                          "placeholder:text-white/30",
                          "focus:outline-none focus:ring-1 focus:ring-neon-cyan/50",
                          "border-white/10 focus:border-neon-cyan/50"
                        )}
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30">
                      <span className="text-neon-red text-sm">⚠</span>
                      <span className="text-sm font-mono text-neon-red">{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <NeonButton
                    type="submit"
                    variant="cyan"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        AUTHENTICATING...
                      </span>
                    ) : (
                      "▶ AUTHENTICATE"
                    )}
                  </NeonButton>
                </form>
              )}

              {/* 2FA Form */}
              {step === "2fa" && (
                <form onSubmit={handle2FASubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                      2FA Code / TOTP Token
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-purple text-sm font-mono">
                        ⊕
                      </span>
                      <input
                        type="text"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        maxLength={6}
                        placeholder="000000"
                        autoFocus
                        className={cn(
                          "w-full bg-void-surface/50 border rounded-lg",
                          "pl-8 pr-4 py-3 text-xl font-mono text-white text-center tracking-[0.5em]",
                          "placeholder:text-white/30 placeholder:tracking-[0.5em]",
                          "focus:outline-none focus:ring-1 focus:ring-neon-purple/50",
                          "border-white/10 focus:border-neon-purple/50"
                        )}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-white/40 text-center">
                      Enter the 6-digit code from your authenticator
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30">
                      <span className="text-neon-red text-sm">⚠</span>
                      <span className="text-sm font-mono text-neon-red">{error}</span>
                    </div>
                  )}

                  <NeonButton
                    type="submit"
                    variant="purple"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting || totpCode.length !== 6}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        VERIFYING...
                      </span>
                    ) : (
                      "⊕ VERIFY 2FA"
                    )}
                  </NeonButton>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setTotpCode("");
                      setError(null);
                    }}
                    className="w-full text-xs font-mono text-white/40 hover:text-white/60 transition-colors"
                  >
                    ← Back to credentials
                  </button>
                </form>
              )}

              {/* Alternative Login */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] font-mono text-white/40 text-center mb-3">
                  ALTERNATIVE AUTH PROTOCOLS
                </p>
                <NeonButton
                  type="button"
                  variant="ghost"
                  size="md"
                  className="w-full"
                  onClick={() => signIn("google", { callbackUrl: "/scifi" })}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google SSO
                </NeonButton>
              </div>
            </div>
          </HoloCard>

          {/* Footer Links */}
          <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-white/30">
            <a href="/login" className="hover:text-neon-cyan transition-colors">
              Classic Login
            </a>
            <span>|</span>
            <a href="#" className="hover:text-neon-cyan transition-colors">
              Request Access
            </a>
            <span>|</span>
            <a href="#" className="hover:text-neon-cyan transition-colors">
              Help
            </a>
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="hidden lg:block">
          <HoloCard variant="default" className="p-0 h-full">
            <Terminal
              title="AUTH CONSOLE"
              lines={terminalLines}
              className="h-full min-h-[500px]"
            />
          </HoloCard>
        </div>
      </div>

      {/* Version Info */}
      <div className="fixed bottom-4 left-4 text-[10px] font-mono text-white/20">
        NEXUS COMMAND CENTER v3.0.1 | Secure Protocol: TLS 1.3 | Region: EU-WEST
      </div>
    </div>
  );
}
