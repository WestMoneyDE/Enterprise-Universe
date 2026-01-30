"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { HoloCard, NeonButton } from "@/components/scifi";
import { ImportWizard } from "@/components/import";

// ═══════════════════════════════════════════════════════════════════════════════
// DATA IMPORT PAGE - CSV/Excel Import Wizard
// SciFi themed data import interface for contacts and deals
// ═══════════════════════════════════════════════════════════════════════════════

export default function ImportPage() {
  const [showWizard, setShowWizard] = useState(true);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([
    {
      id: "imp-001",
      fileName: "contacts_export_2026.csv",
      entityType: "contact",
      recordsImported: 245,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: "success",
    },
    {
      id: "imp-002",
      fileName: "deals_q1_2026.xlsx",
      entityType: "deal",
      recordsImported: 48,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      status: "success",
    },
    {
      id: "imp-003",
      fileName: "leads_batch.csv",
      entityType: "contact",
      recordsImported: 0,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: "failed",
    },
  ]);

  const handleImportComplete = useCallback(() => {
    // Add to history (in production, this would come from the actual import result)
    const newEntry: ImportHistoryItem = {
      id: `imp-${Date.now()}`,
      fileName: "import_" + new Date().toISOString().split("T")[0] + ".csv",
      entityType: "contact",
      recordsImported: Math.floor(Math.random() * 100) + 1,
      timestamp: new Date(),
      status: "success",
    };
    setImportHistory((prev) => [newEntry, ...prev]);
    setShowWizard(false);
  }, []);

  const handleCancel = useCallback(() => {
    setShowWizard(false);
  }, []);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            DATA IMPORT
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Import contacts and deals from CSV or Excel files
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!showWizard && (
            <NeonButton variant="cyan" glow onClick={() => setShowWizard(true)}>
              New Import
            </NeonButton>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Import Wizard */}
        <div className={cn("col-span-12", showWizard ? "lg:col-span-8" : "lg:col-span-12")}>
          {showWizard ? (
            <ImportWizard onComplete={handleImportComplete} onCancel={handleCancel} />
          ) : (
            <HoloCard
              title="IMPORT CENTER"
              subtitle="Start a new import to add data"
              icon="[+]"
              variant="cyan"
            >
              <div className="py-16 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center mb-6">
                  <svg
                    className="w-10 h-10 text-neon-cyan"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-lg text-white font-bold uppercase mb-2">
                  No Active Import
                </h3>
                <p className="text-sm font-mono text-white/50 mb-6 max-w-md mx-auto">
                  Upload a CSV or Excel file to import contacts, deals, or other data into your
                  Nexus Command Center.
                </p>
                <NeonButton variant="cyan" glow size="lg" onClick={() => setShowWizard(true)}>
                  Start New Import
                </NeonButton>
              </div>
            </HoloCard>
          )}
        </div>

        {/* Sidebar - Import History & Info */}
        {showWizard && (
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Quick Stats */}
            <HoloCard title="IMPORT STATS" icon="[#]">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-void-surface/30 border border-white/10 rounded-lg text-center">
                  <div className="text-2xl font-mono text-neon-cyan font-bold">
                    {importHistory.filter((h) => h.status === "success").length}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">
                    Successful
                  </div>
                </div>
                <div className="p-3 bg-void-surface/30 border border-white/10 rounded-lg text-center">
                  <div className="text-2xl font-mono text-neon-purple font-bold">
                    {importHistory.reduce((acc, h) => acc + h.recordsImported, 0)}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">
                    Records
                  </div>
                </div>
              </div>
            </HoloCard>

            {/* Recent Imports */}
            <HoloCard title="RECENT IMPORTS" subtitle="Last 7 days" icon="[H]">
              <div className="space-y-2">
                {importHistory.length === 0 ? (
                  <div className="py-4 text-center text-sm font-mono text-white/30">
                    No recent imports
                  </div>
                ) : (
                  importHistory.map((item) => (
                    <ImportHistoryRow key={item.id} item={item} formatTimeAgo={formatTimeAgo} />
                  ))
                )}
              </div>
            </HoloCard>

            {/* Help */}
            <HoloCard title="IMPORT HELP" icon="[?]" variant="purple">
              <div className="space-y-3 text-xs font-mono text-white/50">
                <div className="flex items-start gap-2">
                  <span className="text-neon-cyan">01</span>
                  <span>Upload a CSV or Excel file</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-cyan">02</span>
                  <span>Map your columns to fields</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-cyan">03</span>
                  <span>Review and validate data</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-cyan">04</span>
                  <span>Import your records</span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="text-white/70 mb-1">Supported formats:</div>
                  <div className="flex gap-2">
                    {[".csv", ".xlsx", ".xls"].map((ext) => (
                      <span
                        key={ext}
                        className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-white/50"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </HoloCard>
          </div>
        )}
      </div>

      {/* Full Import History Table (when wizard is closed) */}
      {!showWizard && importHistory.length > 0 && (
        <HoloCard title="IMPORT HISTORY" subtitle={`${importHistory.length} imports`} icon="[H]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-mono text-white/50 uppercase">
                    File
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-white/50 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-white/50 uppercase">
                    Records
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-white/50 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-white/50 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {importHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-neon-cyan"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm font-mono text-white">{item.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-mono rounded border uppercase",
                          item.entityType === "contact"
                            ? "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan"
                            : "bg-neon-purple/10 border-neon-purple/30 text-neon-purple"
                        )}
                      >
                        {item.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-white/70">
                      {item.recordsImported}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs font-mono",
                          item.status === "success" ? "text-neon-green" : "text-neon-red"
                        )}
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            item.status === "success" ? "bg-neon-green" : "bg-neon-red"
                          )}
                        />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-white/50">
                      {formatTimeAgo(item.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HoloCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ImportHistoryItem {
  id: string;
  fileName: string;
  entityType: "contact" | "deal";
  recordsImported: number;
  timestamp: Date;
  status: "success" | "failed";
}

interface ImportHistoryRowProps {
  item: ImportHistoryItem;
  formatTimeAgo: (date: Date) => string;
}

function ImportHistoryRow({ item, formatTimeAgo }: ImportHistoryRowProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        item.status === "success"
          ? "bg-void-surface/30 border-white/10 hover:border-neon-cyan/30"
          : "bg-neon-red/5 border-neon-red/20 hover:border-neon-red/40"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg
              className={cn(
                "w-4 h-4 flex-shrink-0",
                item.status === "success" ? "text-neon-cyan" : "text-neon-red"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-xs font-mono text-white truncate">{item.fileName}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-6">
            <span
              className={cn(
                "px-1.5 py-0.5 text-[8px] font-mono rounded border uppercase",
                item.entityType === "contact"
                  ? "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan"
                  : "bg-neon-purple/10 border-neon-purple/30 text-neon-purple"
              )}
            >
              {item.entityType}
            </span>
            <span className="text-[10px] font-mono text-white/40">
              {item.recordsImported} records
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={cn(
              "text-[10px] font-mono",
              item.status === "success" ? "text-neon-green" : "text-neon-red"
            )}
          >
            {item.status}
          </span>
          <span className="text-[10px] font-mono text-white/30">{formatTimeAgo(item.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
