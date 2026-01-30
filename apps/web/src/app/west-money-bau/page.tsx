// =============================================================================
// West Money Bau - Branded Landing Page
// Professional Baufinanzierung & Immobilienberatung
// =============================================================================

import Link from "next/link";
import {
  Building2,
  Home,
  Key,
  Shield,
  Calculator,
  FileCheck,
  Users,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Star,
  Award,
  Briefcase,
  TrendingUp,
  Clock,
  MessageCircle,
} from "lucide-react";

export default function WestMoneyBauPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-amber-500/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">West Money</span>
                <span className="text-xl font-bold text-amber-400"> Bau</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#leistungen" className="text-sm text-white/70 hover:text-amber-400 transition-colors">
                Leistungen
              </Link>
              <Link href="#prozess" className="text-sm text-white/70 hover:text-amber-400 transition-colors">
                Ablauf
              </Link>
              <Link href="#partner" className="text-sm text-white/70 hover:text-amber-400 transition-colors">
                Partner
              </Link>
              <Link href="#kontakt" className="text-sm text-white/70 hover:text-amber-400 transition-colors">
                Kontakt
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link
                href="/kundenportal"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Kundenportal
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20"
              >
                Partner Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-600/5" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] bg-amber-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                <Award className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">Nr. 1 Baufinanzierung in Deutschland</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
                Ihr Traum vom
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                  Eigenheim
                </span>
              </h1>
              <p className="mt-6 text-lg text-white/70 leading-relaxed">
                Professionelle Baufinanzierung und Immobilienberatung aus einer Hand.
                Von der ersten Beratung bis zur Schlüsselübergabe – wir begleiten Sie
                durch alle 12 Phasen Ihres Bauprojekts.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/kundenportal"
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-lg font-semibold text-white hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20"
                >
                  <Key className="h-5 w-5" />
                  Zum Kundenportal
                </Link>
                <Link
                  href="#kontakt"
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-lg font-semibold text-white hover:bg-white/5 transition-all"
                >
                  Beratung anfragen
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-400">500+</p>
                  <p className="text-sm text-white/50 mt-1">Projekte</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-400">98%</p>
                  <p className="text-sm text-white/50 mt-1">Zufriedenheit</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-400">12</p>
                  <p className="text-sm text-white/50 mt-1">Jahre Erfahrung</p>
                </div>
              </div>
            </div>

            {/* Hero Image / Feature Cards */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <FeatureCard
                  icon={Home}
                  title="Eigenheimfinanzierung"
                  description="Maßgeschneiderte Lösungen für Ihr Traumhaus"
                  gradient="from-amber-500/20 to-amber-600/10"
                />
                <FeatureCard
                  icon={Building2}
                  title="Kapitalanlage"
                  description="Renditestarke Immobilieninvestments"
                  gradient="from-blue-500/20 to-blue-600/10"
                  className="mt-8"
                />
                <FeatureCard
                  icon={Calculator}
                  title="Finanzierungsrechner"
                  description="Ihre Rate in wenigen Klicks berechnen"
                  gradient="from-green-500/20 to-green-600/10"
                />
                <FeatureCard
                  icon={FileCheck}
                  title="Bauherren Pass"
                  description="Alle Dokumente an einem Ort"
                  gradient="from-purple-500/20 to-purple-600/10"
                  className="mt-8"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="leistungen" className="py-20 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white">
              Unsere Leistungen
            </h2>
            <p className="mt-4 text-lg text-white/60">
              Vom ersten Gespräch bis zur Schlüsselübergabe –
              wir sind Ihr verlässlicher Partner für alle Fragen rund um Baufinanzierung.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Calculator,
                title: "Finanzierungsberatung",
                description: "Individuelle Finanzierungskonzepte mit den besten Konditionen von über 400 Bankpartnern.",
              },
              {
                icon: Home,
                title: "Immobiliensuche",
                description: "Zugang zu exklusiven Off-Market Immobilien und professionelle Objektbewertung.",
              },
              {
                icon: FileCheck,
                title: "Baubegleitung",
                description: "12-stufiges Projektmanagement mit Meilensteinüberwachung und Qualitätskontrolle.",
              },
              {
                icon: Shield,
                title: "Versicherungsschutz",
                description: "Umfassende Absicherung für Bauherren: Bauherrenhaftpflicht, Bauleistungsversicherung.",
              },
              {
                icon: Briefcase,
                title: "Notarielle Begleitung",
                description: "Koordination aller notariellen Termine und Vertragsabwicklung.",
              },
              {
                icon: TrendingUp,
                title: "Wertsteigerung",
                description: "Strategische Beratung für maximale Rendite und langfristigen Werterhalt.",
              },
            ].map((service) => (
              <div
                key={service.title}
                className="group relative p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                    <service.icon className="h-6 w-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/60">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="prozess" className="py-20 border-t border-white/10 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white">
              Der West Money Bau Prozess
            </h2>
            <p className="mt-4 text-lg text-white/60">
              In 4 einfachen Schritten zu Ihrem Eigenheim
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Erstberatung", description: "Kostenlose Analyse Ihrer Wünsche und finanziellen Möglichkeiten", icon: MessageCircle },
              { step: "02", title: "Finanzierung", description: "Maßgeschneidertes Finanzierungskonzept mit Top-Konditionen", icon: Calculator },
              { step: "03", title: "Baubegleitung", description: "Professionelle Betreuung durch alle 12 Bauphasen", icon: Building2 },
              { step: "04", title: "Übergabe", description: "Schlüsselfertige Übergabe Ihres Traumhauses", icon: Key },
            ].map((phase, index) => (
              <div key={phase.step} className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-xl shadow-lg shadow-amber-500/20 mb-4">
                    {phase.step}
                  </div>
                  <h3 className="text-lg font-semibold text-white mt-4">{phase.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{phase.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-amber-500/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bauherren Pass CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-purple-500/20" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

            <div className="relative p-8 sm:p-12 lg:p-16">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-4">
                    <Star className="h-4 w-4" />
                    Exklusiv für Kunden
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    Der Bauherren Pass
                  </h2>
                  <p className="mt-4 text-lg text-white/70">
                    Ihr digitales Zuhause für alle Projektunterlagen, Meilensteine und
                    Dokumente. Behalten Sie jederzeit den Überblick über Ihr Bauvorhaben.
                  </p>
                  <ul className="mt-6 space-y-3">
                    {[
                      "Alle Dokumente digital an einem Ort",
                      "Echtzeit-Updates zu Ihrem Projekt",
                      "Direkte Kommunikation mit Ihrem Berater",
                      "Meilenstein-Tracking für alle 12 Bauphasen",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-white/80">
                        <CheckCircle2 className="h-5 w-5 text-amber-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Link
                      href="/kundenportal"
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-lg font-semibold text-white hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20"
                    >
                      Zum Kundenportal
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-500/20 rounded-xl blur-xl" />
                    <div className="relative bg-slate-800/80 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <FileCheck className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Bauherren Pass</h4>
                          <p className="text-xs text-white/50">Premium Zugang</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: "Projektfortschritt", value: "67%", color: "amber" },
                          { label: "Dokumente", value: "24/36", color: "green" },
                          { label: "Nächster Meilenstein", value: "Phase 8", color: "blue" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                            <span className="text-sm text-white/60">{item.label}</span>
                            <span className={`text-sm font-medium text-${item.color}-400`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="kontakt" className="py-20 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-white">
                Kontaktieren Sie uns
              </h2>
              <p className="mt-4 text-lg text-white/60">
                Vereinbaren Sie noch heute Ihr kostenloses Erstgespräch
                und lassen Sie uns gemeinsam Ihren Traum vom Eigenheim verwirklichen.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Telefon</p>
                    <p className="text-white font-medium">+49 (0) 123 456 789</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">E-Mail</p>
                    <p className="text-white font-medium">info@west-money-bau.de</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Öffnungszeiten</p>
                    <p className="text-white font-medium">Mo-Fr: 9:00 - 18:00 Uhr</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Beratung anfragen</h3>
              <form className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Vorname"
                    className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Nachname"
                    className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <input
                  type="email"
                  placeholder="E-Mail Adresse"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
                />
                <input
                  type="tel"
                  placeholder="Telefonnummer"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
                />
                <textarea
                  placeholder="Ihre Nachricht"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50 resize-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-lg font-semibold text-white hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20"
                >
                  Anfrage senden
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-slate-900/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">West Money Bau</span>
              </div>
              <p className="text-sm text-white/50">
                Ihr Partner für Baufinanzierung und Immobilienberatung.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Leistungen</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link href="#" className="hover:text-amber-400 transition-colors">Baufinanzierung</Link></li>
                <li><Link href="#" className="hover:text-amber-400 transition-colors">Immobilienberatung</Link></li>
                <li><Link href="#" className="hover:text-amber-400 transition-colors">Kapitalanlage</Link></li>
                <li><Link href="#" className="hover:text-amber-400 transition-colors">Versicherungen</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Unternehmen</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link href="#" className="hover:text-amber-400 transition-colors">Über uns</Link></li>
                <li><Link href="#" className="hover:text-amber-400 transition-colors">Karriere</Link></li>
                <li><Link href="/kundenportal" className="hover:text-amber-400 transition-colors">Kundenportal</Link></li>
                <li><Link href="/scifi" className="hover:text-amber-400 transition-colors">Command Center</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link href="/impressum" className="hover:text-amber-400 transition-colors">Impressum</Link></li>
                <li><Link href="/privacy" className="hover:text-amber-400 transition-colors">Datenschutz</Link></li>
                <li><Link href="/terms" className="hover:text-amber-400 transition-colors">AGB</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40">
              © 2024 West Money Bau GmbH – Ein Unternehmen der Enterprise Universe
            </p>
            <p className="text-xs text-white/30">
              Powered by NEXUS AI • DEDSEC World AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient: string;
  className?: string;
}

function FeatureCard({ icon: Icon, title, description, gradient, className }: FeatureCardProps) {
  return (
    <div className={`p-5 rounded-xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-sm hover:border-amber-500/30 transition-all ${className}`}>
      <Icon className="h-8 w-8 text-amber-400 mb-3" />
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-white/60 mt-1">{description}</p>
    </div>
  );
}
