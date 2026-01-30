"use client";

import * as React from "react";
import { useFormContext, FieldErrors, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronUp, X, AlertCircle } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// FORM ERROR SUMMARY - Displays all form errors in a collapsible panel
// Features: Clickable errors that focus fields, collapsible design, SciFi styling
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormErrorSummaryProps {
  /** Custom className for the wrapper */
  className?: string;
  /** Whether the summary starts collapsed */
  defaultCollapsed?: boolean;
  /** Custom title for the error summary */
  title?: string;
  /** Map of field names to custom labels */
  fieldLabels?: Record<string, string>;
  /** Whether to show the summary even with no errors */
  alwaysShow?: boolean;
  /** Callback when an error is clicked */
  onErrorClick?: (fieldName: string) => void;
  /** Maximum number of errors to show before "show more" */
  maxVisible?: number;
}

interface FlattenedError {
  path: string;
  message: string;
  label: string;
}

/**
 * FormErrorSummary - Displays all form validation errors in one place
 *
 * Provides:
 * - Collapsible error list
 * - Clickable errors that focus the corresponding field
 * - SciFi styling with red glow effects
 * - Automatic field label generation from field names
 *
 * @example
 * ```tsx
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormErrorSummary
 *     title="Please fix the following errors"
 *     fieldLabels={{ email: "Email Address", password: "Password" }}
 *   />
 *   <FormField name="email" ... />
 * </Form>
 * ```
 */
export function FormErrorSummary({
  className,
  defaultCollapsed = false,
  title = "Please fix the following errors",
  fieldLabels = {},
  alwaysShow = false,
  onErrorClick,
  maxVisible = 5,
}: FormErrorSummaryProps) {
  const { formState } = useFormContext();
  const { errors, isSubmitted } = formState;

  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [showAll, setShowAll] = React.useState(false);

  // Flatten nested errors into a simple array
  const flattenedErrors = React.useMemo(() => {
    const result: FlattenedError[] = [];

    const flatten = (obj: FieldErrors, prefix = "") => {
      for (const key in obj) {
        const value = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;

        if (value?.message && typeof value.message === "string") {
          // Generate label from path or use custom label
          const label = fieldLabels[path] || formatFieldLabel(path);
          result.push({
            path,
            message: value.message,
            label,
          });
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          // Handle nested objects (but not arrays for now)
          flatten(value as FieldErrors, path);
        }
      }
    };

    flatten(errors);
    return result;
  }, [errors, fieldLabels]);

  const hasErrors = flattenedErrors.length > 0;
  const visibleErrors = showAll
    ? flattenedErrors
    : flattenedErrors.slice(0, maxVisible);
  const hiddenCount = flattenedErrors.length - maxVisible;

  // Don't render if no errors (unless alwaysShow is true)
  if (!hasErrors && !alwaysShow) return null;

  // Don't show until form has been submitted once
  if (!isSubmitted && !alwaysShow) return null;

  const handleErrorClick = (fieldName: string) => {
    // Call custom handler if provided
    onErrorClick?.(fieldName);

    // Try to focus the field
    const field = document.querySelector<HTMLElement>(
      `[name="${fieldName}"], #${fieldName}, [id="${fieldName}"]`
    );

    if (field) {
      field.focus();
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        // Base styles
        "rounded-lg border overflow-hidden",
        "transition-all duration-300 ease-out",
        // Error styling with glow
        "bg-neon-red/5 border-neon-red/30",
        "shadow-[0_0_15px_rgba(255,51,102,0.1)]",
        // Animation on mount
        "animate-slide-down",
        className
      )}
    >
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3",
          "text-left transition-colors duration-200",
          "hover:bg-neon-red/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neon-red/50"
        )}
        aria-expanded={!isCollapsed}
        aria-controls="error-summary-content"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={cn(
              "h-5 w-5 text-neon-red flex-shrink-0",
              "drop-shadow-[0_0_4px_rgba(255,51,102,0.5)]"
            )}
          />
          <span className="font-medium text-neon-red">
            {hasErrors ? title : "No errors"}
          </span>
          {hasErrors && (
            <span
              className={cn(
                "inline-flex items-center justify-center",
                "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
                "bg-neon-red/20 text-neon-red",
                "border border-neon-red/30"
              )}
            >
              {flattenedErrors.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-neon-red/70" />
          ) : (
            <ChevronUp className="h-4 w-4 text-neon-red/70" />
          )}
        </div>
      </button>

      {/* Error list - Collapsible */}
      <div
        id="error-summary-content"
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isCollapsed ? "max-h-0" : "max-h-[500px]"
        )}
      >
        {hasErrors && (
          <ul className="px-4 pb-3 space-y-2">
            {visibleErrors.map((error, index) => (
              <ErrorItem
                key={error.path}
                error={error}
                onClick={() => handleErrorClick(error.path)}
                index={index}
              />
            ))}

            {/* Show more button */}
            {hiddenCount > 0 && !showAll && (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className={cn(
                    "w-full py-2 text-sm text-center",
                    "text-neon-red/70 hover:text-neon-red",
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-neon-red/30 rounded"
                  )}
                >
                  + {hiddenCount} more error{hiddenCount > 1 ? "s" : ""}
                </button>
              </li>
            )}

            {/* Show less button */}
            {showAll && flattenedErrors.length > maxVisible && (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className={cn(
                    "w-full py-2 text-sm text-center",
                    "text-neon-red/70 hover:text-neon-red",
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-neon-red/30 rounded"
                  )}
                >
                  Show less
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR ITEM - Individual error row
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorItemProps {
  error: FlattenedError;
  onClick: () => void;
  index: number;
}

function ErrorItem({ error, onClick, index }: ErrorItemProps) {
  return (
    <li
      className={cn(
        "animate-fade-in",
        // Stagger animation based on index
        index === 0 && "animation-delay-0",
        index === 1 && "[animation-delay:50ms]",
        index === 2 && "[animation-delay:100ms]",
        index === 3 && "[animation-delay:150ms]",
        index >= 4 && "[animation-delay:200ms]"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-start gap-2 p-2 rounded-md text-left",
          "transition-all duration-200",
          "hover:bg-neon-red/10 group",
          "focus:outline-none focus:ring-2 focus:ring-neon-red/30"
        )}
      >
        <AlertCircle
          className={cn(
            "h-4 w-4 mt-0.5 flex-shrink-0",
            "text-neon-red/70 group-hover:text-neon-red",
            "transition-colors duration-200"
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neon-red/90 group-hover:text-neon-red transition-colors">
            {error.label}
          </p>
          <p className="text-xs text-neon-red/60 group-hover:text-neon-red/80 transition-colors truncate">
            {error.message}
          </p>
        </div>
        <span
          className={cn(
            "text-xs text-neon-red/40 group-hover:text-neon-red/60",
            "transition-colors duration-200 font-mono"
          )}
        >
          Click to fix
        </span>
      </button>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE FORM ERROR SUMMARY - For use outside FormContext
// ═══════════════════════════════════════════════════════════════════════════════

export interface StandaloneFormErrorSummaryProps
  extends Omit<FormErrorSummaryProps, "fieldLabels"> {
  /** Array of errors to display */
  errors: Array<{ field: string; message: string; label?: string }>;
}

/**
 * StandaloneFormErrorSummary - Error summary for use without react-hook-form
 *
 * @example
 * ```tsx
 * <StandaloneFormErrorSummary
 *   errors={[
 *     { field: "email", message: "Invalid email format", label: "Email Address" },
 *     { field: "password", message: "Must be at least 8 characters" }
 *   ]}
 * />
 * ```
 */
export function StandaloneFormErrorSummary({
  errors,
  className,
  defaultCollapsed = false,
  title = "Please fix the following errors",
  alwaysShow = false,
  onErrorClick,
  maxVisible = 5,
}: StandaloneFormErrorSummaryProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [showAll, setShowAll] = React.useState(false);

  const flattenedErrors: FlattenedError[] = errors.map((e) => ({
    path: e.field,
    message: e.message,
    label: e.label || formatFieldLabel(e.field),
  }));

  const hasErrors = flattenedErrors.length > 0;
  const visibleErrors = showAll
    ? flattenedErrors
    : flattenedErrors.slice(0, maxVisible);
  const hiddenCount = flattenedErrors.length - maxVisible;

  if (!hasErrors && !alwaysShow) return null;

  const handleErrorClick = (fieldName: string) => {
    onErrorClick?.(fieldName);

    const field = document.querySelector<HTMLElement>(
      `[name="${fieldName}"], #${fieldName}, [id="${fieldName}"]`
    );

    if (field) {
      field.focus();
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-lg border overflow-hidden",
        "transition-all duration-300 ease-out",
        "bg-neon-red/5 border-neon-red/30",
        "shadow-[0_0_15px_rgba(255,51,102,0.1)]",
        "animate-slide-down",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3",
          "text-left transition-colors duration-200",
          "hover:bg-neon-red/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neon-red/50"
        )}
        aria-expanded={!isCollapsed}
        aria-controls="standalone-error-summary-content"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={cn(
              "h-5 w-5 text-neon-red flex-shrink-0",
              "drop-shadow-[0_0_4px_rgba(255,51,102,0.5)]"
            )}
          />
          <span className="font-medium text-neon-red">
            {hasErrors ? title : "No errors"}
          </span>
          {hasErrors && (
            <span
              className={cn(
                "inline-flex items-center justify-center",
                "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
                "bg-neon-red/20 text-neon-red",
                "border border-neon-red/30"
              )}
            >
              {flattenedErrors.length}
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-neon-red/70" />
        ) : (
          <ChevronUp className="h-4 w-4 text-neon-red/70" />
        )}
      </button>

      <div
        id="standalone-error-summary-content"
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isCollapsed ? "max-h-0" : "max-h-[500px]"
        )}
      >
        {hasErrors && (
          <ul className="px-4 pb-3 space-y-2">
            {visibleErrors.map((error, index) => (
              <ErrorItem
                key={error.path}
                error={error}
                onClick={() => handleErrorClick(error.path)}
                index={index}
              />
            ))}

            {hiddenCount > 0 && !showAll && (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className={cn(
                    "w-full py-2 text-sm text-center",
                    "text-neon-red/70 hover:text-neon-red",
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-neon-red/30 rounded"
                  )}
                >
                  + {hiddenCount} more error{hiddenCount > 1 ? "s" : ""}
                </button>
              </li>
            )}

            {showAll && flattenedErrors.length > maxVisible && (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className={cn(
                    "w-full py-2 text-sm text-center",
                    "text-neon-red/70 hover:text-neon-red",
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-neon-red/30 rounded"
                  )}
                >
                  Show less
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Converts a field path to a human-readable label
 * e.g., "user.emailAddress" -> "Email Address"
 */
function formatFieldLabel(path: string): string {
  // Get the last part of the path
  const fieldName = path.split(".").pop() || path;

  // Convert camelCase/snake_case to Title Case
  return fieldName
    // Add space before uppercase letters
    .replace(/([A-Z])/g, " $1")
    // Replace underscores with spaces
    .replace(/_/g, " ")
    // Capitalize first letter of each word
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

export default FormErrorSummary;
