// ===================================================================================================
// USE-TAGS - Hook for managing tags with localStorage persistence
// Supports tagging any entity type (contacts, deals, projects, etc.)
// ===================================================================================================

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

// ===================================================================================================
// TYPES
// ===================================================================================================

export type TagColor = "cyan" | "purple" | "green" | "gold" | "red" | "orange";

export interface Tag {
  id: string;
  name: string;
  color: TagColor;
  entityType?: string; // Optional: restrict tag to specific entity type
  createdAt: string;
  updatedAt: string;
}

export interface EntityTagAssignment {
  entityType: string;
  entityId: string;
  tagIds: string[];
}

export interface UseTagsOptions {
  entityType?: string; // Filter tags by entity type
}

export interface UseTagsReturn {
  tags: Tag[];
  addTag: (name: string, color: TagColor, entityType?: string) => Tag;
  updateTag: (id: string, updates: Partial<Pick<Tag, "name" | "color">>) => Tag | null;
  deleteTag: (id: string) => void;
  mergeTags: (sourceId: string, targetId: string) => void;
  getTagsForEntity: (entityType: string, entityId: string) => Tag[];
  setEntityTags: (entityType: string, entityId: string, tagIds: string[]) => void;
  addTagToEntity: (entityType: string, entityId: string, tagId: string) => void;
  removeTagFromEntity: (entityType: string, entityId: string, tagId: string) => void;
  getTagUsageCount: (tagId: string) => number;
  searchTags: (query: string) => Tag[];
}

// ===================================================================================================
// STORAGE KEYS
// ===================================================================================================

const TAGS_STORAGE_KEY = "nexus-tags";
const ENTITY_TAGS_STORAGE_KEY = "nexus-entity-tags";

// ===================================================================================================
// PRESET COLORS
// ===================================================================================================

export const TAG_COLORS: TagColor[] = ["cyan", "purple", "green", "gold", "red", "orange"];

export const TAG_COLOR_STYLES: Record<TagColor, { bg: string; text: string; border: string; glow: string }> = {
  cyan: {
    bg: "bg-neon-cyan/20",
    text: "text-neon-cyan",
    border: "border-neon-cyan/50",
    glow: "shadow-[0_0_10px_rgba(0,240,255,0.3)]",
  },
  purple: {
    bg: "bg-neon-purple/20",
    text: "text-neon-purple",
    border: "border-neon-purple/50",
    glow: "shadow-[0_0_10px_rgba(168,85,247,0.3)]",
  },
  green: {
    bg: "bg-neon-green/20",
    text: "text-neon-green",
    border: "border-neon-green/50",
    glow: "shadow-[0_0_10px_rgba(0,255,136,0.3)]",
  },
  gold: {
    bg: "bg-neon-gold/20",
    text: "text-neon-gold",
    border: "border-neon-gold/50",
    glow: "shadow-[0_0_10px_rgba(255,215,0,0.3)]",
  },
  red: {
    bg: "bg-neon-red/20",
    text: "text-neon-red",
    border: "border-neon-red/50",
    glow: "shadow-[0_0_10px_rgba(255,51,102,0.3)]",
  },
  orange: {
    bg: "bg-neon-orange/20",
    text: "text-neon-orange",
    border: "border-neon-orange/50",
    glow: "shadow-[0_0_10px_rgba(255,107,0,0.3)]",
  },
};

// ===================================================================================================
// HOOK IMPLEMENTATION
// ===================================================================================================

export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
  const { entityType: filterEntityType } = options;

  const [tags, setTags] = useState<Tag[]>([]);
  const [entityTags, setEntityTags] = useState<EntityTagAssignment[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedTags = localStorage.getItem(TAGS_STORAGE_KEY);
      if (storedTags) {
        setTags(JSON.parse(storedTags) as Tag[]);
      }

      const storedEntityTags = localStorage.getItem(ENTITY_TAGS_STORAGE_KEY);
      if (storedEntityTags) {
        setEntityTags(JSON.parse(storedEntityTags) as EntityTagAssignment[]);
      }
    } catch (error) {
      console.error("Failed to load tags from localStorage:", error);
    }

    setIsInitialized(true);
  }, []);

  // Persist tags to localStorage
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
    } catch (error) {
      console.error("Failed to save tags to localStorage:", error);
    }
  }, [tags, isInitialized]);

  // Persist entity tags to localStorage
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      localStorage.setItem(ENTITY_TAGS_STORAGE_KEY, JSON.stringify(entityTags));
    } catch (error) {
      console.error("Failed to save entity tags to localStorage:", error);
    }
  }, [entityTags, isInitialized]);

  // Filter tags by entity type if specified
  const filteredTags = useMemo(() => {
    if (!filterEntityType) return tags;
    return tags.filter((tag) => !tag.entityType || tag.entityType === filterEntityType);
  }, [tags, filterEntityType]);

  // Generate unique ID
  const generateId = useCallback((): string => {
    return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add a new tag
  const addTag = useCallback(
    (name: string, color: TagColor, entityType?: string): Tag => {
      const now = new Date().toISOString();
      const newTag: Tag = {
        id: generateId(),
        name: name.trim(),
        color,
        entityType,
        createdAt: now,
        updatedAt: now,
      };

      setTags((prev) => [...prev, newTag]);
      return newTag;
    },
    [generateId]
  );

  // Update an existing tag
  const updateTag = useCallback(
    (id: string, updates: Partial<Pick<Tag, "name" | "color">>): Tag | null => {
      let updatedTag: Tag | null = null;

      setTags((prev) =>
        prev.map((tag) => {
          if (tag.id === id) {
            updatedTag = {
              ...tag,
              ...updates,
              name: updates.name?.trim() || tag.name,
              updatedAt: new Date().toISOString(),
            };
            return updatedTag;
          }
          return tag;
        })
      );

      return updatedTag;
    },
    []
  );

  // Delete a tag
  const deleteTag = useCallback((id: string): void => {
    setTags((prev) => prev.filter((tag) => tag.id !== id));

    // Remove tag from all entity assignments
    setEntityTags((prev) =>
      prev
        .map((assignment) => ({
          ...assignment,
          tagIds: assignment.tagIds.filter((tagId) => tagId !== id),
        }))
        .filter((assignment) => assignment.tagIds.length > 0)
    );
  }, []);

  // Merge two tags (move all assignments from source to target, then delete source)
  const mergeTags = useCallback(
    (sourceId: string, targetId: string): void => {
      if (sourceId === targetId) return;

      // Update all entity assignments to replace source with target
      setEntityTags((prev) =>
        prev.map((assignment) => {
          if (assignment.tagIds.includes(sourceId)) {
            const newTagIds = assignment.tagIds.filter((id) => id !== sourceId);
            if (!newTagIds.includes(targetId)) {
              newTagIds.push(targetId);
            }
            return { ...assignment, tagIds: newTagIds };
          }
          return assignment;
        })
      );

      // Delete the source tag
      setTags((prev) => prev.filter((tag) => tag.id !== sourceId));
    },
    []
  );

  // Get tags for a specific entity
  const getTagsForEntity = useCallback(
    (entityType: string, entityId: string): Tag[] => {
      const assignment = entityTags.find(
        (a) => a.entityType === entityType && a.entityId === entityId
      );

      if (!assignment) return [];

      return tags.filter((tag) => assignment.tagIds.includes(tag.id));
    },
    [tags, entityTags]
  );

  // Set tags for an entity (replace all)
  const setEntityTagsHandler = useCallback(
    (entityType: string, entityId: string, tagIds: string[]): void => {
      setEntityTags((prev) => {
        const existingIndex = prev.findIndex(
          (a) => a.entityType === entityType && a.entityId === entityId
        );

        if (tagIds.length === 0) {
          // Remove assignment if no tags
          if (existingIndex >= 0) {
            return [...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1)];
          }
          return prev;
        }

        const newAssignment: EntityTagAssignment = {
          entityType,
          entityId,
          tagIds,
        };

        if (existingIndex >= 0) {
          return [
            ...prev.slice(0, existingIndex),
            newAssignment,
            ...prev.slice(existingIndex + 1),
          ];
        }

        return [...prev, newAssignment];
      });
    },
    []
  );

  // Add a single tag to an entity
  const addTagToEntity = useCallback(
    (entityType: string, entityId: string, tagId: string): void => {
      setEntityTags((prev) => {
        const existingIndex = prev.findIndex(
          (a) => a.entityType === entityType && a.entityId === entityId
        );

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          if (existing.tagIds.includes(tagId)) return prev;

          return [
            ...prev.slice(0, existingIndex),
            { ...existing, tagIds: [...existing.tagIds, tagId] },
            ...prev.slice(existingIndex + 1),
          ];
        }

        return [...prev, { entityType, entityId, tagIds: [tagId] }];
      });
    },
    []
  );

  // Remove a single tag from an entity
  const removeTagFromEntity = useCallback(
    (entityType: string, entityId: string, tagId: string): void => {
      setEntityTags((prev) => {
        const existingIndex = prev.findIndex(
          (a) => a.entityType === entityType && a.entityId === entityId
        );

        if (existingIndex < 0) return prev;

        const existing = prev[existingIndex];
        const newTagIds = existing.tagIds.filter((id) => id !== tagId);

        if (newTagIds.length === 0) {
          return [...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1)];
        }

        return [
          ...prev.slice(0, existingIndex),
          { ...existing, tagIds: newTagIds },
          ...prev.slice(existingIndex + 1),
        ];
      });
    },
    []
  );

  // Get usage count for a tag
  const getTagUsageCount = useCallback(
    (tagId: string): number => {
      return entityTags.reduce((count, assignment) => {
        return count + (assignment.tagIds.includes(tagId) ? 1 : 0);
      }, 0);
    },
    [entityTags]
  );

  // Search tags by name
  const searchTags = useCallback(
    (query: string): Tag[] => {
      const lowerQuery = query.toLowerCase().trim();
      if (!lowerQuery) return filteredTags;

      return filteredTags.filter((tag) =>
        tag.name.toLowerCase().includes(lowerQuery)
      );
    },
    [filteredTags]
  );

  return {
    tags: filteredTags,
    addTag,
    updateTag,
    deleteTag,
    mergeTags,
    getTagsForEntity,
    setEntityTags: setEntityTagsHandler,
    addTagToEntity,
    removeTagFromEntity,
    getTagUsageCount,
    searchTags,
  };
}

export default useTags;
