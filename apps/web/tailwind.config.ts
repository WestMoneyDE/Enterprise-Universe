import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════════
        // CSS VARIABLE COLORS (for shadcn/ui compatibility)
        // ═══════════════════════════════════════════════════════════
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ═══════════════════════════════════════════════════════════
        // SCIFI CYBERPUNK NEON THEME
        // ═══════════════════════════════════════════════════════════

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

        // God Mode 神 Theme
        god: {
          primary: "#FF4500",
          secondary: "#FFD700",
          tertiary: "#FF6347",
        },

        // Ultra Instinct 極 Theme
        ultra: {
          primary: "#E0E7FF",
          secondary: "#818CF8",
          tertiary: "#C7D2FE",
        },

        // ═══════════════════════════════════════════════════════════
        // ORIGINAL BRAND COLORS
        // ═══════════════════════════════════════════════════════════

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
        wmb: {
          primary: "#2563eb",
          secondary: "#1e40af",
        },
        wmos: {
          primary: "#7c3aed",
          secondary: "#5b21b6",
        },
        zauto: {
          primary: "#059669",
          secondary: "#047857",
        },
        dedsec: {
          primary: "#dc2626",
          secondary: "#b91c1c",
        },
      },

      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
        display: ["var(--font-orbitron)", "Orbitron", "sans-serif"],
        ui: ["var(--font-rajdhani)", "Rajdhani", "sans-serif"],
      },

      // ═══════════════════════════════════════════════════════════
      // ANIMATIONS
      // ═══════════════════════════════════════════════════════════

      animation: {
        // Glow Effects
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "glow-cyan": "glow-cyan 2s ease-in-out infinite",
        "glow-purple": "glow-purple 2s ease-in-out infinite",

        // Power Mode Animations
        "god-aura": "god-aura 3s ease-in-out infinite",
        "ultra-aura": "ultra-aura 2s ease-in-out infinite",
        "power-up": "power-up 1s ease-out forwards",

        // UI Animations
        "float": "float 3s ease-in-out infinite",
        "scan-line": "scan-line 2s linear infinite",
        "flicker": "flicker 0.5s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "spin-slow": "spin 3s linear infinite",

        // Terminal Animations
        "typing": "typing 3.5s steps(40, end)",
        "blink-caret": "blink-caret 0.75s step-end infinite",

        // Data Flow
        "data-flow": "data-flow 2s linear infinite",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },

      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "glow-cyan": {
          "0%, 100%": {
            boxShadow: "0 0 5px #00F0FF, 0 0 10px #00F0FF, 0 0 20px #00F0FF",
          },
          "50%": {
            boxShadow: "0 0 10px #00F0FF, 0 0 20px #00F0FF, 0 0 40px #00F0FF",
          },
        },
        "glow-purple": {
          "0%, 100%": {
            boxShadow: "0 0 5px #A855F7, 0 0 10px #A855F7, 0 0 20px #A855F7",
          },
          "50%": {
            boxShadow: "0 0 10px #A855F7, 0 0 20px #A855F7, 0 0 40px #A855F7",
          },
        },
        "god-aura": {
          "0%, 100%": {
            boxShadow: "0 0 20px #FF4500, 0 0 40px #FFD700, 0 0 60px #FF4500",
            filter: "brightness(1)",
          },
          "50%": {
            boxShadow: "0 0 40px #FF4500, 0 0 80px #FFD700, 0 0 120px #FF4500",
            filter: "brightness(1.2)",
          },
        },
        "ultra-aura": {
          "0%, 100%": {
            boxShadow: "0 0 20px #E0E7FF, 0 0 40px #818CF8, 0 0 60px #E0E7FF",
            filter: "brightness(1)",
          },
          "50%": {
            boxShadow: "0 0 40px #E0E7FF, 0 0 80px #818CF8, 0 0 120px #E0E7FF",
            filter: "brightness(1.3)",
          },
        },
        "power-up": {
          "0%": { transform: "scale(1)", filter: "brightness(1)" },
          "50%": { transform: "scale(1.1)", filter: "brightness(2)" },
          "100%": { transform: "scale(1)", filter: "brightness(1.2)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "flicker": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "typing": {
          "from": { width: "0" },
          "to": { width: "100%" },
        },
        "blink-caret": {
          "from, to": { borderColor: "transparent" },
          "50%": { borderColor: "#00F0FF" },
        },
        "data-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
      },

      // ═══════════════════════════════════════════════════════════
      // BOX SHADOWS (Neon Glows)
      // ═══════════════════════════════════════════════════════════

      boxShadow: {
        "neon-cyan": "0 0 5px #00F0FF, 0 0 10px #00F0FF, 0 0 20px #00F0FF",
        "neon-cyan-lg": "0 0 10px #00F0FF, 0 0 20px #00F0FF, 0 0 40px #00F0FF",
        "neon-purple": "0 0 5px #A855F7, 0 0 10px #A855F7, 0 0 20px #A855F7",
        "neon-purple-lg": "0 0 10px #A855F7, 0 0 20px #A855F7, 0 0 40px #A855F7",
        "neon-green": "0 0 5px #00FF88, 0 0 10px #00FF88, 0 0 20px #00FF88",
        "neon-red": "0 0 5px #FF3366, 0 0 10px #FF3366, 0 0 20px #FF3366",
        "neon-gold": "0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 20px #FFD700",
        "neon-orange": "0 0 5px #FF6B00, 0 0 10px #FF6B00, 0 0 20px #FF6B00",
        "god": "0 0 20px #FF4500, 0 0 40px #FFD700, 0 0 60px #FF4500",
        "ultra": "0 0 20px #E0E7FF, 0 0 40px #818CF8, 0 0 60px #E0E7FF",
        "holo": "0 0 1px rgba(0, 240, 255, 0.5), inset 0 0 20px rgba(0, 240, 255, 0.1)",
      },

      // ═══════════════════════════════════════════════════════════
      // BACKGROUND IMAGES (Gradients & Effects)
      // ═══════════════════════════════════════════════════════════

      backgroundImage: {
        "void-gradient": "linear-gradient(to bottom, #0A0A0F, #1A1A24)",
        "cyber-grid": "linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)",
        "god-gradient": "radial-gradient(ellipse at center, rgba(255, 69, 0, 0.4), rgba(255, 215, 0, 0.2), transparent)",
        "ultra-gradient": "radial-gradient(ellipse at center, rgba(224, 231, 255, 0.5), rgba(129, 140, 248, 0.3), transparent)",
        "neon-border": "linear-gradient(90deg, #00F0FF, #A855F7, #00F0FF)",
        "data-stream": "linear-gradient(90deg, transparent, #00F0FF, transparent)",
      },

      backgroundSize: {
        "cyber-grid": "50px 50px",
      },

      // ═══════════════════════════════════════════════════════════
      // BORDER RADIUS
      // ═══════════════════════════════════════════════════════════

      borderRadius: {
        "holo": "12px",
        "terminal": "8px",
      },

      // ═══════════════════════════════════════════════════════════
      // BACKDROP BLUR
      // ═══════════════════════════════════════════════════════════

      backdropBlur: {
        "holo": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
