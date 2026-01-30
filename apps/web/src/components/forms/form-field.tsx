"use client";

import * as React from "react";
import {
  useFormContext,
  Controller,
  FieldValues,
  Path,
  ControllerRenderProps,
  FieldError,
} from "react-hook-form";
import { Label } from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// FORM FIELD - Reusable form field wrapper with react-hook-form integration
// Features: Inline error display with animations, SciFi styling
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormFieldProps<T extends FieldValues> {
  /** Field name matching the form schema */
  name: Path<T>;
  /** Field label displayed above the input */
  label?: string;
  /** Helper description displayed below the input */
  description?: string;
  /** Whether the field is required (shows indicator) */
  required?: boolean;
  /** Custom className for the wrapper */
  className?: string;
  /** Render prop for custom input components */
  children:
    | React.ReactNode
    | ((props: {
        field: ControllerRenderProps<T, Path<T>>;
        error?: FieldError;
        isInvalid: boolean;
      }) => React.ReactNode);
  /** ID for accessibility - defaults to name */
  id?: string;
  /** Disable the error animation */
  disableErrorAnimation?: boolean;
}

/**
 * FormField - A wrapper component for form fields using react-hook-form
 *
 * Provides:
 * - Label with optional required indicator
 * - Description text
 * - Inline error display with slide-in animation
 * - SciFi styling (cyan focus, red errors with glow)
 *
 * @example
 * ```tsx
 * <FormField name="email" label="Email" required>
 *   {({ field, isInvalid }) => (
 *     <Input {...field} variant={isInvalid ? "error" : "cyber"} />
 *   )}
 * </FormField>
 * ```
 */
export function FormField<T extends FieldValues>({
  name,
  label,
  description,
  required = false,
  className,
  children,
  id,
  disableErrorAnimation = false,
}: FormFieldProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();

  // Get nested error using path (supports "user.email" style paths)
  const getNestedError = (path: string): FieldError | undefined => {
    const parts = path.split(".");
    let current: unknown = errors;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current as FieldError | undefined;
  };

  const error = getNestedError(name);
  const fieldId = id || name;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const isInvalid = !!error;

        return (
          <div className={cn("space-y-2", className)}>
            {/* Label with required indicator */}
            {label && (
              <Label
                htmlFor={fieldId}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors duration-200",
                  isInvalid ? "text-neon-red" : "text-gray-200"
                )}
              >
                {label}
                {required && (
                  <span
                    className={cn(
                      "text-xs transition-colors duration-200",
                      isInvalid ? "text-neon-red" : "text-neon-cyan"
                    )}
                    aria-hidden="true"
                  >
                    *
                  </span>
                )}
              </Label>
            )}

            {/* Field content */}
            <div className="relative">
              {typeof children === "function"
                ? children({ field, error, isInvalid })
                : children}
            </div>

            {/* Description (hidden when error is shown) */}
            {description && !error && (
              <p
                id={descriptionId}
                className="text-xs text-gray-500 transition-opacity duration-200"
              >
                {description}
              </p>
            )}

            {/* Error message with animation */}
            <FormFieldError
              error={error}
              errorId={errorId}
              animate={!disableErrorAnimation}
            />
          </div>
        );
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM FIELD ERROR - Animated inline error display
// ═══════════════════════════════════════════════════════════════════════════════

interface FormFieldErrorProps {
  error?: FieldError;
  errorId: string;
  animate?: boolean;
}

function FormFieldError({ error, errorId, animate = true }: FormFieldErrorProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [displayError, setDisplayError] = React.useState<FieldError | undefined>(
    error
  );

  React.useEffect(() => {
    if (error) {
      setDisplayError(error);
      // Small delay for mount animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      // Keep the error visible during exit animation
      const timeout = setTimeout(() => {
        setDisplayError(undefined);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  if (!displayError) return null;

  return (
    <div
      id={errorId}
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        // Error styling with glow
        "text-neon-red",
        // Animation classes
        animate && "transition-all duration-200 ease-out",
        animate && (isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-1")
      )}
    >
      <AlertCircle
        className={cn(
          "h-3.5 w-3.5 flex-shrink-0",
          // Subtle glow effect on the icon
          "drop-shadow-[0_0_4px_rgba(255,51,102,0.5)]"
        )}
      />
      <span className="drop-shadow-[0_0_2px_rgba(255,51,102,0.3)]">
        {displayError.message}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM FIELD INPUT - Pre-styled input for use within FormField
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormFieldInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Whether the input is in an error state */
  isInvalid?: boolean;
  /** Input variant */
  variant?: "default" | "cyber";
}

export const FormFieldInput = React.forwardRef<
  HTMLInputElement,
  FormFieldInputProps
>(({ className, isInvalid, variant = "cyber", ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        // Base styles
        "flex h-9 w-full rounded-md border bg-transparent px-3 py-1",
        "text-base shadow-sm transition-all duration-200",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "md:text-sm",
        // Variant styles
        variant === "cyber" && !isInvalid && [
          "border-neon-cyan/50 bg-void-surface/50 text-neon-cyan",
          "focus-visible:ring-neon-cyan focus-visible:border-neon-cyan",
          "focus-visible:shadow-[0_0_10px_rgba(0,240,255,0.2)]",
          "placeholder:text-neon-cyan/30",
        ],
        variant === "default" && !isInvalid && [
          "border-input focus-visible:ring-ring",
        ],
        // Error state with glow
        isInvalid && [
          "border-neon-red text-neon-red",
          "focus-visible:ring-neon-red focus-visible:border-neon-red",
          "focus-visible:shadow-[0_0_10px_rgba(255,51,102,0.3)]",
          "placeholder:text-neon-red/50",
          "shadow-[0_0_5px_rgba(255,51,102,0.15)]",
        ],
        className
      )}
      {...props}
    />
  );
});

FormFieldInput.displayName = "FormFieldInput";

// ═══════════════════════════════════════════════════════════════════════════════
// FORM FIELD TEXTAREA - Pre-styled textarea for use within FormField
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormFieldTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Whether the textarea is in an error state */
  isInvalid?: boolean;
  /** Textarea variant */
  variant?: "default" | "cyber";
}

export const FormFieldTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FormFieldTextareaProps
>(({ className, isInvalid, variant = "cyber", rows = 4, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        // Base styles
        "flex w-full rounded-md border bg-transparent px-3 py-2",
        "text-sm shadow-sm transition-all duration-200",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y min-h-[80px]",
        // Variant styles
        variant === "cyber" && !isInvalid && [
          "border-neon-cyan/50 bg-void-surface/50 text-neon-cyan",
          "focus-visible:ring-neon-cyan focus-visible:border-neon-cyan",
          "focus-visible:shadow-[0_0_10px_rgba(0,240,255,0.2)]",
          "placeholder:text-neon-cyan/30",
        ],
        variant === "default" && !isInvalid && [
          "border-input focus-visible:ring-ring",
        ],
        // Error state with glow
        isInvalid && [
          "border-neon-red text-neon-red",
          "focus-visible:ring-neon-red focus-visible:border-neon-red",
          "focus-visible:shadow-[0_0_10px_rgba(255,51,102,0.3)]",
          "placeholder:text-neon-red/50",
          "shadow-[0_0_5px_rgba(255,51,102,0.15)]",
        ],
        className
      )}
      {...props}
    />
  );
});

FormFieldTextarea.displayName = "FormFieldTextarea";

// ═══════════════════════════════════════════════════════════════════════════════
// FORM FIELD SELECT - Pre-styled select wrapper for use within FormField
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormFieldSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Whether the select is in an error state */
  isInvalid?: boolean;
  /** Select variant */
  variant?: "default" | "cyber";
  /** Placeholder option */
  placeholder?: string;
}

export const FormFieldSelect = React.forwardRef<
  HTMLSelectElement,
  FormFieldSelectProps
>(
  (
    { className, isInvalid, variant = "cyber", placeholder, children, ...props },
    ref
  ) => {
    return (
      <select
        ref={ref}
        className={cn(
          // Base styles
          "flex h-9 w-full rounded-md border bg-transparent px-3 py-1",
          "text-sm shadow-sm transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "appearance-none cursor-pointer",
          // Chevron indicator
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2300F0FF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]",
          "bg-[length:16px_16px] bg-[right_8px_center] bg-no-repeat pr-10",
          // Variant styles
          variant === "cyber" && !isInvalid && [
            "border-neon-cyan/50 bg-void-surface/50 text-neon-cyan",
            "focus-visible:ring-neon-cyan focus-visible:border-neon-cyan",
            "focus-visible:shadow-[0_0_10px_rgba(0,240,255,0.2)]",
          ],
          variant === "default" && !isInvalid && [
            "border-input focus-visible:ring-ring",
          ],
          // Error state with glow
          isInvalid && [
            "border-neon-red text-neon-red",
            "focus-visible:ring-neon-red focus-visible:border-neon-red",
            "focus-visible:shadow-[0_0_10px_rgba(255,51,102,0.3)]",
            "shadow-[0_0_5px_rgba(255,51,102,0.15)]",
            // Red chevron for error state
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23FF3366%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]",
          ],
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled className="bg-void-dark text-gray-500">
            {placeholder}
          </option>
        )}
        {children}
      </select>
    );
  }
);

FormFieldSelect.displayName = "FormFieldSelect";

export default FormField;
