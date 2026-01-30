"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE SIDEBAR - Responsive sidebar wrapper with sheet on mobile
// ═══════════════════════════════════════════════════════════════════════════════

interface MobileSidebarProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  triggerClassName?: string;
}

export function MobileSidebar({
  children,
  title = "Navigation",
  className,
  triggerClassName,
}: MobileSidebarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("md:hidden", triggerClassName)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menü öffnen</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className={cn("w-[280px] p-0", className)}>
        <SheetHeader className="border-b border-neon-cyan/20 px-4 py-4">
          <SheetTitle className="text-left font-display text-neon-cyan">
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100%-73px)] overflow-y-auto" onClick={() => setOpen(false)}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Hook to detect mobile viewport
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// Responsive sidebar that shows sheet on mobile, regular sidebar on desktop
interface ResponsiveSidebarProps {
  children: React.ReactNode;
  mobileTitle?: string;
  desktopClassName?: string;
  mobileClassName?: string;
}

export function ResponsiveSidebar({
  children,
  mobileTitle,
  desktopClassName,
  mobileClassName,
}: ResponsiveSidebarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileSidebar title={mobileTitle} className={mobileClassName}>
        {children}
      </MobileSidebar>
    );
  }

  return (
    <aside className={cn("hidden md:block", desktopClassName)}>{children}</aside>
  );
}
