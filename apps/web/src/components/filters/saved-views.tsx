"use client";

// ===================================================================================================
// SAVED VIEWS - Components for managing saved filter views
// SavedViewsDropdown: Dropdown to select saved views
// SaveViewDialog: Modal to save current filters as a new view
// ===================================================================================================

import * as React from "react";
import { useState } from "react";
import {
  ChevronDown,
  Save,
  Trash2,
  Star,
  StarOff,
  Edit2,
  Check,
  X,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  SavedView,
  FilterConfig,
  SortConfig,
  EntityType,
} from "@/hooks/use-saved-views";

// ===================================================================================================
// SAVED VIEWS DROPDOWN
// ===================================================================================================

export interface SavedViewsDropdownProps {
  views: SavedView[];
  activeView: SavedView | null;
  onSelectView: (id: string) => void;
  onDeleteView: (id: string) => void;
  onSetDefault: (id: string) => void;
  onClearView: () => void;
  onSaveClick: () => void;
  className?: string;
  entityType: EntityType;
}

export function SavedViewsDropdown({
  views,
  activeView,
  onSelectView,
  onDeleteView,
  onSetDefault,
  onClearView,
  onSaveClick,
  className,
  entityType,
}: SavedViewsDropdownProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDelete === id) {
      onDeleteView(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleSetDefault = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSetDefault(id);
  };

  const entityLabels: Record<EntityType, string> = {
    contacts: "Contacts",
    deals: "Deals",
    projects: "Projects",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="cyan"
          size="sm"
          className={cn(
            "gap-2 font-mono text-xs",
            activeView && "bg-neon-cyan/20",
            className
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          {activeView ? activeView.name : "Views"}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        variant="cyber"
        align="start"
        className="w-64"
      >
        <DropdownMenuLabel className="font-mono text-xs text-neon-cyan/70 uppercase tracking-wider">
          {entityLabels[entityType]} Views
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-neon-cyan/20" />

        {views.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-white/50">
            No saved views yet
          </div>
        ) : (
          views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              className={cn(
                "group flex items-center justify-between gap-2 cursor-pointer",
                "hover:bg-neon-cyan/10 focus:bg-neon-cyan/10",
                activeView?.id === view.id && "bg-neon-cyan/20"
              )}
              onClick={() => onSelectView(view.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {view.isDefault && (
                  <Star className="h-3 w-3 text-neon-gold flex-shrink-0" />
                )}
                <span className="truncate text-sm">{view.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleSetDefault(e, view.id)}
                  className={cn(
                    "p-1 rounded hover:bg-white/10 transition-colors",
                    view.isDefault ? "text-neon-gold" : "text-white/50"
                  )}
                  title={view.isDefault ? "Remove default" : "Set as default"}
                >
                  {view.isDefault ? (
                    <StarOff className="h-3 w-3" />
                  ) : (
                    <Star className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={(e) => handleDelete(e, view.id)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    confirmDelete === view.id
                      ? "bg-neon-red/20 text-neon-red"
                      : "hover:bg-white/10 text-white/50 hover:text-neon-red"
                  )}
                  title={confirmDelete === view.id ? "Click again to confirm" : "Delete view"}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator className="bg-neon-cyan/20" />

        {activeView && (
          <DropdownMenuItem
            onClick={onClearView}
            className="text-white/70 hover:bg-neon-cyan/10 focus:bg-neon-cyan/10"
          >
            <X className="h-3.5 w-3.5 mr-2" />
            Clear current view
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onClick={onSaveClick}
          className="text-neon-cyan hover:bg-neon-cyan/10 focus:bg-neon-cyan/10"
        >
          <Save className="h-3.5 w-3.5 mr-2" />
          Save current filters as view
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ===================================================================================================
// SAVE VIEW DIALOG
// ===================================================================================================

export interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    name: string,
    config: {
      filters: FilterConfig;
      sort?: SortConfig;
      visibleColumns: string[];
      isDefault?: boolean;
    }
  ) => void;
  currentFilters: FilterConfig;
  currentSort?: SortConfig;
  visibleColumns: string[];
  editingView?: SavedView | null;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  onSave,
  currentFilters,
  currentSort,
  visibleColumns,
  editingView,
}: SaveViewDialogProps) {
  const [name, setName] = useState(editingView?.name || "");
  const [isDefault, setIsDefault] = useState(editingView?.isDefault || false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(editingView?.name || "");
      setIsDefault(editingView?.isDefault || false);
      setError(null);
    }
  }, [open, editingView]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a view name");
      return;
    }

    if (trimmedName.length > 50) {
      setError("View name must be 50 characters or less");
      return;
    }

    onSave(trimmedName, {
      filters: currentFilters,
      sort: currentSort,
      visibleColumns,
      isDefault,
    });

    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  // Count active filters
  const activeFilterCount = Object.entries(currentFilters).filter(
    ([, value]) => value !== undefined && value !== ""
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="cyber" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-neon-cyan tracking-wider">
            {editingView ? "Update View" : "Save View"}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {editingView
              ? "Update this saved view with the current filters and settings."
              : "Save your current filters and column settings as a reusable view."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* View Name Input */}
          <div className="space-y-2">
            <label
              htmlFor="view-name"
              className="text-xs font-mono text-white/70 uppercase tracking-wider"
            >
              View Name
            </label>
            <Input
              id="view-name"
              variant="cyber"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Active Deals This Month"
              className="font-mono"
              error={error || undefined}
            />
          </div>

          {/* View Configuration Summary */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-white/70 uppercase tracking-wider">
              Configuration
            </label>
            <div className="rounded-md border border-neon-cyan/20 bg-void-surface/50 p-3 space-y-2 text-sm">
              <div className="flex justify-between text-white/60">
                <span>Active Filters:</span>
                <span className="text-neon-cyan font-mono">
                  {activeFilterCount}
                </span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Visible Columns:</span>
                <span className="text-neon-cyan font-mono">
                  {visibleColumns.length}
                </span>
              </div>
              {currentSort && (
                <div className="flex justify-between text-white/60">
                  <span>Sort:</span>
                  <span className="text-neon-cyan font-mono">
                    {currentSort.field} ({currentSort.direction})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Set as Default Checkbox */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDefault(!isDefault)}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                isDefault
                  ? "border-neon-gold bg-neon-gold/20 text-neon-gold"
                  : "border-white/30 hover:border-neon-cyan/50"
              )}
            >
              {isDefault && <Check className="h-3 w-3" />}
            </button>
            <label
              onClick={() => setIsDefault(!isDefault)}
              className="text-sm text-white/70 cursor-pointer select-none"
            >
              Set as default view
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white"
          >
            Cancel
          </Button>
          <Button variant="cyan" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {editingView ? "Update View" : "Save View"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================================================================================================
// EXPORTS
// ===================================================================================================

export default SavedViewsDropdown;
