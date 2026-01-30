"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ParsedData, ColumnMapping, RowValidationResult, TARGET_FIELDS } from "@/hooks/use-import";

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW STEP - Data Preview with Validation Errors
// Shows first 10 rows with validation errors highlighted
// ═══════════════════════════════════════════════════════════════════════════════

export interface PreviewStepProps {
  parsedData: ParsedData;
  mapping: ColumnMapping[];
  validationResults: RowValidationResult[];
  validCount: number;
  invalidCount: number;
}

export function PreviewStep({
  parsedData,
  mapping,
  validationResults,
  validCount,
  invalidCount,
}: PreviewStepProps) {
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [showOnlyMapped, setShowOnlyMapped] = useState(true);

  // Get mapped columns
  const mappedColumns = useMemo(() => {
    return mapping.filter((m) => m.targetField !== null);
  }, [mapping]);

  // Filter and limit rows for preview
  const displayedResults = useMemo(() => {
    let results = validationResults;

    if (filter === "valid") {
      results = results.filter((r) => r.valid);
    } else if (filter === "invalid") {
      results = results.filter((r) => !r.valid);
    }

    return results.slice(0, 10);
  }, [validationResults, filter]);

  // Get columns to display
  const displayColumns = showOnlyMapped ? mappedColumns : mapping;

  // Get error for a specific cell
  const getCellError = (result: RowValidationResult, sourceColumn: string): string | null => {
    const error = result.errors.find((e) => e.column === sourceColumn);
    return error ? error.message : null;
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={cn(
            "p-4 rounded-lg border text-center cursor-pointer transition-all",
            filter === "all"
              ? "bg-neon-cyan/20 border-neon-cyan"
              : "bg-void-surface/30 border-white/10 hover:border-white/30"
          )}
          onClick={() => setFilter("all")}
        >
          <div className="text-2xl font-mono text-white font-bold">
            {validationResults.length}
          </div>
          <div className="text-[10px] font-mono text-white/40 uppercase">Total Rows</div>
        </div>
        <div
          className={cn(
            "p-4 rounded-lg border text-center cursor-pointer transition-all",
            filter === "valid"
              ? "bg-neon-green/20 border-neon-green"
              : "bg-void-surface/30 border-white/10 hover:border-white/30"
          )}
          onClick={() => setFilter("valid")}
        >
          <div className="text-2xl font-mono text-neon-green font-bold">{validCount}</div>
          <div className="text-[10px] font-mono text-white/40 uppercase">Valid Rows</div>
        </div>
        <div
          className={cn(
            "p-4 rounded-lg border text-center cursor-pointer transition-all",
            filter === "invalid"
              ? "bg-neon-red/20 border-neon-red"
              : "bg-void-surface/30 border-white/10 hover:border-white/30"
          )}
          onClick={() => setFilter("invalid")}
        >
          <div className="text-2xl font-mono text-neon-red font-bold">{invalidCount}</div>
          <div className="text-[10px] font-mono text-white/40 uppercase">Rows with Errors</div>
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/50">Filter:</span>
          {(["all", "valid", "invalid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded text-xs font-mono uppercase transition-all",
                filter === f
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                  : "text-white/50 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyMapped}
            onChange={(e) => setShowOnlyMapped(e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              "w-8 h-4 rounded-full transition-colors relative",
              showOnlyMapped ? "bg-neon-cyan" : "bg-white/20"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                showOnlyMapped ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </div>
          <span className="text-xs font-mono text-white/50">Show only mapped columns</span>
        </label>
      </div>

      {/* Preview Table */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-void-surface/50 border-b border-white/10">
                <th className="px-3 py-2 text-left text-[10px] font-mono text-white/50 uppercase tracking-wider sticky left-0 bg-void-surface/50 z-10 w-12">
                  #
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-mono text-white/50 uppercase tracking-wider w-16">
                  Status
                </th>
                {displayColumns.map((col, index) => (
                  <th
                    key={index}
                    className="px-3 py-2 text-left text-[10px] font-mono text-white/50 uppercase tracking-wider whitespace-nowrap"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white/70">{col.sourceColumn}</span>
                      {col.targetField && (
                        <span className="text-neon-cyan text-[8px]">
                          → {col.targetField}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayedResults.map((result) => {
                const rowData = parsedData.rows[result.rowIndex];
                return (
                  <tr
                    key={result.rowIndex}
                    className={cn(
                      "transition-colors",
                      result.valid ? "hover:bg-neon-green/5" : "bg-neon-red/5 hover:bg-neon-red/10"
                    )}
                  >
                    {/* Row Number */}
                    <td className="px-3 py-2 text-xs font-mono text-white/30 sticky left-0 bg-void z-10">
                      {result.rowIndex + 1}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center">
                      {result.valid ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neon-green/20 text-neon-green">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neon-red/20 text-neon-red"
                          title={result.errors.map((e) => e.message).join(", ")}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                      )}
                    </td>

                    {/* Data Cells */}
                    {displayColumns.map((col, colIndex) => {
                      const value = rowData[col.sourceIndex] || "";
                      const cellError = getCellError(result, col.sourceColumn);

                      return (
                        <td
                          key={colIndex}
                          className={cn(
                            "px-3 py-2 text-xs font-mono max-w-[200px]",
                            cellError ? "bg-neon-red/10" : ""
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                "truncate",
                                cellError ? "text-neon-red" : value ? "text-white" : "text-white/20"
                              )}
                              title={value}
                            >
                              {value || "(empty)"}
                            </span>
                            {cellError && (
                              <span className="text-[10px] text-neon-red/70 truncate" title={cellError}>
                                {cellError}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-xs font-mono text-white/30">
        <span>
          Showing {displayedResults.length} of{" "}
          {filter === "all"
            ? validationResults.length
            : filter === "valid"
            ? validCount
            : invalidCount}{" "}
          rows
        </span>
        {displayedResults.length < validationResults.length && (
          <span className="text-white/50">Preview limited to first 10 rows</span>
        )}
      </div>

      {/* Error Summary */}
      {invalidCount > 0 && (
        <div className="p-4 bg-neon-red/10 border border-neon-red/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-red/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-neon-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-display text-sm text-neon-red font-bold uppercase">
                Validation Errors Detected
              </div>
              <div className="text-xs text-white/50 mt-1">
                {invalidCount} row{invalidCount !== 1 ? "s have" : " has"} validation errors.
                You can choose to skip invalid rows during import or go back to fix the mapping.
              </div>

              {/* Error Types Summary */}
              <div className="mt-3 space-y-1">
                {(() => {
                  const errorTypes: Record<string, number> = {};
                  validationResults.forEach((r) => {
                    r.errors.forEach((e) => {
                      errorTypes[e.message] = (errorTypes[e.message] || 0) + 1;
                    });
                  });
                  return Object.entries(errorTypes)
                    .slice(0, 5)
                    .map(([message, count]) => (
                      <div key={message} className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-neon-red">{count}x</span>
                        <span className="text-white/40">{message}</span>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {invalidCount === 0 && validCount > 0 && (
        <div className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="font-display text-sm text-neon-green font-bold uppercase">
                All Rows Valid
              </div>
              <div className="text-xs text-white/50 mt-0.5">
                {validCount} row{validCount !== 1 ? "s are" : " is"} ready to import.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PreviewStep;
