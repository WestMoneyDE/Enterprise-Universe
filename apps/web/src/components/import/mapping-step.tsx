"use client";

import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { NeonButton } from "@/components/scifi";
import { ParsedData, ColumnMapping, EntityType, TARGET_FIELDS } from "@/hooks/use-import";

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING STEP - Column to Field Mapping Interface
// Map source columns to target entity fields with auto-mapping support
// ═══════════════════════════════════════════════════════════════════════════════

export interface MappingStepProps {
  parsedData: ParsedData;
  mapping: ColumnMapping[];
  entityType: EntityType;
  onUpdateMapping: (index: number, targetField: string | null) => void;
  onResetMapping: () => void;
}

export function MappingStep({
  parsedData,
  mapping,
  entityType,
  onUpdateMapping,
  onResetMapping,
}: MappingStepProps) {
  const targetFields = TARGET_FIELDS[entityType];

  // Get which target fields are already mapped
  const mappedTargets = useMemo(() => {
    return new Set(mapping.filter((m) => m.targetField).map((m) => m.targetField));
  }, [mapping]);

  // Check if a required field is missing from mapping
  const missingRequired = useMemo(() => {
    const required = targetFields.filter((f) => f.required).map((f) => f.field);
    return required.filter((field) => !mappedTargets.has(field));
  }, [targetFields, mappedTargets]);

  // Get sample data for a column
  const getSampleData = useCallback(
    (columnIndex: number): string[] => {
      return parsedData.rows
        .slice(0, 3)
        .map((row) => row[columnIndex] || "")
        .filter((v) => v !== "");
    },
    [parsedData.rows]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-white/50 uppercase tracking-wider">
            Map your columns to {entityType} fields
          </div>
          {missingRequired.length > 0 && (
            <div className="text-xs font-mono text-neon-orange mt-1">
              Missing required: {missingRequired.join(", ")}
            </div>
          )}
        </div>
        <NeonButton variant="ghost" size="sm" onClick={onResetMapping}>
          Reset Mapping
        </NeonButton>
      </div>

      {/* Mapping Legend */}
      <div className="flex items-center gap-4 p-3 bg-void-surface/30 border border-white/10 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-neon-cyan" />
          <span className="text-[10px] font-mono text-white/50">Mapped</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-neon-orange" />
          <span className="text-[10px] font-mono text-white/50">Required</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white/20" />
          <span className="text-[10px] font-mono text-white/50">Skipped</span>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-void-surface/50 border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-mono text-white/50 uppercase tracking-wider">
                Source Column
              </th>
              <th className="px-4 py-3 text-center text-xs font-mono text-white/50 uppercase tracking-wider w-16">
                <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </th>
              <th className="px-4 py-3 text-left text-xs font-mono text-white/50 uppercase tracking-wider">
                Target Field
              </th>
              <th className="px-4 py-3 text-left text-xs font-mono text-white/50 uppercase tracking-wider">
                Sample Data
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {mapping.map((columnMap, index) => {
              const isSkipped = columnMap.targetField === null;
              const isMapped = columnMap.targetField !== null;
              const targetFieldInfo = targetFields.find((f) => f.field === columnMap.targetField);
              const isRequired = targetFieldInfo?.required;
              const samples = getSampleData(columnMap.sourceIndex);

              return (
                <tr
                  key={index}
                  className={cn(
                    "transition-colors",
                    isMapped ? "bg-neon-cyan/5" : "bg-transparent hover:bg-white/5"
                  )}
                >
                  {/* Source Column */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isMapped ? "bg-neon-cyan" : "bg-white/20"
                        )}
                      />
                      <span className="text-sm font-mono text-white">
                        {columnMap.sourceColumn || `Column ${index + 1}`}
                      </span>
                    </div>
                  </td>

                  {/* Arrow */}
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-lg", isMapped ? "text-neon-cyan" : "text-white/20")}>
                      {isMapped ? "→" : "×"}
                    </span>
                  </td>

                  {/* Target Field Dropdown */}
                  <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={columnMap.targetField || ""}
                        onChange={(e) => onUpdateMapping(index, e.target.value || null)}
                        className={cn(
                          "w-full px-3 py-2 rounded-lg appearance-none cursor-pointer",
                          "bg-void-surface/50 border text-sm font-mono",
                          "focus:outline-none focus:ring-2 focus:ring-neon-cyan/50",
                          isSkipped
                            ? "border-white/10 text-white/30"
                            : isRequired
                            ? "border-neon-orange/50 text-neon-orange"
                            : "border-neon-cyan/50 text-neon-cyan"
                        )}
                      >
                        <option value="">Skip this column</option>
                        <optgroup label="Available Fields">
                          {targetFields.map((field) => {
                            const isAlreadyMapped =
                              mappedTargets.has(field.field) && columnMap.targetField !== field.field;
                            return (
                              <option
                                key={field.field}
                                value={field.field}
                                disabled={isAlreadyMapped}
                              >
                                {field.label}
                                {field.required ? " *" : ""}
                                {isAlreadyMapped ? " (already mapped)" : ""}
                              </option>
                            );
                          })}
                        </optgroup>
                      </select>
                      {/* Custom Dropdown Arrow */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                          className={cn(
                            "w-4 h-4",
                            isSkipped ? "text-white/30" : "text-neon-cyan"
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </td>

                  {/* Sample Data */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {samples.length > 0 ? (
                        samples.map((sample, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-white/50 truncate max-w-[100px]"
                            title={sample}
                          >
                            {sample.length > 15 ? sample.slice(0, 15) + "..." : sample}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-mono text-white/20 italic">No data</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mapping Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-void-surface/30 border border-white/10 rounded-lg text-center">
          <div className="text-2xl font-mono text-neon-cyan font-bold">
            {mapping.filter((m) => m.targetField).length}
          </div>
          <div className="text-[10px] font-mono text-white/40 uppercase">Columns Mapped</div>
        </div>
        <div className="p-4 bg-void-surface/30 border border-white/10 rounded-lg text-center">
          <div className="text-2xl font-mono text-white/50 font-bold">
            {mapping.filter((m) => !m.targetField).length}
          </div>
          <div className="text-[10px] font-mono text-white/40 uppercase">Columns Skipped</div>
        </div>
        <div
          className={cn(
            "p-4 border rounded-lg text-center",
            missingRequired.length === 0
              ? "bg-neon-green/10 border-neon-green/30"
              : "bg-neon-orange/10 border-neon-orange/30"
          )}
        >
          <div
            className={cn(
              "text-2xl font-mono font-bold",
              missingRequired.length === 0 ? "text-neon-green" : "text-neon-orange"
            )}
          >
            {missingRequired.length === 0 ? "Ready" : missingRequired.length}
          </div>
          <div
            className={cn(
              "text-[10px] font-mono uppercase",
              missingRequired.length === 0 ? "text-neon-green/50" : "text-neon-orange/50"
            )}
          >
            {missingRequired.length === 0 ? "All Required Set" : "Fields Missing"}
          </div>
        </div>
      </div>

      {/* Field Descriptions */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-white/50 uppercase tracking-wider">
          Available Fields
        </div>
        <div className="grid grid-cols-2 gap-2">
          {targetFields.map((field) => (
            <div
              key={field.field}
              className={cn(
                "p-3 rounded-lg border",
                mappedTargets.has(field.field)
                  ? "bg-neon-cyan/10 border-neon-cyan/30"
                  : "bg-void-surface/30 border-white/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-white">
                  {field.label}
                  {field.required && <span className="text-neon-orange ml-1">*</span>}
                </span>
                {mappedTargets.has(field.field) && (
                  <svg className="w-4 h-4 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="text-[10px] font-mono text-white/30 mt-1">
                Field: {field.field}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MappingStep;
