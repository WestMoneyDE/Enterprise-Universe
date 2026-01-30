"use client";

// ===================================================================================================
// TAG FILTER - Component for filtering lists by tags
// Features: multi-select tag chips, "Any" / "All" match mode toggle, clear filter button
// ===================================================================================================

import * as React from "react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { X, Filter, RotateCcw, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Tag } from "@/hooks/use-tags";
import { TAG_COLOR_STYLES } from "@/hooks/use-tags";
import { TagChip } from "./tag-input";

// ===================================================================================================
// TYPES
// ===================================================================================================

export type MatchMode = "any" | "all";

export interface TagFilterProps {
  /** All available tags for filtering */
  availableTags: Tag[];
  /** Currently selected tag IDs for filtering */
  selectedTagIds: string[];
  /** Called when filter selection changes */
  onFilterChange: (tagIds: string[]) => void;
  /** Match mode: "any" matches items with any selected tag, "all" matches items with all selected tags */
  matchMode: MatchMode;
  /** Called when match mode changes */
  onMatchModeChange: (mode: MatchMode) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
  /** Compact mode - smaller size */
  compact?: boolean;
  /** Show usage counts for tags */
  showCounts?: boolean;
  /** Tag usage counts by tag ID */
  tagCounts?: Record<string, number>;
}

export interface TagFilterResult<T> {
  items: T[];
  matchedTagIds: string[];
}

// ===================================================================================================
// HELPER: Filter items by tags
// ===================================================================================================

export function filterByTags<T extends { tags?: Tag[] | string[] }>(
  items: T[],
  selectedTagIds: string[],
  matchMode: MatchMode,
  getItemTagIds?: (item: T) => string[]
): T[] {
  if (selectedTagIds.length === 0) return items;

  const selectedSet = new Set(selectedTagIds);

  return items.filter((item) => {
    let itemTagIds: string[];

    if (getItemTagIds) {
      itemTagIds = getItemTagIds(item);
    } else if (item.tags) {
      itemTagIds = item.tags.map((t) => (typeof t === "string" ? t : t.id));
    } else {
      return false;
    }

    if (matchMode === "any") {
      // Item matches if it has ANY of the selected tags
      return itemTagIds.some((id) => selectedSet.has(id));
    } else {
      // Item matches if it has ALL of the selected tags
      return selectedTagIds.every((id) => itemTagIds.includes(id));
    }
  });
}

// ===================================================================================================
// TAG FILTER COMPONENT
// ===================================================================================================

export function TagFilter({
  availableTags,
  selectedTagIds,
  onFilterChange,
  matchMode,
  onMatchModeChange,
  placeholder = "Filter by tags...",
  className,
  compact = false,
  showCounts = false,
  tagCounts = {},
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get selected tags
  const selectedTags = useMemo(() => {
    const idSet = new Set(selectedTagIds);
    return availableTags.filter((tag) => idSet.has(tag.id));
  }, [availableTags, selectedTagIds]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle tag selection
  const toggleTag = useCallback(
    (tagId: string) => {
      if (selectedTagIds.includes(tagId)) {
        onFilterChange(selectedTagIds.filter((id) => id !== tagId));
      } else {
        onFilterChange([...selectedTagIds, tagId]);
      }
    },
    [selectedTagIds, onFilterChange]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    onFilterChange([]);
  }, [onFilterChange]);

  // Toggle match mode
  const toggleMatchMode = useCallback(() => {
    onMatchModeChange(matchMode === "any" ? "all" : "any");
  }, [matchMode, onMatchModeChange]);

  const hasFilters = selectedTagIds.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Filter trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 border rounded-md",
          "bg-void-surface/50 border-neon-cyan/30",
          "hover:border-neon-cyan/50 hover:bg-neon-cyan/5",
          "transition-colors font-mono text-sm",
          compact ? "px-2 py-1.5" : "px-3 py-2",
          hasFilters && "border-neon-cyan/50 bg-neon-cyan/10"
        )}
      >
        <Filter className={cn("text-neon-cyan/70", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />

        {hasFilters ? (
          <div className="flex items-center gap-1.5">
            <span className={cn("text-neon-cyan", compact ? "text-xs" : "text-sm")}>
              {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? "s" : ""}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider",
                matchMode === "any"
                  ? "bg-neon-purple/20 text-neon-purple"
                  : "bg-neon-green/20 text-neon-green"
              )}
            >
              {matchMode}
            </span>
          </div>
        ) : (
          <span className={cn("text-white/50", compact ? "text-xs" : "text-sm")}>
            {placeholder}
          </span>
        )}

        <ChevronDown
          className={cn(
            "text-neon-cyan/50 transition-transform",
            compact ? "h-3 w-3" : "h-4 w-4",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-72 mt-1",
            "bg-void-surface/95 backdrop-blur-xl border border-neon-cyan/30 rounded-md",
            "shadow-[0_0_20px_rgba(0,240,255,0.1)]"
          )}
        >
          {/* Header with match mode toggle */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-neon-cyan/20">
            <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
              Filter Tags
            </span>

            {/* Match mode toggle */}
            <button
              type="button"
              onClick={toggleMatchMode}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider",
                "border transition-all",
                matchMode === "any"
                  ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30 hover:bg-neon-purple/30"
                  : "bg-neon-green/20 text-neon-green border-neon-green/30 hover:bg-neon-green/30"
              )}
              title={
                matchMode === "any"
                  ? "Match items with ANY selected tag"
                  : "Match items with ALL selected tags"
              }
            >
              <span>{matchMode === "any" ? "Match Any" : "Match All"}</span>
            </button>
          </div>

          {/* Selected tags */}
          {selectedTags.length > 0 && (
            <div className="px-3 py-2 border-b border-neon-cyan/20">
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    onRemove={() => toggleTag(tag.id)}
                    showGlow
                    size="sm"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tag list */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {availableTags.length > 0 ? (
              availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                const styles = TAG_COLOR_STYLES[tag.color];
                const count = tagCounts[tag.id] ?? 0;

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-left",
                      "text-sm font-mono transition-colors",
                      isSelected
                        ? "bg-neon-cyan/10 text-white"
                        : "text-white/70 hover:bg-neon-cyan/5 hover:text-white"
                    )}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center",
                        "transition-all",
                        isSelected
                          ? cn(styles.bg, styles.border, styles.glow)
                          : "border-white/30 bg-transparent"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>

                    {/* Color dot */}
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        styles.bg,
                        styles.border,
                        "border"
                      )}
                    />

                    {/* Tag name */}
                    <span className="flex-1 truncate">{tag.name}</span>

                    {/* Count */}
                    {showCounts && (
                      <span className="text-[10px] text-white/40">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-white/50 font-mono">
                No tags available
              </div>
            )}
          </div>

          {/* Footer with clear button */}
          {hasFilters && (
            <div className="px-3 py-2 border-t border-neon-cyan/20">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full gap-1.5 text-white/60 hover:text-white font-mono text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================================================================================================
// INLINE TAG FILTER - Horizontal chip-based filter
// ===================================================================================================

export interface InlineTagFilterProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onFilterChange: (tagIds: string[]) => void;
  matchMode?: MatchMode;
  onMatchModeChange?: (mode: MatchMode) => void;
  className?: string;
}

export function InlineTagFilter({
  availableTags,
  selectedTagIds,
  onFilterChange,
  matchMode = "any",
  onMatchModeChange,
  className,
}: InlineTagFilterProps) {
  const toggleTag = useCallback(
    (tagId: string) => {
      if (selectedTagIds.includes(tagId)) {
        onFilterChange(selectedTagIds.filter((id) => id !== tagId));
      } else {
        onFilterChange([...selectedTagIds, tagId]);
      }
    },
    [selectedTagIds, onFilterChange]
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Filter icon */}
      <div className="flex items-center gap-1.5 text-neon-cyan/50">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-[10px] font-mono uppercase tracking-wider">Tags:</span>
      </div>

      {/* Tag chips */}
      {availableTags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id);
        const styles = TAG_COLOR_STYLES[tag.color];

        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border",
              "text-[10px] font-mono uppercase tracking-wider",
              "transition-all duration-200",
              isSelected
                ? cn(styles.bg, styles.text, styles.border, styles.glow)
                : "bg-transparent text-white/50 border-white/20 hover:bg-white/5 hover:text-white/70"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isSelected ? "bg-current" : styles.bg
              )}
            />
            {tag.name}
          </button>
        );
      })}

      {/* Match mode toggle */}
      {onMatchModeChange && selectedTagIds.length > 1 && (
        <button
          type="button"
          onClick={() => onMatchModeChange(matchMode === "any" ? "all" : "any")}
          className={cn(
            "px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider",
            "border transition-all ml-2",
            matchMode === "any"
              ? "bg-neon-purple/10 text-neon-purple border-neon-purple/30"
              : "bg-neon-green/10 text-neon-green border-neon-green/30"
          )}
        >
          {matchMode}
        </button>
      )}

      {/* Clear button */}
      {selectedTagIds.length > 0 && (
        <button
          type="button"
          onClick={() => onFilterChange([])}
          className="text-white/40 hover:text-white/70 transition-colors ml-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default TagFilter;
