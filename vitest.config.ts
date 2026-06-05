import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      shared: path.resolve(__dirname, "src/Lexical/shared/src"),
      lexical: path.resolve(__dirname, "node_modules/lexical"),
      "@lexical/react": path.resolve(__dirname, "node_modules/@lexical/react"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "src/**/*.unit.test.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
