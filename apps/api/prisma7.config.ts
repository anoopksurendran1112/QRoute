// Prisma 7 configuration.
//
// Prisma's CLI looks for `prisma.config.ts` by default. This file is
// deliberately named `prisma7.config.ts` to match the researched convention, so
// every npm script passes `--config prisma7.config.ts`. Do not rely on the
// default lookup and do not rename this file.
//
// Prisma 7's `prisma-client` generator does NOT load .env at runtime, hence the
// explicit dotenv import below.

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts --set=demo",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
