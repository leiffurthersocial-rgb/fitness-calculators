import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The formula library is pure functions — no DOM needed.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
