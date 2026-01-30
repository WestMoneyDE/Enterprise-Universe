// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS DESIGN TOKENS
// Centralized design values for the cyberpunk aesthetic
// ═══════════════════════════════════════════════════════════════════════════════

export const colors = {
  // Void - Deep Space Backgrounds
  void: {
    DEFAULT: "#0A0A0F",
    dark: "#050508",
    surface: "#1A1A24",
    elevated: "#252532",
  },

  // Neon Accents
  neon: {
    cyan: "#00F0FF",
    purple: "#A855F7",
    orange: "#FF6B00",
    green: "#00FF88",
    red: "#FF3366",
    gold: "#FFD700",
    blue: "#0080FF",
    pink: "#FF00FF",
  },

  // Power Mode Themes
  god: {
    primary: "#FF4500",
    secondary: "#FFD700",
    tertiary: "#FF6347",
  },
  ultra: {
    primary: "#E0E7FF",
    secondary: "#818CF8",
    tertiary: "#C7D2FE",
  },

  // Brand Colors
  nexus: {
    50: "#f0f7ff",
    100: "#e0efff",
    200: "#b8dbff",
    300: "#7abfff",
    400: "#369eff",
    500: "#0080ff",
    600: "#0064db",
    700: "#004eb3",
    800: "#004294",
    900: "#00397a",
    950: "#002452",
  },
} as const;

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
} as const;

export const borderRadius = {
  none: "0",
  sm: "0.25rem",
  DEFAULT: "0.5rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  holo: "12px",
  terminal: "8px",
  full: "9999px",
} as const;

export const shadows = {
  neonCyan: "0 0 5px #00F0FF, 0 0 10px #00F0FF, 0 0 20px #00F0FF",
  neonCyanLg: "0 0 10px #00F0FF, 0 0 20px #00F0FF, 0 0 40px #00F0FF",
  neonPurple: "0 0 5px #A855F7, 0 0 10px #A855F7, 0 0 20px #A855F7",
  neonPurpleLg: "0 0 10px #A855F7, 0 0 20px #A855F7, 0 0 40px #A855F7",
  neonGreen: "0 0 5px #00FF88, 0 0 10px #00FF88, 0 0 20px #00FF88",
  neonRed: "0 0 5px #FF3366, 0 0 10px #FF3366, 0 0 20px #FF3366",
  neonGold: "0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 20px #FFD700",
  god: "0 0 20px #FF4500, 0 0 40px #FFD700, 0 0 60px #FF4500",
  ultra: "0 0 20px #E0E7FF, 0 0 40px #818CF8, 0 0 60px #E0E7FF",
  holo: "0 0 1px rgba(0, 240, 255, 0.5), inset 0 0 20px rgba(0, 240, 255, 0.1)",
} as const;

export const typography = {
  fontFamily: {
    sans: ["var(--font-inter)", "system-ui", "sans-serif"],
    mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
    display: ["var(--font-orbitron)", "Orbitron", "sans-serif"],
    ui: ["var(--font-rajdhani)", "Rajdhani", "sans-serif"],
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
    "5xl": ["3rem", { lineHeight: "1" }],
  },
} as const;

export const animation = {
  duration: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
    slower: "1000ms",
  },
  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const zIndex = {
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  commandPalette: 900,
  toast: 1000,
} as const;

export type NeonColor = keyof typeof colors.neon;
export type PowerMode = "normal" | "god" | "ultra";
