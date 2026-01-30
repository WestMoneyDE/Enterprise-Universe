"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileAttachment, getFileCategory } from "@/hooks/use-file-attachments";

// ===============================================================================
// FILE PREVIEW - Modal for previewing images and PDFs
// Features: zoom controls, navigation, fullscreen mode
// ===============================================================================

export interface FilePreviewProps {
  file: FileAttachment | null;
  files?: FileAttachment[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (file: FileAttachment) => void;
}

export function FilePreview({
  file,
  files = [],
  isOpen,
  onClose,
  onNavigate,
}: FilePreviewProps) {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Reset state when file changes
  React.useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [file]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "r":
          handleRotate();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, file, files]);

  // Fullscreen handling
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!isOpen || !file) return null;

  const currentIndex = files.findIndex((f) => f.id === file.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;
  const fileCategory = getFileCategory(file.type);
  const isImage = fileCategory === "image";
  const isPdf = fileCategory === "pdf";

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      onNavigate(files[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(files[currentIndex + 1]);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neon-cyan/20 bg-void-surface/80">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-200 truncate max-w-[300px]">
            {file.name}
          </h3>
          {files.length > 1 && (
            <span className="text-xs text-gray-500 font-mono">
              {currentIndex + 1} / {files.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls (only for images) */}
          {isImage && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="h-8 w-8 text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10"
                title="Zoom out (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500 font-mono w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="h-8 w-8 text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10"
                title="Zoom in (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-neon-cyan/20 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="h-8 w-8 text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10"
                title="Rotate (R)"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </>
          )}

          <div className="w-px h-6 bg-neon-cyan/20 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8 text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10"
            title="Toggle fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8 text-gray-400 hover:text-neon-green hover:bg-neon-green/10"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-neon-cyan/20 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-neon-red hover:bg-neon-red/10"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Navigation buttons */}
        {files.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className={cn(
                "absolute left-4 z-10 h-12 w-12 rounded-full",
                "bg-void-surface/50 border border-neon-cyan/20",
                "text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan/40",
                "transition-all duration-200",
                !hasPrevious && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={!hasNext}
              className={cn(
                "absolute right-4 z-10 h-12 w-12 rounded-full",
                "bg-void-surface/50 border border-neon-cyan/20",
                "text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan/40",
                "transition-all duration-200",
                !hasNext && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Image preview */}
        {isImage && (
          <div
            className="transition-transform duration-200 cursor-move"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={file.url}
              alt={file.name}
              className="max-w-[90vw] max-h-[80vh] object-contain select-none"
              draggable={false}
            />
          </div>
        )}

        {/* PDF preview placeholder */}
        {isPdf && (
          <div className="flex flex-col items-center justify-center gap-6 p-8 rounded-xl border border-neon-cyan/20 bg-void-surface/50">
            <div className="rounded-full p-6 bg-neon-red/10 border border-neon-red/20">
              <FileText className="h-16 w-16 text-neon-red" />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-medium text-gray-200">{file.name}</h4>
              <p className="text-sm text-gray-500 mt-2">
                PDF preview coming soon
              </p>
            </div>
            <Button
              variant="cyan"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <p className="text-xs text-gray-600 max-w-sm text-center">
              For now, please download the file to view it in your preferred PDF reader.
            </p>
          </div>
        )}
      </div>

      {/* Footer with thumbnails (when multiple files) */}
      {files.length > 1 && (
        <div className="px-4 py-3 border-t border-neon-cyan/20 bg-void-surface/80">
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {files.map((f, index) => {
              const isActive = f.id === file.id;
              const category = getFileCategory(f.type);
              const isImg = category === "image";

              return (
                <button
                  key={f.id}
                  onClick={() => onNavigate?.(f)}
                  className={cn(
                    "relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200",
                    "border-2",
                    isActive
                      ? "border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                      : "border-transparent hover:border-neon-cyan/50 opacity-60 hover:opacity-100"
                  )}
                >
                  {isImg ? (
                    <img
                      src={f.url}
                      alt={f.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-void-surface">
                      <FileText className="h-6 w-6 text-neon-red" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-4 text-[10px] text-gray-600 font-mono hidden md:block">
        <span className="px-1.5 py-0.5 rounded bg-void-surface/50 border border-neon-cyan/10 mr-1">
          ESC
        </span>
        close
        {files.length > 1 && (
          <>
            <span className="mx-2">|</span>
            <span className="px-1.5 py-0.5 rounded bg-void-surface/50 border border-neon-cyan/10 mr-1">
              ←
            </span>
            <span className="px-1.5 py-0.5 rounded bg-void-surface/50 border border-neon-cyan/10 mr-1">
              →
            </span>
            navigate
          </>
        )}
        {isImage && (
          <>
            <span className="mx-2">|</span>
            <span className="px-1.5 py-0.5 rounded bg-void-surface/50 border border-neon-cyan/10 mr-1">
              +
            </span>
            <span className="px-1.5 py-0.5 rounded bg-void-surface/50 border border-neon-cyan/10 mr-1">
              -
            </span>
            zoom
            <span className="mx-2">|</span>
            <span className="px-1.5 py-0.5 rounded bg-void-surface/50 border border-neon-cyan/10 mr-1">
              R
            </span>
            rotate
          </>
        )}
      </div>
    </div>
  );
}

export default FilePreview;
