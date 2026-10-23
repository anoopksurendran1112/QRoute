---
phase: 01-foundation-data-model
plan: 03
subsystem: shared-contract-and-test-harness
tags: [shared-types, vitest, test-harness, isolation]
provides:
  - "@qroute/shared domain contract: Role/NodeKind/EdgeKind const tuples, AuthUser and five catalog DTOs, ApiErrorCode and ApiErrorBody"
  - barrel entry point that later plans extend without changing consumer import paths
  - vitest harness (node env, serial files, 20s timeouts) wired to the live MySQL container
  - prefix-scoped, FK-ordered cleanup helper that refuses short prefixes
  - falsifiable harness self-test
affects: [phase-2, phase-3, phase-4, phase-5]
actuals:
  tokens: 26000
  tasks: 2
  commits: 1
tech-stack:
  added: []
  patterns:
    - decimal values cross the API boundary as strings, never numbers
    - test fixtures carry a unique prefix in their natural key; cleanup deletes only by that prefix
    - tests import describe/it/expect explicitly so no globals leak into tsconfig
key-files:
  created:
    - packages/shared/src/domain.ts
    - packages/shared/src/index.ts
    - apps/api/vitest.config.ts
    - apps/api/tests/setup.ts
    - apps/api/tests/helpers/db.ts
    - apps/api/tests/harness.test.ts
  modified:
    - apps/api/package.json
    - apps/admin/package.json
key-decisions:
  - "Both workspaces now declare @qroute/shared so the single contract is genuinely shared rather than reachable by accident"
  - "cleanupByPrefix rejects prefixes shorter than 3 characters, because startsWith(\"\") would delete the seeded campus"
duration: 35min
completed: 2026-10-23
status: complete
---

# Phase 1, Plan 03: Shared Contract and Test Harness Summary

**One domain contract compiled by both tiers, and a test harness that proves its own database reachability and its own isolation guarantees.**

## Performance
- **Duration:** ~35 min
- **Tasks:** 2 of 2
- **Files created/modified:** 9

## Accomplishments
- **`@qroute/shared`**: `ROLES`/`NODE_KINDS`/`EDGE_KINDS` as const tuples with derived union types; `AuthUser`, `BuildingDto`, `FloorDto`, `ClassroomDto`, `DepartmentDto`, `FacultyDto`; `ApiErrorCode` and `ApiErrorBody`. Zero runtime dependencies on Prisma or Express — it ships to the browser bundle.
- **Decimal discipline**: `FloorDto.metersPerPixel` is typed `string`, matching Prisma's JSON serialisation of `Decimal`. Typing it `number` is the defect that makes a 0.02 m/px calibration render unpredictably.
- **Harness**: `vitest.config.ts` — node environment, explicit imports, `fileParallelism: false` (all suites share one database), 20 s test/hook timeouts. `tests/setup.ts` loads dotenv, fails loudly when `DATABASE_URL` is absent, and disconnects Prisma in `afterAll` so Vitest exits instead of hanging.
- **Isolation**: `cleanupByPrefix(prefix)` deletes edges, nodes, classrooms, floors, buildings, faculty then departments in FK-safe order and returns a row count. No truncation anywhere — the seeded demo campus shares this database.
- **Self-test green**: 4 tests pass — shared contract resolves from the API workspace, `SELECT 1` round-trips, five `uniqueSuffix()` calls are distinct and match `/^[a-z0-9]{6,}$/`, and an absent prefix removes 0 rows.

## Task Commits
1. **Tasks 1–2** — `717ba33`

## Decisions & Deviations
- **Added `@qroute/shared` to both workspaces.** Neither `apps/api` nor `apps/admin` declared the dependency; npm workspaces would have resolved the path by hoisting rather than by declaration. Both `package.json` files now list `"@qroute/shared": "*"`, which is outside the plan's `files_modified` but required to make the plan's first truth ("both tiers import from `@qroute/shared`") honest.
- **Added a contract-resolution assertion to `harness.test.ts`.** It proves the shared package actually resolves at runtime (via tsx/vitest) rather than only typechecking.
- **Known transient state: `npm --prefix apps/admin run typecheck` fails with TS18003** ("no inputs found") because `apps/admin/src/` does not exist yet. The admin scaffold was deliberately left bare in 01-01; plans 01-06/01-07 create the auth shell and catalog screens. This is expected at the end of wave 3 and resolves in wave 5.

## Next Phase Readiness
- Wave 4 (01-04: auth) and wave 5 (01-05/01-06) can write behaviour tests against the harness immediately.
- `npm --prefix apps/api run test:harness` is the cheap canary for "is the database actually there" before any other suite.
- Suite runtime is ~10 s, dominated by setup and transform; no optimisation needed at this phase.
