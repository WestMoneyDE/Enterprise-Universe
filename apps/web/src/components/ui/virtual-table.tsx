"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL TABLE - High-performance virtualized table component
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: This component requires @tanstack/react-virtual to be installed.
// Run: pnpm add @tanstack/react-virtual --filter @nexus/web
// ═══════════════════════════════════════════════════════════════════════════════

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Trash2,
  Download,
  UserPlus,
  X,
  Check,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Button } from "./button";
import { Skeleton } from "./skeleton";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VirtualTableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;
  className?: string;
  width?: string;
  minWidth?: string;
}

export type BulkActionType = "delete" | "export" | "assign" | string;

export interface BulkAction {
  type: BulkActionType;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "cyan" | "purple";
}

export interface VirtualTableProps<T> {
  /** Data array to display */
  data: T[];
  /** Column definitions */
  columns: VirtualTableColumn<T>[];
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Visual variant */
  variant?: "default" | "cyber";
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Custom className */
  className?: string;
  /** Row height for virtualization (default: 52) */
  rowHeight?: number;
  /** Number of rows to render outside visible area (default: 5) */
  overscan?: number;
  /** Table height (default: 500) */
  height?: number | string;
  /** Enable row selection */
  selectable?: boolean;
  /** Key to use for row identification */
  rowKey?: keyof T | ((row: T) => string | number);
  /** Bulk action handler */
  onBulkAction?: (action: BulkActionType, selectedRows: T[]) => void;
  /** Bulk action definitions */
  bulkActions?: BulkAction[];
  /** Controlled selected rows */
  selectedRows?: T[];
  /** Selection change handler */
  onSelectionChange?: (selectedRows: T[]) => void;
  /** End reached callback for infinite scroll */
  onEndReached?: () => void;
  /** Threshold for triggering onEndReached */
  endReachedThreshold?: number;
  /** Show search/filter input */
  showFilter?: boolean;
  /** Sticky header (always visible when scrolling) */
  stickyHeader?: boolean;
}

// Default bulk actions
const defaultBulkActions: BulkAction[] = [
  { type: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" />, variant: "destructive" },
  { type: "export", label: "Export", icon: <Download className="h-4 w-4" />, variant: "cyan" },
  { type: "assign", label: "Assign", icon: <UserPlus className="h-4 w-4" />, variant: "purple" },
];

type SortDirection = "asc" | "desc" | null;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getRowKey<T>(row: T, rowKey?: keyof T | ((row: T) => string | number), index?: number): string | number {
  if (!rowKey) return index ?? 0;
  if (typeof rowKey === "function") return rowKey(row);
  return row[rowKey] as string | number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION CHECKBOX
// ═══════════════════════════════════════════════════════════════════════════════

interface SelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  variant?: "default" | "cyber";
  disabled?: boolean;
}

function SelectionCheckbox({ checked, indeterminate, onChange, variant = "cyber", disabled }: SelectionCheckboxProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      disabled={disabled}
      className={cn(
        "relative h-5 w-5 rounded border-2 transition-all duration-200 flex items-center justify-center",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent",
        variant === "cyber"
          ? cn(
              "border-neon-cyan/50 bg-void-elevated/50",
              "hover:border-neon-cyan hover:shadow-[0_0_8px_rgba(0,255,255,0.3)]",
              "focus:ring-neon-cyan/50",
              checked && "border-neon-cyan bg-neon-cyan/20 shadow-[0_0_10px_rgba(0,255,255,0.4)]",
              indeterminate && "border-neon-cyan bg-neon-cyan/10"
            )
          : cn(
              "border-border bg-background",
              "hover:border-primary",
              "focus:ring-primary/50",
              checked && "border-primary bg-primary/20",
              indeterminate && "border-primary bg-primary/10"
            ),
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {checked && !indeterminate && (
        <Check className={cn("h-3 w-3", variant === "cyber" ? "text-neon-cyan" : "text-primary")} />
      )}
      {indeterminate && (
        <Minus className={cn("h-3 w-3", variant === "cyber" ? "text-neon-cyan" : "text-primary")} />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION TOOLBAR
// ═══════════════════════════════════════════════════════════════════════════════

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: BulkActionType) => void;
  bulkActions: BulkAction[];
  variant?: "default" | "cyber";
}

function SelectionToolbar({
  selectedCount,
  totalCount,
  onClearSelection,
  onBulkAction,
  bulkActions,
  variant = "cyber",
}: SelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-lg border animate-in slide-in-from-top-2 duration-200",
        variant === "cyber"
          ? "bg-neon-cyan/10 border-neon-cyan/30 shadow-[0_0_15px_rgba(0,255,255,0.15)]"
          : "bg-primary/10 border-primary/30"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-sm font-medium",
            variant === "cyber" ? "text-neon-cyan" : "text-primary"
          )}
        >
          {selectedCount} of {totalCount} selected
        </span>
        <button
          onClick={onClearSelection}
          className={cn(
            "flex items-center gap-1 text-xs transition-colors",
            variant === "cyber"
              ? "text-neon-cyan/70 hover:text-neon-cyan"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {bulkActions.map((action) => (
          <Button
            key={action.type}
            size="sm"
            variant={
              action.variant === "destructive"
                ? "destructive"
                : action.variant === "cyan"
                ? "cyan"
                : action.variant === "purple"
                ? "purple"
                : variant === "cyber"
                ? "cyan"
                : "outline"
            }
            onClick={() => onBulkAction(action.type)}
            className="gap-1.5"
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCIFI SCROLLBAR STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const sciFiScrollbarStyles = `
  .virtual-table-scifi-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .virtual-table-scifi-scrollbar::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.8);
    border-radius: 4px;
    border: 1px solid rgba(0, 240, 255, 0.1);
  }

  .virtual-table-scifi-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(0, 240, 255, 0.4), rgba(168, 85, 247, 0.4));
    border-radius: 4px;
    border: 1px solid rgba(0, 240, 255, 0.3);
    transition: all 0.2s ease;
  }

  .virtual-table-scifi-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(0, 240, 255, 0.6), rgba(168, 85, 247, 0.6));
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
  }

  .virtual-table-scifi-scrollbar::-webkit-scrollbar-corner {
    background: rgba(10, 10, 15, 0.8);
  }

  .virtual-table-scifi-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 240, 255, 0.4) rgba(10, 10, 15, 0.8);
  }

  .virtual-table-default-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .virtual-table-default-scrollbar::-webkit-scrollbar-track {
    background: hsl(var(--muted));
    border-radius: 4px;
  }

  .virtual-table-default-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: 4px;
  }

  .virtual-table-default-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--foreground) / 0.3);
  }

  .virtual-table-default-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--border)) hsl(var(--muted));
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function VirtualTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  emptyMessage = "No data available",
  variant = "cyber",
  onRowClick,
  className,
  rowHeight = 52,
  overscan = 5,
  height = 500,
  selectable = false,
  rowKey,
  onBulkAction,
  bulkActions = defaultBulkActions,
  selectedRows: controlledSelectedRows,
  onSelectionChange,
  onEndReached,
  endReachedThreshold = 200,
  showFilter = true,
  stickyHeader = true,
}: VirtualTableProps<T>) {
  // Inject scrollbar styles
  React.useEffect(() => {
    const styleId = "virtual-table-scrollbar-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = sciFiScrollbarStyles;
      document.head.appendChild(style);
    }
  }, []);

  // State
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const [filter, setFilter] = React.useState("");
  const [internalSelectedRows, setInternalSelectedRows] = React.useState<T[]>([]);

  // Refs
  const parentRef = React.useRef<HTMLDivElement>(null);
  const endReachedRef = React.useRef(false);

  // Controlled vs uncontrolled selection
  const isControlled = controlledSelectedRows !== undefined;
  const selectedRows = isControlled ? controlledSelectedRows : internalSelectedRows;

  const setSelectedRows = React.useCallback(
    (rows: T[] | ((prev: T[]) => T[])) => {
      const newRows = typeof rows === "function" ? rows(selectedRows) : rows;
      if (isControlled) {
        onSelectionChange?.(newRows);
      } else {
        setInternalSelectedRows(newRows);
      }
    },
    [isControlled, onSelectionChange, selectedRows]
  );

  // Filter data
  const filteredData = React.useMemo(() => {
    if (!filter) return data;
    const lowerFilter = filter.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        if (!col.filterable) return false;
        const value = row[col.key as keyof T];
        return String(value).toLowerCase().includes(lowerFilter);
      })
    );
  }, [data, filter, columns]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey as keyof T];
      const bVal = b[sortKey as keyof T];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const comparison = String(aVal).localeCompare(String(bVal), "en", {
        numeric: true,
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Handle scroll for infinite loading
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

  // Reset end reached when data changes
  React.useEffect(() => {
    endReachedRef.current = false;
  }, [sortedData.length]);

  // Sort handling
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    if (sortDirection === "asc") return <ChevronUp className="h-4 w-4 text-neon-cyan" />;
    return <ChevronDown className="h-4 w-4 text-neon-cyan" />;
  };

  // Selection helpers
  const isRowSelected = React.useCallback(
    (row: T, index: number) => {
      if (!selectable) return false;
      const key = getRowKey(row, rowKey, index);
      return selectedRows.some((selectedRow, idx) => getRowKey(selectedRow, rowKey, idx) === key);
    },
    [selectable, rowKey, selectedRows]
  );

  const toggleRowSelection = React.useCallback(
    (row: T, index: number) => {
      if (!selectable) return;
      const key = getRowKey(row, rowKey, index);
      setSelectedRows((prev) => {
        const isCurrentlySelected = prev.some((r, idx) => getRowKey(r, rowKey, idx) === key);
        if (isCurrentlySelected) {
          return prev.filter((r, idx) => getRowKey(r, rowKey, idx) !== key);
        } else {
          return [...prev, row];
        }
      });
    },
    [selectable, rowKey, setSelectedRows]
  );

  const toggleSelectAll = React.useCallback(() => {
    if (!selectable) return;
    const allSelected = sortedData.every((row, idx) => isRowSelected(row, idx));
    if (allSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows([...sortedData]);
    }
  }, [selectable, sortedData, isRowSelected, setSelectedRows]);

  const clearSelection = React.useCallback(() => {
    setSelectedRows([]);
  }, [setSelectedRows]);

  const handleBulkAction = React.useCallback(
    (actionType: BulkActionType) => {
      if (onBulkAction && selectedRows.length > 0) {
        onBulkAction(actionType, selectedRows);
      }
    },
    [onBulkAction, selectedRows]
  );

  // Calculate selection state
  const allSelected = selectable && sortedData.length > 0 && sortedData.every((row, idx) => isRowSelected(row, idx));
  const someSelected = selectable && sortedData.some((row, idx) => isRowSelected(row, idx));
  const isIndeterminate = someSelected && !allSelected;

  const hasFilterable = columns.some((col) => col.filterable);

  // Calculate header height for proper positioning
  const headerHeight = 48;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selection Toolbar */}
      {selectable && (
        <SelectionToolbar
          selectedCount={selectedRows.length}
          totalCount={sortedData.length}
          onClearSelection={clearSelection}
          onBulkAction={handleBulkAction}
          bulkActions={bulkActions}
          variant={variant}
        />
      )}

      {/* Filter */}
      {showFilter && hasFilterable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search..."
            variant={variant === "cyber" ? "cyber" : "default"}
            className="pl-9"
          />
        </div>
      )}

      {/* Table Container */}
      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          variant === "cyber"
            ? "border-neon-cyan/20 bg-void-surface/50"
            : "border-border bg-card"
        )}
      >
        {/* Header - Always visible */}
        {stickyHeader && (
          <div
            className={cn(
              "border-b z-10",
              variant === "cyber"
                ? "border-neon-cyan/20 bg-void-elevated/90 backdrop-blur-sm"
                : "border-border bg-muted/90 backdrop-blur-sm"
            )}
          >
            <div className="flex">
              {/* Selection checkbox header */}
              {selectable && (
                <div
                  className={cn(
                    "flex-shrink-0 w-12 px-4 py-3 flex items-center justify-center",
                    variant === "cyber" ? "text-neon-cyan/70" : "text-muted-foreground"
                  )}
                >
                  <SelectionCheckbox
                    checked={allSelected}
                    indeterminate={isIndeterminate}
                    onChange={toggleSelectAll}
                    variant={variant}
                    disabled={loading || sortedData.length === 0}
                  />
                </div>
              )}
              {columns.map((col) => (
                <div
                  key={String(col.key)}
                  className={cn(
                    "flex-1 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                    variant === "cyber" ? "text-neon-cyan/70" : "text-muted-foreground",
                    col.sortable && "cursor-pointer select-none hover:bg-white/5",
                    col.className
                  )}
                  style={{ width: col.width, minWidth: col.minWidth }}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.header}</span>
                    {col.sortable && getSortIcon(String(col.key))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Virtualized Body */}
        <div
          ref={parentRef}
          onScroll={handleScroll}
          className={cn(
            "overflow-auto",
            variant === "cyber"
              ? "virtual-table-scifi-scrollbar"
              : "virtual-table-default-scrollbar"
          )}
          style={{ height: typeof height === "number" ? height - (stickyHeader ? headerHeight : 0) : height }}
        >
          {loading && sortedData.length === 0 ? (
            // Loading skeleton
            <div className="p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex border-b last:border-0 py-3",
                    variant === "cyber" ? "border-neon-cyan/10" : "border-border"
                  )}
                >
                  {selectable && (
                    <div className="w-12 px-4">
                      <Skeleton className="h-5 w-5" />
                    </div>
                  )}
                  {columns.map((col) => (
                    <div key={String(col.key)} className="flex-1 px-4">
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : sortedData.length === 0 ? (
            // Empty state
            <div
              className={cn(
                "flex items-center justify-center py-12",
                variant === "cyber" ? "text-neon-cyan/50" : "text-muted-foreground"
              )}
            >
              {emptyMessage}
            </div>
          ) : (
            // Virtual rows
            <div
              style={{
                height: totalSize,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualItems.map((virtualItem) => {
                const row = sortedData[virtualItem.index];
                const isSelected = isRowSelected(row, virtualItem.index);

                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    className={cn(
                      "absolute top-0 left-0 w-full flex items-center border-b transition-all duration-200",
                      variant === "cyber"
                        ? cn(
                            "border-neon-cyan/10",
                            isSelected
                              ? "bg-neon-cyan/15 shadow-[inset_0_0_20px_rgba(0,255,255,0.1)] border-l-2 border-l-neon-cyan"
                              : "hover:bg-neon-cyan/5"
                          )
                        : cn(
                            "border-border",
                            isSelected
                              ? "bg-primary/10 border-l-2 border-l-primary"
                              : "hover:bg-muted/50"
                          ),
                      onRowClick && "cursor-pointer"
                    )}
                    style={{
                      height: rowHeight,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    onClick={() => onRowClick?.(row, virtualItem.index)}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <div className="flex-shrink-0 w-12 px-4 flex items-center justify-center">
                        <SelectionCheckbox
                          checked={isSelected}
                          onChange={() => toggleRowSelection(row, virtualItem.index)}
                          variant={variant}
                        />
                      </div>
                    )}
                    {columns.map((col) => (
                      <div
                        key={String(col.key)}
                        className={cn("flex-1 px-4 text-sm truncate", col.className)}
                        style={{ width: col.width, minWidth: col.minWidth }}
                      >
                        {col.render
                          ? col.render(row[col.key as keyof T], row, virtualItem.index)
                          : String(row[col.key as keyof T] ?? "")}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading indicator for infinite scroll */}
          {loading && sortedData.length > 0 && (
            <div
              className={cn(
                "flex justify-center py-4",
                variant === "cyber" ? "text-neon-cyan/70" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "h-5 w-5 animate-spin rounded-full border-2 border-t-transparent",
                  variant === "cyber" ? "border-neon-cyan" : "border-primary"
                )}
              />
            </div>
          )}
        </div>
      </div>

      {/* Row count info */}
      <div
        className={cn(
          "text-sm",
          variant === "cyber" ? "text-neon-cyan/50" : "text-muted-foreground"
        )}
      >
        Showing {sortedData.length} of {data.length} rows
        {filter && ` (filtered)`}
      </div>
    </div>
  );
}
