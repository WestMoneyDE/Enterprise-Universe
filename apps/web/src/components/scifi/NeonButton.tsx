"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// NEON BUTTON - Cyberpunk Button Component
// Multiple variants with glow effects and animations
// ═══════════════════════════════════════════════════════════════════════════════

export interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "cyan" | "purple" | "green" | "red" | "gold" | "orange" | "god" | "ultra" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  (
    {
      children,
      className,
      variant = "cyan",
      size = "md",
      glow = false,
      loading = false,
      icon,
      iconPosition = "left",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      "relative inline-flex items-center justify-center gap-2",
      "font-display font-semibold tracking-wider uppercase",
      "transition-all duration-300",
      "border rounded-terminal",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void"
    );

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
      xl: "px-8 py-4 text-lg",
    };

    const variantStyles = {
      cyan: cn(
        "bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan",
        "hover:bg-neon-cyan/20 hover:border-neon-cyan",
        glow && "shadow-neon-cyan hover:shadow-neon-cyan-lg",
        "focus:ring-neon-cyan/50"
      ),
      purple: cn(
        "bg-neon-purple/10 border-neon-purple/50 text-neon-purple",
        "hover:bg-neon-purple/20 hover:border-neon-purple",
        glow && "shadow-neon-purple hover:shadow-neon-purple-lg",
        "focus:ring-neon-purple/50"
      ),
      green: cn(
        "bg-neon-green/10 border-neon-green/50 text-neon-green",
        "hover:bg-neon-green/20 hover:border-neon-green",
        glow && "shadow-neon-green",
        "focus:ring-neon-green/50"
      ),
      red: cn(
        "bg-neon-red/10 border-neon-red/50 text-neon-red",
        "hover:bg-neon-red/20 hover:border-neon-red",
        glow && "shadow-neon-red",
        "focus:ring-neon-red/50"
      ),
      gold: cn(
        "bg-neon-gold/10 border-neon-gold/50 text-neon-gold",
        "hover:bg-neon-gold/20 hover:border-neon-gold",
        glow && "shadow-neon-gold",
        "focus:ring-neon-gold/50"
      ),
      orange: cn(
        "bg-neon-orange/10 border-neon-orange/50 text-neon-orange",
        "hover:bg-neon-orange/20 hover:border-neon-orange",
        glow && "shadow-neon-orange",
        "focus:ring-neon-orange/50"
      ),
      god: cn(
        "bg-god-primary/20 border-god-primary text-god-secondary",
        "hover:bg-god-primary/30 hover:border-god-secondary",
        glow && "shadow-god animate-god-aura",
        "focus:ring-god-primary/50"
      ),
      ultra: cn(
        "bg-ultra-secondary/20 border-ultra-secondary text-ultra-primary",
        "hover:bg-ultra-secondary/30 hover:border-ultra-primary",
        glow && "shadow-ultra animate-ultra-aura",
        "focus:ring-ultra-secondary/50"
      ),
      ghost: cn(
        "bg-transparent border-transparent text-white/70",
        "hover:bg-white/5 hover:text-white",
        "focus:ring-white/20"
      ),
      outline: cn(
        "bg-transparent border-white/20 text-white/70",
        "hover:bg-white/5 hover:border-white/40 hover:text-white",
        "focus:ring-white/20"
      ),
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Icon left */}
        {!loading && icon && iconPosition === "left" && (
          <span className="flex-shrink-0">{icon}</span>
        )}

        {/* Text */}
        <span>{children}</span>

        {/* Icon right */}
        {!loading && icon && iconPosition === "right" && (
          <span className="flex-shrink-0">{icon}</span>
        )}

        {/* Hover glow effect */}
        <span className="absolute inset-0 rounded-terminal opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="absolute inset-0 rounded-terminal bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </span>
      </button>
    );
  }
);

NeonButton.displayName = "NeonButton";

// ═══════════════════════════════════════════════════════════════════════════════
// ICON BUTTON - Compact button for icons only
// ═══════════════════════════════════════════════════════════════════════════════

export interface IconButtonProps extends Omit<NeonButtonProps, "children" | "icon"> {
  icon: ReactNode;
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "md", className, ...props }, ref) => {
    const sizeStyles = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
      xl: "w-14 h-14",
    };

    return (
      <NeonButton
        ref={ref}
        size={size}
        className={cn(sizeStyles[size], "!p-0", className)}
        {...props}
      >
        {icon}
      </NeonButton>
    );
  }
);

IconButton.displayName = "IconButton";

// ═══════════════════════════════════════════════════════════════════════════════
// POWER BUTTON - Special animated button for God Mode / Ultra Instinct
// ═══════════════════════════════════════════════════════════════════════════════

export interface PowerButtonProps extends Omit<NeonButtonProps, "variant"> {
  powerMode: "god" | "ultra";
  active?: boolean;
}

export const PowerButton = forwardRef<HTMLButtonElement, PowerButtonProps>(
  ({ powerMode, active = false, children, className, ...props }, ref) => {
    return (
      <NeonButton
        ref={ref}
        variant={powerMode}
        glow={active}
        className={cn(
          active && "animate-power-up",
          className
        )}
        {...props}
      >
        {powerMode === "god" && "神 "}
        {powerMode === "ultra" && "極 "}
        {children}
      </NeonButton>
    );
  }
);

PowerButton.displayName = "PowerButton";

export default NeonButton;
