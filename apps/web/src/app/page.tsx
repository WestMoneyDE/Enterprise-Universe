// =============================================================================
// Landing Page - Nexus Command Center
// =============================================================================

import Link from "next/link";
import {
  Building2,
  Users,
  BarChart3,
  Mail,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nexus-950 via-slate-900 to-nexus-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-nexus-500 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Nexus Command Center
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Anmelden
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-nexus-500 px-4 py-2 text-sm font-medium text-white hover:bg-nexus-600 transition-colors"
              >
                Registrieren
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="relative py-20 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Enterprise Universe
                <span className="block text-nexus-400">Zentrale Steuerung</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
                Die zentrale Plattform für West Money Bau, West Money OS, Z
                Automation und DEDSEC World AI. Verwalten Sie Kontakte, Projekte,
                Deals und Kampagnen an einem Ort.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-lg bg-nexus-500 px-6 py-3 text-lg font-semibold text-white hover:bg-nexus-600 transition-colors"
                >
                  Zum Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/demo"
                  className="flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-lg font-semibold text-white hover:border-white/40 transition-colors"
                >
                  Demo ansehen
                </Link>
              </div>
            </div>
          </div>

          {/* Decorative gradient */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-nexus-500/20 blur-3xl" />
          </div>
        </section>

        {/* Subsidiaries */}
        <section className="py-16 border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-white/50">
              Unsere Marken
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4">
              {[
                { name: "West Money Bau", color: "bg-wmb-primary" },
                { name: "West Money OS", color: "bg-wmos-primary" },
                { name: "Z Automation", color: "bg-zauto-primary" },
                { name: "DEDSEC World AI", color: "bg-dedsec-primary" },
              ].map((brand) => (
                <div key={brand.name} className="flex flex-col items-center">
                  <div
                    className={`h-12 w-12 rounded-lg ${brand.color} flex items-center justify-center`}
                  >
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="mt-3 text-sm font-medium text-white/80">
                    {brand.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">
                Alles in einer Plattform
              </h2>
              <p className="mt-4 text-lg text-white/60">
                Leistungsstarke Tools für Ihr gesamtes Unternehmen
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Kontaktverwaltung",
                  description:
                    "Verwalten Sie 15+ Millionen Kontakte mit DSGVO-konformer Datenhaltung und smarter Segmentierung.",
                },
                {
                  icon: BarChart3,
                  title: "Deal-Pipeline",
                  description:
                    "Behalten Sie den Überblick über 3+ Millionen Deals mit anpassbaren Pipelines und Prognosen.",
                },
                {
                  icon: Building2,
                  title: "Projektmanagement",
                  description:
                    "12-stufiges Baumanagement speziell für West Money Bau mit Tagesberichten und Meilensteinen.",
                },
                {
                  icon: Mail,
                  title: "E-Mail-Kampagnen",
                  description:
                    "Multi-Brand-Kampagnen mit A/B-Testing, Automatisierung und detailliertem Tracking.",
                },
                {
                  icon: Shield,
                  title: "Datensicherheit",
                  description:
                    "Enterprise-Grade Sicherheit mit Zwei-Faktor-Authentifizierung und rollenbasiertem Zugriff.",
                },
                {
                  icon: Zap,
                  title: "Echtzeit-Analytics",
                  description:
                    "Live-Dashboards und Berichte für datengestützte Entscheidungen in Echtzeit.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-6 hover:border-white/20 transition-colors"
                >
                  <feature.icon className="h-10 w-10 text-nexus-400" />
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "15M+", label: "Kontakte" },
                { value: "3M+", label: "Deals" },
                { value: "4", label: "Marken" },
                { value: "99.9%", label: "Uptime" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-4xl font-bold text-nexus-400">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded bg-nexus-500 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-white/60">
                © 2024 Enterprise Universe GmbH
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/privacy"
                className="text-sm text-white/60 hover:text-white"
              >
                Datenschutz
              </Link>
              <Link
                href="/terms"
                className="text-sm text-white/60 hover:text-white"
              >
                AGB
              </Link>
              <Link
                href="/impressum"
                className="text-sm text-white/60 hover:text-white"
              >
                Impressum
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
