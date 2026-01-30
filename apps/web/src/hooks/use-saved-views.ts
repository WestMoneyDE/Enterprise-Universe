// ===================================================================================================
// USE-SAVED-VIEWS - Hook for managing saved filter views with localStorage persistence
// Supports contacts, deals, and projects entity types
// ===================================================================================================

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

// ===================================================================================================
// TYPES
// ===================================================================================================

export type EntityType = "contacts" | "deals" | "projects";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterConfig {
  search?: string;
  status?: string;
  stage?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

export interface SavedView {
  id: string;
  name: string;
  filters: FilterConfig;
  sort?: SortConfig;
  visibleColumns: string[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

export interface UseSavedViewsOptions {
  entityType: EntityType;
  defaultColumns?: string[];
}

export interface UseSavedViewsReturn {
  views: SavedView[];
  activeView: SavedView | null;
  activeViewId: string | null;
  saveView: (name: string, config: Omit<SavedView, "id" | "name" | "createdAt" | "updatedAt">) => SavedView;
  deleteView: (id: string) => void;
  applyView: (id: string) => SavedView | null;
  updateView: (id: string, config: Partial<Omit<SavedView, "id" | "createdAt">>) => SavedView | null;
  clearActiveView: () => void;
  setDefaultView: (id: string) => void;
  getDefaultColumns: () => string[];
}

// ===================================================================================================
// STORAGE KEY HELPER
// ===================================================================================================

function getStorageKey(entityType: EntityType): string {
  return `nexus-saved-views-${entityType}`;
}

function getActiveViewKey(entityType: EntityType): string {
  return `nexus-active-view-${entityType}`;
}

// ===================================================================================================
// DEFAULT COLUMNS BY ENTITY TYPE
// ===================================================================================================

const DEFAULT_COLUMNS: Record<EntityType, string[]> = {
  contacts: ["name", "email", "phone", "company", "status", "createdAt"],
  deals: ["name", "value", "stage", "contact", "probability", "expectedClose"],
  projects: ["name", "status", "client", "startDate", "endDate", "progress"],
};

// ===================================================================================================
// HOOK IMPLEMENTATION
// ===================================================================================================

export function useSavedViews({
  entityType,
  defaultColumns,
}: UseSavedViewsOptions): UseSavedViewsReturn {
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get default columns for this entity type
  const getDefaultColumns = useCallback((): string[] => {
    return defaultColumns || DEFAULT_COLUMNS[entityType] || [];
  }, [defaultColumns, entityType]);

  // Load views from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storageKey = getStorageKey(entityType);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedViews = JSON.parse(stored) as SavedView[];
        setViews(parsedViews);
      }

      // Load active view
      const activeKey = getActiveViewKey(entityType);
      const storedActiveId = localStorage.getItem(activeKey);
      if (storedActiveId) {
        setActiveViewId(storedActiveId);
      }
    } catch (error) {
      console.error("Failed to load saved views from localStorage:", error);
    }

    setIsInitialized(true);
  }, [entityType]);

  // Persist views to localStorage when they change
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      const storageKey = getStorageKey(entityType);
      localStorage.setItem(storageKey, JSON.stringify(views));
    } catch (error) {
      console.error("Failed to save views to localStorage:", error);
    }
  }, [views, entityType, isInitialized]);

  // Persist active view ID to localStorage
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      const activeKey = getActiveViewKey(entityType);
      if (activeViewId) {
        localStorage.setItem(activeKey, activeViewId);
      } else {
        localStorage.removeItem(activeKey);
      }
    } catch (error) {
      console.error("Failed to save active view to localStorage:", error);
    }
  }, [activeViewId, entityType, isInitialized]);

  // Get the currently active view
  const activeView = useMemo(() => {
    if (!activeViewId) return null;
    return views.find((v) => v.id === activeViewId) || null;
  }, [views, activeViewId]);

  // Generate unique ID
  const generateId = useCallback((): string => {
    return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Save a new view
  const saveView = useCallback(
    (
      name: string,
      config: Omit<SavedView, "id" | "name" | "createdAt" | "updatedAt">
    ): SavedView => {
      const now = new Date().toISOString();
      const newView: SavedView = {
        id: generateId(),
        name,
        filters: config.filters || {},
        sort: config.sort,
        visibleColumns: config.visibleColumns || getDefaultColumns(),
        createdAt: now,
        updatedAt: now,
        isDefault: config.isDefault,
      };

      setViews((prev) => {
        // If this is set as default, remove default from others
        if (newView.isDefault) {
          return [...prev.map((v) => ({ ...v, isDefault: false })), newView];
        }
        return [...prev, newView];
      });

      return newView;
    },
    [generateId, getDefaultColumns]
  );

  // Delete a view
  const deleteView = useCallback(
    (id: string): void => {
      setViews((prev) => prev.filter((v) => v.id !== id));

      // Clear active view if it was deleted
      if (activeViewId === id) {
        setActiveViewId(null);
      }
    },
    [activeViewId]
  );

  // Apply a view (set it as active)
  const applyView = useCallback(
    (id: string): SavedView | null => {
      const view = views.find((v) => v.id === id);
      if (view) {
        setActiveViewId(id);
        return view;
      }
      return null;
    },
    [views]
  );

  // Update an existing view
  const updateView = useCallback(
    (
      id: string,
      config: Partial<Omit<SavedView, "id" | "createdAt">>
    ): SavedView | null => {
      let updatedView: SavedView | null = null;

      setViews((prev) =>
        prev.map((v) => {
          if (v.id === id) {
            updatedView = {
              ...v,
              ...config,
              updatedAt: new Date().toISOString(),
            };

            // Handle default flag
            if (config.isDefault) {
              return { ...updatedView, isDefault: true };
            }
            return updatedView;
          }

          // Remove default flag from other views if setting a new default
          if (config.isDefault) {
            return { ...v, isDefault: false };
          }
          return v;
        })
      );

      return updatedView;
    },
    []
  );

  // Clear active view
  const clearActiveView = useCallback((): void => {
    setActiveViewId(null);
  }, []);

  // Set a view as default
  const setDefaultView = useCallback((id: string): void => {
    setViews((prev) =>
      prev.map((v) => ({
        ...v,
        isDefault: v.id === id,
        updatedAt: v.id === id ? new Date().toISOString() : v.updatedAt,
      }))
    );
  }, []);

  return {
    views,
    activeView,
    activeViewId,
    saveView,
    deleteView,
    applyView,
    updateView,
    clearActiveView,
    setDefaultView,
    getDefaultColumns,
  };
}

export default useSavedViews;
