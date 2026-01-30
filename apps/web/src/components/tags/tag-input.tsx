"use client";

// ===================================================================================================
// TAG INPUT - Component for adding/removing tags with autocomplete
// Features: autocomplete dropdown, create new tag inline, color picker, tag chips with remove
// ===================================================================================================

import * as React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { X, Plus, ChevronDown, Tag as TagIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tag, TagColor } from "@/hooks/use-tags";
import { TAG_COLORS, TAG_COLOR_STYLES } from "@/hooks/use-tags";

// ===================================================================================================
// TYPES
// ===================================================================================================

export interface TagInputProps {
  /** Currently selected tags */
  selectedTags: Tag[];
  /** All available tags for autocomplete */
  availableTags: Tag[];
  /** Called when a tag is added */
  onAddTag: (tagId: string) => void;
  /** Called when a tag is removed */
  onRemoveTag: (tagId: string) => void;
  /** Called when creating a new tag - returns the new tag */
  onCreateTag?: (name: string, color: TagColor) => Tag;
  /** Placeholder text */
  placeholder?: string;
  /** Disable input */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Show glow effects on tags */
  showGlow?: boolean;
}

// ===================================================================================================
// COLOR PICKER COMPONENT
// ===================================================================================================

interface ColorPickerProps {
  selectedColor: TagColor;
  onSelectColor: (color: TagColor) => void;
  className?: string;
}

function ColorPicker({ selectedColor, onSelectColor, className }: ColorPickerProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {TAG_COLORS.map((color) => {
        const styles = TAG_COLOR_STYLES[color];
        return (
          <button
            key={color}
            type="button"
            onClick={() => onSelectColor(color)}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-all duration-200",
              styles.bg,
              styles.border,
              selectedColor === color
                ? cn("scale-110", styles.glow)
                : "opacity-60 hover:opacity-100 hover:scale-105"
            )}
            title={color.charAt(0).toUpperCase() + color.slice(1)}
          />
        );
      })}
    </div>
  );
}

// ===================================================================================================
// TAG CHIP COMPONENT
// ===================================================================================================

export interface TagChipProps {
  tag: Tag;
  onRemove?: () => void;
  showGlow?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function TagChip({ tag, onRemove, showGlow = false, size = "md", className }: TagChipProps) {
  const styles = TAG_COLOR_STYLES[tag.color];

  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-mono uppercase tracking-wider",
        "transition-all duration-200",
        styles.bg,
        styles.text,
        styles.border,
        showGlow && styles.glow,
        sizeStyles[size],
        className
      )}
    >
      <TagIcon className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
      <span className="max-w-[120px] truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "rounded-sm hover:bg-white/20 transition-colors",
            size === "sm" ? "-mr-0.5 p-0.5" : "-mr-1 p-0.5"
          )}
        >
          <X className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
        </button>
      )}
    </span>
  );
}

// ===================================================================================================
// TAG INPUT COMPONENT
// ===================================================================================================

export function TagInput({
  selectedTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  placeholder = "Add tags...",
  disabled = false,
  className,
  maxTags,
  showGlow = true,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagColor, setNewTagColor] = useState<TagColor>("cyan");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter available tags based on input and exclude already selected
  const filteredTags = React.useMemo(() => {
    const selectedIds = new Set(selectedTags.map((t) => t.id));
    const lowerInput = inputValue.toLowerCase().trim();

    return availableTags
      .filter((tag) => !selectedIds.has(tag.id))
      .filter((tag) => !lowerInput || tag.name.toLowerCase().includes(lowerInput));
  }, [availableTags, selectedTags, inputValue]);

  // Check if input matches an existing tag exactly
  const exactMatch = React.useMemo(() => {
    const lowerInput = inputValue.toLowerCase().trim();
    return filteredTags.find((tag) => tag.name.toLowerCase() === lowerInput);
  }, [filteredTags, inputValue]);

  // Can create a new tag?
  const canCreateNew = React.useMemo(() => {
    if (!onCreateTag || !inputValue.trim()) return false;
    const lowerInput = inputValue.toLowerCase().trim();
    return !availableTags.some((tag) => tag.name.toLowerCase() === lowerInput);
  }, [onCreateTag, inputValue, availableTags]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  }, []);

  // Handle tag selection
  const handleSelectTag = useCallback(
    (tag: Tag) => {
      onAddTag(tag.id);
      setInputValue("");
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onAddTag]
  );

  // Handle create new tag
  const handleCreateTag = useCallback(() => {
    if (!onCreateTag || !inputValue.trim()) return;

    const newTag = onCreateTag(inputValue.trim(), newTagColor);
    onAddTag(newTag.id);
    setInputValue("");
    setIsCreating(false);
    setIsOpen(false);
    setNewTagColor("cyan");
    inputRef.current?.focus();
  }, [onCreateTag, inputValue, newTagColor, onAddTag]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setIsOpen(true);
          return;
        }
      }

      const totalItems = filteredTags.length + (canCreateNew ? 1 : 0);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (isCreating) {
            handleCreateTag();
          } else if (highlightedIndex >= 0 && highlightedIndex < filteredTags.length) {
            handleSelectTag(filteredTags[highlightedIndex]);
          } else if (highlightedIndex === filteredTags.length && canCreateNew) {
            setIsCreating(true);
          } else if (exactMatch) {
            handleSelectTag(exactMatch);
          } else if (canCreateNew) {
            setIsCreating(true);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setIsCreating(false);
          setHighlightedIndex(-1);
          break;
        case "Backspace":
          if (!inputValue && selectedTags.length > 0) {
            onRemoveTag(selectedTags[selectedTags.length - 1].id);
          }
          break;
      }
    },
    [
      isOpen,
      filteredTags,
      canCreateNew,
      highlightedIndex,
      isCreating,
      handleCreateTag,
      handleSelectTag,
      exactMatch,
      inputValue,
      selectedTags,
      onRemoveTag,
    ]
  );

  const isAtMaxTags = maxTags !== undefined && selectedTags.length >= maxTags;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input container with tag chips */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-2",
          "bg-void-surface/50 border border-neon-cyan/30 rounded-md",
          "focus-within:border-neon-cyan focus-within:ring-1 focus-within:ring-neon-cyan/50",
          "transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Selected tag chips */}
        {selectedTags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            onRemove={() => onRemoveTag(tag.id)}
            showGlow={showGlow}
            size="sm"
          />
        ))}

        {/* Input field */}
        {!isAtMaxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length === 0 ? placeholder : ""}
            disabled={disabled}
            className={cn(
              "flex-1 min-w-[80px] bg-transparent border-none outline-none",
              "text-sm font-mono text-neon-cyan placeholder:text-neon-cyan/30",
              disabled && "cursor-not-allowed"
            )}
          />
        )}

        {/* Dropdown trigger */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="text-neon-cyan/50 hover:text-neon-cyan transition-colors"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 w-full mt-1 py-1",
            "bg-void-surface/95 backdrop-blur-xl border border-neon-cyan/30 rounded-md",
            "shadow-[0_0_20px_rgba(0,240,255,0.1)]",
            "max-h-[240px] overflow-y-auto"
          )}
        >
          {/* Create new tag mode */}
          {isCreating ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs text-neon-cyan/70 font-mono uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                Create New Tag
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex-1 px-3 py-1.5 text-sm font-mono rounded-md border",
                    TAG_COLOR_STYLES[newTagColor].bg,
                    TAG_COLOR_STYLES[newTagColor].text,
                    TAG_COLOR_STYLES[newTagColor].border
                  )}
                >
                  {inputValue}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider">
                  Select Color
                </div>
                <ColorPicker
                  selectedColor={newTagColor}
                  onSelectColor={setNewTagColor}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="cyan"
                  size="sm"
                  onClick={handleCreateTag}
                  className="flex-1 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Tag
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Existing tags */}
              {filteredTags.length > 0 ? (
                filteredTags.map((tag, index) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleSelectTag(tag)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left",
                      "text-sm font-mono transition-colors",
                      highlightedIndex === index
                        ? "bg-neon-cyan/10 text-neon-cyan"
                        : "text-white/70 hover:bg-neon-cyan/5 hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        TAG_COLOR_STYLES[tag.color].bg,
                        TAG_COLOR_STYLES[tag.color].border,
                        "border"
                      )}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                  </button>
                ))
              ) : inputValue ? (
                <div className="px-3 py-2 text-xs text-white/50 font-mono">
                  No matching tags found
                </div>
              ) : (
                <div className="px-3 py-2 text-xs text-white/50 font-mono">
                  No tags available
                </div>
              )}

              {/* Create new option */}
              {canCreateNew && (
                <>
                  <div className="mx-2 my-1 h-px bg-neon-cyan/20" />
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2",
                      "text-sm font-mono transition-colors",
                      highlightedIndex === filteredTags.length
                        ? "bg-neon-purple/10 text-neon-purple"
                        : "text-neon-purple/70 hover:bg-neon-purple/5 hover:text-neon-purple"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create &quot;{inputValue}&quot;</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Max tags indicator */}
      {maxTags && (
        <div className="mt-1 text-[10px] font-mono text-white/40">
          {selectedTags.length} / {maxTags} tags
        </div>
      )}
    </div>
  );
}

export default TagInput;
