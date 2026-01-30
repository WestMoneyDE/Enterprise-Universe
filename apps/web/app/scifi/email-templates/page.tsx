"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { HoloCard, NeonButton, StatsGrid, StatItem } from "@/components/scifi";
import { TemplateEditor, TemplateList } from "@/components/email";
import { useEmailTemplates, EmailTemplate, TemplateCategory } from "@/hooks/use-email-templates";

// ===============================================================================
// EMAIL TEMPLATES PAGE - SciFi-styled email template management
// Integrated with the Nexus Command Center design system
// ===============================================================================

type EditorMode = "list" | "create" | "edit";

export default function EmailTemplatesPage() {
  const {
    templates,
    isLoading,
    saveTemplate,
    deleteTemplate,
    duplicateTemplate,
  } = useEmailTemplates();

  const [editorMode, setEditorMode] = useState<EditorMode>("list");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showSlideOver, setShowSlideOver] = useState(false);

  // Calculate stats
  const stats: StatItem[] = [
    {
      id: "total",
      label: "Total Templates",
      value: templates.length.toString(),
      trend: "neutral",
      status: "online",
    },
    {
      id: "welcome",
      label: "Welcome",
      value: templates.filter((t) => t.category === "welcome").length.toString(),
      trend: "neutral",
      status: "online",
    },
    {
      id: "followup",
      label: "Follow-up",
      value: templates.filter((t) => t.category === "follow-up").length.toString(),
      trend: "neutral",
      status: "online",
    },
    {
      id: "notification",
      label: "Notification",
      value: templates.filter((t) => t.category === "notification").length.toString(),
      trend: "neutral",
      status: "online",
    },
  ];

  // Handle create new template
  const handleCreateNew = useCallback(() => {
    setSelectedTemplate(null);
    setEditorMode("create");
    setShowSlideOver(true);
  }, []);

  // Handle edit template
  const handleEdit = useCallback((template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditorMode("edit");
    setShowSlideOver(true);
  }, []);

  // Handle save template
  const handleSave = useCallback(
    (templateData: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
      saveTemplate(templateData);
      setShowSlideOver(false);
      setEditorMode("list");
      setSelectedTemplate(null);
    },
    [saveTemplate]
  );

  // Handle cancel editing
  const handleCancel = useCallback(() => {
    setShowSlideOver(false);
    setEditorMode("list");
    setSelectedTemplate(null);
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    (id: string) => {
      deleteTemplate(id);
    },
    [deleteTemplate]
  );

  // Handle duplicate
  const handleDuplicate = useCallback(
    (id: string) => {
      const duplicated = duplicateTemplate(id);
      if (duplicated) {
        // Optionally open editor for the duplicated template
        handleEdit(duplicated);
      }
    },
    [duplicateTemplate, handleEdit]
  );

  return (
    <div className="p-6 space-y-6 relative min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            EMAIL TEMPLATES
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Template Management System:{" "}
            <span className="text-neon-cyan">ACTIVE</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick actions */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono",
              "border-neon-green/30 text-neon-green bg-neon-green/10"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            Auto-save: ON
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} columns={4} animated variant="cyan" />

      {/* Main Content */}
      <div className="relative">
        <TemplateList
          templates={templates}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          isLoading={isLoading}
        />
      </div>

      {/* Slide-over Editor */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-4xl",
          "transform transition-transform duration-300 ease-in-out",
          showSlideOver ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Backdrop */}
        {showSlideOver && (
          <div
            className="fixed inset-0 bg-void/80 backdrop-blur-sm -z-10"
            onClick={handleCancel}
          />
        )}

        {/* Editor Panel */}
        <div className="h-full bg-void-dark border-l border-neon-cyan/20 overflow-y-auto">
          {/* Close button */}
          <button
            onClick={handleCancel}
            className={cn(
              "absolute top-4 left-4 z-10 p-2 rounded-lg",
              "bg-void-surface/50 border border-white/10",
              "text-white/50 hover:text-white hover:border-neon-cyan/30",
              "transition-colors"
            )}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Editor Content */}
          <div className="p-6 pt-16">
            <TemplateEditor
              template={selectedTemplate}
              onSave={handleSave}
              onCancel={handleCancel}
              isNew={editorMode === "create"}
            />
          </div>
        </div>
      </div>

      {/* Tips Card */}
      {!showSlideOver && templates.length > 0 && (
        <HoloCard
          title="TEMPLATE TIPS"
          subtitle="Maximize email effectiveness"
          icon=""
          variant="purple"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TipItem
              icon=""
              title="Personalization"
              description="Use variables like {{contact.name}} to personalize each email automatically."
            />
            <TipItem
              icon=""
              title="Organization"
              description="Categorize templates to quickly find the right one for each situation."
            />
            <TipItem
              icon=""
              title="Consistency"
              description="Maintain brand voice and messaging across all team communications."
            />
          </div>
        </HoloCard>
      )}

      {/* Recent Activity */}
      {!showSlideOver && templates.length > 0 && (
        <HoloCard
          title="RECENTLY UPDATED"
          subtitle="Last 5 modified templates"
          icon=""
          variant="cyan"
        >
          <div className="space-y-2">
            {templates
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 5)
              .map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleEdit(template)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border",
                    "bg-void-surface/30 border-white/10",
                    "hover:border-neon-cyan/30 hover:bg-neon-cyan/5",
                    "transition-all text-left"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-lg">
                      {template.category === "welcome" && ""}
                      {template.category === "follow-up" && ""}
                      {template.category === "notification" && ""}
                      {template.category === "custom" && ""}
                    </span>
                    <div>
                      <div className="text-sm font-display text-white">{template.name}</div>
                      <div className="text-xs font-mono text-white/40 truncate max-w-[300px]">
                        {template.subject}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-white/30">
                    {formatRelativeTime(new Date(template.updatedAt))}
                  </div>
                </button>
              ))}
          </div>
        </HoloCard>
      )}
    </div>
  );
}

// ===============================================================================
// HELPER COMPONENTS
// ===============================================================================

interface TipItemProps {
  icon: string;
  title: string;
  description: string;
}

function TipItem({ icon, title, description }: TipItemProps) {
  return (
    <div className="p-4 rounded-lg bg-void-surface/30 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg text-neon-purple">{icon}</span>
        <h4 className="text-sm font-display font-bold text-white">{title}</h4>
      </div>
      <p className="text-xs text-white/50 font-mono">{description}</p>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}
