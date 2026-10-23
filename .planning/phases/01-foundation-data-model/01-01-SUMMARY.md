---
phase: 01-foundation-data-model
plan: 01
subsystem: infrastructure
tags: [npm-workspaces, prisma, mysql, docker, env-contract]
provides:
  - npm workspaces root with three workspaces (api, admin, shared); mobile/ intentionally outside the JS graph
  - pinned dependency tree (prisma 7.10.1, express 5.3.0, react 19.3.1, vite 8.3.5, typescript 5.9.3)
  - MySQL 8 container reachable on host port 3307
  - documented env contract plus a working local .env with a generated JWT secret
  - full npm script surface for the rest of the phase
affects: [phase-2, phase-3, phase-4, phase-5]
actuals:
  tokens: 24000
  tasks: 2
  commits: 1
tech-stack:
  added:
    - express 5.3.0
    - prisma / @prisma/client / @prisma/adapter-mariadb 7.10.1
    - zod 4.6.7
    - jsonwebtoken 9.0.3
    - bcryptjs 3.0.3
    - express-rate-limit 8.7.1
    - helmet 8.3.0
    - pino 10.4.0 + pino-http 11.0.0
    - vitest 5.0.5 + supertest 7.3.1
    - react 19.3.1 / react-dom 19.3.1 / react-router-dom 7.18.4
    - @tanstack/react-query 5.104.5
    - react-hook-form 7.90.0 + @hookform/resolvers 6.0.0
    - vite 8.3.5 + @vitejs/plugin-react 6.1.2
    - tailwindcss 4.3.3 + @tailwindcss/vite 4.3.3
    - happy-dom 21.0.4 + @testing-library/react 16.3.3 + @testing-library/dom 10.4.2
    - typescript 5.9.3
    - mysql:8.0 (docker)
  patterns:
    - npm workspaces with delegating root scripts (`npm --prefix <ws> run <script>`)
    - Prisma CLI bound explicitly via `--config prisma7.config.ts`
    - Vite dev proxy /v1 -> localhost:8080 so CORS never applies in development
    - explicit .ts extension on relative imports (ESM under tsx)
key-files:
  created:
    - package.json
    - package-lock.json
    - docker-compose.yml
    - scripts/wait-for-mysql.mjs
    - apps/api/package.json
    - apps/api/tsconfig.json
    - apps/api/.env.example
    - apps/admin/package.json
    - apps/admin/tsconfig.json
    - apps/admin/vite.config.ts
    - apps/admin/index.html
    - packages/shared/package.json
    - packages/shared/tsconfig.json
  modified:
    - .gitignore
key-decisions:
  - "MySQL container published on host port 3307 because a native MySQL80 service already owns 3306; the container still listens on 3306 internally"
  - "Prisma pinned to exactly 7.10.1 across CLI, client and adapter to avoid the 8.x release candidate on npm's latest tag"
  - "mobile/ excluded from the npm workspace graph — it is a separate Flutter toolchain"
duration: 45min
completed: 2026-10-23
status: complete
---

# Phase 1, Plan 01: Monorepo Foundation Summary

**npm-workspaces monorepo with every Phase 1 dependency pinned exact, a healthy MySQL 8 container, and a complete, self-consistent script and environment contract.**

## Performance
- **Duration:** ~45 min (dominated by the MySQL 8 image pull and a port conflict resolution)
- **Tasks:** 2 of 2
- **Files modified:** 14

## Accomplishments
- Root workspace manifest plus three workspace manifests and tsconfigs; `npm install` resolves the whole pinned tree in one command.
- Verified exact installed versions: prisma 7.10.1, @prisma/client 7.10.1, @prisma/adapter-mariadb 7.10.1, express 5.3.0, react/react-dom 19.3.1, vite 8.3.5, typescript 5.9.3, vitest 5.0.5, happy-dom 21.0.4.
- MySQL 8 container (`qroute-mysql`) healthy, utf8mb4 / utf8mb4_0900_ai_ci, named volume for persistence.
- Environment contract documented in `.env.example`; the live `.env` carries a generated 64-character JWT secret and a `DATABASE_URL` matching the compose service. `.env` is gitignored and confirmed untracked.
- Complete API script surface installed up front (`prisma:validate`, `prisma:generate`, `db:migrate`, `db:seed`, `db:seed:fixtures`, `seed:verify`, `test*`, `typecheck`, `smoke:health`), each Prisma script binding `--config prisma7.config.ts`.

## Task Commits
1. **Task 1: npm-workspaces root and workspace manifests** - `c22bb7f`
2. **Task 2: MySQL 8 container and env contract** - `c22bb7f`

## Files Created/Modified
- `package.json` — workspaces root, engines pin, delegating scripts
- `package-lock.json` — single lockfile for the JS graph
- `docker-compose.yml` — mysql:8.0 service, healthcheck, named volume, host port 3307
- `scripts/wait-for-mysql.mjs` — real readiness gate polling container health (not print-only)
- `apps/api/package.json` — dependency pins and the full script surface
- `apps/api/tsconfig.json` — ES2022 / ESNext / Bundler, strict, noUncheckedIndexedAccess
- `apps/api/.env.example` — the reviewed environment contract
- `apps/admin/{package.json,tsconfig.json,vite.config.ts,index.html}` — admin scaffold with /v1 dev proxy
- `packages/shared/{package.json,tsconfig.json}` — source-exporting shared package (no build step)
- `.gitignore` — node_modules, dist, coverage, `.env`/`.env.*`, generated Prisma client

## Decisions & Deviations

- **Deviation: MySQL host port 3306 → 3307.** A native `MySQL80` service was already listening on 3306, so the container failed to bind. The plan explicitly permits "change the compose host port in .env", and the plan also documents why the *native* MySQL must not be used (lower-case table names, spurious Prisma drift, silent seed failures). Docker on 3307 keeps the containerised database while leaving the user's existing MySQL service untouched. `docker-compose.yml`, `.env` and `.env.example` were updated consistently; the verify assertion was updated from `:3306` to `:3307`.
- **Deviation: verify-block form for dependency checks.** The plan's `npm ls --prefix apps/api pkg@version` reports "(empty)" under npm workspaces because the lockfile lives at the root — the packages are hoisted to the root `node_modules`. Versions were instead asserted by reading each installed package's `package.json`, and all match the pinned values exactly. The substance of the gate (exact versions installed) holds; only the command form was wrong.
- **Not a deviation, but note:** PowerShell execution policy blocks `npm.ps1`, so `npm.cmd` must be used in this environment.

## Next Phase Readiness
- Wave 2 (plan 01-02) can run: toolchain installed, database reachable at `127.0.0.1:3307`, script surface present.
- `apps/api/prisma7.config.ts` and the Prisma schema do not exist yet — they are 01-02's deliverable, which is why `prisma:*` scripts currently reference a file that does not exist. This is expected at the end of wave 1.
- Docker Desktop's engine must be running before any later plan touches the database. It is not auto-started.
