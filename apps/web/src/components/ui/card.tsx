import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// CARD - Flexible card component with cyberpunk variants
// ═══════════════════════════════════════════════════════════════════════════════

const cardVariants = cva("rounded-xl border text-card-foreground", {
  variants: {
    variant: {
      default: "bg-card shadow-sm",
      ghost: "border-transparent",
      outline: "bg-transparent",
      // Cyberpunk variants
      holo: "bg-void-surface/80 backdrop-blur-holo border-neon-cyan/30 shadow-holo",
      cyan: "bg-void-surface/90 backdrop-blur-sm border-neon-cyan/50 shadow-neon-cyan",
      purple: "bg-void-surface/90 backdrop-blur-sm border-neon-purple/50 shadow-neon-purple",
      gold: "bg-void-surface/90 backdrop-blur-sm border-neon-gold/50 shadow-neon-gold",
      god: "bg-void-surface/90 backdrop-blur-sm border-god-primary/50 shadow-god",
      ultra: "bg-void-surface/90 backdrop-blur-sm border-ultra-secondary/50 shadow-ultra",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
