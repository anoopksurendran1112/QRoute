# Phase 1 Validation — Foundation & Data Model

**Phase:** 1 — Foundation & Data Model
**Requirements in scope:** AUTH-01, ADMIN-01, SEED-01
**Config in force:** `workflow.nyquist_validation: true`, `workflow.security_enforcement: true`, `security_asvs_level: 1`, `human_verify_mode: end-of-phase`
**Authored:** 2026-10-23 (revision 2 — closes the missing-test-artifact blocker)

Every command in this document is executed from the repository root and carries its own exit status. No command ends in `wc -l`, `tail`, `|| echo` or any other suffix that would mask a failure.

---

## 1. Test framework

| Property | Value |
|---|---|
| Framework | vitest ^5.0.5 (installed in plan 01-01) |
| HTTP driver | supertest ^7.3.1 (bundles its own types) |
| API environment | node |
| Admin environment | happy-dom ^21.0.4 — **not** jsdom 30, which requires Node ≥22.22.2 while this machine runs 22.14.0 |
| API config | `apps/api/vitest.config.ts` — `setupFiles ./tests/setup.ts`, `fileParallelism false`, 20 s timeouts |
| Admin config | `apps/admin/vitest.config.ts` — `setupFiles ./src/test/setup.ts` |
| Database | the Docker MySQL 8 container from plan 01-01; suites run serially because they share it |
| Isolation | unique natural keys per run (`t-auth-`, `t-cat-` prefixes) plus prefix-scoped cleanup; never truncate the demo campus |

### Commands

| Purpose | Command |
|---|---|
| API harness self-test | `npm --prefix apps/api run test:harness` |
| AUTH-01 suite | `npm --prefix apps/api run test:auth` |
| ADMIN-01 API suite | `npm --prefix apps/api run test:catalog` |
| SEED-01 suite | `npm --prefix apps/api run test:seed` |
| Full API suite | `npm --prefix apps/api run test` |
| Admin panel suite | `npm --prefix apps/admin run test` |
| Schema validity | `npm --prefix apps/api run prisma:validate` |
| Generate gate | `npm --prefix apps/api run prisma:generate` |
| Migration gate | `npm --prefix apps/api run db:migrate -- --name init_phase1` |
| Seed (twice, for idempotency) | `npm --prefix apps/api run db:seed && npm --prefix apps/api run db:seed` |
| Seed invariants | `npm --prefix apps/api run seed:verify` |
| End-to-end health | `npm --prefix apps/api run smoke:health` |
| Type gates | `npm --prefix apps/api run typecheck`, `npm --prefix packages/shared run typecheck`, `npm --prefix apps/admin run typecheck` |
| Admin build | `npm --prefix apps/admin run build` |

### Phase gate

`npm --prefix apps/api run test && npm --prefix apps/admin run test && npm --prefix apps/api run seed:verify` — all three must exit 0 before Phase 2 begins.

---

## 2. Wave 0 gap closure

`01-RESEARCH.md` listed five Wave 0 files and noted that none existed. Each is now owned by a plan that runs before the first behaviour test that needs it.

| Wave 0 artefact | Owning plan | Wave |
|---|---|---|
| `apps/api/vitest.config.ts` | 01-03 | 3 |
| `apps/api/tests/setup.ts` | 01-03 | 3 |
| `apps/api/tests/helpers/db.ts` | 01-03 | 3 |
| `apps/api/tests/harness.test.ts` | 01-03 | 3 |
| `apps/api/tests/auth.test.ts` | 01-04 | 4 |
| `apps/api/tests/catalog.test.ts` | 01-05 | 5 |
| `apps/api/tests/seed.test.ts` | 01-05 | 5 |
| vitest + supertest installed and scripted | 01-01 | 1 |
| `apps/admin/vitest.config.ts`, `src/test/setup.ts` | 01-06 | 5 |

The harness is itself validated: `tests/harness.test.ts` fails when MySQL is unreachable or the migration has not been applied, so a green run of any later suite cannot be an artefact of a dead harness.

---

## 3. Requirement → test map

### AUTH-01 — Users can register and log in; admins are distinguished by role

Test file: `apps/api/tests/auth.test.ts` (server) and `apps/admin/src/__tests__/auth-gate.test.tsx` (client)
Commands: `npm --prefix apps/api run test:auth` · `npm --prefix apps/admin run test`

| ID | Behaviour asserted | Layer |
|---|---|---|
| AUTH-01-01 | Register with valid payload returns 201, a token, and `user.role === "user"`; the body contains no password or hash field | API |
| AUTH-01-02 | Register with `role: "admin"` in the body still yields `user.role === "user"` | API |
| AUTH-01-03 | Register with an existing email returns 409 `CONFLICT` | API |
| AUTH-01-04 | Register with an invalid email or a 7-character password returns 400 `VALIDATION_ERROR` | API |
| AUTH-01-05 | Login with the correct password returns 200 and a token that `/v1/auth/me` accepts | API |
| AUTH-01-06 | Login with a wrong password returns 401 `UNAUTHORIZED` | API |
| AUTH-01-07 | Login with an unknown email returns 401 with the same body shape and message as AUTH-01-06 | API |
| AUTH-01-08 | `GET /v1/auth/me` with a valid token returns the caller's email and role | API |
| AUTH-01-09 | `GET /v1/auth/me` with no Authorization header returns 401 | API |
| AUTH-01-10 | `GET /v1/auth/me` with a token signed by a different secret returns 401 | API |
| AUTH-01-11 | `GET /v1/admin/ping` anonymously returns 401 | API |
| AUTH-01-12 | `GET /v1/admin/ping` with a `user` token returns 403 | API |
| AUTH-01-13 | `GET /v1/admin/ping` with an `admin` token returns 200 | API |
| AUTH-01-14 | Repeated failed logins from one client reach 429 `RATE_LIMITED` | API |
| AUTH-01-15 | An anonymous visitor to `/` is redirected to the login screen and never sees dashboard text | Admin UI |
| AUTH-01-16 | Submitting valid credentials posts to `/auth/login`, stores the token and renders the dashboard with the user's email | Admin UI |
| AUTH-01-17 | A 401 login response keeps the user on the login screen and shows the invalid-credentials message | Admin UI |
| AUTH-01-18 | A token decoding to role `user` renders "Admin access required" with no catalog controls | Admin UI |
| AUTH-01-19 | A malformed persisted token is discarded on mount and the user lands on the login screen | Admin UI |

### ADMIN-01 — Admin can create, edit and delete buildings, floors, classrooms, departments and faculty

Test files: `apps/api/tests/catalog.test.ts` (API), `apps/admin/src/__tests__/catalog.test.tsx` (UI)
Commands: `npm --prefix apps/api run test:catalog` · `npm --prefix apps/admin run test`

| ID | Behaviour asserted | Layer |
|---|---|---|
| ADMIN-01-01 | Buildings: POST 201 → GET list contains → GET by id 200 → PATCH changes name → DELETE 204 → **GET by id 404** | API |
| ADMIN-01-02 | Floors: same full round-trip, `level` unique per building, `buildingId` required | API |
| ADMIN-01-03 | Classrooms: same full round-trip, `roomNumber` unique per floor, `floorId` required | API |
| ADMIN-01-04 | Departments: same full round-trip, `name` and `code` unique | API |
| ADMIN-01-05 | Faculty: same full round-trip, `email` unique, `departmentId` required | API |
| ADMIN-01-06 | Every write without a token returns 401, for all five entities | API |
| ADMIN-01-07 | Every write with a `user` token returns 403, for all five entities | API |
| ADMIN-01-08 | Every read with a `user` token returns 200 | API |
| ADMIN-01-09 | DELETE building with floors returns 409 | API |
| ADMIN-01-10 | DELETE floor with classrooms returns 409 | API |
| ADMIN-01-11 | DELETE department with faculty returns 409 | API |
| ADMIN-01-12 | Missing required field or non-positive `metersPerPixel` returns 400 `VALIDATION_ERROR` | API |
| ADMIN-01-13 | Duplicate natural key returns 409 `CONFLICT` | API |
| ADMIN-01-14 | `metersPerPixel` serialises as a JSON **string**, never a nested object | API |
| ADMIN-01-15 | Classroom list filter by `floorId` returns only that floor's rooms | API |
| ADMIN-01-16 | All five catalog pages render their heading and rows | Admin UI |
| ADMIN-01-17 | Create issues POST to the entity path and the new row appears without a manual reload | Admin UI |
| ADMIN-01-18 | Edit pre-fills the record and issues PATCH to `/<entity>/<id>` | Admin UI |
| ADMIN-01-19 | Delete requires confirmation; cancelling issues **no** request; confirming issues exactly one DELETE | Admin UI |
| ADMIN-01-20 | A 409 on delete renders the server's blocking-dependents message | Admin UI |
| ADMIN-01-21 | The floors table displays `metersPerPixel`; the classrooms table displays entrance-node binding | Admin UI |

### SEED-01 — A seeded synthetic campus exists and is loadable without manual setup

Test file: `apps/api/tests/seed.test.ts` plus the `seed:verify` CLI
Commands: `npm --prefix apps/api run db:seed && npm --prefix apps/api run db:seed && npm --prefix apps/api run seed:verify` · `npm --prefix apps/api run test:seed`

| ID | Behaviour asserted | Layer |
|---|---|---|
| SEED-01-01 | `runSeed("demo")` twice yields identical counts for buildings, floors, classrooms, departments, faculty, nodes and edges | Suite |
| SEED-01-02 | `verifyDemoCampus()` returns zero violations after the demo seed | Suite |
| SEED-01-03 | `runSeed("fixtures")` creates a `FIX-` building containing an orphan node, a classroom with a null entrance node, an unpaired stair node, an out-of-bounds node, a cross-floor walk edge and a disconnected component | Suite |
| SEED-01-04 | Demo invariants stay clean after fixtures are seeded (fixture isolation by `FIX-` prefix) | Suite |
| SEED-01-05 | A duplicate edge (`fromNodeId`, `toNodeId`, `kind`) is rejected with Prisma `P2002` | Suite |
| SEED-01-06 | Two consecutive CLI seed runs exit 0 (idempotency under every unique constraint) | CLI |
| SEED-01-07 | `seed:verify` exits 0 and prints counts on a healthy campus | CLI |
| SEED-01-08 | `seed:verify` exits non-zero and names the offender when an invariant is broken (negative test, run manually during phase verification) | CLI |

### seed:verify invariants

Run by `npm --prefix apps/api run seed:verify` (fixture rows with building codes beginning `FIX-` excluded):

1. ≥ 3 buildings, each with ≥ 2 floors
2. every floor's `metersPerPixel` > 0 and ≠ 1.0
3. ≥ 2 distinct calibrations with a ratio ≥ 1.5 (e.g. 0.020 vs 0.011 vs 0.035)
4. every classroom has a non-null entrance node **on its own floor**
5. no node with zero incident edges
6. all five catalog entity types have a non-zero row count
7. an admin user exists
8. every edge `costM` > 0
9. at least one room number appears in ≥ 2 buildings (search-ambiguity coverage)
10. each demo building's graph is a single connected component

---

## 4. Infrastructure validation

| Check | Command | Fails when |
|---|---|---|
| Toolchain installed and pinned | `npm ls --prefix apps/api prisma@7.10.1 @prisma/client@7.10.1 @prisma/adapter-mariadb@7.10.1` | any package missing or version-drifted (also catches the prisma 8.x release candidate) |
| Database reachable | `node scripts/wait-for-mysql.mjs` | container absent, unhealthy, or timed out |
| Schema valid | `npm --prefix apps/api run prisma:validate` | invalid syntax **or a relation without its opposite field** |
| Client generated | `npm --prefix apps/api run prisma:generate && npm --prefix apps/api run typecheck` | generate fails, or `src/lib/prisma.ts` cannot import the generated client |
| Migration applied | `npm --prefix apps/api run db:migrate -- --name init_phase1` | migration fails or the database is unreachable |
| End-to-end health | `npm --prefix apps/api run smoke:health` | server does not bind, `/v1/health` is not 200, or `db !== "ok"` |

The generate gate is deliberately placed in plan 01-02 **before** any later plan imports the client. Prisma 7's `migrate dev` does not run `generate`, so a wave that assumes generation would otherwise fail at a distance.

---

## 5. Threat → verification map

| Threat | Verification evidence |
|---|---|
| T-01-01 (.env disclosure) | 01-01 verify asserts `.env` is ignored and `.env.example` holds placeholders only |
| T-01-02 (dependency drift) | `npm ls` version pins in 01-01 verify |
| T-01-03 (compose creds) | Accepted; local-only container bound to localhost |
| T-01-04 (secret in config errors) | 01-02: startup with `JWT_SECRET` unset exits non-zero without echoing values |
| T-01-05 (migration drift) | `prisma validate` + `prisma generate` + committed migration SQL assertion |
| T-01-06 (health error leakage) | 01-02: 503 body carries a short message only; single error formatter |
| T-01-07 (SQL injection) | Prisma parameterised client; one literal `SELECT 1` |
| T-01-08 (shared package leakage) | Review of `packages/shared` scope: types and zod schemas only |
| T-01-09 (test cleanup scope) | `test:harness` asserts an absent prefix deletes zero rows |
| T-01-10 (shared test DB) | Accepted; serial suites, local container |
| T-01-11 (brute force) | AUTH-01-14 (429) |
| T-01-12 (role escalation) | AUTH-01-02 |
| T-01-13 (password exposure) | AUTH-01-01 (no hash in body), bcryptjs-only assertion in 01-04 verify |
| T-01-14 (JWT tampering) | AUTH-01-10 (forged signature → 401) |
| T-01-15 (account enumeration) | AUTH-01-07 (identical 401 body) |
| T-01-16 (catalog EoP) | ADMIN-01-06 and ADMIN-01-07 |
| T-01-17 (catalog input tampering) | ADMIN-01-12, ADMIN-01-13 |
| T-01-18 (destructive deletes) | ADMIN-01-09, ADMIN-01-10, ADMIN-01-11, ADMIN-01-19 |
| T-01-19 (seeded demo credentials) | Accepted; documented in 01-05 SUMMARY, hashed at rest |
| T-01-20 (no audit trail) | Accepted; deferred to Phase 3 with ADMIN-02, recorded here |
| T-01-21 (client-side gate only) | AUTH-01-18 (UI denial) paired with ADMIN-01-07 (server 403) |
| T-01-22 (token in localStorage) | Accepted residual risk; expiry plus 401/sign-out clearing; AUTH-01-19 covers malformed tokens |
| T-01-23 (client role decoding) | Guard comment plus ADMIN-01-07 proving the server decides |
| T-01-24 (login error surface) | AUTH-01-17 preserves the non-enumerating message |
| T-01-25 (form validation divergence) | Descriptors derived from shared schemas; ADMIN-01-12 re-validates server-side |
| T-01-26 (catalog route gating) | ADMIN-01-07 and AUTH-01-18 |
| T-01-27 (delete without intent) | ADMIN-01-19 (cancel issues no request) |
| T-01-28 (error leakage in UI) | Only `code` and `message` are rendered |
| T-01-SC (supply chain) | Package Legitimacy Audit in 01-RESEARCH.md; no unapproved package is installed |

---

## 6. Sampling rate

| Moment | Command |
|---|---|
| Per task | the task's own `<automated>` block (suite, typecheck or CLI gate) |
| Per wave merge | `npm --prefix apps/api run test && npm --prefix apps/admin run test` |
| Phase gate | the phase gate command in §1 |

A task is not complete because its files exist; it is complete when its `<automated>` command exits 0. Every verify block in this phase was written to fail on absence, emptiness or a broken response — none of them can pass on an empty result set.

---

## 7. Manual / UAT checks (end-of-phase)

`human_verify_mode` is `end-of-phase`, so these run once at phase verification rather than per task.

1. `docker compose up -d db`, then `npm --prefix apps/api run db:migrate -- --name init_phase1`, `npm --prefix apps/api run db:seed`, `npm --prefix apps/api run dev`.
2. `npm --prefix apps/admin run dev`, open `http://localhost:5173`, sign in with the seeded admin credentials from the 01-05 SUMMARY, and confirm the Buildings/Floors/Classrooms/Departments/Faculty screens each list seeded rows.
3. Create, edit and delete one record per entity in the browser; confirm the tables update without a reload and that deleting a building with floors shows the conflict message.
4. Sign out, sign in as the seeded regular user, and confirm the "Admin access required" screen instead of catalog controls.
5. Break one invariant deliberately (set a floor's `metersPerPixel` to 1.0 through Prisma Studio) and confirm `npm --prefix apps/api run seed:verify` exits non-zero and names that floor. Restore it.
6. Confirm no `.env` file is tracked: `git status --porcelain --untracked-files=all | findstr .env` returns nothing except `.env.example`.

---

## 8. Residual risks

| Risk | Handling |
|---|---|
| Tests share the development database | Suites run serially with prefix-scoped cleanup; a dedicated CI database is deferred and recorded as T-01-10 |
| Admin UI tests stub `fetch` rather than exercising the real API | The API's own suites cover the contract; an E2E browser test is deferred to Phase 5's client work when the mobile client consumes the same endpoints |
| Fixtures are seeded but only consumed in Phase 2 | Intentional: Phase 2's validator tests are written against them (PITFALLS.md assigns fixtures to the foundation phase) |
| No audit trail for admin mutations | Accepted for this phase (T-01-20); revisit when ADMIN-02 lands |
| Demo credentials are published in the SUMMARY | Intended for a synthetic local campus demo; hashed at rest and not a production credential |
