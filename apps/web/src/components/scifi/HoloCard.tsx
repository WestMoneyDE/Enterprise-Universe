"use client";

import { forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// HOLO CARD - Holographic Card Component
// Cyberpunk Neon Design with glass morphism and glow effects
// ═══════════════════════════════════════════════════════════════════════════════

export interface HoloCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "cyan" | "purple" | "gold" | "god" | "ultra";
  glow?: boolean;
  animated?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
}

const HoloCard = forwardRef<HTMLDivElement, HoloCardProps>(
  (
    {
      children,
      className,
      variant = "default",
      glow = false,
      animated = false,
      header,
      footer,
      icon,
      title,
      subtitle,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: "border-neon-cyan/20 hover:border-neon-cyan/40",
      cyan: "border-neon-cyan/30 hover:border-neon-cyan/60",
      purple: "border-neon-purple/30 hover:border-neon-purple/60",
      gold: "border-neon-gold/30 hover:border-neon-gold/60",
      god: "border-god-primary/40 hover:border-god-primary/70",
      ultra: "border-ultra-secondary/40 hover:border-ultra-secondary/70",
    };

    const glowStyles = {
      default: glow ? "shadow-holo" : "",
      cyan: glow ? "shadow-neon-cyan" : "",
      purple: glow ? "shadow-neon-purple" : "",
      gold: glow ? "shadow-neon-gold" : "",
      god: glow ? "shadow-god animate-god-aura" : "",
      ultra: glow ? "shadow-ultra animate-ultra-aura" : "",
    };

    const iconColors = {
      default: "text-neon-cyan",
      cyan: "text-neon-cyan",
      purple: "text-neon-purple",
      gold: "text-neon-gold",
      god: "text-god-primary",
      ultra: "text-ultra-primary",
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "relative overflow-hidden rounded-holo",
          "bg-void-surface/90 backdrop-blur-holo",
          "border transition-all duration-300",

          // Variant styles
          variantStyles[variant],
          glowStyles[variant],

          // Animation
          animated && "animate-float",

          className
        )}
        {...props}
      >
        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/5 to-transparent animate-scan-line opacity-50" />
        </div>

        {/* Header */}
        {(header || title || icon) && (
          <div className="relative z-10 flex items-center gap-3 px-4 py-3 border-b border-white/5">
            {icon && (
              <div className={cn("text-xl", iconColors[variant])}>
                {icon}
              </div>
            )}
            {(title || subtitle) && (
              <div className="flex flex-col">
                {title && (
                  <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-white/50 font-mono">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {header && <div className="ml-auto">{header}</div>}
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 p-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="relative z-10 px-4 py-3 border-t border-white/5">
            {footer}
          </div>
        )}

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-neon-cyan/30" />
        <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-neon-cyan/30" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-neon-cyan/30" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-neon-cyan/30" />
      </div>
    );
  }
);

HoloCard.displayName = "HoloCard";

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD - Specialized card for displaying statistics
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatCardProps extends Omit<HoloCardProps, 'children'> {
  value: string | number;
  label: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  status?: "online" | "offline" | "warning" | "critical";
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ value, label, trend, trendValue, status, icon, variant = "cyan", ...props }, ref) => {
    const trendColors = {
      up: "text-neon-green",
      down: "text-neon-red",
      neutral: "text-white/50",
    };

    const statusColors = {
      online: "bg-neon-green",
      offline: "bg-white/30",
      warning: "bg-neon-orange",
      critical: "bg-neon-red animate-pulse",
    };

    return (
      <HoloCard ref={ref} variant={variant} {...props}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {status && (
                <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
              )}
              <span className="text-xs text-white/50 font-mono uppercase tracking-wider">
                {label}
              </span>
            </div>
            <div className="font-display text-3xl font-bold text-white tracking-wide">
              {value}
            </div>
            {trend && trendValue && (
              <div className={cn("text-xs font-mono flex items-center gap-1", trendColors[trend])}>
                {trend === "up" && "▲"}
                {trend === "down" && "▼"}
                {trend === "neutral" && "●"}
                {trendValue}
              </div>
            )}
          </div>
          {icon && (
            <div className="text-2xl text-neon-cyan/50">
              {icon}
            </div>
          )}
        </div>
      </HoloCard>
    );
  }
);

StatCard.displayName = "StatCard";

export default HoloCard;
