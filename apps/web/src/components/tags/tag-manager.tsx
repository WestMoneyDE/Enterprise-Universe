"use client";

// ===================================================================================================
// TAG MANAGER - Full tag management UI
// Features: list all tags with usage count, edit name/color, delete with confirmation, merge tags
// ===================================================================================================

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import {
  Tag as TagIcon,
  Plus,
  Pencil,
  Trash2,
  Merge,
  Search,
  X,
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Tag, TagColor } from "@/hooks/use-tags";
import { TAG_COLORS, TAG_COLOR_STYLES } from "@/hooks/use-tags";
import { TagChip } from "./tag-input";

// ===================================================================================================
// TYPES
// ===================================================================================================

export interface TagManagerProps {
  /** All tags */
  tags: Tag[];
  /** Add a new tag */
  onAddTag: (name: string, color: TagColor) => Tag;
  /** Update a tag */
  onUpdateTag: (id: string, updates: { name?: string; color?: TagColor }) => void;
  /** Delete a tag */
  onDeleteTag: (id: string) => void;
  /** Merge two tags */
  onMergeTags: (sourceId: string, targetId: string) => void;
  /** Get usage count for a tag */
  getTagUsageCount: (tagId: string) => number;
  /** Additional class names */
  className?: string;
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
    <div className={cn("flex items-center gap-2", className)}>
      {TAG_COLORS.map((color) => {
        const styles = TAG_COLOR_STYLES[color];
        return (
          <button
            key={color}
            type="button"
            onClick={() => onSelectColor(color)}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all duration-200",
              styles.bg,
              styles.border,
              selectedColor === color
                ? cn("scale-110 ring-2 ring-offset-2 ring-offset-void", styles.glow)
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
// TAG ROW COMPONENT
// ===================================================================================================

interface TagRowProps {
  tag: Tag;
  usageCount: number;
  isEditing: boolean;
  editName: string;
  editColor: TagColor;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditNameChange: (name: string) => void;
  onEditColorChange: (color: TagColor) => void;
  onDelete: () => void;
  onMerge: () => void;
}

function TagRow({
  tag,
  usageCount,
  isEditing,
  editName,
  editColor,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNameChange,
  onEditColorChange,
  onDelete,
  onMerge,
}: TagRowProps) {
  if (isEditing) {
    return (
      <div
        className={cn(
          "flex items-center gap-4 p-4 rounded-lg",
          "bg-neon-cyan/5 border border-neon-cyan/30"
        )}
      >
        {/* Edit form */}
        <div className="flex-1 space-y-3">
          <Input
            type="text"
            variant="cyber"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            placeholder="Tag name"
            className="h-9 font-mono text-sm"
            autoFocus
          />
          <ColorPicker selectedColor={editColor} onSelectColor={onEditColorChange} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="green"
            size="sm"
            onClick={onSaveEdit}
            disabled={!editName.trim()}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg",
        "bg-void-surface/30 border border-white/5",
        "hover:bg-void-surface/50 hover:border-neon-cyan/20",
        "transition-all duration-200 group"
      )}
    >
      {/* Tag preview */}
      <TagChip tag={tag} showGlow size="md" />

      {/* Usage count */}
      <div className="flex items-center gap-1.5 text-xs font-mono text-white/40">
        <span>{usageCount}</span>
        <span>use{usageCount !== 1 ? "s" : ""}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onStartEdit}
          className="h-8 w-8 p-0 text-white/50 hover:text-neon-cyan"
          title="Edit tag"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onMerge}
          className="h-8 w-8 p-0 text-white/50 hover:text-neon-purple"
          title="Merge into another tag"
        >
          <Merge className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-white/50 hover:text-neon-red"
          title="Delete tag"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ===================================================================================================
// TAG MANAGER COMPONENT
// ===================================================================================================

export function TagManager({
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onMergeTags,
  getTagUsageCount,
  className,
}: TagManagerProps) {
  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Editing
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<TagColor>("cyan");

  // Create new tag
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<TagColor>("cyan");

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

  // Merge dialog
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [sourceTag, setSourceTag] = useState<Tag | null>(null);
  const [targetTagId, setTargetTagId] = useState<string | null>(null);

  // Filtered tags
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const lowerQuery = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(lowerQuery));
  }, [tags, searchQuery]);

  // Start editing
  const startEditing = useCallback((tag: Tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingTagId(null);
    setEditName("");
    setEditColor("cyan");
  }, []);

  // Save edit
  const saveEdit = useCallback(() => {
    if (!editingTagId || !editName.trim()) return;

    onUpdateTag(editingTagId, {
      name: editName.trim(),
      color: editColor,
    });

    cancelEditing();
  }, [editingTagId, editName, editColor, onUpdateTag, cancelEditing]);

  // Handle create new tag
  const handleCreateTag = useCallback(() => {
    if (!newTagName.trim()) return;

    onAddTag(newTagName.trim(), newTagColor);
    setNewTagName("");
    setNewTagColor("cyan");
    setIsCreating(false);
  }, [newTagName, newTagColor, onAddTag]);

  // Open delete dialog
  const openDeleteDialog = useCallback((tag: Tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  }, []);

  // Confirm delete
  const confirmDelete = useCallback(() => {
    if (!tagToDelete) return;
    onDeleteTag(tagToDelete.id);
    setDeleteDialogOpen(false);
    setTagToDelete(null);
  }, [tagToDelete, onDeleteTag]);

  // Open merge dialog
  const openMergeDialog = useCallback((tag: Tag) => {
    setSourceTag(tag);
    setTargetTagId(null);
    setMergeDialogOpen(true);
  }, []);

  // Confirm merge
  const confirmMerge = useCallback(() => {
    if (!sourceTag || !targetTagId) return;
    onMergeTags(sourceTag.id, targetTagId);
    setMergeDialogOpen(false);
    setSourceTag(null);
    setTargetTagId(null);
  }, [sourceTag, targetTagId, onMergeTags]);

  // Available merge targets (exclude source tag)
  const mergeTargets = useMemo(() => {
    if (!sourceTag) return tags;
    return tags.filter((tag) => tag.id !== sourceTag.id);
  }, [tags, sourceTag]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-neon-cyan">
          <TagIcon className="h-5 w-5" />
          <h2 className="text-lg font-display font-semibold tracking-wider uppercase">
            Tag Manager
          </h2>
          <span className="text-sm font-mono text-white/50">({tags.length})</span>
        </div>

        <Button
          type="button"
          variant="cyan"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          New Tag
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-cyan/50" />
        <Input
          type="text"
          variant="cyber"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          className="pl-9 pr-9 font-mono text-sm h-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Create new tag form */}
      {isCreating && (
        <div
          className={cn(
            "p-4 rounded-lg space-y-4",
            "bg-neon-purple/5 border border-neon-purple/30"
          )}
        >
          <div className="flex items-center gap-2 text-neon-purple">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-mono uppercase tracking-wider">
              Create New Tag
            </span>
          </div>

          <Input
            type="text"
            variant="cyber"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="h-10 font-mono"
            autoFocus
          />

          <div className="space-y-2">
            <label className="text-xs font-mono text-white/50 uppercase tracking-wider">
              Select Color
            </label>
            <ColorPicker selectedColor={newTagColor} onSelectColor={setNewTagColor} />
          </div>

          {/* Preview */}
          {newTagName && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-white/50">Preview:</span>
              <TagChip
                tag={{
                  id: "preview",
                  name: newTagName,
                  color: newTagColor,
                  createdAt: "",
                  updatedAt: "",
                }}
                showGlow
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="purple"
              size="sm"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Tag
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setNewTagName("");
                setNewTagColor("cyan");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tags list */}
      <div className="space-y-2">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              usageCount={getTagUsageCount(tag.id)}
              isEditing={editingTagId === tag.id}
              editName={editName}
              editColor={editColor}
              onStartEdit={() => startEditing(tag)}
              onCancelEdit={cancelEditing}
              onSaveEdit={saveEdit}
              onEditNameChange={setEditName}
              onEditColorChange={setEditColor}
              onDelete={() => openDeleteDialog(tag)}
              onMerge={() => openMergeDialog(tag)}
            />
          ))
        ) : searchQuery ? (
          <div className="py-8 text-center">
            <Search className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm font-mono text-white/50">
              No tags matching &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <TagIcon className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm font-mono text-white/50">No tags created yet</p>
            <Button
              type="button"
              variant="cyan"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="mt-4 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Your First Tag
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent variant="cyber">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-neon-red">
              <AlertTriangle className="h-5 w-5" />
              Delete Tag
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Are you sure you want to delete this tag? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {tagToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-void-surface/50 border border-neon-red/20">
                <TagChip tag={tagToDelete} showGlow />
                <span className="text-sm font-mono text-white/50">
                  Used by {getTagUsageCount(tagToDelete.id)} item
                  {getTagUsageCount(tagToDelete.id) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="red"
              onClick={confirmDelete}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent variant="cyber" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-neon-purple">
              <Merge className="h-5 w-5" />
              Merge Tags
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Merge one tag into another. All items with the source tag will be
              reassigned to the target tag.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Source tag */}
            {sourceTag && (
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Source Tag (will be deleted)
                </label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-void-surface/50 border border-neon-red/20">
                  <TagChip tag={sourceTag} showGlow />
                  <span className="text-sm font-mono text-white/40">
                    ({getTagUsageCount(sourceTag.id)} uses)
                  </span>
                </div>
              </div>
            )}

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="p-2 rounded-full bg-neon-purple/10 border border-neon-purple/30">
                <Merge className="h-4 w-4 text-neon-purple rotate-90" />
              </div>
            </div>

            {/* Target tag selection */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Target Tag (will keep)
              </label>
              <div className="max-h-[200px] overflow-y-auto space-y-1 p-2 rounded-lg bg-void-surface/30 border border-white/10">
                {mergeTargets.length > 0 ? (
                  mergeTargets.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setTargetTagId(tag.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-md",
                        "transition-colors",
                        targetTagId === tag.id
                          ? "bg-neon-green/10 border border-neon-green/30"
                          : "hover:bg-white/5"
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center",
                          targetTagId === tag.id
                            ? "bg-neon-green/20 border-neon-green/50"
                            : "border-white/20"
                        )}
                      >
                        {targetTagId === tag.id && (
                          <Check className="h-3 w-3 text-neon-green" />
                        )}
                      </div>
                      <TagChip tag={tag} size="sm" />
                      <span className="text-[10px] font-mono text-white/40 ml-auto">
                        {getTagUsageCount(tag.id)} uses
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm font-mono text-white/50 text-center py-4">
                    No other tags available
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMergeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="purple"
              onClick={confirmMerge}
              disabled={!targetTagId}
              className="gap-1.5"
            >
              <Merge className="h-3.5 w-3.5" />
              Merge Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TagManager;
