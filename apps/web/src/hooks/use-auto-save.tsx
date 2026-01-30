"use client";

import * as React from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-SAVE HOOK - Automatically save form data with debouncing
// ═══════════════════════════════════════════════════════════════════════════════

interface UseAutoSaveOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  storageKey?: string;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  saveNow: () => Promise<void>;
  clearDraft: () => void;
}

export function useAutoSave<T extends FieldValues>({
  form,
  onSave,
  debounceMs = 2000,
  storageKey,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const { watch, reset } = form;

  // Load draft from localStorage on mount
  React.useEffect(() => {
    if (!storageKey || !enabled) return;

    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const draft = JSON.parse(stored);
        reset(draft);
      } catch {
        // Invalid stored data, ignore
      }
    }
  }, [storageKey, enabled, reset]);

  // Watch form changes and auto-save
  React.useEffect(() => {
    if (!enabled) return;

    const subscription = watch((data) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Save to localStorage immediately if key provided
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(data));
      }

      // Debounced save to server
      timeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        setError(null);

        try {
          await onSave(data as T);
          setLastSaved(new Date());
        } catch (err) {
          setError(err instanceof Error ? err : new Error("Speichern fehlgeschlagen"));
        } finally {
          setIsSaving(false);
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, onSave, debounceMs, storageKey, enabled]);

  // Manual save
  const saveNow = React.useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);
    setError(null);

    try {
      const data = form.getValues();
      await onSave(data);
      setLastSaved(new Date());

      // Clear draft after successful save
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Speichern fehlgeschlagen"));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [form, onSave, storageKey]);

  // Clear draft
  const clearDraft = React.useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
    clearDraft,
  };
}

// Auto-save status indicator component
interface AutoSaveStatusProps {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

export function AutoSaveStatus({ isSaving, lastSaved, error }: AutoSaveStatusProps) {
  if (error) {
    return (
      <span className="text-xs text-neon-red">
        Fehler beim Speichern
      </span>
    );
  }

  if (isSaving) {
    return (
      <span className="text-xs text-neon-cyan animate-pulse">
        Speichern...
      </span>
    );
  }

  if (lastSaved) {
    return (
      <span className="text-xs text-gray-500">
        Gespeichert um {lastSaved.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    );
  }

  return null;
}
