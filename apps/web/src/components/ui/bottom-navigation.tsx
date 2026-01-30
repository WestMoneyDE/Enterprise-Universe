"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION - Mobile bottom tab bar
// ═══════════════════════════════════════════════════════════════════════════════

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface BottomNavigationProps {
  items: NavItem[];
  className?: string;
}

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-neon-cyan/20 bg-void-dark/95 backdrop-blur-xl md:hidden",
        "safe-area-pb",
        className
      )}
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                isActive
                  ? "text-neon-cyan"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 bg-neon-cyan shadow-neon-cyan" />
              )}

              {/* Icon with badge */}
              <span className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isActive && "scale-110"
                  )}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-red px-1 text-[10px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>

              {/* Label */}
              <span className={cn("font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Safe area padding for devices with home indicator
const safeAreaStyles = `
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
`;

// Inject safe area styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = safeAreaStyles;
  document.head.appendChild(style);
}
