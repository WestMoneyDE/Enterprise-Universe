"use client";

// ===================================================================================================
// FILTER BAR - Common filter controls with SciFi styling
// Text search, date range picker, status/stage dropdown, clear and save buttons
// ===================================================================================================

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import {
  Search,
  X,
  Calendar,
  ChevronDown,
  Save,
  Filter,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FilterConfig, EntityType } from "@/hooks/use-saved-views";

// ===================================================================================================
// TYPES
// ===================================================================================================

export interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterBarProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  onSaveView: () => void;
  onClearFilters: () => void;
  entityType: EntityType;
  statusOptions?: StatusOption[];
  stageOptions?: StatusOption[];
  showDateRange?: boolean;
  showStatus?: boolean;
  showStage?: boolean;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

// ===================================================================================================
// DEFAULT OPTIONS BY ENTITY TYPE
// ===================================================================================================

const DEFAULT_STATUS_OPTIONS: Record<EntityType, StatusOption[]> = {
  contacts: [
    { value: "active", label: "Active", color: "neon-green" },
    { value: "inactive", label: "Inactive", color: "white/50" },
    { value: "lead", label: "Lead", color: "neon-cyan" },
    { value: "customer", label: "Customer", color: "neon-purple" },
    { value: "archived", label: "Archived", color: "white/30" },
  ],
  deals: [
    { value: "open", label: "Open", color: "neon-cyan" },
    { value: "won", label: "Won", color: "neon-green" },
    { value: "lost", label: "Lost", color: "neon-red" },
    { value: "stalled", label: "Stalled", color: "neon-gold" },
  ],
  projects: [
    { value: "planning", label: "Planning", color: "neon-purple" },
    { value: "active", label: "Active", color: "neon-cyan" },
    { value: "on-hold", label: "On Hold", color: "neon-gold" },
    { value: "completed", label: "Completed", color: "neon-green" },
    { value: "cancelled", label: "Cancelled", color: "neon-red" },
  ],
};

const DEFAULT_STAGE_OPTIONS: Record<EntityType, StatusOption[]> = {
  contacts: [],
  deals: [
    { value: "qualification", label: "Qualification", color: "neon-cyan" },
    { value: "proposal", label: "Proposal", color: "neon-purple" },
    { value: "negotiation", label: "Negotiation", color: "neon-gold" },
    { value: "closing", label: "Closing", color: "neon-green" },
  ],
  projects: [
    { value: "initiation", label: "Initiation", color: "neon-cyan" },
    { value: "design", label: "Design", color: "neon-purple" },
    { value: "development", label: "Development", color: "neon-gold" },
    { value: "testing", label: "Testing", color: "neon-orange" },
    { value: "deployment", label: "Deployment", color: "neon-green" },
  ],
};

// ===================================================================================================
// FILTER BAR COMPONENT
// ===================================================================================================

export function FilterBar({
  filters,
  onFiltersChange,
  onSaveView,
  onClearFilters,
  entityType,
  statusOptions,
  stageOptions,
  showDateRange = true,
  showStatus = true,
  showStage = false,
  placeholder,
  className,
  children,
}: FilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");

  // Get options with defaults
  const effectiveStatusOptions =
    statusOptions || DEFAULT_STATUS_OPTIONS[entityType];
  const effectiveStageOptions =
    stageOptions || DEFAULT_STAGE_OPTIONS[entityType];

  // Sync search value with filters
  useEffect(() => {
    setSearchValue(filters.search || "");
  }, [filters.search]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (filters.search || "")) {
        onFiltersChange({ ...filters, search: searchValue || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, filters, onFiltersChange]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
    },
    []
  );

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchValue("");
    onFiltersChange({ ...filters, search: undefined });
  }, [filters, onFiltersChange]);

  // Handle status change
  const handleStatusChange = useCallback(
    (value: string | undefined) => {
      onFiltersChange({ ...filters, status: value });
    },
    [filters, onFiltersChange]
  );

  // Handle stage change
  const handleStageChange = useCallback(
    (value: string | undefined) => {
      onFiltersChange({ ...filters, stage: value });
    },
    [filters, onFiltersChange]
  );

  // Handle date from change
  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({
        ...filters,
        dateFrom: e.target.value || undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // Handle date to change
  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({
        ...filters,
        dateTo: e.target.value || undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== undefined && value !== "" && key !== "search"
  ).length;

  // Get selected status/stage labels
  const selectedStatus = effectiveStatusOptions.find(
    (opt) => opt.value === filters.status
  );
  const selectedStage = effectiveStageOptions.find(
    (opt) => opt.value === filters.stage
  );

  const defaultPlaceholder =
    placeholder ||
    `Search ${entityType === "contacts" ? "contacts" : entityType === "deals" ? "deals" : "projects"}...`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 p-4",
        "bg-void-surface/50 border border-neon-cyan/20 rounded-lg",
        "backdrop-blur-sm",
        className
      )}
    >
      {/* Filter Icon */}
      <div className="flex items-center gap-2 text-neon-cyan/70">
        <Filter className="h-4 w-4" />
        {activeFilterCount > 0 && (
          <span className="font-mono text-xs bg-neon-cyan/20 px-1.5 py-0.5 rounded">
            {activeFilterCount}
          </span>
        )}
      </div>

      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-cyan/50" />
        <Input
          type="text"
          variant="cyber"
          value={searchValue}
          onChange={handleSearchChange}
          placeholder={defaultPlaceholder}
          className="pl-9 pr-9 font-mono text-sm h-9"
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status Dropdown */}
      {showStatus && effectiveStatusOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2 font-mono text-xs border border-neon-cyan/30 hover:border-neon-cyan/50",
                "bg-void-surface/50 hover:bg-neon-cyan/10",
                filters.status && "bg-neon-cyan/10 text-neon-cyan"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  selectedStatus?.color
                    ? `bg-${selectedStatus.color}`
                    : "bg-white/30"
                )}
              />
              {selectedStatus?.label || "Status"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent variant="cyber" align="start">
            <DropdownMenuItem
              onClick={() => handleStatusChange(undefined)}
              className="text-white/70 hover:bg-neon-cyan/10"
            >
              All Statuses
            </DropdownMenuItem>
            {effectiveStatusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={cn(
                  "hover:bg-neon-cyan/10",
                  filters.status === option.value && "bg-neon-cyan/20"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    option.color ? `bg-${option.color}` : "bg-white/30"
                  )}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Stage Dropdown */}
      {showStage && effectiveStageOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2 font-mono text-xs border border-neon-cyan/30 hover:border-neon-cyan/50",
                "bg-void-surface/50 hover:bg-neon-cyan/10",
                filters.stage && "bg-neon-cyan/10 text-neon-cyan"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  selectedStage?.color
                    ? `bg-${selectedStage.color}`
                    : "bg-white/30"
                )}
              />
              {selectedStage?.label || "Stage"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent variant="cyber" align="start">
            <DropdownMenuItem
              onClick={() => handleStageChange(undefined)}
              className="text-white/70 hover:bg-neon-cyan/10"
            >
              All Stages
            </DropdownMenuItem>
            {effectiveStageOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleStageChange(option.value)}
                className={cn(
                  "hover:bg-neon-cyan/10",
                  filters.stage === option.value && "bg-neon-cyan/20"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    option.color ? `bg-${option.color}` : "bg-white/30"
                  )}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Date Range */}
      {showDateRange && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neon-cyan/50" />
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={handleDateFromChange}
              className={cn(
                "h-9 pl-8 pr-2 text-xs font-mono rounded-md",
                "bg-void-surface/50 border border-neon-cyan/30",
                "text-white/80 placeholder:text-white/30",
                "focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50",
                "transition-colors",
                "[color-scheme:dark]"
              )}
            />
          </div>
          <span className="text-white/30 text-xs">to</span>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neon-cyan/50" />
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={handleDateToChange}
              className={cn(
                "h-9 pl-8 pr-2 text-xs font-mono rounded-md",
                "bg-void-surface/50 border border-neon-cyan/30",
                "text-white/80 placeholder:text-white/30",
                "focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50",
                "transition-colors",
                "[color-scheme:dark]"
              )}
            />
          </div>
        </div>
      )}

      {/* Custom filter children */}
      {children}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1.5 text-white/60 hover:text-white font-mono text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        {/* Save View */}
        <Button
          variant="cyan"
          size="sm"
          onClick={onSaveView}
          className="gap-1.5 font-mono text-xs"
        >
          <Save className="h-3.5 w-3.5" />
          Save View
        </Button>
      </div>
    </div>
  );
}

// ===================================================================================================
// COMPACT FILTER BAR - Smaller variant for tight spaces
// ===================================================================================================

export interface CompactFilterBarProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  placeholder?: string;
  className?: string;
}

export function CompactFilterBar({
  filters,
  onFiltersChange,
  placeholder = "Search...",
  className,
}: CompactFilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");

  useEffect(() => {
    setSearchValue(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (filters.search || "")) {
        onFiltersChange({ ...filters, search: searchValue || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, filters, onFiltersChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-cyan/50" />
      <Input
        type="text"
        variant="cyber"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9 font-mono text-sm h-9"
      />
      {searchValue && (
        <button
          onClick={() => {
            setSearchValue("");
            onFiltersChange({ ...filters, search: undefined });
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ===================================================================================================
// EXPORTS
// ===================================================================================================

export default FilterBar;
