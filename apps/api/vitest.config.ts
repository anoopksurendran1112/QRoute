import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Tests import describe/it/expect explicitly, so no globals are injected
    // into the tsconfig type space.
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    // `src/**/__tests__` holds the pure unit tests (pathfinding, heap) that need
    // no database. They were excluded by the old `tests/**` glob, which is how
    // a routing regression that broke every route reached a running demo.
    include: ["tests/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
    // Every suite shares one MySQL database; parallel files would race on
    // cleanup and on the seeded campus.
    fileParallelism: false,
    // pino-http logs every request at `info`; that noise buries the test
    // reporter. dotenv does not override an existing env var, so this wins.
    env: { LOG_LEVEL: "silent" },
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
