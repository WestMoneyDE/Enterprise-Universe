"use client";

import { useState, useEffect, useCallback } from "react";

// ===============================================================================
// EMAIL TEMPLATES HOOK - Manage email templates in localStorage
// ===============================================================================

export type TemplateCategory = "welcome" | "follow-up" | "notification" | "custom";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: TemplateCategory;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "nexus-email-templates";

// Sample templates for initial state
const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "template-001",
    name: "Welcome New Lead",
    subject: "Welcome to West Money Bau, {{contact.name}}!",
    body: `Dear {{contact.name}},

Thank you for your interest in West Money Bau. We're excited to help you with your construction project.

Your assigned account manager, {{user.name}}, will be in touch shortly to discuss your requirements.

Best regards,
The West Money Bau Team`,
    category: "welcome",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template-002",
    name: "Deal Follow-up",
    subject: "Following up on {{deal.name}}",
    body: `Hi {{contact.name}},

I wanted to follow up regarding {{deal.name}} with a value of {{deal.amount}}.

Do you have any questions or would you like to schedule a meeting to discuss next steps?

Looking forward to hearing from you.

Best,
{{user.name}}`,
    category: "follow-up",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template-003",
    name: "Project Update Notification",
    subject: "Update on {{deal.name}}",
    body: `Dear {{contact.name}},

We wanted to provide you with an update on your project {{deal.name}}.

[Insert project update details here]

If you have any questions, please don't hesitate to reach out.

Best regards,
{{user.name}}`,
    category: "notification",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface UseEmailTemplatesReturn {
  templates: EmailTemplate[];
  isLoading: boolean;
  saveTemplate: (template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string }) => EmailTemplate;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => EmailTemplate | undefined;
  getTemplatesByCategory: (category: TemplateCategory) => EmailTemplate[];
  duplicateTemplate: (id: string) => EmailTemplate | undefined;
}

export function useEmailTemplates(): UseEmailTemplatesReturn {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load templates from localStorage on mount
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setTemplates(parsed);
        } else {
          // Initialize with default templates
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
          setTemplates(DEFAULT_TEMPLATES);
        }
      } catch {
        // If parsing fails, use defaults
        setTemplates(DEFAULT_TEMPLATES);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Persist templates to localStorage whenever they change
  const persistTemplates = useCallback((newTemplates: EmailTemplate[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  }, []);

  // Save template (create or update)
  const saveTemplate = useCallback(
    (template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string }): EmailTemplate => {
      const now = new Date().toISOString();

      if (template.id) {
        // Update existing template
        const existing = templates.find((t) => t.id === template.id);
        if (existing) {
          const updated: EmailTemplate = {
            ...existing,
            ...template,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: now,
          };
          const newTemplates = templates.map((t) => (t.id === template.id ? updated : t));
          persistTemplates(newTemplates);
          return updated;
        }
      }

      // Create new template
      const newTemplate: EmailTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: template.name,
        subject: template.subject,
        body: template.body,
        category: template.category,
        createdAt: now,
        updatedAt: now,
      };
      persistTemplates([...templates, newTemplate]);
      return newTemplate;
    },
    [templates, persistTemplates]
  );

  // Delete template
  const deleteTemplate = useCallback(
    (id: string) => {
      const newTemplates = templates.filter((t) => t.id !== id);
      persistTemplates(newTemplates);
    },
    [templates, persistTemplates]
  );

  // Get template by ID
  const getTemplate = useCallback(
    (id: string): EmailTemplate | undefined => {
      return templates.find((t) => t.id === id);
    },
    [templates]
  );

  // Get templates by category
  const getTemplatesByCategory = useCallback(
    (category: TemplateCategory): EmailTemplate[] => {
      return templates.filter((t) => t.category === category);
    },
    [templates]
  );

  // Duplicate template
  const duplicateTemplate = useCallback(
    (id: string): EmailTemplate | undefined => {
      const original = templates.find((t) => t.id === id);
      if (!original) return undefined;

      return saveTemplate({
        name: `${original.name} (Copy)`,
        subject: original.subject,
        body: original.body,
        category: original.category,
      });
    },
    [templates, saveTemplate]
  );

  return {
    templates,
    isLoading,
    saveTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByCategory,
    duplicateTemplate,
  };
}
