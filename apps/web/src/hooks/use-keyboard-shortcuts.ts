"use client";

import * as React from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS HOOK - Global keyboard shortcut management
// ═══════════════════════════════════════════════════════════════════════════════

type Modifier = "meta" | "ctrl" | "alt" | "shift";

interface Shortcut {
  key: string;
  modifiers?: Modifier[];
  action: () => void;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const modifiers = shortcut.modifiers ?? [];
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();

        const metaRequired = modifiers.includes("meta");
        const ctrlRequired = modifiers.includes("ctrl");
        const altRequired = modifiers.includes("alt");
        const shiftRequired = modifiers.includes("shift");

        const modifiersMatch =
          (metaRequired ? event.metaKey : !event.metaKey || !metaRequired) &&
          (ctrlRequired ? event.ctrlKey : !event.ctrlKey || !ctrlRequired) &&
          (altRequired ? event.altKey : !event.altKey || !altRequired) &&
          (shiftRequired ? event.shiftKey : !event.shiftKey || !shiftRequired);

        // Handle Cmd/Ctrl universally
        const cmdOrCtrl = modifiers.includes("meta") || modifiers.includes("ctrl");
        const cmdOrCtrlPressed = event.metaKey || event.ctrlKey;

        if (keyMatches && (cmdOrCtrl ? cmdOrCtrlPressed : modifiersMatch)) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

// Hook for command palette specifically
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
