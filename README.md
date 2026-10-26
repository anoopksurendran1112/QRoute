# QRoute — QR-Based Indoor Navigation

QRoute tells you how to walk to a classroom inside a campus building. Printed QR codes sit at
decision points — corridor junctions, stairwells, lift lobbies — and every one of them maps to a
node on a routable graph of the campus. Scan a code and the system knows where you are. Pick a
classroom and it computes the shortest walkable route across corridors, stairs and floors, draws
that route on the floor plan, and reads out turn-by-turn directions.

Built for St. Joseph's College of Engineering and Technology (SJCET), Palai — Mini Project
(24SJMCA245), Department of Computer Applications.

> **v1 scope.** The shipped navigation client is a mobile-first React web app (`apps/web`), not a
> Flutter build. It scans with the device camera (`html5-qrcode`), computes routes server-side, and
> is reachable from a phone through VSCode port forwarding. See
> [Limitations](#limitations--next-steps) for what is deliberately out of scope.

---

## Contents

- [What works](#what-works)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Getting the code](#getting-the-code)
- [Setup — from clone to working app](#setup--from-clone-to-working-app)
- [First run walkthrough](#first-run-walkthrough)
- [Using it from a phone](#using-it-from-a-phone)
- [Configuration](#configuration)
- [API surface](#api-surface)
- [How routing works](#how-routing-works)
- [Demo data](#demo-data)
- [Scripts](#scripts)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)
- [Limitations & next steps](#limitations--next-steps)
- [Documentation](#documentation)

---

## What works

**Navigation app — `apps/web`, port 5174**

| Capability | Detail |
|---|---|
| QR scan | Camera scanning, or open a scanned link directly at `/scan/<token>`. The token resolves to a graph node, which becomes the route origin. |
| Destination search | Search by room number, building, floor, department, faculty member, or by graph features such as `J1`, `stairs`, `lift`. |
| Route map | Interactive floor plan (pan, zoom) with the route drawn on the correct floor; floor tabs switch between levels; stairs/lifts are used to change floors. |
| Turn-by-turn guidance | Numbered, contiguous steps with per-leg distances in metres: `Turn left at L0-J2`, `Take the stairs to Floor 2`, `Arrive at L3-D-401 (Room 401) on Floor 3`. |
| Honest metrics panel | Distance, step count, and the Dijkstra-vs-A\* comparison (cost, nodes expanded, frontier size, relaxations, agreement). |
| Session origin | The scanned start survives `Route → Search → Route` and page reloads, stored per browser tab in `sessionStorage`. |

**Admin panel — `apps/admin`, port 5173**

- Building / floor / classroom / department / faculty CRUD.
- Graph editor on a bitmap floor-plan backdrop: place and drag nodes, connect edges, delete, validate.
- Floor-plan upload with automatic normalisation (EXIF rotation, PNG re-encode, 4096 px cap).
- Calibration: floor `widthPx` / `heightPx` and `metersPerPixel`.
- QR generation per node (preview, printable sheet, bulk by floor), plus a dashboard landing page.

**API — `apps/api`, port 8080**

JWT auth, the campus catalog, graph snapshot and editing, pathfinding, QR signing, scan resolution,
navigation sessions, and monitoring.

---

## Architecture

```
┌──────────────────────────┐        ┌───────────────────────────┐
│  apps/web  :5174         │        │  apps/admin  :5173        │
│  scan → search → route   │        │  catalog, graph editor,   │
│  → guidance              │        │  QR sheets                │
└────────────┬─────────────┘        └─────────────┬─────────────┘
             │  relative /v1/* and /uploads/*     │
             │  (Vite dev proxy, same origin)     │
             └───────────────┬────────────────────┘
                             ▼
             ┌───────────────────────────────────┐
             │  apps/api  :8080                  │
             │  Express 5 · JWT · zod · Prisma 7 │
             │  routing engine (Dijkstra + A*)   │
             └───────────────┬───────────────────┘
                             │ mariadb driver adapter
                             ▼
             ┌───────────────────────────────────┐
             │  MySQL 8 (Docker)                 │
             │  host :3307 → container :3306     │
             └───────────────────────────────────┘
```

Two details that matter when you debug:

- **Both front ends call the API with relative URLs** (`/v1/...`, `/uploads/...`). Their Vite dev
  servers proxy those prefixes to `http://localhost:8080`. That is why a forwarded URL on a phone
  works without configuring an API hostname, and why you do not hit CORS in development.
- **Floor plans are served by the API** from `server/storage/uploads/`, not by Vite. If the
  `/uploads` proxy is missing, `<img>` receives `index.html` and the map renders blank.

### The QR contract

A node's QR payload is deterministic and signed:

```
SJCETNAV:v1:<nodeId>.<first 8 hex chars of HMAC-SHA256(payload, QR_SECRET)>
```

The signature uses `QR_SECRET`, falling back to `JWT_SECRET` when unset. Because the payload is
derived from the node ID, a printed code is stable forever — and **changing `QR_SECRET` invalidates
every code already printed**. Resolution is public and rate-limited: a student must be able to scan
before logging in.

---

## Tech stack

| Layer | Choice |
|---|---|
| Web + admin UI | React 19.3, React Router 7, TanStack Query 5, Tailwind CSS 4 (Vite plugin), React Flow 12 (graph editor) |
| API | Node.js 22, Express 5, TypeScript 5.9, zod 4, JWT (HS256), bcryptjs, multer + sharp, pino |
| Data | MySQL 8 (Docker), Prisma 7 with the `@prisma/adapter-mariadb` driver adapter |
| Shared | `packages/shared` — zod schemas and domain types used by the API and both front ends |
| Build / test | npm workspaces, Vite 8, Vitest 5, Playwright (optional) |

No pathfinding library is used. Dijkstra and A\* are implemented in
`apps/api/src/modules/routing/` so the instrumentation the report needs (`nodesExpanded`,
`maxFrontier`, `relaxations`) is available.

---

## Repository layout

```
.
├── apps/
│   ├── api/                 Express + TypeScript API
│   │   ├── prisma/          schema, migrations, seed data (demo campus, fixtures)
│   │   └── src/
│   │       ├── modules/     auth, catalog, graph, routing, scan, qr,
│   │       │                navigation, monitoring
│   │       ├── generated/   Prisma client (generated, gitignored)
│   │       └── routes/      health, admin
│   ├── admin/               React admin panel
│   └── web/                 React navigation app
├── packages/shared/         shared zod schemas + types
├── docker/init/             MySQL bootstrap (shadow-database grant)
├── docs/                    phase testing guides + source PDFs
├── scripts/                 dev and smoke helpers
├── server/storage/uploads/  uploaded floor plans (runtime data, gitignored)
├── docker-compose.yml       MySQL 8 service
└── .planning/               GSD planning artefacts (roadmap, phases, research)
```

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | **22.14.x – 22.x** (`>=22.14.0 <23`) | 22.14.0 or newer 22.x. Node 26 is not supported by the pinned tooling. |
| npm | 10+ | Ships with Node 22. Workspaces are used; install from the repo root only. |
| Docker Desktop | any recent | Runs MySQL 8 with the right credentials and a persistent volume. A local MySQL 8 works too — see [Configuration](#configuration). |
| Git | any recent | Only for the clone route; the ZIP route needs no Git. |
| Browser | Chrome, Edge, Safari 16+, Firefox | Camera scanning needs a secure context (`https://` or `localhost`). |
| VSCode | optional | Port forwarding for testing on a phone. |

Ports used: **8080** (API), **5173** (admin), **5174** (web), **3307** (MySQL on the host).

---

## Getting the code

### Option A — clone with Git

```bash
git clone https://github.com/anoopksurendran1112/QRoute.git
cd QRoute
```

If the repository is private, sign in to GitHub first (or use a personal access token when prompted).

### Option B — download the ZIP

1. Open <https://github.com/anoopksurendran1112/QRoute> in a browser.
2. **Code → Download ZIP**.
3. Extract it somewhere without spaces in the path, then open a terminal in the extracted folder
   (the one containing `package.json`).

The ZIP contains no `.git` directory, so `git pull` will not work later — re-download to update. It
also contains no `node_modules` and no generated Prisma client; both are created by the setup steps
below. Floor-plan images are runtime uploads and are deliberately not in the repository.

---

## Setup — from clone to working app

Run everything from the repository root unless a step says otherwise.

### 1. Install dependencies

```bash
npm install
```

This installs the API, admin, web and shared workspaces in one pass.

### 2. Create the API environment file

```bash
# macOS / Linux
cp apps/api/.env.example apps/api/.env

# Windows PowerShell
Copy-Item apps/api/.env.example apps/api/.env
```

Then replace `JWT_SECRET` with a real secret of at least 32 characters:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Paste the output over the placeholder. The API refuses to boot with a missing or short secret. Note
that the example placeholder is long enough to pass that check, so replace it explicitly — a shared
signing key means anyone with this README can mint a token for your API.

`apps/api/.env` is gitignored. Never commit it. Full variable list:
[Configuration](#configuration).

### 3. Start MySQL

```bash
npm run db:up          # docker compose up -d db
```

The container is `qroute-mysql`, image `mysql:8.0`, exposed on host port **3307** (the container
still uses 3306 internally). Wait until it reports healthy:

```bash
docker compose ps
```

The first boot creates the `qroute` database, the `qroute` user and a grant that Prisma Migrate
needs for its shadow database. That grant script only runs on an empty volume — if you ever attach
an existing volume and hit `P3014`, see [Troubleshooting](#troubleshooting).

### 4. Create the schema, generate the client, seed the campus

```bash
npm run db:generate    # Prisma 7 does not generate on migrate
npm run db:migrate     # apply prisma/migrations
npm run db:seed        # synthetic campus + demo users
npm run db:verify      # invariant checks on the seeded graph
```

Order matters. `db:generate` writes the Prisma client to `apps/api/src/generated/prisma` (gitignored),
so both the API and `npm run typecheck` fail until it has run. `db:migrate` no longer triggers
generation in Prisma 7.

`db:verify` should print a pass for all ten seed invariants (three buildings, calibrated floors,
every classroom reachable, connected per building, an admin account, and so on). If it fails, the
database is not in a demo-able state — reseed before continuing.

### 5. Run the three processes

Use three terminals, all from the repository root:

```bash
npm run dev:api      # terminal 1 → http://localhost:8080
npm run dev:admin    # terminal 2 → http://localhost:5173
npm run dev:web      # terminal 3 → http://localhost:5174
```

`npm run dev` runs all three at once, but its implementation uses `&`, which is a POSIX background
operator. On Windows `cmd`/PowerShell it runs them sequentially and the first one blocks forever.
Prefer the three terminals — or use Git Bash/WSL if you want the one-liner.

### 6. Verify

```bash
curl http://localhost:8080/v1/health
```

Expected:

```json
{ "status": "ok", "db": "ok", "uptimeSeconds": 12 }
```

On Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`; use `curl.exe` or open the URL in
a browser. If health returns `503` with `db: unreachable`, the API is up but cannot reach MySQL —
check `docker compose ps` and that `DATABASE_URL` uses port **3307**.

Then open:

| URL | What you should see |
|---|---|
| <http://localhost:5174> | QRoute home: **Scan QR Code** / **Search Destination** |
| <http://localhost:5173> | Admin login |
| <http://localhost:8080/v1/health> | JSON health probe |

### Resetting the database

To start from an empty database (destroys all data, including uploaded plan metadata):

```bash
docker compose down -v
npm run db:up
npm run db:migrate
npm run db:seed
```

---

## First run walkthrough

A complete demo, without printing anything.

1. **Sign in to the admin panel** at <http://localhost:5173>. Use the seeded credentials from
   `apps/api/.env`:

   | Role | Email | Password |
   |---|---|---|
   | Admin | `admin@sjcet.local` | `Admin@12345!` |
   | Student | `student@sjcet.local` | `Student@12345!` |

   These are the defaults in `.env.example`. Change them before showing the project to anyone who
   should not have write access.

2. **Generate a QR code.** Open **Graph Editor**, choose a building and floor (for example
   *Main Block → Level 0*), then **Generate QR Codes**. The panel lists every node on that floor with
   its QR image, node code, label and raw token. Either print the sheet or copy a token.

3. **Scan it.** Open <http://localhost:5174/scan> and allow camera access, or skip the camera
   entirely by opening the deep link:

   ```
   http://localhost:5174/scan/<the-token-you-copied>
   ```

   The page resolves the token to a node and shows *"You are at …"*.

4. **Search for a destination.** Type `401`, `CSE`, `Anita Joseph`, `stairs`, or a junction code such
   as `J1`. Results are grouped by type; classrooms also show building and floor.

5. **Read the route.** The route page draws the path on the floor plan, shows distance and step
   count, and lists turn-by-turn instructions. Use the floor tabs to follow the route across
   levels — stairs appear as `Take the stairs to Floor 3`. **Open guidance** gives the step-by-step
   view.

### Optional: upload floor plans

The repository ships **without** floor-plan images (they are runtime uploads, gitignored). On a
fresh seed the map falls back to *"No floor plan uploaded for this level"* and still draws the route
to scale on the floor's declared grid — nothing is broken.

To get the bitmap view:

1. Admin → **Graph Editor** → select the floor → **Upload Floor Plan**.
2. Pick a PNG or JPEG (max 10 MB). It is EXIF-rotated, re-encoded as PNG and capped at 4096 px on
   the long edge.
3. Check the calibration fields. The seeded campus uses a **900 × 600** logical grid per floor, so a
   3:2 image fits without distortion; the bitmap is stretched into the declared grid, and
   `metersPerPixel` converts pixels to metres.
4. Reload the web app. The plan appears under the route.

---

## Using it from a phone

The API and the web dev server both bind to `0.0.0.0`, and the web app talks to the API through its
own dev-server proxy, so a phone only needs one tunnel.

1. Start the API and web app (`npm run dev:api`, `npm run dev:web`).
2. In VSCode open **Ports** → **Forward a Port** → `5174`.
3. Set the forwarded port's visibility to **Public** if you are not signed in to GitHub in that
   VSCode session.
4. Open the forwarded `https://…` URL on the phone.

Notes:

- **Camera scanning requires a secure context.** The forwarded `https://` URL qualifies; a plain
  `http://192.168.x.x:5174` on your LAN does not, and the browser will refuse camera access. In that
  case use the `/scan/<token>` deep link, which needs no camera.
- You do **not** need to forward 8080 — `/v1` and `/uploads` are proxied from 5174.
- The admin panel (5173) is a desktop surface; there is no need to forward it for a phone demo.

---

## Configuration

All API configuration lives in `apps/api/.env` and is parsed once, at boot, by
`apps/api/src/config.ts`. Nothing else in the codebase reads `process.env`.

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `DATABASE_URL` | — | yes | Must start with `mysql://`. Compose default: `mysql://qroute:qroute@127.0.0.1:3307/qroute`. |
| `JWT_SECRET` | — | yes | ≥ 32 characters, no default. Signing key for access tokens. |
| `QR_SECRET` | `JWT_SECRET` | no | Dedicated HMAC key for QR payloads. Changing it invalidates printed codes. |
| `PORT` | `8080` | no | API listen port. |
| `CORS_ORIGIN` | `http://localhost:5173` | no | Parsed and exposed as `config.corsOrigin`. The dev server currently reflects any origin, because both front ends use the Vite proxy (same origin). |
| `BCRYPT_ROUNDS` | `10` | no | Password hashing cost. |
| `RATE_LIMIT_AUTH_MAX` | `10` | no | Login/register attempts per window per IP. |
| `RATE_LIMIT_AUTH_WINDOW_MS` | `900000` | no | Auth rate-limit window (15 min). |
| `LOG_LEVEL` | `info` | no | pino level: `fatal`…`trace`, or `silent`. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@sjcet.local` / `Admin@12345!` | no | Admin account created by the seed. |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | `student@sjcet.local` / `Student@12345!` | no | Student account created by the seed. |

Ports and proxy targets are not environment variables — they are in
`apps/web/vite.config.ts` and `apps/admin/vite.config.ts`. If you change the API port, update both
proxies.

**Using a local MySQL instead of Docker.** Create a database and user, then point `DATABASE_URL` at
it (default port 3306 if you are not using the container). The user needs permission to create and
drop databases, because `prisma migrate dev` builds a throwaway shadow database on every run:

```sql
CREATE DATABASE qroute CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'qroute'@'%' IDENTIFIED BY 'qroute';
GRANT ALL PRIVILEGES ON *.* TO 'qroute'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

---

## API surface

Base path `/v1`. Errors are `{ "error": { "code", "message", "details? } }`. Auth is
`Authorization: Bearer <jwt>`.

| Method + path | Auth | Purpose |
|---|---|---|
| `GET /v1/health` | — | Liveness + database probe. |
| `POST /v1/auth/register` | — | Create a student account (rate-limited). |
| `POST /v1/auth/login` | — | Issue an HS256 access token with a `role` claim. |
| `GET /v1/auth/me` | user | Current user. |
| `GET /v1/buildings`, `/v1/floors`, `/v1/classrooms`, `/v1/departments`, `/v1/faculty` | — | Catalog reads. Classroom search supports filters used by the web app. |
| `POST/PATCH/DELETE` on the same resources | admin | Catalog writes. |
| `GET /v1/graph/snapshot` | — | Whole routable graph: buildings, floors (incl. `metersPerPixel`), nodes, edges. |
| `GET /v1/graph/floors/:id/graph` | user | One floor's nodes and edges (editor). |
| `GET /v1/graph/floors/:id/validate` | admin | Connectivity/geometry checks for a floor. |
| `POST /v1/graph/floors/:id/upload` | admin | Multipart floor-plan upload (`image` field). |
| `POST/PATCH/DELETE /v1/graph/nodes`, `/v1/graph/edges` | admin | Graph editing. |
| `POST /v1/routes/compute` | — | Pathfinding. Body: `startNodeId` or `startClassroomId`, `endNodeId` or `endClassroomId`, optional `algorithm: "dijkstra" \| "astar" \| "both"` (default `astar`). |
| `POST /v1/scan/resolve` | — | Resolve a QR token to a node, record a scan event (rate-limited). |
| `GET /v1/qr/nodes/:id` | admin | Token + PNG data URL for one node. |
| `POST /v1/qr/bulk` | admin | Tokens/PNGs for a batch of node IDs. |
| `POST /v1/navigation/sessions` | user | Start a navigation session. |
| `PATCH /v1/navigation/sessions/:id/complete` | user | Complete it. |
| `GET /v1/navigation/sessions/me` | user | The caller's sessions. |
| `GET /v1/monitoring/summary` | admin | Usage summary (API only — no admin screen yet). |
| `GET /uploads/<file>.png` | — | Floor plans, content-hashed and immutable. |

Route compute is deliberately public: a visitor must be able to get directions before creating an
account. All graph **writes** stay behind admin auth.

Example:

```bash
curl.exe -X POST http://localhost:8080/v1/routes/compute -H "Content-Type: application/json" -d "{\"startNodeId\":\"<node id>\",\"endClassroomId\":\"<classroom id>\",\"algorithm\":\"both\"}"
```

On macOS/Linux use `curl` instead of `curl.exe`; line continuations differ between PowerShell and
Bash, so keep it on one line.

The response contains `dijkstra`, `astar` and `agreed`. Each result has `found`, `totalCostM`,
`nodeIds`, `instructions` and `metrics`.

---

## How routing works

The engine lives in `apps/api/src/modules/routing/`:

| File | Role |
|---|---|
| `graph.ts` | Loads the DB graph into an adjacency map, adds synthetic room-door edges, computes plan distances and the heuristic scale. |
| `dijkstra.ts` | Uniform-cost search over metre edge costs, with instrumentation. |
| `astar.ts` | A\* over the same costs, with an admissible geometric heuristic. |
| `directions.ts` | Turns a node sequence into human instructions with metre distances and turn events. |
| `service.ts` | Resolves classroom ↔ entrance node, runs the requested algorithm(s), reports agreement. |
| `loader.ts` | DB rows → routing structures (`metersPerPixel`, floor heights, vertical edges). |

**Edge costs are metres, and they are authored, not derived.** Stair and lift edges cost more than
their plan distance; door spurs cost less than the drawn gap. A routing table that pretends the
campus is a Euclidean plane is simply wrong, so the heuristic has to respect that.

**A\* stays admissible.** The heuristic is

```
h(n) = planDistanceM(n, goal) × heuristicScale
```

`planDistanceM` turns pixel geometry into metres — it uses the **smaller** `metersPerPixel` of the
two floors involved and adds the vertical difference as `level × floor height` — so it can only
undershoot the straight-line distance. `heuristicScale` is the **minimum** observed
`costM / planDistanceM` across every horizontal edge in the graph. Because that scale is a lower
bound on what an edge actually costs, `h` never overestimates, so A\* returns the same shortest path
as Dijkstra — never a faster wrong one. When the start or goal floor has no usable calibration, the
heuristic is forced to zero, A\* degenerates to Dijkstra, and the response says
`heuristicUsed: "zero"` instead of pretending otherwise.

Both algorithms record `nodesExpanded`, `maxFrontier`, `relaxations`, `pathCostM` and `runtimeMs`,
which is what the comparison table in the report is built from. At campus scale both searches are
sub-millisecond, so **lead with `nodesExpanded`, not wall-clock time**. The size of A\*'s advantage
depends entirely on how well the graph is calibrated: on a loosely authored graph the admissible
scale is small and the savings shrink. That is a property of the data, not of the algorithm.

---

## Demo data

`npm run db:seed` creates a synthetic SJCET campus:

| Entity | Count | Notes |
|---|---|---|
| Buildings | 3 | Main Block (`MAIN`), Computer Science Block (`CSB`), Library Block (`LIB`) |
| Floors | 9 | Main Block levels 0–3, CSB 0–2, Library 0–1 |
| Departments | 5 | CSE, ECE, MECH, CIVIL, EEE |
| Faculty | 10 | Two per department |
| Classrooms | 21 | Room numbers deliberately repeat across buildings, so search ambiguity is real |
| Nodes / edges | per floor | Corridor junctions `J1`–`J4`, stairs, lifts, room doors |
| Users | 2 | One admin, one student (credentials from `.env`) |

Every floor is calibrated with its own `metersPerPixel` (0.011–0.035), the graphs are connected per
building, and every classroom has an entrance node on its own floor. `npm run db:verify` checks all
of this.

Inside `apps/api`, `npm run db:seed:fixtures` adds a separate `FIX-` building of deliberately invalid
rows used by the validator tests. Do not run it against a database you intend to demo — it is there
to be rejected.

---

## Scripts

From the repository root:

| Command | Does |
|---|---|
| `npm run dev:api` / `dev:admin` / `dev:web` | Start one workspace's dev server. |
| `npm run dev` | Start all three (POSIX shells only — see [Setup](#5-run-the-three-processes)). |
| `npm run db:up` / `db:down` | Start/stop the MySQL container. |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:migrate` | Apply migrations (`prisma migrate dev`). |
| `npm run db:seed` | Seed the demo campus. |
| `npm run db:verify` | Verify seed invariants. |
| `npm run build` | Typecheck the API and shared, build both front ends. |
| `npm run typecheck` | TypeScript across all four workspaces. |
| `npm test` | API + admin test suites. |

Inside `apps/api`: `db:migrate:deploy` (non-interactive, for CI), `db:seed:fixtures`,
`prisma:validate`, `smoke:health`, and per-suite `test:auth`, `test:catalog`, `test:seed`,
`test:harness`.

Note that `apps/api`'s `build` is `tsc --noEmit` — the API runs from TypeScript sources via `tsx`,
so there is no emitted `dist/`. Production hosting would need a build step or a `tsx` runtime.

---

## Tests

```bash
npm test                # API (Vitest) + admin (Vitest, happy-dom)
npm run typecheck
```

- `apps/api/tests/**` — HTTP-level tests against a real database: auth, catalog, seed invariants,
  routing, scan, navigation, harness.
- `apps/api/src/**/__tests__/**` — pure unit tests for the routing engine (Dijkstra, A\*,
  directions, regression cases such as start-node relaxation and heuristic units).
- `apps/admin/src/**/*.test.tsx` — auth gate and component tests.
- `tests/**` + `playwright.config.ts` — optional Playwright specs for the admin graph editor and
  scan flow. They are not part of `npm test`; run `npx playwright test` after installing browsers.
  The graph-editor spec needs a plan image: pass `FLOOR_IMAGE=<path to a PNG>`.

The API tests need the database running and seeded. They create and clean up their own rows.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Cannot find module './internal/class.js'` or Prisma types missing | The generated client is absent. Run `npm run db:generate`. |
| API exits at boot: *Invalid environment configuration* | `apps/api/.env` is missing, or `JWT_SECRET` is under 32 characters. Copy the example and generate a secret. |
| `P1001` / `db: unreachable` on `/v1/health` | MySQL is not up yet, or `DATABASE_URL` points at 3306. The container is on **3307**. |
| `RSA public key is not available client side` | MySQL 8 `caching_sha2_password` over a non-TLS socket. The adapter already sets `allowPublicKeyRetrieval`; if it appears, the DB restarted mid-pool — restart the API. |
| `P3014` — could not create the shadow database | The grant script only runs on a fresh volume. Apply it manually:<br>`docker exec qroute-mysql mysql -uroot -pdevroot -e "GRANT ALL PRIVILEGES ON *.* TO 'qroute'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;"` |
| `EADDRINUSE` on 8080 / 5173 / 5174 | Another process owns the port. Stop it, or change the API port and update both Vite proxies. |
| Map panel says *No floor plan uploaded* | Expected on a fresh seed — images are runtime uploads. Upload one in the admin graph editor. |
| Floor plan returns HTML instead of an image | The `/uploads` proxy is missing from `apps/web/vite.config.ts`, or the API is not running. |
| Camera never starts on a phone | Camera needs `https://` or `localhost`. Use the forwarded HTTPS URL, or the `/scan/<token>` deep link. |
| `npm.ps1 cannot be loaded because running scripts is disabled` (Windows) | PowerShell execution policy. Use `npm.cmd …` or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `&&` / `&` do not chain commands in PowerShell | `&&` is unsupported in Windows PowerShell 5.1; run commands separately, use `;`, or use PowerShell 7 / Git Bash. |
| Search returns duplicates (the same node several times) | Duplicate rows from seeding the same database repeatedly. Reset with `docker compose down -v` and reseed. |

---

## Limitations & next steps

Honest list of what v1 does **not** do, because an examiner will ask:

- **No Flutter client.** The synopsis describes a Flutter app; this repository ships the navigation
  client as a mobile-first React web app so the whole system can be demoed from one machine and one
  forwarded port. The API is client-agnostic, so a Flutter client can be added without changing the
  backend.
- **No continuous positioning.** A QR code is a checkpoint. The app knows exactly where you were
  when you scanned and nothing about where you are now. Dead reckoning (compass + step count) is a
  labelled future enhancement, not a feature.
- **No offline routing in the web client.** The API exposes `GET /v1/graph/snapshot` for clients that
  cache the graph, but the shipped web app always computes server-side.
- **Floor plans are not bundled.** A fresh clone renders routes to scale on an empty grid until an
  admin uploads a plan.
- **A\* savings depend on calibration.** Edge costs are authored, so the admissible heuristic scale
  is conservative; on a loosely calibrated graph A\* expands nearly as many nodes as Dijkstra. The
  metrics panel reports this instead of hiding it.
- **The admin editor is scoped to a campus, not a CAD tool.** Node placement, edge creation,
  calibration and validation — no layer management, no auto-tracing.
- **Single-campus seed data.** Three buildings and nine floors; the schema is not multi-tenant.
- **No CI pipeline in the repo.** `npm test`, `npm run typecheck` and `npm run build` are the gates;
  run them manually before committing.

---

## Documentation

| Path | Contents |
|---|---|
| [`docs/PHASE-5-MANUAL-TESTING.md`](docs/PHASE-5-MANUAL-TESTING.md) | Test cases for the web navigation app (search, map, guidance). |
| [`docs/PHASE-4-MANUAL-TESTING.md`](docs/PHASE-4-MANUAL-TESTING.md) | Graph, scan, routing and navigation API checks. |
| [`docs/PHASE-3-MANUAL-TESTING.md`](docs/PHASE-3-MANUAL-TESTING.md) | Admin graph editor and floor-plan upload. |
| [`docs/PHASE-1-MANUAL-TESTING.md`](docs/PHASE-1-MANUAL-TESTING.md), [`docs/PHASE-2-MANUAL-TESTING.md`](docs/PHASE-2-MANUAL-TESTING.md) | Foundation and auth/catalog checks. |
| [`docs/synopsis.pdf`](docs/synopsis.pdf) | Original project synopsis. |
| [`docs/QR code based app.pdf`](docs/QR%20code%20based%20app.pdf) | Original abstract report. |
| [`.planning/`](.planning/) | Roadmap, phase plans, research and decisions produced with the GSD workflow. |
| [`PROJECT_ANALYSIS.md`](PROJECT_ANALYSIS.md) | Full analysis of the problem, data model and phase breakdown. |

Some phase guides were written against earlier port numbers (for example an API on 4000). The live
ports are the ones in this README: **8080**, **5173**, **5174**.

---

Mini Project (24SJMCA245) — Department of Computer Applications,
St. Joseph's College of Engineering and Technology, Palai.
