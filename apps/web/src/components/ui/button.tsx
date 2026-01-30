import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON - Cyberpunk styled button with multiple variants
// ═══════════════════════════════════════════════════════════════════════════════

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Cyberpunk neon variants
        cyan: "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan/20 hover:shadow-neon-cyan",
        purple:
          "bg-neon-purple/10 text-neon-purple border border-neon-purple/50 hover:bg-neon-purple/20 hover:shadow-neon-purple",
        green:
          "bg-neon-green/10 text-neon-green border border-neon-green/50 hover:bg-neon-green/20 hover:shadow-neon-green",
        red: "bg-neon-red/10 text-neon-red border border-neon-red/50 hover:bg-neon-red/20 hover:shadow-neon-red",
        gold: "bg-neon-gold/10 text-neon-gold border border-neon-gold/50 hover:bg-neon-gold/20 hover:shadow-neon-gold",
        god: "bg-god-primary/10 text-god-secondary border border-god-primary/50 hover:bg-god-primary/20 hover:shadow-god animate-god-aura",
        ultra:
          "bg-ultra-secondary/10 text-ultra-primary border border-ultra-secondary/50 hover:bg-ultra-secondary/20 hover:shadow-ultra animate-ultra-aura",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
