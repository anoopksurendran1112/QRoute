import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Tests import describe/it/expect explicitly, so no globals are injected
    // into the tsconfig type space.
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Every suite shares one MySQL database; parallel files would race on
    // cleanup and on the seeded campus.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
