"use client";

import { useState, useCallback } from "react";
import {
  User,
  Settings,
  Bell,
  Shield,
  Moon,
  Sun,
  Monitor,
  Globe,
  Clock,
  Calendar,
  Mail,
  Smartphone,
  Volume2,
  Eye,
  Lock,
  Key,
  LogOut,
  AlertTriangle,
  Check,
  X,
  Upload,
  RefreshCw,
  Laptop,
  Tablet,
  ChevronRight,
} from "lucide-react";
import { HoloCard, usePowerMode } from "@/components/scifi";
import { Button, Input, Card, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useUserPreferences,
  type Theme,
  type Language,
  type DateFormat,
  type ActiveSession,
} from "@/hooks/use-user-preferences";

// ===============================================================================
// SETTINGS PAGE - User Preferences and Configuration
// ===============================================================================

type SettingsTab = "profile" | "preferences" | "notifications" | "security";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: "profile",
    label: "Profile",
    icon: <User className="h-4 w-4" />,
    description: "Manage your personal information",
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: <Settings className="h-4 w-4" />,
    description: "Customize your experience",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4" />,
    description: "Configure alert settings",
  },
  {
    id: "security",
    label: "Security",
    icon: <Shield className="h-4 w-4" />,
    description: "Protect your account",
  },
];

// Timezone options
const timezones = [
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Zurich", label: "Zurich (CET/CEST)" },
  { value: "Europe/Vienna", label: "Vienna (CET/CEST)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "UTC", label: "UTC" },
];

// Date format options
const dateFormats: { value: DateFormat; label: string; example: string }[] = [
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY", example: "30.01.2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "01/30/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-01-30" },
];

export default function SettingsPage() {
  const { mode } = usePowerMode();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const {
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
  } = useUserPreferences();

  const isGodMode = mode === "god";
  const isUltraMode = mode === "ultra";

  const accentColor = isGodMode
    ? "text-god-primary"
    : isUltraMode
    ? "text-ultra-secondary"
    : "text-neon-cyan";

  const accentBg = isGodMode
    ? "bg-god-primary"
    : isUltraMode
    ? "bg-ultra-secondary"
    : "bg-neon-cyan";

  const accentBorder = isGodMode
    ? "border-god-primary"
    : isUltraMode
    ? "border-ultra-secondary"
    : "border-neon-cyan";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-16 w-64 bg-gray-800/50" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 bg-gray-800/50" />
            ))}
          </div>
          <Skeleton className="h-96 bg-gray-800/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "p-3 rounded-lg",
                isGodMode
                  ? "bg-god-primary/20"
                  : isUltraMode
                  ? "bg-ultra-secondary/20"
                  : "bg-neon-cyan/20"
              )}
            >
              <Settings
                className={cn(
                  "h-8 w-8",
                  isGodMode
                    ? "text-god-primary"
                    : isUltraMode
                    ? "text-ultra-secondary"
                    : "text-neon-cyan"
                )}
              />
            </div>
            <div>
              <h1
                className={cn(
                  "text-3xl font-bold",
                  isGodMode
                    ? "text-god-primary"
                    : isUltraMode
                    ? "text-ultra-secondary"
                    : "text-neon-cyan"
                )}
              >
                SETTINGS
              </h1>
              <p className="text-gray-400 text-sm">
                Configure your Nexus Command Center experience
              </p>
            </div>
          </div>

          {/* Save indicator & Reset */}
          <div className="flex items-center gap-3">
            {isSaving && (
              <div className="flex items-center gap-2 text-neon-green text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="border-white/20 hover:border-neon-red/50 hover:text-neon-red"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="relative">
          <div className="flex gap-2 p-1 bg-void-surface/50 rounded-lg border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all duration-300",
                  "text-sm font-medium",
                  activeTab === tab.id
                    ? cn("text-black", accentBg)
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div
                    className={cn(
                      "absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full",
                      accentBg,
                      "shadow-[0_0_10px_currentColor]"
                    )}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === "profile" && (
            <ProfileTab
              preferences={preferences}
              updatePreference={updatePreference}
              accentColor={accentColor}
              accentBg={accentBg}
              accentBorder={accentBorder}
              isGodMode={isGodMode}
              isUltraMode={isUltraMode}
            />
          )}
          {activeTab === "preferences" && (
            <PreferencesTab
              preferences={preferences}
              updatePreference={updatePreference}
              accentColor={accentColor}
              accentBg={accentBg}
              accentBorder={accentBorder}
              isGodMode={isGodMode}
              isUltraMode={isUltraMode}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsTab
              preferences={preferences}
              updateNotificationPreference={updateNotificationPreference}
              accentColor={accentColor}
              accentBg={accentBg}
              isGodMode={isGodMode}
              isUltraMode={isUltraMode}
            />
          )}
          {activeTab === "security" && (
            <SecurityTab
              preferences={preferences}
              activeSessions={activeSessions}
              updateSecurityPreference={updateSecurityPreference}
              terminateSession={terminateSession}
              terminateAllOtherSessions={terminateAllOtherSessions}
              accentColor={accentColor}
              accentBg={accentBg}
              accentBorder={accentBorder}
              isGodMode={isGodMode}
              isUltraMode={isUltraMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===============================================================================
// PROFILE TAB
// ===============================================================================

interface ProfileTabProps {
  preferences: ReturnType<typeof useUserPreferences>["preferences"];
  updatePreference: ReturnType<typeof useUserPreferences>["updatePreference"];
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  isGodMode: boolean;
  isUltraMode: boolean;
}

function ProfileTab({
  preferences,
  updatePreference,
  accentColor,
  accentBg,
  accentBorder,
  isGodMode,
  isUltraMode,
}: ProfileTabProps) {
  const [displayName, setDisplayName] = useState(preferences.displayName);

  const handleSaveName = () => {
    updatePreference("displayName", displayName);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Avatar Section */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
        title="Avatar"
        subtitle="Your profile picture"
        icon={<User className={cn("h-5 w-5", accentColor)} />}
        glow
      >
        <div className="flex flex-col items-center py-6">
          <div
            className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center",
              "bg-void-dark border-2",
              accentBorder,
              "shadow-[0_0_20px_currentColor]"
            )}
          >
            {preferences.avatarUrl ? (
              <img
                src={preferences.avatarUrl}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className={cn("h-16 w-16", accentColor)} />
            )}
            <button
              className={cn(
                "absolute bottom-0 right-0 p-2 rounded-full",
                "bg-void-surface border",
                accentBorder,
                "hover:scale-110 transition-transform"
              )}
            >
              <Upload className={cn("h-4 w-4", accentColor)} />
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-500 text-center">
            Click to upload a new avatar
            <br />
            Max size: 2MB (PNG, JPG)
          </p>
        </div>
      </HoloCard>

      {/* Profile Information */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "default"}
        title="Profile Information"
        subtitle="Your personal details"
        icon={<User className={cn("h-5 w-5", accentColor)} />}
        glow
        className="lg:col-span-2"
      >
        <div className="space-y-6 py-4">
          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Display Name
            </label>
            <div className="flex gap-2">
              <Input
                variant="cyber"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="flex-1"
              />
              <Button
                variant={isGodMode ? "gold" : isUltraMode ? "purple" : "cyan"}
                onClick={handleSaveName}
                disabled={displayName === preferences.displayName}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Email Address
            </label>
            <div className="relative">
              <Input
                variant="cyber"
                value={preferences.email}
                readOnly
                className="opacity-60 cursor-not-allowed pr-10"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
            <p className="text-xs text-gray-500">
              Contact support to change your email address
            </p>
          </div>

          {/* Account Info */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Account ID</span>
                <p className={cn("font-mono", accentColor)}>NXS-2026-0001</p>
              </div>
              <div>
                <span className="text-gray-500">Member Since</span>
                <p className="text-white">January 2026</p>
              </div>
            </div>
          </div>
        </div>
      </HoloCard>
    </div>
  );
}

// ===============================================================================
// PREFERENCES TAB
// ===============================================================================

interface PreferencesTabProps {
  preferences: ReturnType<typeof useUserPreferences>["preferences"];
  updatePreference: ReturnType<typeof useUserPreferences>["updatePreference"];
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  isGodMode: boolean;
  isUltraMode: boolean;
}

function PreferencesTab({
  preferences,
  updatePreference,
  accentColor,
  accentBg,
  accentBorder,
  isGodMode,
  isUltraMode,
}: PreferencesTabProps) {
  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "dark", label: "Dark", icon: <Moon className="h-5 w-5" /> },
    { value: "light", label: "Light", icon: <Sun className="h-5 w-5" /> },
    { value: "auto", label: "Auto", icon: <Monitor className="h-5 w-5" /> },
  ];

  const languageOptions: { value: Language; label: string; flag: string }[] = [
    { value: "de", label: "Deutsch", flag: "DE" },
    { value: "en", label: "English", flag: "EN" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Theme Selection */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
        title="Theme"
        subtitle="Choose your visual style"
        icon={<Moon className={cn("h-5 w-5", accentColor)} />}
        glow
      >
        <div className="grid grid-cols-3 gap-3 py-4">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updatePreference("theme", option.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-300",
                preferences.theme === option.value
                  ? cn(accentBorder, "bg-white/5 shadow-[0_0_15px_currentColor]")
                  : "border-white/10 hover:border-white/30 hover:bg-white/5"
              )}
            >
              <div
                className={cn(
                  preferences.theme === option.value
                    ? accentColor
                    : "text-gray-400"
                )}
              >
                {option.icon}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  preferences.theme === option.value
                    ? "text-white"
                    : "text-gray-400"
                )}
              >
                {option.label}
              </span>
              {preferences.theme === option.value && (
                <Check className={cn("h-4 w-4", accentColor)} />
              )}
            </button>
          ))}
        </div>
      </HoloCard>

      {/* Language Selection */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "purple"}
        title="Language"
        subtitle="Select your preferred language"
        icon={<Globe className={cn("h-5 w-5", accentColor)} />}
        glow
      >
        <div className="grid grid-cols-2 gap-3 py-4">
          {languageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updatePreference("language", option.value)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border transition-all duration-300",
                preferences.language === option.value
                  ? cn(accentBorder, "bg-white/5 shadow-[0_0_15px_currentColor]")
                  : "border-white/10 hover:border-white/30 hover:bg-white/5"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                  preferences.language === option.value
                    ? cn(accentBg, "text-black")
                    : "bg-gray-700 text-gray-300"
                )}
              >
                {option.flag}
              </div>
              <span
                className={cn(
                  "font-medium",
                  preferences.language === option.value
                    ? "text-white"
                    : "text-gray-400"
                )}
              >
                {option.label}
              </span>
              {preferences.language === option.value && (
                <Check className={cn("h-4 w-4 ml-auto", accentColor)} />
              )}
            </button>
          ))}
        </div>
      </HoloCard>

      {/* Timezone */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "default"}
        title="Timezone"
        subtitle="Set your local timezone"
        icon={<Clock className={cn("h-5 w-5", accentColor)} />}
        glow
      >
        <div className="py-4">
          <select
            value={preferences.timezone}
            onChange={(e) => updatePreference("timezone", e.target.value)}
            className={cn(
              "w-full px-4 py-3 rounded-lg bg-void-dark border transition-all duration-300",
              "text-white text-sm",
              "focus:outline-none focus:ring-2",
              accentBorder,
              isGodMode
                ? "focus:ring-god-primary/50"
                : isUltraMode
                ? "focus:ring-ultra-secondary/50"
                : "focus:ring-neon-cyan/50"
            )}
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value} className="bg-void-dark">
                {tz.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">
            Current time:{" "}
            <span className={accentColor}>
              {new Date().toLocaleTimeString("de-DE", {
                timeZone: preferences.timezone,
              })}
            </span>
          </p>
        </div>
      </HoloCard>

      {/* Date Format */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "gold"}
        title="Date Format"
        subtitle="How dates are displayed"
        icon={<Calendar className={cn("h-5 w-5", accentColor)} />}
        glow
      >
        <div className="space-y-2 py-4">
          {dateFormats.map((format) => (
            <button
              key={format.value}
              onClick={() => updatePreference("dateFormat", format.value)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
                preferences.dateFormat === format.value
                  ? cn(accentBorder, "bg-white/5")
                  : "border-white/10 hover:border-white/30 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-300">
                  {format.label}
                </span>
                <span className="text-xs text-gray-500">({format.example})</span>
              </div>
              {preferences.dateFormat === format.value && (
                <Check className={cn("h-4 w-4", accentColor)} />
              )}
            </button>
          ))}
        </div>
      </HoloCard>
    </div>
  );
}

// ===============================================================================
// NOTIFICATIONS TAB
// ===============================================================================

interface NotificationsTabProps {
  preferences: ReturnType<typeof useUserPreferences>["preferences"];
  updateNotificationPreference: ReturnType<
    typeof useUserPreferences
  >["updateNotificationPreference"];
  accentColor: string;
  accentBg: string;
  isGodMode: boolean;
  isUltraMode: boolean;
}

function NotificationsTab({
  preferences,
  updateNotificationPreference,
  accentColor,
  accentBg,
  isGodMode,
  isUltraMode,
}: NotificationsTabProps) {
  const notificationSettings = [
    {
      key: "emailNotifications" as const,
      label: "Email Notifications",
      description: "Receive updates via email",
      icon: <Mail className="h-5 w-5" />,
    },
    {
      key: "pushNotifications" as const,
      label: "Push Notifications",
      description: "Browser push notifications",
      icon: <Smartphone className="h-5 w-5" />,
    },
    {
      key: "alertSounds" as const,
      label: "Alert Sounds",
      description: "Play sounds for important alerts",
      icon: <Volume2 className="h-5 w-5" />,
    },
    {
      key: "desktopNotifications" as const,
      label: "Desktop Notifications",
      description: "System-level notifications",
      icon: <Monitor className="h-5 w-5" />,
    },
    {
      key: "weeklyDigest" as const,
      label: "Weekly Digest",
      description: "Summary of activity each week",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      key: "securityAlerts" as const,
      label: "Security Alerts",
      description: "Important security notifications",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      key: "marketingUpdates" as const,
      label: "Marketing Updates",
      description: "News and promotional content",
      icon: <Bell className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
        title="Notification Preferences"
        subtitle="Control how you receive alerts"
        icon={<Bell className={cn("h-5 w-5", accentColor)} />}
        glow
      >
        <div className="divide-y divide-white/10">
          {notificationSettings.map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between py-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    preferences.notifications[setting.key]
                      ? isGodMode
                        ? "bg-god-primary/20 text-god-primary"
                        : isUltraMode
                        ? "bg-ultra-secondary/20 text-ultra-secondary"
                        : "bg-neon-cyan/20 text-neon-cyan"
                      : "bg-gray-800 text-gray-500"
                  )}
                >
                  {setting.icon}
                </div>
                <div>
                  <p className="font-medium text-white">{setting.label}</p>
                  <p className="text-sm text-gray-500">{setting.description}</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={preferences.notifications[setting.key]}
                onChange={(value) =>
                  updateNotificationPreference(setting.key, value)
                }
                accentBg={accentBg}
              />
            </div>
          ))}
        </div>
      </HoloCard>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button
          variant={isGodMode ? "gold" : isUltraMode ? "purple" : "cyan"}
          onClick={() => {
            Object.keys(preferences.notifications).forEach((key) => {
              updateNotificationPreference(
                key as keyof typeof preferences.notifications,
                true
              );
            });
          }}
        >
          <Check className="h-4 w-4 mr-2" />
          Enable All
        </Button>
        <Button
          variant="outline"
          className="border-white/20"
          onClick={() => {
            Object.keys(preferences.notifications).forEach((key) => {
              if (key !== "securityAlerts") {
                updateNotificationPreference(
                  key as keyof typeof preferences.notifications,
                  false
                );
              }
            });
          }}
        >
          <X className="h-4 w-4 mr-2" />
          Disable Non-Essential
        </Button>
      </div>
    </div>
  );
}

// ===============================================================================
// SECURITY TAB
// ===============================================================================

interface SecurityTabProps {
  preferences: ReturnType<typeof useUserPreferences>["preferences"];
  activeSessions: ActiveSession[];
  updateSecurityPreference: ReturnType<
    typeof useUserPreferences
  >["updateSecurityPreference"];
  terminateSession: (id: string) => void;
  terminateAllOtherSessions: () => void;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  isGodMode: boolean;
  isUltraMode: boolean;
}

function SecurityTab({
  preferences,
  activeSessions,
  updateSecurityPreference,
  terminateSession,
  terminateAllOtherSessions,
  accentColor,
  accentBg,
  accentBorder,
  isGodMode,
  isUltraMode,
}: SecurityTabProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    // Simulate password change
    setPasswordError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    alert("Password changed successfully!");
  };

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes("mobile"))
      return <Smartphone className="h-5 w-5" />;
    if (device.toLowerCase().includes("tablet"))
      return <Tablet className="h-5 w-5" />;
    return <Laptop className="h-5 w-5" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Change Password */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "cyan"}
        title="Change Password"
        subtitle="Update your password"
        icon={<Key className={cn("h-5 w-5", accentColor)} />}
        glow
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Current Password</label>
            <Input
              variant="cyber"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">New Password</label>
            <Input
              variant="cyber"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Confirm New Password</label>
            <Input
              variant="cyber"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              error={passwordError}
            />
          </div>
          <Button
            variant={isGodMode ? "gold" : isUltraMode ? "purple" : "cyan"}
            onClick={handleChangePassword}
            className="w-full"
          >
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </div>
      </HoloCard>

      {/* Two-Factor Authentication */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "purple"}
        title="Two-Factor Authentication"
        subtitle="Add an extra layer of security"
        icon={<Shield className={cn("h-5 w-5", accentColor)} />}
        glow
      >
        <div className="py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-medium text-white">2FA Status</p>
              <p className="text-sm text-gray-500">
                {preferences.security.twoFactorEnabled
                  ? "Two-factor authentication is enabled"
                  : "Protect your account with 2FA"}
              </p>
            </div>
            <ToggleSwitch
              enabled={preferences.security.twoFactorEnabled}
              onChange={(value) =>
                updateSecurityPreference("twoFactorEnabled", value)
              }
              accentBg={accentBg}
            />
          </div>

          {!preferences.security.twoFactorEnabled && (
            <div className="p-4 rounded-lg bg-neon-gold/10 border border-neon-gold/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-neon-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-neon-gold">
                    Recommended
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Enable 2FA to protect your account from unauthorized access.
                  </p>
                </div>
              </div>
            </div>
          )}

          {preferences.security.twoFactorEnabled && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-white/20"
                disabled
              >
                <Key className="h-4 w-4 mr-2" />
                Manage Authenticator App
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/20"
                disabled
              >
                <Smartphone className="h-4 w-4 mr-2" />
                View Backup Codes
              </Button>
            </div>
          )}
        </div>
      </HoloCard>

      {/* Active Sessions */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "default"}
        title="Active Sessions"
        subtitle="Devices where you're logged in"
        icon={<Eye className={cn("h-5 w-5", accentColor)} />}
        glow
        className="lg:col-span-2"
      >
        <div className="py-4">
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-all",
                  session.isCurrent
                    ? cn(accentBorder, "bg-white/5")
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      session.isCurrent
                        ? isGodMode
                          ? "bg-god-primary/20 text-god-primary"
                          : isUltraMode
                          ? "bg-ultra-secondary/20 text-ultra-secondary"
                          : "bg-neon-cyan/20 text-neon-cyan"
                        : "bg-gray-800 text-gray-400"
                    )}
                  >
                    {getDeviceIcon(session.device)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">
                        {session.device} - {session.browser}
                      </p>
                      {session.isCurrent && (
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            accentBg,
                            "text-black"
                          )}
                        >
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {session.location} - {session.ip}
                    </p>
                    <p className="text-xs text-gray-600">
                      Last active:{" "}
                      {new Date(session.lastActive).toLocaleString("de-DE")}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => terminateSession(session.id)}
                    className="border-neon-red/50 text-neon-red hover:bg-neon-red/10"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {activeSessions.filter((s) => !s.isCurrent).length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={terminateAllOtherSessions}
                className="border-neon-red/50 text-neon-red hover:bg-neon-red/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out All Other Sessions
              </Button>
            </div>
          )}
        </div>
      </HoloCard>

      {/* Additional Security Settings */}
      <HoloCard
        variant={isGodMode ? "god" : isUltraMode ? "ultra" : "gold"}
        title="Security Preferences"
        subtitle="Additional security options"
        icon={<Lock className={cn("h-5 w-5", accentColor)} />}
        glow
        className="lg:col-span-2"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Login Notifications</p>
              <p className="text-sm text-gray-500">
                Get notified of new logins
              </p>
            </div>
            <ToggleSwitch
              enabled={preferences.security.loginNotifications}
              onChange={(value) =>
                updateSecurityPreference("loginNotifications", value)
              }
              accentBg={accentBg}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Session Timeout</p>
                <p className="text-sm text-gray-500">
                  Auto-logout after inactivity
                </p>
              </div>
            </div>
            <select
              value={preferences.security.sessionTimeout}
              onChange={(e) =>
                updateSecurityPreference(
                  "sessionTimeout",
                  parseInt(e.target.value)
                )
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg bg-void-dark border transition-all",
                "text-white text-sm",
                "focus:outline-none focus:ring-2",
                accentBorder,
                isGodMode
                  ? "focus:ring-god-primary/50"
                  : isUltraMode
                  ? "focus:ring-ultra-secondary/50"
                  : "focus:ring-neon-cyan/50"
              )}
            >
              <option value={15} className="bg-void-dark">
                15 minutes
              </option>
              <option value={30} className="bg-void-dark">
                30 minutes
              </option>
              <option value={60} className="bg-void-dark">
                1 hour
              </option>
              <option value={120} className="bg-void-dark">
                2 hours
              </option>
              <option value={480} className="bg-void-dark">
                8 hours
              </option>
            </select>
          </div>
        </div>
      </HoloCard>
    </div>
  );
}

// ===============================================================================
// TOGGLE SWITCH COMPONENT
// ===============================================================================

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  accentBg: string;
}

function ToggleSwitch({ enabled, onChange, accentBg }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative w-12 h-6 rounded-full transition-all duration-300",
        enabled ? accentBg : "bg-gray-700",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void",
        enabled ? "focus:ring-current" : "focus:ring-gray-500"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300",
          "bg-white shadow-lg",
          enabled ? "left-6" : "left-0.5"
        )}
      />
    </button>
  );
}
