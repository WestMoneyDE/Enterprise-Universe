import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT - Form input with validation states and cyberpunk styling
// ═══════════════════════════════════════════════════════════════════════════════

const inputVariants = cva(
  "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-ring",
        error:
          "border-neon-red text-neon-red focus-visible:ring-neon-red placeholder:text-neon-red/50",
        success:
          "border-neon-green text-neon-green focus-visible:ring-neon-green",
        warning:
          "border-neon-gold text-neon-gold focus-visible:ring-neon-gold",
        cyber:
          "border-neon-cyan/50 bg-void-surface/50 text-neon-cyan focus-visible:ring-neon-cyan focus-visible:border-neon-cyan placeholder:text-neon-cyan/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            inputVariants({ variant: error ? "error" : variant }),
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-neon-red">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
