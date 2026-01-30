"use client";

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { NeonButton } from "@/components/scifi";
import { ParsedData, EntityType } from "@/hooks/use-import";

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD STEP - File Drop Zone and Entity Type Selection
// Accepts CSV, XLSX, XLS files with drag-and-drop support
// ═══════════════════════════════════════════════════════════════════════════════

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const ACCEPTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export interface UploadStepProps {
  file: File | null;
  parsedData: ParsedData | null;
  parseError: string | null;
  isParsing: boolean;
  entityType: EntityType;
  onFileSelect: (file: File | null) => Promise<void>;
  onEntityTypeChange: (type: EntityType) => void;
}

export function UploadStep({
  file,
  parsedData,
  parseError,
  isParsing,
  entityType,
  onFileSelect,
  onEntityTypeChange,
}: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`;
    }
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return "File too large. Maximum size is 10MB.";
    }
    return null;
  }, []);

  const handleFileInput = useCallback(
    async (file: File) => {
      const error = validateFile(file);
      if (error) {
        // We'll handle this by passing a null file and let the parent show error
        await onFileSelect(null);
        return;
      }
      await onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await handleFileInput(files[0]);
      }
    },
    [handleFileInput]
  );

  const handleInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await handleFileInput(files[0]);
      }
    },
    [handleFileInput]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(async () => {
    await onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Entity Type Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-mono text-white/50 uppercase tracking-wider">
          Import Type
        </label>
        <div className="flex gap-3">
          {(["contact", "deal"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onEntityTypeChange(type)}
              disabled={isParsing}
              className={cn(
                "flex-1 py-3 px-4 rounded-lg border transition-all",
                "font-display text-sm uppercase tracking-wider",
                entityType === type
                  ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan"
                  : "bg-void-surface/30 border-white/10 text-white/50 hover:border-white/30 hover:text-white"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">
                  {type === "contact" ? "👤" : "💼"}
                </span>
                <span>{type === "contact" ? "Contacts" : "Deals"}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[10px] font-mono text-white/30">
          {entityType === "contact"
            ? "Import contacts with name, email, phone, and company"
            : "Import deals with name, amount, stage, and contact"}
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all duration-300",
          "min-h-[200px] flex flex-col items-center justify-center",
          isDragging
            ? "border-neon-cyan bg-neon-cyan/10 scale-[1.02]"
            : file
            ? "border-neon-green/50 bg-neon-green/5"
            : "border-white/20 hover:border-neon-cyan/50 bg-void-surface/30"
        )}
      >
        {/* Corner Decorations */}
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-neon-cyan/30" />
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-neon-cyan/30" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-neon-cyan/30" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-neon-cyan/30" />

        {isParsing ? (
          // Parsing State
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-neon-cyan/20" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
            </div>
            <div className="text-sm font-mono text-neon-cyan">Analyzing file...</div>
          </div>
        ) : file && parsedData ? (
          // File Loaded State
          <div className="flex flex-col items-center gap-4 p-6">
            {/* File Icon */}
            <div className="relative">
              <div className="w-16 h-16 rounded-lg bg-neon-green/20 border border-neon-green/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-neon-green flex items-center justify-center">
                <svg className="w-4 h-4 text-void" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* File Info */}
            <div className="text-center">
              <div className="font-display text-lg text-white font-bold truncate max-w-[300px]">
                {parsedData.fileName}
              </div>
              <div className="text-xs font-mono text-white/50 mt-1">
                {formatFileSize(parsedData.fileSize)}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-2">
              <div className="text-center">
                <div className="text-2xl font-mono text-neon-cyan font-bold">
                  {parsedData.headers.length}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase">Columns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono text-neon-purple font-bold">
                  {parsedData.totalRows}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase">Rows</div>
              </div>
            </div>

            {/* Remove Button */}
            <NeonButton variant="ghost" size="sm" onClick={handleRemoveFile}>
              Remove File
            </NeonButton>
          </div>
        ) : parseError ? (
          // Error State
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="w-16 h-16 rounded-full bg-neon-red/20 border border-neon-red/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-neon-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="text-center">
              <div className="font-display text-sm text-neon-red font-bold uppercase">
                Parse Error
              </div>
              <div className="text-xs font-mono text-white/50 mt-1 max-w-[300px]">
                {parseError}
              </div>
            </div>
            <NeonButton variant="cyan" size="sm" onClick={handleBrowseClick}>
              Try Another File
            </NeonButton>
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="relative">
              <div
                className={cn(
                  "w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all",
                  isDragging
                    ? "border-neon-cyan bg-neon-cyan/20 scale-110"
                    : "border-white/20"
                )}
              >
                <svg
                  className={cn(
                    "w-10 h-10 transition-colors",
                    isDragging ? "text-neon-cyan" : "text-white/30"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              {isDragging && (
                <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-neon-cyan animate-ping opacity-50" />
              )}
            </div>

            <div className="text-center">
              <div className="font-display text-lg text-white font-bold">
                {isDragging ? "Drop your file here" : "Drag and drop your file"}
              </div>
              <div className="text-xs font-mono text-white/50 mt-1">
                or click to browse
              </div>
            </div>

            <NeonButton variant="cyan" size="sm" onClick={handleBrowseClick} glow>
              Browse Files
            </NeonButton>

            {/* Accepted Formats */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-mono text-white/30">Accepted:</span>
              {ACCEPTED_EXTENSIONS.map((ext) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-white/50"
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Headers */}
      {parsedData && (
        <div className="space-y-2">
          <label className="block text-xs font-mono text-white/50 uppercase tracking-wider">
            Detected Columns
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-void-surface/30 border border-white/10 rounded-lg">
            {parsedData.headers.map((header, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-mono bg-neon-cyan/10 border border-neon-cyan/30 rounded text-neon-cyan"
              >
                {header || `Column ${index + 1}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadStep;
