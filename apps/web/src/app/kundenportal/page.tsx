"use client";

// =============================================================================
// Kundenportal - Customer Portal for West Money Bau
// Access to Bauherren Pass, project tracking, and documents
// =============================================================================

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Home,
  FileText,
  Calendar,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Search,
  Filter,
  TrendingUp,
  Wallet,
  FileCheck,
  HardHat,
  Key,
  Hammer,
  Truck,
  Paintbrush,
  Lightbulb,
  ShowerHead,
  Trees,
  PartyPopper,
} from "lucide-react";

// =============================================================================
// Mock Data - In production this comes from API/tRPC
// =============================================================================

const MOCK_USER = {
  name: "Familie Müller",
  email: "mueller@example.com",
  projectName: "Neubau Einfamilienhaus München",
  contractDate: "15.03.2024",
  advisor: "Max Mustermann",
};

const MOCK_PROJECT = {
  currentPhase: 7,
  totalPhases: 12,
  progress: 58,
  nextMilestone: "Dachstuhl aufstellen",
  nextMilestoneDate: "28.01.2025",
  financingAmount: 450000,
  paidAmount: 262500,
  remainingAmount: 187500,
};

const PHASES = [
  { id: 1, name: "Grundstückskauf", icon: Key, status: "completed" },
  { id: 2, name: "Finanzierungszusage", icon: Wallet, status: "completed" },
  { id: 3, name: "Baugenehmigung", icon: FileCheck, status: "completed" },
  { id: 4, name: "Bodenaushub", icon: Truck, status: "completed" },
  { id: 5, name: "Fundament & Keller", icon: HardHat, status: "completed" },
  { id: 6, name: "Rohbau", icon: Building2, status: "completed" },
  { id: 7, name: "Dachstuhl", icon: Home, status: "in_progress" },
  { id: 8, name: "Fenster & Türen", icon: Key, status: "pending" },
  { id: 9, name: "Elektro & Sanitär", icon: Lightbulb, status: "pending" },
  { id: 10, name: "Innenausbau", icon: Paintbrush, status: "pending" },
  { id: 11, name: "Außenanlagen", icon: Trees, status: "pending" },
  { id: 12, name: "Übergabe", icon: PartyPopper, status: "pending" },
];

const MOCK_DOCUMENTS = [
  { id: 1, name: "Kaufvertrag Grundstück", category: "Verträge", date: "15.03.2024", type: "pdf" },
  { id: 2, name: "Finanzierungszusage", category: "Finanzierung", date: "22.03.2024", type: "pdf" },
  { id: 3, name: "Baugenehmigung", category: "Genehmigungen", date: "10.04.2024", type: "pdf" },
  { id: 4, name: "Bauplan Erdgeschoss", category: "Pläne", date: "05.04.2024", type: "pdf" },
  { id: 5, name: "Statik Berechnung", category: "Technik", date: "08.04.2024", type: "pdf" },
  { id: 6, name: "Abnahmeprotokoll Rohbau", category: "Protokolle", date: "15.12.2024", type: "pdf" },
];

const MOCK_MESSAGES = [
  { id: 1, from: "Max Mustermann", subject: "Update Baufortschritt KW 3", date: "vor 2 Stunden", unread: true },
  { id: 2, from: "Bauleiter Schmidt", subject: "Terminbestätigung Dachstuhl", date: "vor 1 Tag", unread: true },
  { id: 3, from: "West Money Bau", subject: "Rechnung Abschlagszahlung 5", date: "vor 3 Tagen", unread: false },
];

// =============================================================================
// Main Component
// =============================================================================

export default function KundenportalPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "phases" | "documents" | "messages">("overview");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginCode, setLoginCode] = useState("");

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 mb-4">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Kundenportal</h1>
            <p className="text-white/60 mt-2">West Money Bau</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Anmelden</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsLoggedIn(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-white/60 block mb-2">E-Mail oder Kundennummer</label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-2">Zugangsode</label>
                <input
                  type="password"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-semibold text-white hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20"
              >
                Anmelden
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-white/50 text-center">
                Noch kein Kunde?{" "}
                <Link href="/west-money-bau#kontakt" className="text-amber-400 hover:text-amber-300">
                  Beratung anfragen
                </Link>
              </p>
            </div>
          </div>

          <p className="text-xs text-white/30 text-center mt-6">
            Bei Problemen mit dem Login kontaktieren Sie uns unter{" "}
            <a href="tel:+49123456789" className="text-amber-400">+49 (0) 123 456 789</a>
          </p>
        </div>
      </div>
    );
  }

  // Logged In Dashboard
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
                <span className="text-lg font-bold text-white">Kundenportal</span>
                <span className="text-xs text-white/50 block">West Money Bau</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-white/60 hover:text-amber-400 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-[10px] font-bold flex items-center justify-center rounded-full">
                  2
                </span>
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{MOCK_USER.name}</p>
                  <p className="text-xs text-white/50">{MOCK_USER.email}</p>
                </div>
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="p-2 text-white/60 hover:text-red-400 transition-colors"
                  title="Abmelden"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {[
              { id: "overview", label: "Übersicht", icon: Home },
              { id: "phases", label: "Bauphasen", icon: HardHat },
              { id: "documents", label: "Dokumente", icon: FileText },
              { id: "messages", label: "Nachrichten", icon: MessageCircle, badge: 2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative flex items-center gap-2 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-amber-400"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                    {tab.badge}
                  </span>
                )}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "phases" && <PhasesTab />}
        {activeTab === "documents" && <DocumentsTab />}
        {activeTab === "messages" && <MessagesTab />}
      </main>
    </div>
  );
}

// =============================================================================
// Overview Tab
// =============================================================================

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/20 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Willkommen zurück, {MOCK_USER.name}!
            </h1>
            <p className="text-white/60 mt-1">{MOCK_USER.projectName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50">Ihr Berater</p>
            <p className="text-sm font-medium text-amber-400">{MOCK_USER.advisor}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Baufortschritt"
          value={`${MOCK_PROJECT.progress}%`}
          subtitle={`Phase ${MOCK_PROJECT.currentPhase} von ${MOCK_PROJECT.totalPhases}`}
          color="amber"
        />
        <StatCard
          icon={Calendar}
          label="Nächster Meilenstein"
          value={MOCK_PROJECT.nextMilestone}
          subtitle={MOCK_PROJECT.nextMilestoneDate}
          color="blue"
        />
        <StatCard
          icon={Wallet}
          label="Finanzierung"
          value={formatCurrency(MOCK_PROJECT.financingAmount)}
          subtitle={`${formatCurrency(MOCK_PROJECT.paidAmount)} ausgezahlt`}
          color="green"
        />
        <StatCard
          icon={FileText}
          label="Dokumente"
          value={MOCK_DOCUMENTS.length.toString()}
          subtitle="Verfügbar zum Download"
          color="purple"
        />
      </div>

      {/* Progress & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Projektfortschritt</h3>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">Gesamtfortschritt</span>
              <span className="text-amber-400 font-medium">{MOCK_PROJECT.progress}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                style={{ width: `${MOCK_PROJECT.progress}%` }}
              />
            </div>
          </div>

          {/* Phase Overview */}
          <div className="grid grid-cols-6 gap-2">
            {PHASES.slice(0, 6).map((phase) => (
              <div key={phase.id} className="text-center">
                <div
                  className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1 ${
                    phase.status === "completed"
                      ? "bg-green-500/20 text-green-400"
                      : phase.status === "in_progress"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-white/5 text-white/30"
                  }`}
                >
                  {phase.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <phase.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-[10px] text-white/50">{phase.id}</span>
              </div>
            ))}
          </div>

          <Link
            href="#"
            onClick={() => {}}
            className="mt-4 inline-flex items-center text-sm text-amber-400 hover:text-amber-300"
          >
            Alle Bauphasen anzeigen
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Letzte Aktivitäten</h3>
          <div className="space-y-4">
            {[
              { text: "Rohbau abgenommen", date: "15.12.2024", type: "success" },
              { text: "Neue Nachricht erhalten", date: "Heute", type: "info" },
              { text: "Dokument hochgeladen", date: "12.01.2025", type: "neutral" },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === "success"
                      ? "bg-green-400"
                      : activity.type === "info"
                      ? "bg-amber-400"
                      : "bg-white/30"
                  }`}
                />
                <div>
                  <p className="text-sm text-white">{activity.text}</p>
                  <p className="text-xs text-white/50">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href="/scifi/bauherren-pass"
          className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <FileCheck className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h4 className="font-medium text-white">Bauherren Pass</h4>
            <p className="text-xs text-white/50">Vollständiges Dashboard</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/30 ml-auto group-hover:text-amber-400 transition-colors" />
        </Link>

        <Link
          href="/scifi"
          className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
            <Building2 className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h4 className="font-medium text-white">Command Center</h4>
            <p className="text-xs text-white/50">SciFi Dashboard</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/30 ml-auto group-hover:text-cyan-400 transition-colors" />
        </Link>

        <Link
          href="#"
          className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
            <MessageCircle className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h4 className="font-medium text-white">Berater kontaktieren</h4>
            <p className="text-xs text-white/50">Direkte Kommunikation</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/30 ml-auto group-hover:text-green-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

// =============================================================================
// Phases Tab
// =============================================================================

function PhasesTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Die 12 Bauphasen</h2>
        <div className="text-sm text-white/60">
          Aktuell: <span className="text-amber-400 font-medium">Phase {MOCK_PROJECT.currentPhase}</span>
        </div>
      </div>

      <div className="grid gap-4">
        {PHASES.map((phase, index) => (
          <div
            key={phase.id}
            className={`p-4 rounded-xl border transition-all ${
              phase.status === "completed"
                ? "bg-green-500/5 border-green-500/20"
                : phase.status === "in_progress"
                ? "bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/20"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  phase.status === "completed"
                    ? "bg-green-500/20 text-green-400"
                    : phase.status === "in_progress"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-white/5 text-white/30"
                }`}
              >
                {phase.status === "completed" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <phase.icon className="h-6 w-6" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white/40">PHASE {String(phase.id).padStart(2, "0")}</span>
                  {phase.status === "in_progress" && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded-full">
                      AKTIV
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-white mt-1">{phase.name}</h3>
              </div>

              <div className="text-right">
                {phase.status === "completed" && (
                  <span className="text-sm text-green-400">Abgeschlossen</span>
                )}
                {phase.status === "in_progress" && (
                  <span className="text-sm text-amber-400">In Bearbeitung</span>
                )}
                {phase.status === "pending" && (
                  <span className="text-sm text-white/40">Ausstehend</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Documents Tab
// =============================================================================

function DocumentsTab() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = MOCK_DOCUMENTS.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Dokumente</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">Dokument</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">Kategorie</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">Datum</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-white/50 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-red-400" />
                    </div>
                    <span className="text-sm font-medium text-white">{doc.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-white/60">{doc.category}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-white/60">{doc.date}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-amber-400 transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Messages Tab
// =============================================================================

function MessagesTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Nachrichten</h2>
        <button className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors">
          Neue Nachricht
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
        {MOCK_MESSAGES.map((message) => (
          <div
            key={message.id}
            className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${
              message.unread ? "bg-amber-500/5" : ""
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                {message.from.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{message.from}</span>
                  {message.unread && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </div>
                <p className="text-sm text-white/80 mt-0.5">{message.subject}</p>
                <p className="text-xs text-white/50 mt-1">{message.date}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle: string;
  color: "amber" | "blue" | "green" | "purple";
}

function StatCard({ icon: Icon, label, value, subtitle, color }: StatCardProps) {
  const colors = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  const iconColors = {
    amber: "text-amber-400",
    blue: "text-blue-400",
    green: "text-green-400",
    purple: "text-purple-400",
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`h-5 w-5 ${iconColors[color]}`} />
        <span className="text-xs text-white/50 uppercase">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50 mt-1">{subtitle}</p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
