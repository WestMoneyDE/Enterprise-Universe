"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL LIST - High-performance virtualized list component
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: This component requires @tanstack/react-virtual to be installed.
// Run: pnpm add @tanstack/react-virtual --filter @nexus/web
// ═══════════════════════════════════════════════════════════════════════════════

import * as React from "react";
import { useVirtualizer, VirtualizerOptions } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Function to render each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Estimated size of each item in pixels */
  estimateSize: number | ((index: number) => number);
  /** Number of items to render outside visible area (default: 5) */
  overscan?: number;
  /** Height of the container (required for vertical lists) */
  height?: number | string;
  /** Width of the container (default: 100%) */
  width?: number | string;
  /** Custom className for the container */
  className?: string;
  /** Custom className for the scroll container */
  scrollClassName?: string;
  /** Gap between items in pixels */
  gap?: number;
  /** Visual variant */
  variant?: "default" | "cyber";
  /** Direction of the list */
  direction?: "vertical" | "horizontal";
  /** Loading state */
  loading?: boolean;
  /** Loading skeleton component */
  loadingSkeleton?: React.ReactNode;
  /** Empty state component */
  emptyState?: React.ReactNode;
  /** Get item key (for stable rendering) */
  getItemKey?: (index: number) => string | number;
  /** Callback when scroll reaches near the end (for infinite scroll) */
  onEndReached?: () => void;
  /** Threshold for onEndReached callback (pixels from end) */
  endReachedThreshold?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCIFI SCROLLBAR STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const sciFiScrollbarStyles = `
  /* SciFi Scrollbar - Cyber Theme */
  .scifi-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .scifi-scrollbar::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.8);
    border-radius: 4px;
    border: 1px solid rgba(0, 240, 255, 0.1);
  }

  .scifi-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(0, 240, 255, 0.4), rgba(168, 85, 247, 0.4));
    border-radius: 4px;
    border: 1px solid rgba(0, 240, 255, 0.3);
    transition: all 0.2s ease;
  }

  .scifi-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(0, 240, 255, 0.6), rgba(168, 85, 247, 0.6));
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
  }

  .scifi-scrollbar::-webkit-scrollbar-corner {
    background: rgba(10, 10, 15, 0.8);
  }

  /* Firefox */
  .scifi-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 240, 255, 0.4) rgba(10, 10, 15, 0.8);
  }

  /* Default Scrollbar */
  .default-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .default-scrollbar::-webkit-scrollbar-track {
    background: hsl(var(--muted));
    border-radius: 4px;
  }

  .default-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: 4px;
  }

  .default-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--foreground) / 0.3);
  }

  .default-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--border)) hsl(var(--muted));
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL LIST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize,
  overscan = 5,
  height = 400,
  width = "100%",
  className,
  scrollClassName,
  gap = 0,
  variant = "cyber",
  direction = "vertical",
  loading = false,
  loadingSkeleton,
  emptyState,
  getItemKey,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualListProps<T>) {
  // Inject scrollbar styles
  React.useEffect(() => {
    const styleId = "virtual-list-scrollbar-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = sciFiScrollbarStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Parent ref for the scroll container
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Track if we've already triggered onEndReached
  const endReachedRef = React.useRef(false);

  // Determine estimate size function
  const getEstimateSize = React.useCallback(
    (index: number): number => {
      if (typeof estimateSize === "function") {
        return estimateSize(index) + gap;
      }
      return estimateSize + gap;
    },
    [estimateSize, gap]
  );

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getEstimateSize,
    overscan,
    horizontal: direction === "horizontal",
    getItemKey: getItemKey
      ? (index) => getItemKey(index)
      : undefined,
  });

  // Get virtual items
  const virtualItems = virtualizer.getVirtualItems();

  // Calculate total size
  const totalSize = virtualizer.getTotalSize();

  // Handle scroll to detect end reached
  const handleScroll = React.useCallback(() => {
    if (!onEndReached || !parentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const distanceFromEnd = scrollHeight - scrollTop - clientHeight;

    if (distanceFromEnd < endReachedThreshold) {
      if (!endReachedRef.current) {
        endReachedRef.current = true;
        onEndReached();
      }
    } else {
      endReachedRef.current = false;
    }
  }, [onEndReached, endReachedThreshold]);

  // Reset endReachedRef when items change
  React.useEffect(() => {
    endReachedRef.current = false;
  }, [items.length]);

  // Loading state
  if (loading && items.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          className
        )}
        style={{ height, width }}
      >
        {loadingSkeleton || (
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "h-8 w-8 animate-spin rounded-full border-2 border-t-transparent",
                variant === "cyber"
                  ? "border-neon-cyan"
                  : "border-primary"
              )}
            />
            <span
              className={cn(
                "text-sm",
                variant === "cyber"
                  ? "text-neon-cyan/70"
                  : "text-muted-foreground"
              )}
            >
              Loading...
            </span>
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          className
        )}
        style={{ height, width }}
      >
        {emptyState || (
          <span
            className={cn(
              "text-sm",
              variant === "cyber"
                ? "text-neon-cyan/50"
                : "text-muted-foreground"
            )}
          >
            No items to display
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className={cn(
        "overflow-auto",
        variant === "cyber" ? "scifi-scrollbar" : "default-scrollbar",
        variant === "cyber" && [
          "border border-neon-cyan/20 rounded-lg",
          "bg-void-surface/50 backdrop-blur-sm",
        ],
        scrollClassName,
        className
      )}
      style={{ height, width }}
    >
      <div
        style={{
          height: direction === "vertical" ? totalSize : "100%",
          width: direction === "horizontal" ? totalSize : "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: direction === "vertical" ? "100%" : undefined,
                height: direction === "horizontal" ? "100%" : undefined,
                transform:
                  direction === "vertical"
                    ? `translateY(${virtualItem.start}px)`
                    : `translateX(${virtualItem.start}px)`,
                paddingBottom: direction === "vertical" ? gap : 0,
                paddingRight: direction === "horizontal" ? gap : 0,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>

      {/* Loading indicator at bottom for infinite scroll */}
      {loading && items.length > 0 && (
        <div
          className={cn(
            "flex justify-center py-4",
            variant === "cyber"
              ? "text-neon-cyan/70"
              : "text-muted-foreground"
          )}
        >
          <div
            className={cn(
              "h-5 w-5 animate-spin rounded-full border-2 border-t-transparent",
              variant === "cyber"
                ? "border-neon-cyan"
                : "border-primary"
            )}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL LIST ITEM - Helper component for consistent item styling
// ═══════════════════════════════════════════════════════════════════════════════

export interface VirtualListItemProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "cyber";
  onClick?: () => void;
  selected?: boolean;
  hoverable?: boolean;
}

export function VirtualListItem({
  children,
  className,
  variant = "cyber",
  onClick,
  selected,
  hoverable = true,
}: VirtualListItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "transition-all duration-200",
        variant === "cyber"
          ? cn(
              "border-b border-neon-cyan/10 px-4 py-3",
              selected && "bg-neon-cyan/15 border-l-2 border-l-neon-cyan",
              hoverable && !selected && "hover:bg-neon-cyan/5",
            )
          : cn(
              "border-b border-border px-4 py-3",
              selected && "bg-primary/10 border-l-2 border-l-primary",
              hoverable && !selected && "hover:bg-muted/50",
            ),
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USE VIRTUAL LIST HOOK - For advanced use cases
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseVirtualListOptions<T> {
  items: T[];
  estimateSize: number | ((index: number) => number);
  overscan?: number;
  horizontal?: boolean;
  getItemKey?: (index: number) => string | number;
}

export function useVirtualList<T>({
  items,
  estimateSize,
  overscan = 5,
  horizontal = false,
  getItemKey,
}: UseVirtualListOptions<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const getEstimateSize = React.useCallback(
    (index: number): number => {
      if (typeof estimateSize === "function") {
        return estimateSize(index);
      }
      return estimateSize;
    },
    [estimateSize]
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getEstimateSize,
    overscan,
    horizontal,
    getItemKey,
  });

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollToIndex: virtualizer.scrollToIndex,
    scrollToOffset: virtualizer.scrollToOffset,
  };
}
