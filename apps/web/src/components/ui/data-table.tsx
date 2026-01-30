"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
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

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  variant?: "default" | "cyber";
  onRowClick?: (row: T) => void;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  emptyMessage = "Keine Daten vorhanden",
  pageSize = 10,
  variant = "cyber",
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const [filter, setFilter] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

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

  return (
    <div className={cn("space-y-4", className)}>
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
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b last:border-0 transition-colors",
                      variant === "cyber"
                        ? "border-neon-cyan/10 hover:bg-neon-cyan/5"
                        : "border-border hover:bg-muted/50",
                      onRowClick && "cursor-pointer"
                    )}
                  >
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
                ))
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
