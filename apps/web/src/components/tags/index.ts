// ===================================================================================================
// TAGS - Tag System Components
// Provides tagging and categorization functionality for the Nexus Command Center
// ===================================================================================================

// Tag Input - Adding/removing tags with autocomplete
export { TagInput, TagChip } from "./tag-input";
export type { TagInputProps, TagChipProps } from "./tag-input";

// Tag Filter - Filtering lists by tags
export { TagFilter, InlineTagFilter, filterByTags } from "./tag-filter";
export type {
  TagFilterProps,
  InlineTagFilterProps,
  MatchMode,
  TagFilterResult,
} from "./tag-filter";

// Tag Manager - Full tag management UI
export { TagManager } from "./tag-manager";
export type { TagManagerProps } from "./tag-manager";

// Re-export hook types and utilities
export type { Tag, TagColor, UseTagsReturn, UseTagsOptions } from "@/hooks/use-tags";
export { TAG_COLORS, TAG_COLOR_STYLES } from "@/hooks/use-tags";
