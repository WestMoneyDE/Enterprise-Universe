"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload, X, File, Image, FileText, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize, isValidFileType, getFileCategory } from "@/hooks/use-file-attachments";

// ===============================================================================
// FILE UPLOADER - Drag and drop file upload component with SciFi styling
// Features: drag-and-drop, click to browse, file type validation, progress bar
// ===============================================================================

export interface FileUploaderProps {
  onUpload?: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
  entityType?: string;
  entityId?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
}

const ALLOWED_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploader({
  onUpload,
  accept,
  maxFiles = 10,
  maxSize = MAX_FILE_SIZE,
  multiple = true,
  className,
  disabled = false,
  entityType,
  entityId,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounter = React.useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Check max files
      if (valid.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      // Check file size
      if (file.size > maxSize) {
        errors.push(`"${file.name}" exceeds ${formatFileSize(maxSize)} limit`);
        continue;
      }

      // Check file type
      if (!isValidFileType(file, accept ? accept.split(",").map((t) => t.trim()) : ALLOWED_TYPES)) {
        errors.push(`"${file.name}" has an unsupported file type`);
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  };

  const simulateUpload = React.useCallback((files: File[]) => {
    if (files.length === 0) return;

    const newUploads: UploadingFile[] = files.map((file) => ({
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploads]);

    // Simulate upload progress for each file
    files.forEach((file, index) => {
      const uploadIndex = uploadingFiles.length + index;
      let progress = 0;

      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);

          setUploadingFiles((prev) =>
            prev.map((u, i) =>
              i === uploadIndex ? { ...u, progress: 100, status: "complete" as const } : u
            )
          );

          // Remove completed upload after a delay
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((_, i) => i !== uploadIndex));
          }, 1500);
        } else {
          setUploadingFiles((prev) =>
            prev.map((u, i) => (i === uploadIndex ? { ...u, progress } : u))
          );
        }
      }, 200);
    });

    // Call onUpload callback
    onUpload?.(files);
  }, [uploadingFiles.length, onUpload]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const { valid, errors } = validateFiles(droppedFiles);

    if (errors.length > 0) {
      setError(errors[0]);
      setTimeout(() => setError(null), 5000);
    }

    if (valid.length > 0) {
      simulateUpload(valid);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const { valid, errors } = validateFiles(selectedFiles);

      if (errors.length > 0) {
        setError(errors[0]);
        setTimeout(() => setError(null), 5000);
      }

      if (valid.length > 0) {
        simulateUpload(valid);
      }
    }
    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300",
          isDragging
            ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_30px_rgba(0,240,255,0.2)]"
            : "border-neon-cyan/30 bg-void-surface/30 hover:border-neon-cyan/60 hover:bg-void-surface/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]",
          disabled && "cursor-not-allowed opacity-50",
          error && "border-neon-red/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept || ALLOWED_TYPES.join(",")}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-neon-cyan/40" />
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-neon-cyan/40" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-neon-cyan/40" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-neon-cyan/40" />

        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div
            className={cn(
              "rounded-full p-4 transition-all duration-300",
              isDragging
                ? "bg-neon-cyan/20 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                : "bg-neon-cyan/10"
            )}
          >
            <Upload
              className={cn(
                "h-8 w-8 transition-all duration-300",
                isDragging ? "text-neon-cyan scale-110" : "text-neon-cyan/70"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">
              {isDragging ? "Drop files here" : "Drag and drop files here"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              or <span className="text-neon-cyan hover:underline">click to browse</span>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-[10px] text-gray-500">
            <span className="px-2 py-1 rounded-full bg-void-surface/50 border border-neon-cyan/20">
              Images
            </span>
            <span className="px-2 py-1 rounded-full bg-void-surface/50 border border-neon-cyan/20">
              PDFs
            </span>
            <span className="px-2 py-1 rounded-full bg-void-surface/50 border border-neon-cyan/20">
              Documents
            </span>
            <span className="px-2 py-1 rounded-full bg-void-surface/50 border border-neon-cyan/20">
              Spreadsheets
            </span>
          </div>
          <p className="text-[10px] text-gray-600 font-mono">
            Max {formatFileSize(maxSize)} per file
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-neon-red animate-pulse">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Upload Progress List */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((upload, index) => {
            const FileIcon = getFileIcon(upload.file.type);
            return (
              <div
                key={`${upload.file.name}-${index}`}
                className="relative overflow-hidden rounded-lg border border-neon-cyan/20 bg-void-surface/50"
              >
                {/* Progress bar background */}
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-300",
                    upload.status === "complete"
                      ? "bg-neon-green/10"
                      : upload.status === "error"
                      ? "bg-neon-red/10"
                      : "bg-neon-cyan/5"
                  )}
                  style={{ width: `${upload.progress}%` }}
                />

                <div className="relative flex items-center gap-3 p-3">
                  <div
                    className={cn(
                      "rounded p-2",
                      upload.status === "complete"
                        ? "bg-neon-green/20"
                        : upload.status === "error"
                        ? "bg-neon-red/20"
                        : "bg-neon-cyan/10"
                    )}
                  >
                    <FileIcon
                      className={cn(
                        "h-4 w-4",
                        upload.status === "complete"
                          ? "text-neon-green"
                          : upload.status === "error"
                          ? "text-neon-red"
                          : "text-neon-cyan"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-200">
                      {upload.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(upload.file.size)}
                      </p>
                      {upload.status === "uploading" && (
                        <p className="text-xs text-neon-cyan font-mono">
                          {Math.round(upload.progress)}%
                        </p>
                      )}
                      {upload.status === "complete" && (
                        <div className="flex items-center gap-1 text-xs text-neon-green">
                          <CheckCircle className="h-3 w-3" />
                          Complete
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUploadingFile(index);
                    }}
                    className="h-8 w-8 text-gray-400 hover:text-neon-red"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress bar */}
                {upload.status === "uploading" && (
                  <div className="h-1 bg-void-surface">
                    <div
                      className="h-full bg-neon-cyan transition-all duration-300 shadow-[0_0_10px_rgba(0,240,255,0.5)]"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FileUploader;
