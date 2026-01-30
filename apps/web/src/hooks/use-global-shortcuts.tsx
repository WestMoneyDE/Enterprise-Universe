"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL SHORTCUTS HOOK - Sequence-based keyboard shortcut management
// Supports shortcuts like G+D (Go to Dashboard), N+C (New Contact), etc.
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShortcutDefinition {
  /** Unique identifier for the shortcut */
  id: string;
  /** Key sequence (e.g., ["g", "d"] for G+D) or single key (e.g., ["?"]) */
  keys: string[];
  /** Description shown in the help modal */
  description: string;
  /** Category for grouping in help modal */
  category: "navigation" | "actions" | "general";
  /** Callback function when shortcut is triggered */
  action: () => void;
  /** Whether the shortcut is currently enabled */
  enabled?: boolean;
}

interface GlobalShortcutsState {
  /** Currently registered shortcuts */
  shortcuts: Map<string, ShortcutDefinition>;
  /** Whether shortcuts help modal is open */
  helpModalOpen: boolean;
  /** Current key sequence buffer */
  keyBuffer: string[];
}

interface GlobalShortcutsContextValue extends GlobalShortcutsState {
  /** Register a new shortcut */
  register: (shortcut: ShortcutDefinition) => void;
  /** Unregister a shortcut by ID */
  unregister: (id: string) => void;
  /** Open shortcuts help modal */
  openHelpModal: () => void;
  /** Close shortcuts help modal */
  closeHelpModal: () => void;
  /** Toggle shortcuts help modal */
  toggleHelpModal: () => void;
  /** Get all shortcuts grouped by category */
  getShortcutsByCategory: () => Record<string, ShortcutDefinition[]>;
}

const GlobalShortcutsContext = React.createContext<GlobalShortcutsContextValue | null>(null);

// Timeout for key sequence (ms)
const KEY_SEQUENCE_TIMEOUT = 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<GlobalShortcutsState>({
    shortcuts: new Map(),
    helpModalOpen: false,
    keyBuffer: [],
  });

  const keyBufferTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Register a shortcut
  const register = React.useCallback((shortcut: ShortcutDefinition) => {
    setState((prev) => {
      const newShortcuts = new Map(prev.shortcuts);
      newShortcuts.set(shortcut.id, { ...shortcut, enabled: shortcut.enabled ?? true });
      return { ...prev, shortcuts: newShortcuts };
    });
  }, []);

  // Unregister a shortcut
  const unregister = React.useCallback((id: string) => {
    setState((prev) => {
      const newShortcuts = new Map(prev.shortcuts);
      newShortcuts.delete(id);
      return { ...prev, shortcuts: newShortcuts };
    });
  }, []);

  // Help modal controls
  const openHelpModal = React.useCallback(() => {
    setState((prev) => ({ ...prev, helpModalOpen: true }));
  }, []);

  const closeHelpModal = React.useCallback(() => {
    setState((prev) => ({ ...prev, helpModalOpen: false }));
  }, []);

  const toggleHelpModal = React.useCallback(() => {
    setState((prev) => ({ ...prev, helpModalOpen: !prev.helpModalOpen }));
  }, []);

  // Get shortcuts grouped by category
  const getShortcutsByCategory = React.useCallback(() => {
    const grouped: Record<string, ShortcutDefinition[]> = {
      navigation: [],
      actions: [],
      general: [],
    };

    state.shortcuts.forEach((shortcut) => {
      if (shortcut.enabled !== false) {
        grouped[shortcut.category].push(shortcut);
      }
    });

    return grouped;
  }, [state.shortcuts]);

  // Register default shortcuts
  React.useEffect(() => {
    const defaultShortcuts: ShortcutDefinition[] = [
      // Navigation shortcuts (G+X pattern)
      {
        id: "go-dashboard",
        keys: ["g", "d"],
        description: "Go to Dashboard",
        category: "navigation",
        action: () => router.push("/dashboard"),
      },
      {
        id: "go-contacts",
        keys: ["g", "c"],
        description: "Go to Contacts",
        category: "navigation",
        action: () => router.push("/contacts"),
      },
      {
        id: "go-analytics",
        keys: ["g", "a"],
        description: "Go to Analytics",
        category: "navigation",
        action: () => router.push("/analytics"),
      },
      {
        id: "go-settings",
        keys: ["g", "s"],
        description: "Go to Settings",
        category: "navigation",
        action: () => router.push("/settings"),
      },
      {
        id: "go-home",
        keys: ["g", "h"],
        description: "Go to Home",
        category: "navigation",
        action: () => router.push("/"),
      },

      // Action shortcuts (N+X pattern)
      {
        id: "new-contact",
        keys: ["n", "c"],
        description: "New Contact",
        category: "actions",
        action: () => router.push("/contacts/new"),
      },
      {
        id: "new-project",
        keys: ["n", "p"],
        description: "New Project",
        category: "actions",
        action: () => router.push("/projects/new"),
      },
      {
        id: "new-task",
        keys: ["n", "t"],
        description: "New Task",
        category: "actions",
        action: () => router.push("/tasks/new"),
      },

      // General shortcuts
      {
        id: "show-help",
        keys: ["?"],
        description: "Show keyboard shortcuts",
        category: "general",
        action: () => toggleHelpModal(),
      },
      {
        id: "escape",
        keys: ["Escape"],
        description: "Close modal / Cancel",
        category: "general",
        action: () => closeHelpModal(),
      },
    ];

    defaultShortcuts.forEach(register);

    return () => {
      defaultShortcuts.forEach((s) => unregister(s.id));
    };
  }, [router, register, unregister, toggleHelpModal, closeHelpModal]);

  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape key even in inputs
        if (event.key !== "Escape") {
          return;
        }
      }

      // Skip if modifier keys are pressed (except Shift for ?)
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      // Clear existing timeout
      if (keyBufferTimeoutRef.current) {
        clearTimeout(keyBufferTimeoutRef.current);
      }

      // Update key buffer
      setState((prev) => {
        const newBuffer = [...prev.keyBuffer, key];

        // Check for matching shortcuts
        let matched = false;
        prev.shortcuts.forEach((shortcut) => {
          if (shortcut.enabled === false) return;

          const shortcutKeys = shortcut.keys.map((k) => k.toLowerCase());

          // Check if current buffer matches the shortcut
          if (
            shortcutKeys.length === newBuffer.length &&
            shortcutKeys.every((k, i) => k === newBuffer[i])
          ) {
            matched = true;
            event.preventDefault();
            // Execute action after state update
            setTimeout(() => shortcut.action(), 0);
          }
        });

        // If matched, clear buffer
        if (matched) {
          return { ...prev, keyBuffer: [] };
        }

        // Check if any shortcut could still match (prefix match)
        let couldMatch = false;
        prev.shortcuts.forEach((shortcut) => {
          if (shortcut.enabled === false) return;

          const shortcutKeys = shortcut.keys.map((k) => k.toLowerCase());
          if (
            shortcutKeys.length > newBuffer.length &&
            shortcutKeys.slice(0, newBuffer.length).every((k, i) => k === newBuffer[i])
          ) {
            couldMatch = true;
          }
        });

        // If no shortcut could match, clear buffer
        if (!couldMatch) {
          return { ...prev, keyBuffer: [] };
        }

        return { ...prev, keyBuffer: newBuffer };
      });

      // Set timeout to clear buffer
      keyBufferTimeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, keyBuffer: [] }));
      }, KEY_SEQUENCE_TIMEOUT);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (keyBufferTimeoutRef.current) {
        clearTimeout(keyBufferTimeoutRef.current);
      }
    };
  }, []);

  const value: GlobalShortcutsContextValue = {
    ...state,
    register,
    unregister,
    openHelpModal,
    closeHelpModal,
    toggleHelpModal,
    getShortcutsByCategory,
  };

  return (
    <GlobalShortcutsContext.Provider value={value}>
      {children}
    </GlobalShortcutsContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useGlobalShortcuts() {
  const context = React.useContext(GlobalShortcutsContext);

  if (!context) {
    throw new Error("useGlobalShortcuts must be used within a GlobalShortcutsProvider");
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY HOOK - Register shortcuts for a specific component
// ═══════════════════════════════════════════════════════════════════════════════

export function useRegisterShortcut(shortcut: Omit<ShortcutDefinition, "id"> & { id?: string }) {
  const { register, unregister } = useGlobalShortcuts();

  React.useEffect(() => {
    const id = shortcut.id || `custom-${shortcut.keys.join("-")}-${Date.now()}`;
    const fullShortcut: ShortcutDefinition = {
      ...shortcut,
      id,
    };

    register(fullShortcut);

    return () => {
      unregister(id);
    };
  }, [shortcut, register, unregister]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER - Format keys for display
// ═══════════════════════════════════════════════════════════════════════════════

export function formatShortcutKeys(keys: string[]): string {
  return keys
    .map((key) => {
      // Special key mappings
      const keyMap: Record<string, string> = {
        escape: "Esc",
        arrowup: "Up",
        arrowdown: "Down",
        arrowleft: "Left",
        arrowright: "Right",
        enter: "Enter",
        " ": "Space",
        backspace: "Backspace",
        delete: "Del",
        tab: "Tab",
      };

      const lowerKey = key.toLowerCase();
      return keyMap[lowerKey] || key.toUpperCase();
    })
    .join(" + ");
}
