"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, File, ChevronDown, Check } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { exportData, type ExportFormat, type ExportColumn, type ExportOptions } from "@/lib/export";

// =============================================================================
// EXPORT BUTTON COMPONENT
// =============================================================================

export interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  title?: string;
  subtitle?: string;
  includeTimestamp?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  onExportStart?: (format: ExportFormat) => void;
  onExportComplete?: (format: ExportFormat) => void;
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  title,
  subtitle,
  includeTimestamp = true,
  variant = "outline",
  size = "default",
  className,
  disabled = false,
  onExportStart,
  onExportComplete,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const [lastFormat, setLastFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    setIsExporting(true);
    onExportStart?.(format);

    try {
      const options: ExportOptions = {
        filename,
        title,
        subtitle,
        includeTimestamp,
      };

      // Small delay for UI feedback
      await new Promise((resolve) => setTimeout(resolve, 100));

      exportData(data, columns, format, options);
      setLastFormat(format);

      onExportComplete?.(format);
    } catch (error) {
      console.error("Export failed:", error);
      alert(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatConfig = [
    {
      format: "csv" as ExportFormat,
      label: "CSV",
      description: "Comma-separated values",
      icon: FileText,
    },
    {
      format: "xlsx" as ExportFormat,
      label: "Excel",
      description: "Microsoft Excel format",
      icon: FileSpreadsheet,
    },
    {
      format: "pdf" as ExportFormat,
      label: "PDF",
      description: "Print-ready document",
      icon: File,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={disabled || isExporting || data.length === 0}
        >
          <Download className={`h-4 w-4 mr-2 ${isExporting ? "animate-bounce" : ""}`} />
          {isExporting ? "Exporting..." : "Export"}
          <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {formatConfig.map((config) => (
          <DropdownMenuItem
            key={config.format}
            onClick={() => handleExport(config.format)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <config.icon className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{config.label}</div>
              <div className="text-xs text-muted-foreground">{config.description}</div>
            </div>
            {lastFormat === config.format && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {data.length} record{data.length !== 1 ? "s" : ""} to export
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Re-export types for convenience
export type { ExportFormat, ExportColumn, ExportOptions };
