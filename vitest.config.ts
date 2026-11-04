import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
    // Component tests opt into jsdom with a per-file docblock.
    environmentMatchGlobs: [["test/components/**", "jsdom"], ["test/present/**", "jsdom"]],
  },
});
