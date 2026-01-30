"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload, X, File, Image, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ═══════════════════════════════════════════════════════════════════════════════
// FILE UPLOAD - Drag and drop file upload component
// ═══════════════════════════════════════════════════════════════════════════════

interface FileUploadProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function FileUpload({
  value = [],
  onChange,
  accept,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
  className,
  label,
  description,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateFiles = (files: File[]): File[] => {
    setError(null);
    const validFiles: File[] = [];

    for (const file of files) {
      // Check max files
      if (value.length + validFiles.length >= maxFiles) {
        setError(`Maximal ${maxFiles} Dateien erlaubt`);
        break;
      }

      // Check file size
      if (file.size > maxSize) {
        setError(`Datei "${file.name}" ist zu groß (max. ${formatBytes(maxSize)})`);
        continue;
      }

      // Check file type
      if (accept) {
        const acceptedTypes = accept.split(",").map((t) => t.trim());
        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.endsWith("/*")) {
            return file.type.startsWith(type.replace("/*", ""));
          }
          return file.type === type;
        });

        if (!isAccepted) {
          setError(`Dateityp "${file.type}" nicht erlaubt`);
          continue;
        }
      }

      validFiles.push(file);
    }

    return validFiles;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = validateFiles(droppedFiles);

    if (validFiles.length > 0) {
      onChange?.([...value, ...validFiles]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = validateFiles(selectedFiles);

      if (validFiles.length > 0) {
        onChange?.([...value, ...validFiles]);
      }
    }
    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    onChange?.(newFiles);
    setError(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return Image;
    if (file.type.includes("pdf")) return FileText;
    return File;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="text-sm font-medium text-gray-200">{label}</label>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
          isDragging
            ? "border-neon-cyan bg-neon-cyan/10"
            : "border-neon-cyan/30 bg-void-surface/30 hover:border-neon-cyan/50 hover:bg-void-surface/50",
          disabled && "cursor-not-allowed opacity-50",
          error && "border-neon-red/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div
            className={cn(
              "rounded-full p-3",
              isDragging ? "bg-neon-cyan/20" : "bg-neon-cyan/10"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6",
                isDragging ? "text-neon-cyan" : "text-neon-cyan/70"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">
              {isDragging ? "Dateien hier ablegen" : "Dateien hier ablegen oder klicken"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {description || `Max. ${maxFiles} Dateien, je ${formatBytes(maxSize)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-neon-red">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* File List */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, index) => {
            const FileIcon = getFileIcon(file);
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-neon-cyan/20 bg-void-surface/50 p-3"
              >
                <div className="rounded bg-neon-cyan/10 p-2">
                  <FileIcon className="h-4 w-4 text-neon-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-200">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="h-8 w-8 text-gray-400 hover:text-neon-red"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Utility function
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
