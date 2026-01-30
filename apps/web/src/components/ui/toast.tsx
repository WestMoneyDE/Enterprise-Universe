"use client";

import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "@/lib/design-system";

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST - Notification toasts powered by Sonner with cyberpunk styling
// ═══════════════════════════════════════════════════════════════════════════════

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-void-surface group-[.toaster]:text-foreground group-[.toaster]:border-neon-cyan/30 group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-neon-cyan group-[.toast]:text-void-dark",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:border-neon-green/50 group-[.toaster]:text-neon-green",
          error:
            "group-[.toaster]:border-neon-red/50 group-[.toaster]:text-neon-red",
          warning:
            "group-[.toaster]:border-neon-gold/50 group-[.toaster]:text-neon-gold",
          info: "group-[.toaster]:border-neon-cyan/50 group-[.toaster]:text-neon-cyan",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
