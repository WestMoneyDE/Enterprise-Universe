"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { HoloCard, NeonButton } from "@/components/scifi";
import { EmailTemplate, TemplateCategory } from "@/hooks/use-email-templates";

// ===============================================================================
// TEMPLATE LIST - Display and manage email templates
// SciFi card styling with filtering and actions
// ===============================================================================

// Category configuration
const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; icon: string; color: string }> = {
  welcome: { label: "Welcome", icon: "", color: "green" },
  "follow-up": { label: "Follow-up", icon: "", color: "cyan" },
  notification: { label: "Notification", icon: "", color: "purple" },
  custom: { label: "Custom", icon: "", color: "gold" },
};

const ALL_CATEGORIES: TemplateCategory[] = ["welcome", "follow-up", "notification", "custom"];

export interface TemplateListProps {
  templates: EmailTemplate[];
  onCreateNew: () => void;
  onEdit: (template: EmailTemplate) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  isLoading?: boolean;
}

export function TemplateList({
  templates,
  onCreateNew,
  onEdit,
  onDelete,
  onDuplicate,
  isLoading = false,
}: TemplateListProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Group templates by category for stats
  const categoryStats = useMemo(() => {
    const stats: Record<TemplateCategory | "all", number> = {
      all: templates.length,
      welcome: 0,
      "follow-up": 0,
      notification: 0,
      custom: 0,
    };
    templates.forEach((t) => {
      stats[t.category]++;
    });
    return stats;
  }, [templates]);

  // Handle delete confirmation
  const handleDeleteClick = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-void-surface/50 rounded animate-pulse" />
          <div className="h-10 w-32 bg-void-surface/50 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-void-surface/30 rounded-lg border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-white tracking-wider">
            EMAIL TEMPLATES
          </h2>
          <p className="text-sm text-white/50 font-mono mt-1">
            {templates.length} template{templates.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <NeonButton variant="cyan" size="md" glow onClick={onCreateNew}>
          + Create New
        </NeonButton>
      </div>

      {/* Filters */}
      <HoloCard variant="cyan">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"></span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className={cn(
                  "w-full pl-10 pr-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg",
                  "text-sm font-mono text-white placeholder-white/30",
                  "focus:outline-none focus:border-neon-cyan/50 transition-colors"
                )}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-mono transition-all",
                selectedCategory === "all"
                  ? "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan"
                  : "bg-void-surface/30 border-white/10 text-white/50 hover:border-white/30"
              )}
            >
              All ({categoryStats.all})
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-mono transition-all",
                    selectedCategory === cat
                      ? cn(
                          "border-opacity-50",
                          config.color === "green" && "bg-neon-green/20 border-neon-green/50 text-neon-green",
                          config.color === "cyan" && "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan",
                          config.color === "purple" && "bg-neon-purple/20 border-neon-purple/50 text-neon-purple",
                          config.color === "gold" && "bg-neon-gold/20 border-neon-gold/50 text-neon-gold"
                        )
                      : "bg-void-surface/30 border-white/10 text-white/50 hover:border-white/30"
                  )}
                >
                  <span className="mr-1">{config.icon}</span>
                  {config.label} ({categoryStats[cat]})
                </button>
              );
            })}
          </div>
        </div>
      </HoloCard>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <HoloCard variant="purple">
          <div className="py-12 text-center">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-lg font-display text-white/70 mb-2">No templates found</h3>
            <p className="text-sm text-white/40 font-mono mb-6">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your filters"
                : "Create your first email template to get started"}
            </p>
            {!searchQuery && selectedCategory === "all" && (
              <NeonButton variant="cyan" size="sm" onClick={onCreateNew}>
                Create Template
              </NeonButton>
            )}
          </div>
        </HoloCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => onEdit(template)}
              onDelete={() => handleDeleteClick(template.id)}
              onDuplicate={onDuplicate ? () => onDuplicate(template.id) : undefined}
              isConfirmingDelete={confirmDelete === template.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===============================================================================
// TEMPLATE CARD - Individual template display
// ===============================================================================

interface TemplateCardProps {
  template: EmailTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  isConfirmingDelete: boolean;
}

function TemplateCard({ template, onEdit, onDelete, onDuplicate, isConfirmingDelete }: TemplateCardProps) {
  const categoryConfig = CATEGORY_CONFIG[template.category];
  const variantMap: Record<string, "cyan" | "purple" | "gold" | "default"> = {
    green: "cyan",
    cyan: "cyan",
    purple: "purple",
    gold: "gold",
  };

  return (
    <HoloCard
      variant={variantMap[categoryConfig.color] || "default"}
      className="flex flex-col h-full"
    >
      <div className="flex-1 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-white truncate">
              {template.name}
            </h3>
            <div
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono mt-1",
                categoryConfig.color === "green" && "bg-neon-green/10 text-neon-green border border-neon-green/30",
                categoryConfig.color === "cyan" && "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30",
                categoryConfig.color === "purple" && "bg-neon-purple/10 text-neon-purple border border-neon-purple/30",
                categoryConfig.color === "gold" && "bg-neon-gold/10 text-neon-gold border border-neon-gold/30"
              )}
            >
              <span>{categoryConfig.icon}</span>
              {categoryConfig.label}
            </div>
          </div>
        </div>

        {/* Subject */}
        <div>
          <div className="text-[10px] text-white/40 font-mono uppercase mb-1">Subject</div>
          <p className="text-xs text-white/70 font-mono line-clamp-2">{template.subject}</p>
        </div>

        {/* Body Preview */}
        <div>
          <div className="text-[10px] text-white/40 font-mono uppercase mb-1">Preview</div>
          <p className="text-xs text-white/50 font-mono line-clamp-3">{template.body}</p>
        </div>

        {/* Metadata */}
        <div className="text-[10px] text-white/30 font-mono">
          Updated:{" "}
          {new Date(template.updatedAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/10">
        <NeonButton variant="cyan" size="sm" className="flex-1" onClick={onEdit}>
          Edit
        </NeonButton>
        {onDuplicate && (
          <NeonButton variant="purple" size="sm" onClick={onDuplicate}>
            Duplicate
          </NeonButton>
        )}
        <NeonButton
          variant={isConfirmingDelete ? "red" : "outline"}
          size="sm"
          onClick={onDelete}
        >
          {isConfirmingDelete ? "Confirm" : "Delete"}
        </NeonButton>
      </div>
    </HoloCard>
  );
}

export default TemplateList;
