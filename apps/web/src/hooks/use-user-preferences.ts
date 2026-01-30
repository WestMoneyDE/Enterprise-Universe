"use client";

import { useState, useEffect, useCallback } from "react";

// ===============================================================================
// USER PREFERENCES HOOK
// Manages user settings with localStorage persistence
// ===============================================================================

export type Theme = "dark" | "light" | "auto";
export type Language = "en" | "de";
export type DateFormat = "DD.MM.YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSounds: boolean;
  desktopNotifications: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
  marketingUpdates: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number; // minutes
  loginNotifications: boolean;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface UserPreferences {
  // Profile
  displayName: string;
  email: string;
  avatarUrl: string | null;

  // Preferences
  theme: Theme;
  language: Language;
  timezone: string;
  dateFormat: DateFormat;

  // Notifications
  notifications: NotificationPreferences;

  // Security
  security: SecuritySettings;
}

const STORAGE_KEY = "nexus-user-preferences";

const defaultPreferences: UserPreferences = {
  // Profile
  displayName: "Nexus User",
  email: "user@nexus-command.center",
  avatarUrl: null,

  // Preferences
  theme: "dark",
  language: "de",
  timezone: "Europe/Berlin",
  dateFormat: "DD.MM.YYYY",

  // Notifications
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    alertSounds: true,
    desktopNotifications: false,
    weeklyDigest: true,
    securityAlerts: true,
    marketingUpdates: false,
  },

  // Security
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginNotifications: true,
  },
};

// Mock active sessions for demo
const mockActiveSessions: ActiveSession[] = [
  {
    id: "session-1",
    device: "Desktop",
    browser: "Chrome 120",
    location: "Berlin, Germany",
    ip: "192.168.1.100",
    lastActive: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: "session-2",
    device: "Mobile",
    browser: "Safari 17",
    location: "Munich, Germany",
    ip: "10.0.0.50",
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    isCurrent: false,
  },
  {
    id: "session-3",
    device: "Tablet",
    browser: "Firefox 121",
    location: "Hamburg, Germany",
    ip: "172.16.0.25",
    lastActive: new Date(Date.now() - 86400000).toISOString(),
    isCurrent: false,
  },
];

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(mockActiveSessions);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserPreferences>;
        setPreferences((prev) => ({
          ...prev,
          ...parsed,
          notifications: {
            ...prev.notifications,
            ...(parsed.notifications || {}),
          },
          security: {
            ...prev.security,
            ...(parsed.security || {}),
          },
        }));
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply theme on preference change
  useEffect(() => {
    if (isLoading) return;

    const applyTheme = (theme: Theme) => {
      const root = document.documentElement;
      if (theme === "auto") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
        root.classList.toggle("light", !prefersDark);
      } else {
        root.classList.toggle("dark", theme === "dark");
        root.classList.toggle("light", theme === "light");
      }
    };

    applyTheme(preferences.theme);

    // Listen for system theme changes if auto
    if (preferences.theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("auto");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [preferences.theme, isLoading]);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPrefs: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }, []);

  // Update a single preference
  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setIsSaving(true);
      setPreferences((prev) => {
        const newPrefs = { ...prev, [key]: value };
        savePreferences(newPrefs);
        return newPrefs;
      });
      // Simulate save delay for UX feedback
      setTimeout(() => setIsSaving(false), 300);
    },
    [savePreferences]
  );

  // Update nested notification preference
  const updateNotificationPreference = useCallback(
    <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
      setIsSaving(true);
      setPreferences((prev) => {
        const newPrefs = {
          ...prev,
          notifications: { ...prev.notifications, [key]: value },
        };
        savePreferences(newPrefs);
        return newPrefs;
      });
      setTimeout(() => setIsSaving(false), 300);
    },
    [savePreferences]
  );

  // Update nested security preference
  const updateSecurityPreference = useCallback(
    <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
      setIsSaving(true);
      setPreferences((prev) => {
        const newPrefs = {
          ...prev,
          security: { ...prev.security, [key]: value },
        };
        savePreferences(newPrefs);
        return newPrefs;
      });
      setTimeout(() => setIsSaving(false), 300);
    },
    [savePreferences]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setIsSaving(true);
    setPreferences(defaultPreferences);
    savePreferences(defaultPreferences);
    setTimeout(() => setIsSaving(false), 300);
  }, [savePreferences]);

  // Terminate a session
  const terminateSession = useCallback((sessionId: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  // Terminate all sessions except current
  const terminateAllOtherSessions = useCallback(() => {
    setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
  }, []);

  return {
    preferences,
    activeSessions,
    isLoading,
    isSaving,
    updatePreference,
    updateNotificationPreference,
    updateSecurityPreference,
    resetToDefaults,
    terminateSession,
    terminateAllOtherSessions,
  };
}

// Export types for external use
export type UseUserPreferencesReturn = ReturnType<typeof useUserPreferences>;
