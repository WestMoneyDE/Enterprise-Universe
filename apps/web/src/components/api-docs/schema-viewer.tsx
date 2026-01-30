"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { SchemaField } from "@/data/api-docs";

// =============================================================================
// SCHEMA VIEWER COMPONENT
// =============================================================================
// Displays Zod schema as readable format with type indicators

interface SchemaViewerProps {
  fields: SchemaField[];
  className?: string;
  variant?: "default" | "compact";
}

export function SchemaViewer({ fields, className, variant = "default" }: SchemaViewerProps) {
  if (fields.length === 0) {
    return (
      <div className={cn("text-white/40 font-mono text-sm italic", className)}>
        No parameters
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {fields.map((field) => (
        <SchemaFieldItem key={field.name} field={field} variant={variant} />
      ))}
    </div>
  );
}

// =============================================================================
// SCHEMA FIELD ITEM
// =============================================================================

interface SchemaFieldItemProps {
  field: SchemaField;
  depth?: number;
  variant?: "default" | "compact";
}

function SchemaFieldItem({ field, depth = 0, variant = "default" }: SchemaFieldItemProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasNested = field.nested && field.nested.length > 0;
  const isCompact = variant === "compact";

  return (
    <div className={cn("font-mono text-sm", depth > 0 && "ml-4")}>
      <div
        className={cn(
          "flex items-start gap-2 py-1 px-2 rounded transition-colors",
          hasNested && "cursor-pointer hover:bg-white/5",
          isCompact ? "py-0.5" : "py-1"
        )}
        onClick={() => hasNested && setExpanded(!expanded)}
      >
        {/* Expand/Collapse Icon */}
        {hasNested ? (
          <span className="text-white/30 mt-0.5 flex-shrink-0">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}

        {/* Field Name */}
        <span className="text-neon-cyan">{field.name}</span>

        {/* Required Marker */}
        {field.required ? (
          <span className="text-neon-red text-xs">*</span>
        ) : (
          <span className="text-white/30 text-xs">?</span>
        )}

        {/* Type Badge */}
        <TypeBadge type={field.type} enumValues={field.enumValues} />

        {/* Description */}
        {field.description && !isCompact && (
          <span className="text-white/40 text-xs ml-2 truncate flex-1">
            // {field.description}
          </span>
        )}
      </div>

      {/* Enum Values */}
      {field.enumValues && field.enumValues.length > 0 && expanded && (
        <div className="ml-10 flex flex-wrap gap-1 py-1">
          {field.enumValues.map((value) => (
            <span
              key={value}
              className="px-1.5 py-0.5 rounded text-[10px] bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
            >
              "{value}"
            </span>
          ))}
        </div>
      )}

      {/* Nested Fields */}
      {hasNested && expanded && (
        <div className="border-l border-white/10 ml-2">
          {field.nested!.map((nestedField) => (
            <SchemaFieldItem
              key={nestedField.name}
              field={nestedField}
              depth={depth + 1}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TYPE BADGE
// =============================================================================

interface TypeBadgeProps {
  type: string;
  enumValues?: string[];
}

function TypeBadge({ type, enumValues }: TypeBadgeProps) {
  const getTypeColor = (t: string): string => {
    switch (t.toLowerCase()) {
      case "string":
        return "bg-neon-green/20 text-neon-green border-neon-green/30";
      case "number":
        return "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30";
      case "boolean":
        return "bg-neon-orange/20 text-neon-orange border-neon-orange/30";
      case "date":
        return "bg-neon-purple/20 text-neon-purple border-neon-purple/30";
      case "object":
        return "bg-neon-gold/20 text-neon-gold border-neon-gold/30";
      case "array":
        return "bg-neon-red/20 text-neon-red border-neon-red/30";
      default:
        return "bg-white/10 text-white/60 border-white/20";
    }
  };

  const displayType = enumValues && enumValues.length > 0 ? "enum" : type;

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border",
        getTypeColor(displayType === "enum" ? "string" : type)
      )}
    >
      {displayType}
    </span>
  );
}

// =============================================================================
// INLINE SCHEMA PREVIEW
// =============================================================================

interface InlineSchemaPreviewProps {
  fields: SchemaField[];
  maxFields?: number;
}

export function InlineSchemaPreview({ fields, maxFields = 3 }: InlineSchemaPreviewProps) {
  if (fields.length === 0) {
    return <span className="text-white/40 font-mono text-xs">void</span>;
  }

  const displayFields = fields.slice(0, maxFields);
  const remaining = fields.length - maxFields;

  return (
    <span className="font-mono text-xs text-white/60">
      {"{ "}
      {displayFields.map((field, index) => (
        <span key={field.name}>
          <span className="text-neon-cyan">{field.name}</span>
          {!field.required && <span className="text-white/30">?</span>}
          <span className="text-white/40">: </span>
          <TypeBadge type={field.type} />
          {index < displayFields.length - 1 && <span className="text-white/40">, </span>}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-white/40"> +{remaining} more</span>
      )}
      {" }"}
    </span>
  );
}

export default SchemaViewer;
