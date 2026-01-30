"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  HoloCard,
  NeonButton,
  StatsGrid,
  MetricRing,
  DataBar,
  StatItem,
} from "@/components/scifi";

// =============================================================================
// KUNDENKARTE NEXUS - Customer Data Management System
// West Money Bau Customer Profile Cards
// =============================================================================

// Status types matching the database enum
const KUNDENKARTE_STATUS = [
  { id: "draft", name: "Entwurf", icon: "◇", color: "gray" },
  { id: "pending_review", name: "In Prüfung", icon: "◈", color: "orange" },
  { id: "approved", name: "Genehmigt", icon: "◆", color: "green" },
  { id: "rejected", name: "Abgelehnt", icon: "✕", color: "red" },
  { id: "archived", name: "Archiviert", icon: "◎", color: "purple" },
] as const;

type KundenkarteStatus = typeof KUNDENKARTE_STATUS[number]["id"];

interface Kundenkarte {
  id: string;
  kundenNummer: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon?: string;
  status: KundenkarteStatus;
  ort?: string;
  gesamtbudget?: number;
  hausTyp?: string;
  smartHomeInteresse: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock data for development
const MOCK_KUNDENKARTEN: Kundenkarte[] = [
  {
    id: "kk-001",
    kundenNummer: "WMB-2024-0001",
    vorname: "Thomas",
    nachname: "Müller",
    email: "thomas.mueller@email.de",
    telefon: "+49 151 12345678",
    status: "approved",
    ort: "München",
    gesamtbudget: 450000,
    hausTyp: "Einfamilienhaus",
    smartHomeInteresse: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-03-10"),
  },
  {
    id: "kk-002",
    kundenNummer: "WMB-2024-0002",
    vorname: "Anna",
    nachname: "Schmidt",
    email: "anna.schmidt@email.de",
    telefon: "+49 170 87654321",
    status: "pending_review",
    ort: "Stuttgart",
    gesamtbudget: 380000,
    hausTyp: "Doppelhaushälfte",
    smartHomeInteresse: false,
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-03-18"),
  },
  {
    id: "kk-003",
    kundenNummer: "WMB-2024-0003",
    vorname: "Michael",
    nachname: "Weber",
    email: "m.weber@business.de",
    telefon: "+49 172 11223344",
    status: "draft",
    ort: "Augsburg",
    gesamtbudget: 520000,
    hausTyp: "Einfamilienhaus",
    smartHomeInteresse: true,
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-15"),
  },
  {
    id: "kk-004",
    kundenNummer: "WMB-2024-0004",
    vorname: "Laura",
    nachname: "Fischer",
    email: "laura.f@privat.de",
    telefon: "+49 176 55667788",
    status: "approved",
    ort: "Nürnberg",
    gesamtbudget: 295000,
    hausTyp: "Reihenhaus",
    smartHomeInteresse: true,
    createdAt: new Date("2024-01-28"),
    updatedAt: new Date("2024-03-05"),
  },
  {
    id: "kk-005",
    kundenNummer: "WMB-2024-0005",
    vorname: "Markus",
    nachname: "Hoffmann",
    email: "hoffmann.m@firma.de",
    status: "rejected",
    ort: "Ingolstadt",
    gesamtbudget: 680000,
    hausTyp: "Mehrfamilienhaus",
    smartHomeInteresse: false,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-03-12"),
  },
  {
    id: "kk-006",
    kundenNummer: "WMB-2024-0006",
    vorname: "Julia",
    nachname: "Becker",
    email: "j.becker@web.de",
    telefon: "+49 160 99887766",
    status: "pending_review",
    ort: "Regensburg",
    gesamtbudget: 410000,
    hausTyp: "Einfamilienhaus",
    smartHomeInteresse: true,
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-19"),
  },
  {
    id: "kk-007",
    kundenNummer: "WMB-2024-0007",
    vorname: "Stefan",
    nachname: "Krause",
    email: "stefan.krause@email.de",
    telefon: "+49 171 33445566",
    status: "archived",
    ort: "Würzburg",
    gesamtbudget: 350000,
    hausTyp: "Doppelhaushälfte",
    smartHomeInteresse: false,
    createdAt: new Date("2023-11-20"),
    updatedAt: new Date("2024-02-01"),
  },
];

export default function KundenkarteNexusPage() {
  const [kundenkarten] = useState<Kundenkarte[]>(MOCK_KUNDENKARTEN);
  const [selectedStatus, setSelectedStatus] = useState<KundenkarteStatus | "all">("all");
  const [selectedKundenkarte, setSelectedKundenkarte] = useState<Kundenkarte | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter kundenkarten
  const filteredKundenkarten = kundenkarten.filter((kk) => {
    const matchesStatus = selectedStatus === "all" || kk.status === selectedStatus;
    const matchesSearch =
      kk.vorname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kk.nachname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kk.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kk.kundenNummer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate stats
  const statusStats = KUNDENKARTE_STATUS.map((status) => ({
    ...status,
    count: kundenkarten.filter((kk) => kk.status === status.id).length,
  }));

  const totalBudget = kundenkarten.reduce((sum, kk) => sum + (kk.gesamtbudget || 0), 0);
  const approvedBudget = kundenkarten
    .filter((kk) => kk.status === "approved")
    .reduce((sum, kk) => sum + (kk.gesamtbudget || 0), 0);
  const smartHomeCount = kundenkarten.filter((kk) => kk.smartHomeInteresse).length;

  // Stats for grid
  const kundenkarteStats: StatItem[] = [
    { id: "total", label: "Kundenkarten", value: kundenkarten.length.toString(), trend: "up", trendValue: "+2", status: "online" },
    { id: "approved", label: "Genehmigt", value: statusStats.find(s => s.id === "approved")?.count.toString() || "0", trend: "up", trendValue: "+1", status: "online" },
    { id: "budget", label: "Gesamtbudget", value: `€${(totalBudget / 1000000).toFixed(2)}M`, trend: "up", trendValue: "+8%", status: "online" },
    { id: "smarthome", label: "Smart Home", value: `${Math.round((smartHomeCount / kundenkarten.length) * 100)}%`, trend: "neutral", trendValue: "", status: "warning" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            KUNDENKARTE NEXUS
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Customer Profile Management • <span className="text-neon-cyan">{kundenkarten.length} Karten Aktiv</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-void-surface/50 border border-white/10">
            <button
              onClick={() => setSelectedStatus("all")}
              className={cn(
                "px-3 py-1 rounded text-xs font-mono uppercase transition-all",
                selectedStatus === "all"
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                  : "text-white/50 hover:text-white"
              )}
            >
              Alle
            </button>
            {KUNDENKARTE_STATUS.slice(0, 3).map((status) => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(selectedStatus === status.id ? "all" : status.id)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono uppercase transition-all",
                  selectedStatus === status.id
                    ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                    : "text-white/50 hover:text-white"
                )}
              >
                {status.name}
              </button>
            ))}
          </div>

          <NeonButton variant="cyan" size="sm" onClick={() => setShowCreateModal(true)}>
            + Neue Karte
          </NeonButton>
          <NeonButton variant="purple" size="sm" glow>
            Export
          </NeonButton>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={kundenkarteStats} columns={4} animated variant="cyan" />

      {/* Status Pipeline */}
      <HoloCard title="STATUS PIPELINE" subtitle="Kundenkarten nach Status" icon="◈" variant="cyan">
        <div className="flex gap-4">
          {statusStats.map((status) => (
            <button
              key={status.id}
              onClick={() => setSelectedStatus(selectedStatus === status.id ? "all" : status.id)}
              className={cn(
                "flex-1 p-4 rounded-lg border transition-all",
                selectedStatus === status.id
                  ? "bg-neon-cyan/20 border-neon-cyan/50"
                  : "bg-void-surface/30 border-white/10 hover:border-white/30"
              )}
            >
              <div className="text-center">
                <span className={cn(
                  "text-2xl",
                  status.color === "gray" && "text-white/50",
                  status.color === "orange" && "text-neon-orange",
                  status.color === "green" && "text-neon-green",
                  status.color === "red" && "text-neon-red",
                  status.color === "purple" && "text-neon-purple"
                )}>
                  {status.icon}
                </span>
                <div className="text-2xl font-mono text-white font-bold mt-2">
                  {status.count}
                </div>
                <div className="text-[10px] text-white/50 uppercase font-display">
                  {status.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </HoloCard>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Kundenkarten List */}
        <div className="col-span-12 lg:col-span-8">
          <HoloCard
            title="KUNDENKARTEN"
            subtitle={`${filteredKundenkarten.length} Einträge`}
            icon="◆"
          >
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Suche nach Name, E-Mail, Kundennummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50"
              />
            </div>

            {/* Kundenkarten Table */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredKundenkarten.map((kk) => (
                <KundenkarteCard
                  key={kk.id}
                  kundenkarte={kk}
                  isSelected={selectedKundenkarte?.id === kk.id}
                  onClick={() => setSelectedKundenkarte(kk)}
                />
              ))}
              {filteredKundenkarten.length === 0 && (
                <div className="py-8 text-center text-white/30 text-sm font-mono">
                  Keine Kundenkarten gefunden
                </div>
              )}
            </div>
          </HoloCard>
        </div>

        {/* Right Column - Details */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Selected Kundenkarte Details */}
          {selectedKundenkarte ? (
            <HoloCard
              title="KUNDENKARTE DETAILS"
              subtitle={selectedKundenkarte.kundenNummer}
              icon="◎"
              variant="purple"
              glow
            >
              <div className="space-y-4">
                {/* Name & Status */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-display text-white font-bold">
                      {selectedKundenkarte.vorname} {selectedKundenkarte.nachname}
                    </div>
                    <div className="text-xs text-white/50 font-mono">
                      {selectedKundenkarte.email}
                    </div>
                  </div>
                  <StatusBadge status={selectedKundenkarte.status} />
                </div>

                {/* Budget */}
                {selectedKundenkarte.gesamtbudget && (
                  <div className="text-center py-4 border-t border-b border-white/10">
                    <div className="text-2xl font-mono text-neon-green font-bold">
                      €{(selectedKundenkarte.gesamtbudget / 1000).toFixed(0)}K
                    </div>
                    <div className="text-[10px] text-white/50 uppercase">Gesamtbudget</div>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2">
                  <DetailRow label="Ort" value={selectedKundenkarte.ort || "—"} />
                  <DetailRow label="Haustyp" value={selectedKundenkarte.hausTyp || "—"} />
                  <DetailRow label="Telefon" value={selectedKundenkarte.telefon || "—"} />
                  <DetailRow
                    label="Smart Home"
                    value={selectedKundenkarte.smartHomeInteresse ? "Ja ✓" : "Nein"}
                    highlight={selectedKundenkarte.smartHomeInteresse}
                  />
                  <DetailRow
                    label="Erstellt"
                    value={selectedKundenkarte.createdAt.toLocaleDateString("de-DE")}
                  />
                  <DetailRow
                    label="Aktualisiert"
                    value={selectedKundenkarte.updatedAt.toLocaleDateString("de-DE")}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <NeonButton variant="cyan" size="sm" className="flex-1">
                    Bearbeiten
                  </NeonButton>
                  <NeonButton variant="purple" size="sm" className="flex-1">
                    Dokumente
                  </NeonButton>
                </div>
              </div>
            </HoloCard>
          ) : (
            <HoloCard title="KUNDENKARTE DETAILS" icon="◎" variant="purple">
              <div className="py-8 text-center text-white/30 text-sm font-mono">
                Wählen Sie eine Kundenkarte aus
              </div>
            </HoloCard>
          )}

          {/* Quick Stats */}
          <HoloCard title="HAUSTYPEN" icon="◈">
            <div className="space-y-3">
              <DataBar label="Einfamilienhaus" value={43} color="cyan" />
              <DataBar label="Doppelhaushälfte" value={28} color="purple" />
              <DataBar label="Reihenhaus" value={14} color="green" />
              <DataBar label="Mehrfamilienhaus" value={10} color="orange" />
              <DataBar label="Sonstige" value={5} color="gold" />
            </div>
          </HoloCard>

          {/* Smart Home Interest */}
          <HoloCard title="SMART HOME INTERESSE" subtitle="Loxone Integration" icon="⚡" variant="ultra" glow>
            <div className="flex justify-center py-4">
              <MetricRing
                value={Math.round((smartHomeCount / kundenkarten.length) * 100)}
                label="Mit Interesse"
                color="cyan"
                size="lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 text-center">
                <div className="text-lg font-mono text-neon-cyan font-bold">{smartHomeCount}</div>
                <div className="text-[10px] text-white/50">Interessiert</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-lg font-mono text-white/70 font-bold">{kundenkarten.length - smartHomeCount}</div>
                <div className="text-[10px] text-white/50">Kein Interesse</div>
              </div>
            </div>
          </HoloCard>
        </div>
      </div>

      {/* Create Modal - Simple Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-void-dark border border-neon-cyan/30 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display text-white font-bold">NEUE KUNDENKARTE</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/50 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Personal Data */}
              <div className="p-4 rounded-lg bg-void-surface/30 border border-white/10">
                <h3 className="text-sm font-display text-neon-cyan mb-3 uppercase">Persönliche Daten</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Vorname" placeholder="Max" />
                  <FormInput label="Nachname" placeholder="Mustermann" />
                  <FormInput label="E-Mail" placeholder="max@email.de" type="email" />
                  <FormInput label="Telefon" placeholder="+49 151 12345678" />
                </div>
              </div>

              {/* Address */}
              <div className="p-4 rounded-lg bg-void-surface/30 border border-white/10">
                <h3 className="text-sm font-display text-neon-cyan mb-3 uppercase">Adresse</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormInput label="Straße & Hausnummer" placeholder="Musterstraße 123" />
                  </div>
                  <FormInput label="PLZ" placeholder="80331" />
                  <FormInput label="Ort" placeholder="München" />
                </div>
              </div>

              {/* Building Project */}
              <div className="p-4 rounded-lg bg-void-surface/30 border border-white/10">
                <h3 className="text-sm font-display text-neon-cyan mb-3 uppercase">Bauvorhaben</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-1 font-mono">Haustyp</label>
                    <select className="w-full px-3 py-2 bg-void-dark border border-white/20 rounded text-sm text-white font-mono focus:outline-none focus:border-neon-cyan/50">
                      <option value="">Auswählen...</option>
                      <option value="EFH">Einfamilienhaus</option>
                      <option value="DHH">Doppelhaushälfte</option>
                      <option value="RH">Reihenhaus</option>
                      <option value="MFH">Mehrfamilienhaus</option>
                    </select>
                  </div>
                  <FormInput label="Gesamtbudget (€)" placeholder="400000" type="number" />
                </div>
              </div>

              {/* Smart Home */}
              <div className="p-4 rounded-lg bg-void-surface/30 border border-white/10">
                <h3 className="text-sm font-display text-neon-cyan mb-3 uppercase">Smart Home</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-white/20 bg-void-dark" />
                  <span className="text-sm text-white font-mono">Interesse an Smart Home (Loxone)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <NeonButton variant="cyan" size="sm" className="flex-1" glow>
                Speichern
              </NeonButton>
              <NeonButton variant="purple" size="sm" className="flex-1" onClick={() => setShowCreateModal(false)}>
                Abbrechen
              </NeonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface KundenkarteCardProps {
  kundenkarte: Kundenkarte;
  isSelected: boolean;
  onClick: () => void;
}

function KundenkarteCard({ kundenkarte, isSelected, onClick }: KundenkarteCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-lg border transition-all text-left",
        isSelected
          ? "bg-neon-purple/20 border-neon-purple/50"
          : "bg-void-surface/30 border-white/10 hover:border-neon-cyan/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm text-white font-bold">
              {kundenkarte.vorname} {kundenkarte.nachname}
            </span>
            {kundenkarte.smartHomeInteresse && (
              <span className="text-neon-cyan text-xs">⚡</span>
            )}
          </div>
          <div className="text-xs text-white/50 font-mono">{kundenkarte.email}</div>
          <div className="text-[10px] text-white/30 font-mono mt-1">
            {kundenkarte.kundenNummer}
          </div>
        </div>
        <div className="text-right">
          {kundenkarte.gesamtbudget && (
            <div className="text-sm font-mono text-neon-green font-bold">
              €{(kundenkarte.gesamtbudget / 1000).toFixed(0)}K
            </div>
          )}
          <StatusBadge status={kundenkarte.status} small />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {kundenkarte.ort && (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-white/60">
              📍 {kundenkarte.ort}
            </span>
          )}
          {kundenkarte.hausTyp && (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-neon-purple/10 border border-neon-purple/20 rounded text-neon-purple/80">
              {kundenkarte.hausTyp}
            </span>
          )}
        </div>
        <span className="text-[10px] text-white/30 font-mono">
          {kundenkarte.updatedAt.toLocaleDateString("de-DE")}
        </span>
      </div>
    </button>
  );
}

interface StatusBadgeProps {
  status: KundenkarteStatus;
  small?: boolean;
}

function StatusBadge({ status, small }: StatusBadgeProps) {
  const statusConfig = KUNDENKARTE_STATUS.find((s) => s.id === status);
  if (!statusConfig) return null;

  const colorClasses = {
    gray: "bg-white/10 border-white/20 text-white/60",
    orange: "bg-neon-orange/10 border-neon-orange/30 text-neon-orange",
    green: "bg-neon-green/10 border-neon-green/30 text-neon-green",
    red: "bg-neon-red/10 border-neon-red/30 text-neon-red",
    purple: "bg-neon-purple/10 border-neon-purple/30 text-neon-purple",
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded border font-mono",
        small ? "text-[9px]" : "text-[10px]",
        colorClasses[statusConfig.color]
      )}
    >
      {statusConfig.icon} {statusConfig.name}
    </span>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function DetailRow({ label, value, highlight }: DetailRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-white/50 font-mono uppercase">{label}</span>
      <span className={cn("text-sm font-mono", highlight ? "text-neon-cyan" : "text-white")}>
        {value}
      </span>
    </div>
  );
}

interface FormInputProps {
  label: string;
  placeholder?: string;
  type?: string;
}

function FormInput({ label, placeholder, type = "text" }: FormInputProps) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1 font-mono">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-void-dark border border-white/20 rounded text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-neon-cyan/50"
      />
    </div>
  );
}
