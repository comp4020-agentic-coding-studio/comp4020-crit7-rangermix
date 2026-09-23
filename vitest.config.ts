import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "spec/**/*.test.ts",
      "scripts/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    globalSetup: ["./spec/global-setup.ts"],
    // One shared server and database: files run in turn so row counts are exact.
    fileParallelism: false,
  },
});
