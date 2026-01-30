"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { HoloCard, NeonButton } from "@/components/scifi";
import { EmailTemplate, TemplateCategory } from "@/hooks/use-email-templates";

// ===============================================================================
// TEMPLATE EDITOR - Rich text editor for email templates
// SciFi-styled with variable insertion and preview mode
// ===============================================================================

// Sample data for preview mode
const SAMPLE_DATA = {
  contact: {
    name: "Max Mustermann",
    email: "max.mustermann@example.de",
  },
  deal: {
    name: "Villa Projekt Munchen",
    amount: "450,000",
  },
  user: {
    name: "Anna Schmidt",
  },
};

// Available variables for insertion
const VARIABLES = [
  { key: "{{contact.name}}", label: "Contact Name", icon: "" },
  { key: "{{contact.email}}", label: "Contact Email", icon: "" },
  { key: "{{deal.name}}", label: "Deal Name", icon: "" },
  { key: "{{deal.amount}}", label: "Deal Amount", icon: "" },
  { key: "{{user.name}}", label: "Your Name", icon: "" },
] as const;

// Template categories
const CATEGORIES: { value: TemplateCategory; label: string; icon: string }[] = [
  { value: "welcome", label: "Welcome", icon: "" },
  { value: "follow-up", label: "Follow-up", icon: "" },
  { value: "notification", label: "Notification", icon: "" },
  { value: "custom", label: "Custom", icon: "" },
];

export interface TemplateEditorProps {
  template?: EmailTemplate | null;
  onSave: (template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
  onCancel: () => void;
  isNew?: boolean;
}

export function TemplateEditor({ template, onSave, onCancel, isNew = false }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [category, setCategory] = useState<TemplateCategory>(template?.category || "custom");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setBody(template.body);
      setCategory(template.category);
    } else {
      setName("");
      setSubject("");
      setBody("");
      setCategory("custom");
    }
  }, [template]);

  // Replace variables with sample data
  const replaceVariables = useCallback((text: string): string => {
    return text
      .replace(/\{\{contact\.name\}\}/g, SAMPLE_DATA.contact.name)
      .replace(/\{\{contact\.email\}\}/g, SAMPLE_DATA.contact.email)
      .replace(/\{\{deal\.name\}\}/g, SAMPLE_DATA.deal.name)
      .replace(/\{\{deal\.amount\}\}/g, SAMPLE_DATA.deal.amount)
      .replace(/\{\{user\.name\}\}/g, SAMPLE_DATA.user.name);
  }, []);

  // Insert variable at cursor position
  const insertVariable = useCallback((variable: string) => {
    const textarea = document.getElementById("email-body") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.substring(0, start) + variable + body.substring(end);
      setBody(newBody);
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setBody(body + variable);
    }
  }, [body]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      onSave({
        id: template?.id,
        name: name.trim(),
        subject: subject.trim(),
        body: body.trim(),
        category,
      });
    } finally {
      setIsSaving(false);
    }
  }, [name, subject, body, category, template?.id, onSave]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white tracking-wider">
            {isNew ? "CREATE TEMPLATE" : "EDIT TEMPLATE"}
          </h2>
          <p className="text-sm text-white/50 font-mono mt-1">
            {isPreview ? "Preview Mode" : "Edit Mode"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NeonButton
            variant={isPreview ? "cyan" : "outline"}
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? "Edit" : "Preview"}
          </NeonButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Editor Section */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Template Name */}
          <HoloCard variant="cyan">
            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-xs text-white/50 font-mono uppercase tracking-wider mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter template name..."
                  disabled={isPreview}
                  className={cn(
                    "w-full px-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg",
                    "text-sm font-mono text-white placeholder-white/30",
                    "focus:outline-none focus:border-neon-cyan/50 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-xs text-white/50 font-mono uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => !isPreview && setCategory(cat.value)}
                      disabled={isPreview}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-mono transition-all",
                        category === cat.value
                          ? "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan"
                          : "bg-void-surface/30 border-white/10 text-white/50 hover:border-white/30",
                        isPreview && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="mr-1">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </HoloCard>

          {/* Subject Line */}
          <HoloCard title="SUBJECT LINE" subtitle="Email subject with variables" icon="" variant="cyan">
            {isPreview ? (
              <div className="px-4 py-3 bg-void-surface/30 rounded-lg border border-white/10">
                <p className="text-sm text-white font-mono">{replaceVariables(subject)}</p>
              </div>
            ) : (
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className={cn(
                  "w-full px-4 py-2 bg-void-surface/50 border border-white/10 rounded-lg",
                  "text-sm font-mono text-white placeholder-white/30",
                  "focus:outline-none focus:border-neon-cyan/50 transition-colors"
                )}
              />
            )}
          </HoloCard>

          {/* Email Body */}
          <HoloCard
            title="EMAIL BODY"
            subtitle={isPreview ? "Preview with sample data" : "Formatting: **bold** | *italic* | --- (line)"}
            icon=""
            variant="cyan"
          >
            {isPreview ? (
              <div className="px-4 py-3 bg-void-surface/30 rounded-lg border border-white/10 min-h-[300px]">
                <pre className="text-sm text-white font-mono whitespace-pre-wrap leading-relaxed">
                  {replaceVariables(body)}
                </pre>
              </div>
            ) : (
              <textarea
                id="email-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter email body content...

Use variables like {{contact.name}} to personalize your emails.

Formatting hints:
- **text** for bold
- *text* for italic
- --- for horizontal line"
                rows={12}
                className={cn(
                  "w-full px-4 py-3 bg-void-surface/50 border border-white/10 rounded-lg",
                  "text-sm font-mono text-white placeholder-white/30",
                  "focus:outline-none focus:border-neon-cyan/50 transition-colors",
                  "resize-none"
                )}
              />
            )}
          </HoloCard>
        </div>

        {/* Sidebar - Variables & Preview Info */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Variable Buttons */}
          <HoloCard
            title="INSERT VARIABLES"
            subtitle="Click to insert at cursor"
            icon=""
            variant="purple"
          >
            <div className="space-y-2">
              {VARIABLES.map((variable) => (
                <button
                  key={variable.key}
                  onClick={() => insertVariable(variable.key)}
                  disabled={isPreview}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-left transition-all",
                    "bg-void-surface/30 border-white/10",
                    "hover:bg-neon-purple/10 hover:border-neon-purple/30",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/70 font-mono">
                      <span className="mr-2">{variable.icon}</span>
                      {variable.label}
                    </span>
                    <span className="text-[10px] text-neon-cyan font-mono">{variable.key}</span>
                  </div>
                </button>
              ))}
            </div>
          </HoloCard>

          {/* Preview Data Info */}
          {isPreview && (
            <HoloCard
              title="SAMPLE DATA"
              subtitle="Used in preview"
              icon=""
              variant="gold"
            >
              <div className="space-y-3 text-xs font-mono">
                <div className="space-y-1">
                  <div className="text-white/50">Contact:</div>
                  <div className="pl-2 text-white/70">
                    <div>Name: {SAMPLE_DATA.contact.name}</div>
                    <div>Email: {SAMPLE_DATA.contact.email}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-white/50">Deal:</div>
                  <div className="pl-2 text-white/70">
                    <div>Name: {SAMPLE_DATA.deal.name}</div>
                    <div>Amount: {SAMPLE_DATA.deal.amount}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-white/50">User:</div>
                  <div className="pl-2 text-white/70">
                    <div>Name: {SAMPLE_DATA.user.name}</div>
                  </div>
                </div>
              </div>
            </HoloCard>
          )}

          {/* Formatting Help */}
          {!isPreview && (
            <HoloCard
              title="FORMATTING TIPS"
              subtitle="Basic text formatting"
              icon=""
              variant="gold"
            >
              <div className="space-y-2 text-xs font-mono text-white/50">
                <div className="flex justify-between">
                  <span>**bold text**</span>
                  <span className="text-white">bold text</span>
                </div>
                <div className="flex justify-between">
                  <span>*italic text*</span>
                  <span className="text-white italic">italic text</span>
                </div>
                <div className="flex justify-between">
                  <span>---</span>
                  <span className="text-white">horizontal line</span>
                </div>
                <div className="pt-2 border-t border-white/10 text-white/30">
                  Variables are replaced with actual contact data when sending.
                </div>
              </div>
            </HoloCard>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="text-xs font-mono text-white/30">
          {template?.updatedAt && (
            <span>
              Last updated:{" "}
              {new Date(template.updatedAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <NeonButton variant="outline" size="md" onClick={onCancel}>
            Cancel
          </NeonButton>
          <NeonButton
            variant="cyan"
            size="md"
            glow
            onClick={handleSave}
            loading={isSaving}
            disabled={!name.trim() || !subject.trim() || !body.trim()}
          >
            {isNew ? "Create Template" : "Save Changes"}
          </NeonButton>
        </div>
      </div>
    </div>
  );
}

export default TemplateEditor;
