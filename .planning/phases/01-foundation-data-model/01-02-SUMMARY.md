---
phase: 01-foundation-data-model
plan: 02
subsystem: data-model
tags: [prisma, mysql, migration, express, health-check, zod]
provides:
  - eight-model Phase 1 schema (users, departments, faculty, buildings, floors, classrooms, nodes, edges) with complete bidirectional relations
  - applied initial migration creating all eight tables
  - generated Prisma 7 client bound to the MariaDB driver adapter via a single singleton
  - fail-closed environment parser (no default JWT secret)
  - Express 5 app factory with helmet, cors, json, pino-http, a 404 handler and a leak-free error handler
  - GET /v1/health proving the HTTP -> Prisma -> MySQL round-trip
  - scripts/smoke-health.ts as the phase's end-to-end gate
affects: [phase-2, phase-3, phase-4, phase-5]
actuals:
  tokens: 41000
  tasks: 3
  commits: 1
tech-stack:
  added:
    - "@prisma/adapter-mariadb (PrismaMariaDb, connectionLimit 5)"
    - helmet 8.3.0
    - pino 10.4.0 + pino-http 11.0.0
    - cors 2.8.6
  patterns:
    - single process-wide PrismaClient constructed only in src/lib/prisma.ts
    - environment parsed once by zod at module load; process.env never read elsewhere
    - app factory (createApp) separate from the process entry point
    - named Prisma self-relations (EdgeFrom / EdgeTo) on both sides
key-files:
  created:
    - apps/api/prisma/schema.prisma
    - apps/api/prisma7.config.ts
    - apps/api/prisma/migrations/20261023115623_init/migration.sql
    - apps/api/src/config.ts
    - apps/api/src/lib/prisma.ts
    - apps/api/src/app.ts
    - apps/api/src/index.ts
    - apps/api/src/routes/health.ts
    - apps/api/scripts/smoke-health.ts
    - docker/init/01-grant-shadow-db.sql
  modified:
    - package.json
    - package-lock.json
    - docker-compose.yml
key-decisions:
  - "Pinned `effect` to 3.20.0 for @prisma/config; the hoisted 4.0.6 made defineConfig crash with \"Cannot read properties of undefined (reading 'right')\""
  - "Granted the app user CREATE DATABASE via a docker init script so Prisma's per-run shadow database can be created"
  - "The 503 health branch logs the driver error and returns a fixed message, per threat T-01-06"
duration: 90min
completed: 2026-10-23
status: complete
---

# Phase 1, Plan 02: Schema, Migration and Health Slice Summary

**The schema-to-migration-to-generated-client-to-HTTP-200 path is proven end to end: a real server on an ephemeral port returns `{ status: "ok", db: "ok" }` from a real MySQL round-trip.**

## Performance
- **Duration:** ~90 min (most of it spent diagnosing a dependency-resolution failure and a MySQL grant)
- **Tasks:** 3 of 3
- **Files created/modified:** 14

## Accomplishments

- **Schema.** All eight Phase 1 models with both sides of every relation, three enums (`Role`, `NodeKind`, `EdgeKind`), four natural-key unique constraints, and the two non-nullable calibration columns — `Floor.metersPerPixel Decimal(10,6)` and `Edge.costM Decimal(8,2)` — from day one. `prisma validate` passes, which is only possible with complete opposite relation fields.
- **Migration.** `20261023115623_init` applies cleanly and its SQL creates all eight tables.
- **Generated client.** 7.10.1, emitted to `apps/api/src/generated/prisma` with `importFileExtension = "ts"`; gitignored, so `prisma:generate` is a required setup step.
- **Adapter wiring.** `PrismaMariaDb` built from `dbConnection` with `connectionLimit: 5`; the client is a single exported singleton.
- **Environment boundary.** `src/config.ts` parses `process.env` once with zod. `JWT_SECRET` has no default and must be ≥32 chars. Verified: booting with `JWT_SECRET=short` throws `Invalid environment configuration. Problem keys: JWT_SECRET. …` and never opens a port.
- **HTTP slice.** `createApp()` in the required middleware order; `GET /v1/health` returns 200 `{status:"ok",db:"ok",uptimeSeconds}` or 503 `{status:"degraded",db:"unreachable"}`.
- **Gates.** `typecheck` clean, `smoke:health` exits 0, schema/migration assertions pass.

## Task Commits
1. **Tasks 1–3** — `2d99973` (schema, migration, config, client, app, health slice)

## Decisions & Deviations

1. **`effect` version conflict (blocking, cost ~40 min).** `prisma validate` failed on every command with `Failed to load config file … TypeError: Cannot read properties of undefined (reading 'right')`. Root cause: `@prisma/config@7.10.1` depends on `effect@3.20.0`, but the tree hoisted **`effect@4.0.6`** to the root (pulled in as an *optional peer* of `@hookform/resolvers`), and effect 4 no longer exposes the `Either` export that `validateExperimentalFeatures` calls. The package.json had an override `"effect": "^4.0.0"` making this worse. **Fix:** removed that override, replaced it with `"overrides": { "effect": "3.20.0" }`, and added `effect@3.20.0` as an exact root devDependency so npm actually hoists it. `@hookform/resolvers`' effect peer is optional and unused (we use `zodResolver`), so pinning 3.20.0 is harmless. **This must not be "upgraded" casually later.**
2. **Prisma shadow database (blocking).** `prisma migrate dev` failed with `P3014` / `P1010`: the `qroute` MySQL user had no right to create `prisma_migrate_shadow_db_*`. **Fix:** `docker/init/01-grant-shadow-db.sql` granted on first container init, plus a live `GRANT ALL PRIVILEGES ON *.*` this session. Warning: the init script only runs on an **empty data volume** — the file documents the manual command for existing volumes.
3. **Migration name.** Applied as `20261023115623_init` rather than `init_phase1`; the plan's later `db:migrate -- --name init_phase1` re-run reports "Already in sync" and exits 0, so the gate still holds.
4. **Health 503 body.** The plan text suggested echoing the driver's `<message>`; threat T-01-06 forbids leaking connection details. The handler logs the real error through pino and returns a fixed `"database unreachable"` string.
5. **Generated-client import path.** The `prisma-client` generator emits a `client.ts` entry point, so the singleton imports `../generated/prisma/client.ts` rather than the bare directory named in the plan.

## Next Phase Readiness
- Wave 3 can run: schema, migration, generated client, `config`, `prisma` singleton and `createApp` all exist and are typechecked.
- `npm install && npm --prefix apps/api run prisma:generate && npm --prefix apps/api run db:migrate` is the cold-start sequence.
- Docker Desktop's engine must be running; the DB listens on host **3307** (native MySQL80 owns 3306).
- Remaining risk: if the `qroute-mysql` volume is recreated, the init script re-grants automatically — but an existing volume created before this commit still needs the manual `GRANT`.
