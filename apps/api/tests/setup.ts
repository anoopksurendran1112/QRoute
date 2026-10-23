// Vitest setup — runs once per test file.
//
// dotenv must be imported before anything touches the Prisma client, because
// src/config.ts validates DATABASE_URL and JWT_SECRET at module load.

import "dotenv/config";
import { afterAll } from "vitest";
import { disconnectPrisma } from "../src/lib/prisma.ts";

if (!process.env["DATABASE_URL"]) {
  throw new Error(
    "DATABASE_URL is not set. Tests run with cwd = apps/api, so copy " +
      "apps/api/.env.example to apps/api/.env and start the MySQL container " +
      "(docker compose up -d db).",
  );
}

afterAll(async () => {
  // Without this the pool keeps the event loop alive and Vitest hangs.
  await disconnectPrisma();
});
