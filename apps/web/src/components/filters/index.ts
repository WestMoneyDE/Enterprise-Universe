// ===================================================================================================
// FILTERS - Saved views and filter components
// Exports all filter-related components and hooks
// ===================================================================================================

// Components
export { SavedViewsDropdown, SaveViewDialog } from "./saved-views";
export { FilterBar, CompactFilterBar } from "./filter-bar";

// Types from saved-views component
export type { SavedViewsDropdownProps, SaveViewDialogProps } from "./saved-views";

// Types from filter-bar component
export type { FilterBarProps, CompactFilterBarProps, StatusOption } from "./filter-bar";

// Re-export hook and types from hooks directory
export {
  useSavedViews,
  type EntityType,
  type SortDirection,
  type SortConfig,
  type FilterConfig,
  type SavedView,
  type UseSavedViewsOptions,
  type UseSavedViewsReturn,
} from "@/hooks/use-saved-views";
