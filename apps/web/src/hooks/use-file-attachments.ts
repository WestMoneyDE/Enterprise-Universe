"use client";

import { useState, useEffect, useCallback } from "react";

// ===============================================================================
// USE FILE ATTACHMENTS - Hook for managing file attachment metadata
// Stores attachment metadata in localStorage under 'nexus-attachments'
// ===============================================================================

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  entityType: string;
  entityId: string;
  uploadedAt: string;
}

const STORAGE_KEY = "nexus-attachments";

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function loadAttachments(): FileAttachment[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveAttachments(attachments: FileAttachment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attachments));
  } catch (error) {
    console.error("Failed to save attachments to localStorage:", error);
  }
}

export function useFileAttachments() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load attachments from localStorage on mount
  useEffect(() => {
    setAttachments(loadAttachments());
    setIsLoading(false);
  }, []);

  // Save attachments to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveAttachments(attachments);
    }
  }, [attachments, isLoading]);

  const addAttachment = useCallback(
    (
      file: File,
      entityType: string,
      entityId: string
    ): FileAttachment => {
      // Create a temporary URL for preview (in a real app, this would be uploaded)
      const url = URL.createObjectURL(file);

      const newAttachment: FileAttachment = {
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        url,
        entityType,
        entityId,
        uploadedAt: new Date().toISOString(),
      };

      setAttachments((prev) => [...prev, newAttachment]);
      return newAttachment;
    },
    []
  );

  const addAttachments = useCallback(
    (
      files: File[],
      entityType: string,
      entityId: string
    ): FileAttachment[] => {
      const newAttachments = files.map((file) => {
        const url = URL.createObjectURL(file);
        return {
          id: generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
          url,
          entityType,
          entityId,
          uploadedAt: new Date().toISOString(),
        };
      });

      setAttachments((prev) => [...prev, ...newAttachments]);
      return newAttachments;
    },
    []
  );

  const removeAttachment = useCallback((id: string): void => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment && attachment.url.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const getAttachments = useCallback(
    (entityType: string, entityId: string): FileAttachment[] => {
      return attachments.filter(
        (a) => a.entityType === entityType && a.entityId === entityId
      );
    },
    [attachments]
  );

  const getAttachmentById = useCallback(
    (id: string): FileAttachment | undefined => {
      return attachments.find((a) => a.id === id);
    },
    [attachments]
  );

  const clearAttachments = useCallback(
    (entityType?: string, entityId?: string): void => {
      if (entityType && entityId) {
        setAttachments((prev) =>
          prev.filter(
            (a) => !(a.entityType === entityType && a.entityId === entityId)
          )
        );
      } else {
        // Revoke all blob URLs
        attachments.forEach((a) => {
          if (a.url.startsWith("blob:")) {
            URL.revokeObjectURL(a.url);
          }
        });
        setAttachments([]);
      }
    },
    [attachments]
  );

  return {
    attachments,
    isLoading,
    addAttachment,
    addAttachments,
    removeAttachment,
    getAttachments,
    getAttachmentById,
    clearAttachments,
  };
}

// Utility functions for file type detection
export function getFileCategory(
  type: string
): "image" | "pdf" | "document" | "spreadsheet" | "generic" {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (
    type.includes("document") ||
    type.includes("msword") ||
    type.includes("text/")
  ) {
    return "document";
  }
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("csv")
  ) {
    return "spreadsheet";
  }
  return "generic";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function isValidFileType(
  file: File,
  allowedTypes: string[] = [
    "image/*",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]
): boolean {
  return allowedTypes.some((type) => {
    if (type.endsWith("/*")) {
      return file.type.startsWith(type.replace("/*", ""));
    }
    return file.type === type;
  });
}
