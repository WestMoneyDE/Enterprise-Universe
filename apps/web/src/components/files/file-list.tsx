"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  File,
  Image,
  FileText,
  FileSpreadsheet,
  Eye,
  Download,
  Trash2,
  Grid3X3,
  List,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileAttachment,
  formatFileSize,
  getFileCategory,
} from "@/hooks/use-file-attachments";

// ===============================================================================
// FILE LIST - Display attached files with grid/list view toggle
// Features: file icons, preview, download, delete with confirmation
// ===============================================================================

export interface FileListProps {
  files: FileAttachment[];
  onPreview?: (file: FileAttachment) => void;
  onDownload?: (file: FileAttachment) => void;
  onDelete?: (file: FileAttachment) => void;
  className?: string;
  emptyMessage?: string;
}

type ViewMode = "grid" | "list";

export function FileList({
  files,
  onPreview,
  onDownload,
  onDelete,
  className,
  emptyMessage = "No files attached",
}: FileListProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = React.useState<FileAttachment | null>(null);

  const getFileIcon = (type: string) => {
    const category = getFileCategory(type);
    switch (category) {
      case "image":
        return Image;
      case "pdf":
        return FileText;
      case "document":
        return FileText;
      case "spreadsheet":
        return FileSpreadsheet;
      default:
        return File;
    }
  };

  const getIconColor = (type: string) => {
    const category = getFileCategory(type);
    switch (category) {
      case "image":
        return "text-neon-purple";
      case "pdf":
        return "text-neon-red";
      case "document":
        return "text-neon-cyan";
      case "spreadsheet":
        return "text-neon-green";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDownload = (file: FileAttachment) => {
    if (onDownload) {
      onDownload(file);
    } else {
      // Default download behavior
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget);
    }
    setDeleteTarget(null);
  };

  const canPreview = (file: FileAttachment) => {
    const category = getFileCategory(file.type);
    return category === "image" || category === "pdf";
  };

  if (files.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          "rounded-xl border border-dashed border-neon-cyan/20 bg-void-surface/20",
          className
        )}
      >
        <File className="h-12 w-12 text-gray-600 mb-3" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-neon-cyan/20 bg-void-surface/30 p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("grid")}
            className={cn(
              "h-8 w-8 p-0",
              viewMode === "grid"
                ? "bg-neon-cyan/20 text-neon-cyan"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn(
              "h-8 w-8 p-0",
              viewMode === "list"
                ? "bg-neon-cyan/20 text-neon-cyan"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            const iconColor = getIconColor(file.type);
            const isImage = getFileCategory(file.type) === "image";

            return (
              <div
                key={file.id}
                className="group relative rounded-xl border border-neon-cyan/20 bg-void-surface/50 overflow-hidden transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]"
              >
                {/* Preview area */}
                <div className="relative aspect-square bg-void-surface flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileIcon className={cn("h-12 w-12", iconColor)} />
                  )}

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    {canPreview(file) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPreview?.(file)}
                        className="h-9 w-9 bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 border border-neon-cyan/30"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file)}
                      className="h-9 w-9 bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(file)}
                      className="h-9 w-9 bg-neon-red/20 text-neon-red hover:bg-neon-red/30 border border-neon-red/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* File info */}
                <div className="p-3 border-t border-neon-cyan/10">
                  <p className="text-sm font-medium text-gray-200 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            const iconColor = getIconColor(file.type);

            return (
              <div
                key={file.id}
                className="group flex items-center gap-4 rounded-xl border border-neon-cyan/20 bg-void-surface/50 p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "rounded-lg p-3 bg-void-surface border border-neon-cyan/20",
                    iconColor
                  )}
                >
                  <FileIcon className="h-6 w-6" />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span className="text-neon-cyan/30">|</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {canPreview(file) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onPreview?.(file)}
                      className="h-8 w-8 text-neon-cyan hover:bg-neon-cyan/20"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(file)}
                    className="h-8 w-8 text-neon-green hover:bg-neon-green/20"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(file)}
                    className="h-8 w-8 text-neon-red hover:bg-neon-red/20"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent variant="cyber" className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-neon-red/20 border border-neon-red/30">
                <AlertTriangle className="h-5 w-5 text-neon-red" />
              </div>
              <DialogTitle className="text-gray-100">Delete File</DialogTitle>
            </div>
            <DialogDescription className="text-gray-400 pt-2">
              Are you sure you want to delete{" "}
              <span className="text-neon-cyan font-medium">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="border border-neon-cyan/20 hover:bg-neon-cyan/10"
            >
              Cancel
            </Button>
            <Button
              variant="red"
              onClick={handleDeleteConfirm}
              className="bg-neon-red/20 text-neon-red border border-neon-red/50 hover:bg-neon-red/30"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileList;
