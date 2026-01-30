"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
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
// DATA TABLE - Sortable, filterable table with cyberpunk styling
// ═══════════════════════════════════════════════════════════════════════════════

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
  width?: string;
}

// Bulk action types
export type BulkActionType = "delete" | "export" | "assign" | string;

export interface BulkAction {
  type: BulkActionType;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "cyan" | "purple";
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  variant?: "default" | "cyber";
  onRowClick?: (row: T) => void;
  className?: string;
  // Bulk selection props (optional for backward compatibility)
  selectable?: boolean;
  rowKey?: keyof T | ((row: T) => string | number);
  onBulkAction?: (action: BulkActionType, selectedRows: T[]) => void;
  bulkActions?: BulkAction[];
  selectedRows?: T[];
  onSelectionChange?: (selectedRows: T[]) => void;
}

// Default bulk actions
const defaultBulkActions: BulkAction[] = [
  { type: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" />, variant: "destructive" },
  { type: "export", label: "Export", icon: <Download className="h-4 w-4" />, variant: "cyan" },
  { type: "assign", label: "Assign", icon: <UserPlus className="h-4 w-4" />, variant: "purple" },
];

type SortDirection = "asc" | "desc" | null;

// Helper to get row identifier
function getRowKey<T>(row: T, rowKey?: keyof T | ((row: T) => string | number), index?: number): string | number {
  if (!rowKey) return index ?? 0;
  if (typeof rowKey === "function") return rowKey(row);
  return row[rowKey] as string | number;
}

// Checkbox component for selection
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
        <Check className={cn(
          "h-3 w-3",
          variant === "cyber" ? "text-neon-cyan" : "text-primary"
        )} />
      )}
      {indeterminate && (
        <Minus className={cn(
          "h-3 w-3",
          variant === "cyber" ? "text-neon-cyan" : "text-primary"
        )} />
      )}
    </button>
  );
}

// Selection toolbar component
interface SelectionToolbarProps<T> {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: BulkActionType) => void;
  bulkActions: BulkAction[];
  variant?: "default" | "cyber";
}

function SelectionToolbar<T>({
  selectedCount,
  totalCount,
  onClearSelection,
  onBulkAction,
  bulkActions,
  variant = "cyber",
}: SelectionToolbarProps<T>) {
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

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  emptyMessage = "Keine Daten vorhanden",
  pageSize = 10,
  variant = "cyber",
  onRowClick,
  className,
  // Bulk selection props
  selectable = false,
  rowKey,
  onBulkAction,
  bulkActions = defaultBulkActions,
  selectedRows: controlledSelectedRows,
  onSelectionChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const [filter, setFilter] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Internal selection state (for uncontrolled mode)
  const [internalSelectedRows, setInternalSelectedRows] = React.useState<T[]>([]);

  // Use controlled or uncontrolled selection
  const isControlled = controlledSelectedRows !== undefined;
  const selectedRows = isControlled ? controlledSelectedRows : internalSelectedRows;

  const setSelectedRows = React.useCallback((rows: T[] | ((prev: T[]) => T[])) => {
    const newRows = typeof rows === "function" ? rows(selectedRows) : rows;
    if (isControlled) {
      onSelectionChange?.(newRows);
    } else {
      setInternalSelectedRows(newRows);
    }
  }, [isControlled, onSelectionChange, selectedRows]);

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
      const comparison = String(aVal).localeCompare(String(bVal), "de", {
        numeric: true,
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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

  const hasFilterable = columns.some((col) => col.filterable);

  // Selection helpers
  const isRowSelected = React.useCallback((row: T, index: number) => {
    if (!selectable) return false;
    const key = getRowKey(row, rowKey, index);
    return selectedRows.some((selectedRow, idx) => getRowKey(selectedRow, rowKey, idx) === key);
  }, [selectable, rowKey, selectedRows]);

  const toggleRowSelection = React.useCallback((row: T, index: number) => {
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
  }, [selectable, rowKey, setSelectedRows]);

  const toggleSelectAll = React.useCallback(() => {
    if (!selectable) return;
    const allCurrentPageSelected = paginatedData.every((row, idx) =>
      isRowSelected(row, (currentPage - 1) * pageSize + idx)
    );
    if (allCurrentPageSelected) {
      // Deselect all on current page
      const currentPageKeys = paginatedData.map((row, idx) =>
        getRowKey(row, rowKey, (currentPage - 1) * pageSize + idx)
      );
      setSelectedRows((prev) =>
        prev.filter((row, idx) => !currentPageKeys.includes(getRowKey(row, rowKey, idx)))
      );
    } else {
      // Select all on current page
      setSelectedRows((prev) => {
        const existingKeys = prev.map((row, idx) => getRowKey(row, rowKey, idx));
        const newRows = paginatedData.filter((row, idx) =>
          !existingKeys.includes(getRowKey(row, rowKey, (currentPage - 1) * pageSize + idx))
        );
        return [...prev, ...newRows];
      });
    }
  }, [selectable, paginatedData, currentPage, pageSize, rowKey, isRowSelected, setSelectedRows]);

  const clearSelection = React.useCallback(() => {
    setSelectedRows([]);
  }, [setSelectedRows]);

  const handleBulkAction = React.useCallback((actionType: BulkActionType) => {
    if (onBulkAction && selectedRows.length > 0) {
      onBulkAction(actionType, selectedRows);
    }
  }, [onBulkAction, selectedRows]);

  // Calculate selection state for header checkbox
  const allOnPageSelected = selectable && paginatedData.length > 0 && paginatedData.every((row, idx) =>
    isRowSelected(row, (currentPage - 1) * pageSize + idx)
  );
  const someOnPageSelected = selectable && paginatedData.some((row, idx) =>
    isRowSelected(row, (currentPage - 1) * pageSize + idx)
  );
  const isIndeterminate = someOnPageSelected && !allOnPageSelected;

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
      {hasFilterable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Suchen..."
            variant={variant === "cyber" ? "cyber" : "default"}
            className="pl-9"
          />
        </div>
      )}

      {/* Table */}
      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          variant === "cyber"
            ? "border-neon-cyan/20 bg-void-surface/50"
            : "border-border bg-card"
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                className={cn(
                  "border-b",
                  variant === "cyber"
                    ? "border-neon-cyan/20 bg-void-elevated/50"
                    : "border-border bg-muted/50"
                )}
              >
                {/* Selection checkbox column */}
                {selectable && (
                  <th
                    className={cn(
                      "px-4 py-3 w-12",
                      variant === "cyber"
                        ? "text-neon-cyan/70"
                        : "text-muted-foreground"
                    )}
                  >
                    <SelectionCheckbox
                      checked={allOnPageSelected}
                      indeterminate={isIndeterminate}
                      onChange={toggleSelectAll}
                      variant={variant}
                      disabled={loading || paginatedData.length === 0}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                      variant === "cyber"
                        ? "text-neon-cyan/70"
                        : "text-muted-foreground",
                      col.sortable && "cursor-pointer select-none",
                      col.className
                    )}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.header}</span>
                      {col.sortable && getSortIcon(String(col.key))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b last:border-0",
                      variant === "cyber" ? "border-neon-cyan/10" : "border-border"
                    )}
                  >
                    {/* Skeleton for selection checkbox */}
                    {selectable && (
                      <td className="px-4 py-3 w-12">
                        <Skeleton className="h-5 w-5" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectable ? columns.length + 1 : columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => {
                  const globalIndex = (currentPage - 1) * pageSize + rowIndex;
                  const isSelected = isRowSelected(row, globalIndex);

                  return (
                    <tr
                      key={rowIndex}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "border-b last:border-0 transition-all duration-200",
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
                    >
                      {/* Selection checkbox cell */}
                      {selectable && (
                        <td className="px-4 py-3 w-12">
                          <SelectionCheckbox
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row, globalIndex)}
                            variant={variant}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={cn(
                            "px-4 py-3 text-sm",
                            col.className
                          )}
                        >
                          {col.render
                            ? col.render(row[col.key as keyof T], row)
                            : String(row[col.key as keyof T] ?? "")}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Zeige {(currentPage - 1) * pageSize + 1} bis{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} von{" "}
            {sortedData.length} Einträgen
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant={variant === "cyber" ? "cyan" : "outline"}
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Seite {currentPage} von {totalPages}
            </span>
            <Button
              variant={variant === "cyber" ? "cyan" : "outline"}
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
