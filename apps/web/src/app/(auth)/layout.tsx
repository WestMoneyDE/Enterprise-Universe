// =============================================================================
// Auth Layout - Login/Register Pages
// =============================================================================

import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-nexus-950 via-slate-900 to-nexus-900 p-12 flex-col justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-10 w-10 rounded-lg bg-nexus-500 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">
            Nexus Command Center
          </span>
        </Link>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white">
            Die zentrale Plattform für Ihr Unternehmen
          </h1>
          <p className="text-lg text-white/70">
            Verwalten Sie alle Ihre Geschäftsprozesse an einem Ort. Von
            Kontakten über Projekte bis hin zu E-Mail-Kampagnen.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-8">
            {[
              { value: "15M+", label: "Kontakte" },
              { value: "3M+", label: "Deals" },
              { value: "4", label: "Marken" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <p className="text-2xl font-bold text-nexus-400">{stat.value}</p>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/40">
          © 2024 Enterprise Universe GmbH
        </p>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
