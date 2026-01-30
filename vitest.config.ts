import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Use Node environment for API tests
    environment: "node",

    // Global test utilities
    globals: true,

    // Include patterns
    include: [
      "packages/**/src/**/*.test.ts",
      "packages/**/src/**/*.spec.ts",
      "apps/**/src/**/*.test.ts",
      "apps/**/src/**/*.test.tsx",
    ],

    // Exclude patterns
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
    ],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        ".next/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
      ],
    },

    // Setup files
    setupFiles: ["./vitest.setup.ts"],

    // Timeout for each test
    testTimeout: 10000,

    // Pool options
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },

  resolve: {
    alias: {
      "@nexus/api": path.resolve(__dirname, "./packages/api/src"),
      "@nexus/db": path.resolve(__dirname, "./packages/db/src"),
      "@nexus/integrations": path.resolve(__dirname, "./packages/integrations/src"),
      "@nexus/automation": path.resolve(__dirname, "./packages/automation/src"),
    },
  },
});
