import path from "path";

/**
 * Vitest Configuration for Nexus FnB BMS Test Suite
 */
export default {
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
