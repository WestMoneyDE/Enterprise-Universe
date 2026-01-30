"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { HoloCard, NeonButton } from "@/components/scifi";
import { SchemaViewer } from "./schema-viewer";
import { MethodBadge } from "./endpoint-card";
import {
  Play,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import type { ApiEndpoint, SchemaField } from "@/data/api-docs";

// =============================================================================
// API EXPLORER COMPONENT
// =============================================================================
// Interactive "Try it" panel for testing API endpoints

interface ApiExplorerProps {
  endpoint: ApiEndpoint;
  onClose?: () => void;
  className?: string;
}

export function ApiExplorer({ endpoint, onClose, className }: ApiExplorerProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    buildInitialFormData(endpoint.inputSchema, endpoint.examples.request)
  );
  const [response, setResponse] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const isQuery = endpoint.type === "query";

  const handleInputChange = useCallback((path: string, value: unknown) => {
    setFormData((prev) => {
      const newData = { ...prev };
      setNestedValue(newData, path, value);
      return newData;
    });
  }, []);

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setExecutionTime(null);

    const startTime = performance.now();

    try {
      // Build the tRPC URL
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const procedurePath = `${endpoint.router}.${endpoint.procedure}`;

      // For queries, use GET with input as query param
      // For mutations, use POST with input in body
      let url: string;
      let options: RequestInit;

      const cleanedInput = cleanFormData(formData);
      const hasInput = Object.keys(cleanedInput).length > 0;

      if (isQuery) {
        const inputParam = hasInput
          ? `?input=${encodeURIComponent(JSON.stringify({ "0": cleanedInput }))}`
          : "";
        url = `${baseUrl}/api/trpc/${procedurePath}${inputParam}`;
        options = {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-trpc-source": "api-explorer",
          },
        };
      } else {
        url = `${baseUrl}/api/trpc/${procedurePath}`;
        options = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-trpc-source": "api-explorer",
          },
          body: JSON.stringify({ "0": hasInput ? cleanedInput : undefined }),
        };
      }

      const res = await fetch(url, options);
      const data = await res.json();

      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));

      if (!res.ok || data[0]?.error) {
        setError(data[0]?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        setResponse(data);
      } else {
        setResponse(data[0]?.result?.data ?? data);
      }
    } catch (err) {
      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setFormData(buildInitialFormData(endpoint.inputSchema, endpoint.examples.request));
    setResponse(null);
    setError(null);
    setExecutionTime(null);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/80 backdrop-blur-sm",
        className
      )}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <HoloCard
        variant={isQuery ? "cyan" : "purple"}
        glow
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <MethodBadge type={endpoint.type} />
            <code className="text-white font-mono">
              {endpoint.router}.{endpoint.procedure}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 text-white/50 hover:text-white/80 transition-colors"
              title="Reset"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-white/50 hover:text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Input Form */}
          {endpoint.inputSchema.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                Input Parameters
              </h3>
              <div className="space-y-3">
                {endpoint.inputSchema.map((field) => (
                  <FormField
                    key={field.name}
                    field={field}
                    value={formData[field.name]}
                    onChange={(value) => handleInputChange(field.name, value)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-white/40">
              No input parameters required
            </div>
          )}

          {/* Execute Button */}
          <div className="flex items-center justify-center gap-4 py-4">
            <NeonButton
              variant={isQuery ? "cyan" : "purple"}
              glow
              onClick={handleExecute}
              disabled={isLoading}
              icon={
                isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )
              }
            >
              {isLoading ? "Executing..." : "Execute"}
            </NeonButton>
          </div>

          {/* Response Section */}
          {(response !== null || error) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                    Response
                  </h3>
                  {error ? (
                    <span className="flex items-center gap-1 text-xs text-neon-red">
                      <XCircle className="w-3.5 h-3.5" />
                      Error
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-neon-green">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Success
                    </span>
                  )}
                  {executionTime !== null && (
                    <span className="text-xs text-white/40">
                      {executionTime}ms
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCopyResponse}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-neon-green" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm">
                  {error}
                </div>
              )}

              <pre
                className={cn(
                  "p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-80",
                  "bg-void-dark/50 border",
                  error ? "border-neon-red/30" : "border-neon-green/30"
                )}
              >
                <code className="text-white/80">
                  {JSON.stringify(response, null, 2)}
                </code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer - Schema Reference */}
        <div className="p-4 border-t border-white/10 bg-void-dark/50">
          <details className="group">
            <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70">
              Schema Reference
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/40 mb-2">Input</p>
                <SchemaViewer fields={endpoint.inputSchema} variant="compact" />
              </div>
              <div>
                <p className="text-xs text-white/40 mb-2">Output</p>
                <SchemaViewer fields={endpoint.outputSchema} variant="compact" />
              </div>
            </div>
          </details>
        </div>
      </HoloCard>
    </div>
  );
}

// =============================================================================
// FORM FIELD COMPONENT
// =============================================================================

interface FormFieldProps {
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  path?: string;
}

function FormField({ field, value, onChange, path = "" }: FormFieldProps) {
  const fieldPath = path ? `${path}.${field.name}` : field.name;

  // Handle nested objects
  if (field.type === "object" && field.nested) {
    return (
      <div className="border border-white/10 rounded-lg p-3 space-y-3">
        <label className="block text-xs font-semibold text-neon-cyan">
          {field.name}
          {!field.required && <span className="text-white/30 ml-1">(optional)</span>}
        </label>
        {field.description && (
          <p className="text-[10px] text-white/40">{field.description}</p>
        )}
        <div className="space-y-2 ml-3 border-l border-white/10 pl-3">
          {field.nested.map((nestedField) => (
            <FormField
              key={nestedField.name}
              field={nestedField}
              value={(value as Record<string, unknown>)?.[nestedField.name]}
              onChange={(v) => {
                const newValue = { ...(value as Record<string, unknown> || {}), [nestedField.name]: v };
                onChange(newValue);
              }}
              path={fieldPath}
            />
          ))}
        </div>
      </div>
    );
  }

  // Handle arrays
  if (field.type === "array") {
    const arrayValue = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-neon-cyan">
          {field.name}
          {!field.required && <span className="text-white/30 ml-1">(optional)</span>}
        </label>
        <input
          type="text"
          value={arrayValue.join(", ")}
          onChange={(e) => {
            const arr = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            onChange(arr.length > 0 ? arr : undefined);
          }}
          placeholder="Comma-separated values"
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm font-mono",
            "bg-void-dark/50 border border-white/20",
            "text-white placeholder:text-white/30",
            "focus:outline-none focus:border-neon-cyan/50"
          )}
        />
      </div>
    );
  }

  // Handle enums
  if (field.enumValues && field.enumValues.length > 0) {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-neon-cyan">
          {field.name}
          {!field.required && <span className="text-white/30 ml-1">(optional)</span>}
        </label>
        <select
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm font-mono",
            "bg-void-dark/50 border border-white/20",
            "text-white",
            "focus:outline-none focus:border-neon-cyan/50"
          )}
        >
          <option value="">Select...</option>
          {field.enumValues.map((enumVal) => (
            <option key={enumVal} value={enumVal}>
              {enumVal}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Handle boolean
  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-white/20 bg-void-dark/50 text-neon-cyan focus:ring-neon-cyan/50"
        />
        <label className="text-xs font-semibold text-neon-cyan">
          {field.name}
          {!field.required && <span className="text-white/30 ml-1">(optional)</span>}
        </label>
        {field.description && (
          <span className="text-[10px] text-white/40">{field.description}</span>
        )}
      </div>
    );
  }

  // Handle number
  if (field.type === "number") {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-neon-cyan">
          {field.name}
          {!field.required && <span className="text-white/30 ml-1">(optional)</span>}
        </label>
        {field.description && (
          <p className="text-[10px] text-white/40">{field.description}</p>
        )}
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : undefined)
          }
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm font-mono",
            "bg-void-dark/50 border border-white/20",
            "text-white placeholder:text-white/30",
            "focus:outline-none focus:border-neon-cyan/50"
          )}
        />
      </div>
    );
  }

  // Handle date
  if (field.type === "date") {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-neon-cyan">
          {field.name}
          {!field.required && <span className="text-white/30 ml-1">(optional)</span>}
        </label>
        {field.description && (
          <p className="text-[10px] text-white/40">{field.description}</p>
        )}
        <input
          type="datetime-local"
          value={value ? formatDateForInput(value as string) : ""}
          onChange={(e) =>
            onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)
          }
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm font-mono",
            "bg-void-dark/50 border border-white/20",
            "text-white placeholder:text-white/30",
            "focus:outline-none focus:border-neon-cyan/50"
          )}
        />
      </div>
    );
  }

  // Default: string input
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-neon-cyan">
        {field.name}
        {!field.required && <span className="text-white/30 ml-1">(optional)</span>}
      </label>
      {field.description && (
        <p className="text-[10px] text-white/40">{field.description}</p>
      )}
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm font-mono",
          "bg-void-dark/50 border border-white/20",
          "text-white placeholder:text-white/30",
          "focus:outline-none focus:border-neon-cyan/50"
        )}
      />
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildInitialFormData(
  schema: SchemaField[],
  example?: Record<string, unknown>
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const field of schema) {
    if (example && example[field.name] !== undefined) {
      data[field.name] = example[field.name];
    } else if (field.nested) {
      data[field.name] = buildInitialFormData(field.nested);
    }
  }

  return data;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

function cleanFormData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === "" || value === null) {
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      const cleanedNested = cleanFormData(value as Record<string, unknown>);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

function formatDateForInput(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export default ApiExplorer;
