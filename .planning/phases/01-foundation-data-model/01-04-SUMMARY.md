---
phase: 01-foundation-data-model
plan: 04
subsystem: authentication
tags: [auth, jwt, bcrypt, rate-limit, rbac, supertest]
provides:
  - shared registerSchema/loginSchema consumed by both tiers
  - HS256 JWT issue/verify with pinned algorithm allowlist and issuer check
  - bcryptjs hashing plus a toPublicUser projection that no route can bypass
  - requireAuth and requireRole middleware with Express Request augmentation
  - express-rate-limit auth throttle (429 RATE_LIMITED, failures only)
  - auth router (register, login, me) and a role-gated /v1/admin/ping probe
  - 13-test AUTH-01 behaviour suite over real HTTP
affects: [phase-3, phase-4, phase-5]
actuals:
  tokens: 34000
  tasks: 3
  commits: 1
tech-stack:
  added: []
  patterns:
    - pin the JWT algorithm with an allowlist and verify the issuer
    - assign role server-side; the register schema has no role field so zod strips it
    - identical 401 body for wrong password and unknown email
    - only failed credential attempts consume the rate-limit budget
key-files:
  created:
    - packages/shared/src/schemas/auth.ts
    - apps/api/src/utils/jwt.ts
    - apps/api/src/utils/password.ts
    - apps/api/src/types/express.d.ts
    - apps/api/src/middleware/auth.ts
    - apps/api/src/middleware/requireRole.ts
    - apps/api/src/middleware/rateLimit.ts
    - apps/api/src/modules/auth/router.ts
    - apps/api/src/routes/admin.ts
    - apps/api/tests/helpers/auth.ts
    - apps/api/tests/auth.test.ts
  modified:
    - packages/shared/src/index.ts
    - apps/api/src/app.ts
    - apps/api/vitest.config.ts
key-decisions:
  - "Auth tests assert only HTTP status and body shape; no source greps, so a missing endpoint cannot pass"
  - "The throttle test runs last because the limiter's budget is shared with the deliberate failures earlier in the suite"
duration: 50min
completed: 2026-10-23
status: complete
---

# Phase 1, Plan 04: Authentication Summary

**A visitor can register, log in, and reach an admin-only route only if they are actually an admin — proven by HTTP status codes, including the 429 on brute force.**

## Performance
- **Duration:** ~50 min
- **Tasks:** 3 of 3
- **Files created/modified:** 14

## Accomplishments

- **Shared schemas.** `registerSchema` / `loginSchema` live in `@qroute/shared`, so the admin forms and the API reject identical input for identical reasons. The register schema deliberately has **no** `role` field — zod's default object behaviour strips it.
- **Token policy.** `signToken` issues HS256 with `issuer: "qroute"` and `expiresIn: "7d"`; `verifyToken` passes an explicit `algorithms: ["HS256"]` allowlist plus the issuer check. A token signed with a different secret, a different algorithm or a different issuer is rejected (T-01-14). A forged-token test proves it.
- **No hash can leak.** `toPublicUser` is the only serialisation shape for a user, and the suite asserts `register`, `login` and `me` bodies never match `/password|hash/i` (T-01-13).
- **No self-escalation.** The handler assigns `role: "user"` unconditionally; posting `role: "admin"` still yields a `user` (T-01-12).
- **No account enumeration.** Wrong password and unknown email return byte-identical 401 bodies; the test asserts `toEqual`, not "both are 401" (T-01-15).
- **Authorisation.** `requireAuth` → `requireRole("admin")` on `/v1/admin/ping` returns 401 anonymous, 403 user, 200 admin.
- **Brute-force throttle.** `express-rate-limit` with `standardHeaders: "draft-8"`, `legacyHeaders: false`, `skipSuccessfulRequests: true` and a 429 `RATE_LIMITED` handler, mounted on both `/register` and `/login` (T-01-11). Closing this in Phase 1 removes the "deferred with no owner" gap the checker flagged.
- **Suite.** 13 tests, ~5 s, all green.

## Task Commits
1. **Tasks 1–3** — `7e869ae`

## Decisions & Deviations
- **`LOG_LEVEL=silent` injected by `vitest.config.ts`.** `pino-http` logs every request at `info`, which buried the reporter under ~40 lines of JSON per test. Vitest's `env` wins over `.env` because dotenv does not override an already-set variable.
- **`GET /v1/auth/me` returns `req.user` directly**, i.e. `{ id, email, role }` — the token's own claims — rather than re-reading the row. This is deliberate: `/me` is a token-validity probe, and a database read would make it useless precisely when the database is the thing under test. Any endpoint that needs fresher data (a changed name, a revoked role) must read the row.
- **The time-to-hash gap for unknown emails is not equalised.** A missing user skips `bcrypt.compare`, so login timing differs by a few milliseconds. The response body is identical, which is what T-01-15 requires; a dummy-hash constant would close the timing channel too and is cheap to add later if it is ever measured.

## Next Phase Readiness
- Every later admin route stacks `requireAuth` then `requireRole("admin")`; the pattern and its test double (`createTestUser({ role })` returning a ready token) already exist in `tests/helpers/auth.ts`.
- `test:auth` is the canary for "auth still works" after any middleware change.
- Phase 3's graph editor and Phase 4's QR endpoints can reuse `createTestUser`, `loginAs` and the `t-auth-` prefix cleanup convention verbatim.
