"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { NeonButton } from "@/components/scifi";
import { ImportResult } from "@/hooks/use-import";

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT STEP - Import Progress and Results
// Shows progress bar during import and results summary after completion
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImportStepProps {
  isImporting: boolean;
  importProgress: number;
  importResult: ImportResult | null;
  validCount: number;
  invalidCount: number;
  onStartImport: (skipInvalid: boolean) => void;
  onDownloadErrors: () => void;
  onDone: () => void;
}

export function ImportStep({
  isImporting,
  importProgress,
  importResult,
  validCount,
  invalidCount,
  onStartImport,
  onDownloadErrors,
  onDone,
}: ImportStepProps) {
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  // Show confetti on successful import
  useEffect(() => {
    if (importResult?.success && importResult.imported > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [importResult]);

  // Not started yet
  if (!isImporting && !importResult) {
    return (
      <div className="space-y-6">
        {/* Pre-import Summary */}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-neon-cyan/20 border-2 border-neon-cyan/50 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <h3 className="font-display text-xl text-white font-bold uppercase mb-2">
            Ready to Import
          </h3>
          <p className="text-sm font-mono text-white/50">
            Your data has been validated and is ready to be imported.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg text-center">
            <div className="text-3xl font-mono text-neon-green font-bold">{validCount}</div>
            <div className="text-xs font-mono text-white/40 uppercase mt-1">Valid Rows</div>
          </div>
          <div
            className={cn(
              "p-4 border rounded-lg text-center",
              invalidCount > 0
                ? "bg-neon-red/10 border-neon-red/30"
                : "bg-void-surface/30 border-white/10"
            )}
          >
            <div
              className={cn(
                "text-3xl font-mono font-bold",
                invalidCount > 0 ? "text-neon-red" : "text-white/30"
              )}
            >
              {invalidCount}
            </div>
            <div className="text-xs font-mono text-white/40 uppercase mt-1">Invalid Rows</div>
          </div>
        </div>

        {/* Skip Invalid Option */}
        {invalidCount > 0 && (
          <div className="p-4 bg-void-surface/30 border border-white/10 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipInvalid}
                onChange={(e) => setSkipInvalid(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  skipInvalid
                    ? "bg-neon-cyan border-neon-cyan"
                    : "border-white/30 hover:border-white/50"
                )}
              >
                {skipInvalid && (
                  <svg className="w-3 h-3 text-void" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-sm font-mono text-white">Skip invalid rows</div>
                <div className="text-xs text-white/40 mt-0.5">
                  {skipInvalid
                    ? `${validCount} rows will be imported, ${invalidCount} will be skipped`
                    : `All ${validCount + invalidCount} rows will be processed (invalid rows will fail)`}
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Start Import Button */}
        <div className="text-center">
          <NeonButton
            variant="cyan"
            size="lg"
            glow
            onClick={() => onStartImport(skipInvalid)}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            }
          >
            Start Import
          </NeonButton>
        </div>
      </div>
    );
  }

  // Importing in progress
  if (isImporting) {
    return (
      <div className="space-y-6 py-8">
        {/* Progress Animation */}
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            {/* Background Circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(importProgress / 100) * 283} 283`}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00ffff" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            {/* Percentage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-mono text-neon-cyan font-bold">
                {Math.round(importProgress)}%
              </span>
            </div>
            {/* Rotating Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-neon-cyan/20 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-neon-cyan" />
            </div>
          </div>

          <h3 className="font-display text-xl text-white font-bold uppercase mb-2">
            Importing Data
          </h3>
          <p className="text-sm font-mono text-white/50">
            Please wait while your data is being processed...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-white/30">
            <span>Processing...</span>
            <span>{Math.round(importProgress)}%</span>
          </div>
        </div>

        {/* Console-like Log */}
        <div className="p-4 bg-void-dark border border-white/10 rounded-lg font-mono text-xs">
          <div className="text-neon-cyan">[IMPORT] Starting data import...</div>
          <div className="text-white/50">[IMPORT] Processing rows...</div>
          <div className="text-neon-green animate-pulse">[IMPORT] ████████████░░░░ {Math.round(importProgress)}%</div>
        </div>
      </div>
    );
  }

  // Import completed
  if (importResult) {
    const isSuccess = importResult.success || importResult.imported > 0;

    return (
      <div className="space-y-6">
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    ["bg-neon-cyan", "bg-neon-purple", "bg-neon-green", "bg-neon-gold"][
                      Math.floor(Math.random() * 4)
                    ]
                  )}
                />
              </div>
            ))}
          </div>
        )}

        {/* Result Icon */}
        <div className="text-center py-4">
          <div
            className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6",
              isSuccess
                ? "bg-neon-green/20 border-2 border-neon-green"
                : "bg-neon-red/20 border-2 border-neon-red"
            )}
          >
            {isSuccess ? (
              <svg className="w-10 h-10 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-neon-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h3
            className={cn(
              "font-display text-xl font-bold uppercase mb-2",
              isSuccess ? "text-neon-green" : "text-neon-red"
            )}
          >
            {isSuccess ? "Import Complete" : "Import Failed"}
          </h3>
          <p className="text-sm font-mono text-white/50">
            {isSuccess
              ? "Your data has been successfully imported."
              : "There was an error importing your data."}
          </p>
        </div>

        {/* Results Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg text-center">
            <div className="text-3xl font-mono text-neon-green font-bold">
              {importResult.imported}
            </div>
            <div className="text-xs font-mono text-white/40 uppercase mt-1">Successfully Imported</div>
          </div>
          <div
            className={cn(
              "p-4 border rounded-lg text-center",
              importResult.failed > 0
                ? "bg-neon-red/10 border-neon-red/30"
                : "bg-void-surface/30 border-white/10"
            )}
          >
            <div
              className={cn(
                "text-3xl font-mono font-bold",
                importResult.failed > 0 ? "text-neon-red" : "text-white/30"
              )}
            >
              {importResult.failed}
            </div>
            <div className="text-xs font-mono text-white/40 uppercase mt-1">Failed / Skipped</div>
          </div>
        </div>

        {/* Error Report */}
        {importResult.errors.length > 0 && (
          <div className="p-4 bg-neon-red/10 border border-neon-red/30 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-sm text-neon-red font-bold uppercase">
                  {importResult.errors.length} Error{importResult.errors.length !== 1 ? "s" : ""} Detected
                </div>
                <div className="text-xs text-white/50 mt-1">
                  Download the error report to see details about failed rows.
                </div>
              </div>
              <NeonButton variant="red" size="sm" onClick={onDownloadErrors}>
                Download Report
              </NeonButton>
            </div>

            {/* Error Preview */}
            <div className="mt-3 space-y-1 max-h-[120px] overflow-y-auto">
              {importResult.errors.slice(0, 5).map((error, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-neon-red">Row {error.row + 1}:</span>
                  <span className="text-white/40">{error.message}</span>
                </div>
              ))}
              {importResult.errors.length > 5 && (
                <div className="text-[10px] font-mono text-white/30">
                  ... and {importResult.errors.length - 5} more errors
                </div>
              )}
            </div>
          </div>
        )}

        {/* Console Log */}
        <div className="p-4 bg-void-dark border border-white/10 rounded-lg font-mono text-xs space-y-1">
          <div className="text-neon-cyan">[IMPORT] Import complete</div>
          <div className="text-neon-green">[IMPORT] Imported: {importResult.imported} records</div>
          {importResult.failed > 0 && (
            <div className="text-neon-red">[IMPORT] Failed: {importResult.failed} records</div>
          )}
          <div className="text-white/50">[IMPORT] Data stored in localStorage</div>
          <div className="text-white/30">[IMPORT] Check browser console for details</div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {importResult.errors.length > 0 && (
            <NeonButton variant="outline" onClick={onDownloadErrors}>
              Download Error Report
            </NeonButton>
          )}
          <NeonButton variant="cyan" glow onClick={onDone}>
            Done
          </NeonButton>
        </div>
      </div>
    );
  }

  return null;
}

export default ImportStep;
