<!-- GSD:project-start source:PROJECT.md -->

## Project

**QR-Based Indoor Navigation System**

An indoor campus navigation system for St. Joseph's College of Engineering and Technology, Palai.
Printed QR codes are placed at decision points across campus buildings; scanning one with the
mobile app identifies the user's position, and the system computes and displays the shortest
walkable route to a chosen classroom as turn-by-turn guidance on an interactive floor map.
Students, faculty, and visitors are the end users; campus administrators maintain the campus
graph, floor plans, and QR codes through an admin panel.

**Core Value:** A user standing anywhere on campus can scan one QR code and receive an accurate, step-by-step
route to any classroom on any floor of any building.

### Constraints

- **Tech stack**: Flutter/Dart mobile app, Node.js + Express + TypeScript API, React + Vite + TypeScript admin panel, MySQL 8 via Prisma. Fixed by the synopsis and the decisions of 2026-10-22.
- **Stack hygiene**: `qr_code_scanner` is deprecated — use `mobile_scanner` (ML Kit). Do not add Google Maps SDK, Firebase, ZXing-on-mobile, or React Native.
- **Two admin surfaces**: a web admin panel is primary (it hosts the graph editor); a minimal in-app admin in Flutter covers quick phone-side edits.
- **Pathfinding**: server-side, with a client-side graph cache as the offline fallback.
- **Guidance model**: checkpoint navigation is the spine. Dead reckoning (compass + accelerometer step count) is a later enhancement and must be labelled as such.
- **Data**: build against a seeded synthetic campus. Real campus floor plans are optional and non-blocking.
- **Network dependency**: indoor dead zones are expected; the client must degrade to a cached graph rather than fail.
- **Scope**: single-student mini project — the phase count must stay within a single milestone and the graph editor must not be allowed to sprawl.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Scope: the stack is fixed, only the *inside* is open

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Conf. |
|---|---|---|---|---|
| Flutter (stable) | **3.47.7** (2026-10-08) | Mobile app | The fixed mobile choice. Critical detail: several packages in this stack now require **Flutter ≥ 3.44.0** (`cached_network_image`, `go_router`), so do not scaffold on an older SDK. 3.47.7 satisfies every dependency below. | HIGH |
| Dart | **3.13.5** | Language | Ships with Flutter 3.47.7. `mobile_scanner` needs Dart `^3.7.0`. | HIGH |
| Node.js | **22.14.0** | API runtime | Already installed. Prisma 7 requires Node 20.19+/22.x. **Do not upgrade to Node 26 mid-project** — it changes `@types/node` and `jsdom` compatibility for no benefit. | HIGH |
| TypeScript | **5.9.3** | API, admin, shared types | Explicitly **not** 7.0.2. See *What NOT to Use* — TS 7 has no compiler API and `typescript-eslint` still rejects it, and Prisma 7 documents 5.9.x as the recommended version. | HIGH |
| Express | **5.3.0** (2026-10-09) | HTTP API | v5 is the current stable line. Its single most valuable property here: rejected promises from `async` handlers are **forwarded to the error middleware automatically** (verified in the v5 migration guide), so `express-async-handler` is unnecessary. | HIGH |
| Prisma CLI + Client | **7.10.1** (pinned) | ORM / migrations | Fixed by `PROJECT.md`. **Must be pinned explicitly**: the npm `latest` tag for `prisma` currently resolves to **`8.0.0-rc.25`** (a release candidate) while `@prisma/client@latest` is **7.10.1**. `npm i prisma` installs a mismatched RC. | HIGH |
| `@prisma/adapter-mariadb` | **7.10.1** | MySQL driver adapter | Prisma 7 **requires** a driver adapter — the query engine no longer speaks the wire protocol itself. This is the official MySQL/MariaDB adapter (`PrismaMariaDb`). There is **no** `@prisma/adapter-mysql2` package (registry 404). | HIGH |
| `mariadb` | **3.5.4** | Wire driver | Pulled in by the adapter; do not depend on it directly. | HIGH |
| MySQL | **8.0** (Docker image `mysql:8.0`) | Datastore | Fixed. Run via Docker Compose so the schema is reproducible and the `DATABASE_URL` is identical on the demo laptop and in the viva room. | HIGH |
| React | **19.3.1** | Admin UI | Fixed. Both editor candidates support it (`@xyflow/react` peer `react >=17`; `react-konva` peer `react ^19.3.0`). | HIGH |
| Vite | **8.3.5** | Admin dev server + build | Fixed. With `@vitejs/plugin-react` **6.1.2**. | HIGH |
| `@xyflow/react` | **12.12.0** (2026-09-24) | Admin graph editor | The graph editor is the project's credibility feature (`FEATURES.md` TS9, 12–15 days). React Flow ships node dragging, edge creation, selection, deletion, keyboard shortcuts, viewport control and undo support **out of the box**; the alternatives make you build all of it. | HIGH |

### Mobile — Flutter (`mobile/`, a sibling of `apps/` — not an npm workspace)

| Library | Version | Purpose | When to Use | Conf. |
|---|---|---|---|---|
| `mobile_scanner` | **^7.4.2** (2026-09-14) | QR scanning | Always — this is the scanner. Android uses CameraX + **bundled** ML Kit by default (+3–10 MB APK); set `dev.steenbakker.mobile_scanner.useUnbundled=true` in `android/gradle.properties` to download the model via Play Services instead (~600 KB, first-use delay). Requires Flutter ≥3.29. 1.94M downloads, publisher `steenbakker.dev`. | HIGH |
| `permission_handler` | **^13.0.2** | Camera permission UX | Only for the "camera denied" state. `mobile_scanner` exposes `controller.value.hasCameraPermission`; use that for gating and this for the "open settings" affordance. | HIGH |
| `dio` | **^5.11.1** | HTTP client | Always, over `http`. Interceptors give you one place for the `Authorization` header, 401 → refresh, retry-with-backoff, and request logging — the messy parts of talking to a real API. | HIGH |
| `cached_network_image` | **^4.0.5** (2026-10-21) | Floor-plan image cache | Always. Gives disk + memory caching, placeholder/error builders and `evictFromCache`. **Requires Flutter ≥3.44.0.** | HIGH |
| `path_provider` | **^2.1.6** | App storage path | Always — the offline graph JSON lives in `getApplicationSupportDirectory()`. | HIGH |
| `shared_preferences` | **^2.5.6** | Small key/value state | JWT, last scanned node, "onboarding seen", cached `graph_revision`. **Not** secure storage; do not put the QR HMAC secret's security case on this. | HIGH |
| `connectivity_plus` | **^7.3.2** | Online/offline signal | To *trigger* a graph re-sync and to show the offline banner. Never as the sole gate — always treat a failed request as the real signal. Note v6+ changed the stream to `Stream<List<ConnectivityResult>>`; write for the list. | MEDIUM |
| `go_router` | **^18.1.1** | Navigation | If the app has more than two screens (it will: scan → search → map → guidance → admin). **Requires Flutter ≥3.44.0.** If you would rather avoid the concept, plain `Navigator` is genuinely fine at this size. | HIGH |
| `provider` | **^6.1.5+1** | State management | **Recommendation.** The app has ~4 pieces of state (session, cached graph, active route, scan state). A `ChangeNotifier` + `Provider` is ~40 lines and zero codegen. | MEDIUM |
| `flutter_riverpod` | **^3.4.3** | Alternative state management | Only if you want compile-safe dependency injection and provider-level testability. It is the better long-term choice and the *worse* choice for a 6-month mini project — pick one, don't mix. | MEDIUM |
| `crypto` | **`^3.0.0`** | HMAC-SHA256 for on-device token check | Only if you implement the offline tamper pre-check described in `PROJECT.md`. **Do not pin `^3.0.7`** — the Flutter SDK pins a `3.0.x` version transitively and an exact pin can conflict. | MEDIUM |
| `flutter_lints` | **^6.0.0** | Lints | Always, via `analysis_options.yaml`. | HIGH |
| Library | Version | Why deferred |
|---|---|---|
| `sensors_plus` | 7.1.1 | Accelerometer/gyro for dead reckoning. `PROJECT.md` makes dead reckoning an *optional later enhancement* and explicitly warns that over-claiming continuous tracking is the top exam risk. Adding it in v1 creates the impression the app tracks position continuously — it does not. |
| `flutter_device_compass` | 2.2.0 | Compass heading for a rotating "you are here" needle. Same reason: it implies orientation tracking that QR checkpoints cannot support. If you do add a needle later, this is the right package — 2.2.0 (2026-08-22), AGP 8/9 + Kotlin DSL compatible, unlike `flutter_compass` 0.8.1 (last release 2024-11-17). |
| `google_mlkit_barcode_scanning` | 0.16.1 | Rebuilds camera preview, lifecycle and permission handling that `mobile_scanner` already wraps. Only worth it if you need a barcode format `mobile_scanner` lacks — you need exactly one format: QR. |

### API — Node + Express + TypeScript (`apps/api`)

| Library | Version | Purpose | When to Use | Conf. |
|---|---|---|---|---|
| `zod` | **^4.6.7** | Request/response validation | Every route boundary. Define the schemas once in `packages/shared` so the admin form, the API validator and the mobile DTO are the same definition. | HIGH |
| `jsonwebtoken` | **^9.0.3** | JWT issue/verify | HS256 access tokens, `role` claim. If you later need WebCrypto/edge runtimes, `jose` 6.2.13 is the modern ESM alternative — not needed here. | HIGH |
| `bcryptjs` | **^3.0.3** | Password hashing | **Use this, not `bcrypt`.** Pure JS: no `node-gyp`, no Visual Studio Build Tools on Windows. `bcrypt@6.0.0` needs a native build or a matching prebuilt binary. | HIGH |
| `multer` | **^2.5.0** | Floor-plan upload (multipart) | The admin upload endpoint. 2.x is the maintained line (1.x is EOL); pair with `sharp` to validate that the file really is an image. | HIGH |
| `sharp` | **^0.35.5** | Image normalisation | **On upload, before calibration.** Auto-rotate by EXIF, re-encode to PNG, cap the long edge (e.g. 4096 px), strip metadata. Prebuilt win32-x64 binaries — no compiler needed. | HIGH |
| `qrcode` | **^1.5.4** (2024-08-05) | Server-side QR generation | `toBuffer()` for PNG, `toString({type:'svg'})` for print-ready vector sheets, `toFile()`/`toFileStream()` for bulk node batches. 18.5M weekly downloads; the de-facto standard. Types: `@types/qrcode` **^1.5.6**. | HIGH |
| `helmet` | **^8.3.0** | Security headers | Always, first middleware. | HIGH |
| `cors` | **^2.8.6** | Cross-origin for the Vite dev server | Dev only; in production the admin is served from the same origin or an explicit allow-list. | HIGH |
| `express-rate-limit` | **^8.7.1** | Throttling | On `/v1/auth/login` and `/v1/scan/resolve`. Cheap, and it is a fair viva question. | HIGH |
| `pino` + `pino-http` | **^10.4.0** / **^11.0.0** | Structured logging | Request logs plus the `audit_log` writes for admin mutations. `morgan` is fine for a toy; pino gives you JSON you can actually read back during the demo. | HIGH |
| `compression` | **^1.8.2** | gzip/brotli | Route JSON and graph snapshots are repetitive text; this is free bytes. | HIGH |
| `dotenv` | **^18.0.8** | Env loading | Required, not optional: Prisma 7's `prisma-client` generator **does not load `.env` at runtime**. `import "dotenv/config"` at the top of the entry point and in `prisma7.config.ts`. | HIGH |
| `@types/express` | **^5.0.6** | Types | Matches Express 5. | HIGH |
| `@types/node` | **^22.20.5** | Types | Match the runtime (22.x). `@types/node@26.x` exists but targets Node 26. | HIGH |

### Data — Prisma 7 + MySQL 8

| Change | What to do | Conf. |
|---|---|---|
| Generator is `prisma-client`, not `prisma-client-js` | `provider = "prisma-client"` with a **required** `output` path (e.g. `"../src/generated/prisma"`). It emits plain TypeScript you import, not magic into `node_modules`. | HIGH |
| `datasource.url` is gone from `schema.prisma` | The URL lives in `prisma7.config.ts` → `datasource: { url: process.env["DATABASE_URL"] }`. The schema keeps only `datasource db { provider = "mysql" }`. | HIGH |
| A **driver adapter is mandatory** | `new PrismaClient({ adapter: new PrismaMariaDb({ host, user, password, database, connectionLimit }) })`. There is no adapter-free path. | HIGH |
| `migrate dev` no longer runs `generate` | Run `prisma generate` explicitly (put it in a `db:setup` script). | HIGH |
| Seeding is not automatic | `prisma db seed` is explicit; register the command in `prisma7.config.ts`. | HIGH |
| `.env` is not auto-loaded | `import "dotenv/config"` in the config file **and** the app entry point. | HIGH |
| `tsx` + generated client mismatch | If you see `Cannot find module './internal/class.js'`, set `importFileExtension = "ts"` in the generator block. This is documented by Prisma specifically for `tsx` users. | HIGH |

### Admin — React + Vite + TypeScript (`apps/admin`)

| Library | Version | Purpose | When to Use | Conf. |
|---|---|---|---|---|
| `@xyflow/react` | **^12.12.0** | Graph editor canvas | Always. Peer deps accept React 19. Keep the default attribution badge visible — it is MIT-licensed and honest in an academic project. | HIGH |
| `react-router-dom` | **^7.18.4** | Routing | The admin has 6–8 screens (buildings, floors, nodes/edges, classrooms, faculty, QR sheets, analytics). | HIGH |
| `@tanstack/react-query` | **^5.104.5** | Server state | Caching, invalidation after mutations, loading/error states. Removes ~80% of the hand-written `useEffect` fetch code in a CRUD panel. | HIGH |
| `zustand` | **^5.0.16** | Editor-local UI state | Selected node, tool mode, unsaved edits, undo stack. Note React Flow carries its **own** internal `zustand@^4` — that is fine, they don't share a store; don't try to reach into it. | HIGH |
| `react-hook-form` + `@hookform/resolvers` | **^7.90.0** / **^6.0.0** | CRUD forms | With `zodResolver` against the shared schemas, so client and server validate identically. | HIGH |
| `tailwindcss` + `@tailwindcss/vite` | **^4.3.3** (both) | Styling | v4 is CSS-first: **no `tailwind.config.js` by default**, and you add the Vite plugin instead of PostCSS. Following a v3 tutorial here is the classic time sink. | HIGH |
| `lucide-react` | **^1.61.0** | Icons | Node-kind palette, tool buttons. | HIGH |
| `@tanstack/react-table` | **^9.3.1** | Sortable/filterable CRUD tables | Optional. Plain tables are fine for 6 entities; adopt this only if you want column sorting/filtering for free. Note the v9 API differs from the v8 tutorials that dominate search results. | MEDIUM |

### Shared contract (`packages/shared`)

### Development Tools

| Tool | Version | Purpose | Notes | Conf. |
|---|---|---|---|---|
| npm workspaces | built-in (npm 7+) | Monorepo | Root `"workspaces": ["apps/api", "apps/admin", "packages/shared"]`. Zero extra tooling. See *Monorepo shape*. | HIGH |
| `tsx` | **^4.23.15** | Run TS without a build step | Node 22.14.0 is **below** 22.18, so native type-stripping (`node file.ts`) is not available. `tsx` is also what Prisma's quickstart uses. | HIGH |
| `vitest` + `@vitest/coverage-v8` | **^5.0.5** | Unit/integration tests | One runner for API, admin and shared. The pathfinding tests need no DB and no HTTP — that is the point. | HIGH |
| `supertest` | **^7.3.1** | Route tests | Bundles its own types now; no `@types/supertest`. | HIGH |
| `@testing-library/react` + `happy-dom` | **^16.3.3** / **^21.0.4** | Admin component tests | **Use `happy-dom`, not `jsdom`** — `jsdom@30` requires Node ≥22.22.2 and the environment has 22.14.0. | HIGH |
| `eslint` + `typescript-eslint` | **^10.13.0** / **^8.72.0** | Lint | `typescript-eslint@8.72.0` peer-caps TypeScript at `<6.1.0`. This is the concrete reason TS 5.9.3 is pinned. | HIGH |
| `prettier` | **^3.9.10** | Formatting | — | HIGH |
| `husky` + `lint-staged` | **^9.1.7** / **^17.6.0** | Pre-commit | Optional. Worth it mainly to stop `.env` and generated Prisma output being committed. | MEDIUM |
| Docker Compose | — | `mysql:8.0` on `:3306` | Named volume; `healthcheck` so `db:setup` can wait for readiness. | HIGH |
| Prisma Studio | (bundled with CLI) | Browse/seed the campus graph | Far faster than `mysql` CLI while authoring the synthetic campus. | HIGH |
| `flutter_lints` + `dart format` | ^6.0.0 | Dart lint/format | Enable `strict-casts`, `strict-raw-types` in `analysis_options.yaml` early; retrofitting is painful. | HIGH |

## The one real library decision: pathfinding is hand-rolled

### What the candidates actually provide

| Option | Version | Has A\*? | Has plain Dijkstra? | Gives node-expansion counts? | Verdict |
|---|---|---|---|---|---|
| **Hand-rolled module** | — | Yes (write ~60 lines) | Yes (write ~40 lines) | Yes — you own the loop | **Recommended** |
| `graphlib` | 2.1.8 (2019-12-03) | **No.** `alg` exports are `bellmanFord, components, dijkstra, dijkstraAll, findCycles, floydWarshall, isAcyclic, postorder, preorder, prim, shortestPaths, tarjan, topsort`. | Yes (`alg.dijkstra`) | No | Avoid |
| `@dagrejs/graphlib` | 4.0.5 (2026-03-08) | **No** — identical `alg` surface to 2.x | Yes | No | Avoid for routing; fine as a graph container |
| `graphology` + `graphology-shortest-path` | 0.26.0 / 2.1.0 (2024-03-27) | Only `astar.bidirectional` | Only `dijkstra.bidirectional` / `dijkstra.singleSource` | No | Avoid |
| `ngraph.path` | 1.6.1 (2025-11-18) | Yes — `aStar(graph, {distance, heuristic, blocked, oriented})` | **No** independent Dijkstra | No | Avoid |
| `js-priority-queue` | 0.1.5 (2016) | n/a (heap only) | n/a | n/a | Avoid — unmaintained, untyped |

### Verdict: hand-roll ~180 lines, take zero dependencies

### The A\* heuristic must be admissible across floors

### Instrumentation to record per query

| Metric | Why it is in the report |
|---|---|
| `nodesExpanded` | The headline: A\* should expand strictly fewer nodes than Dijkstra on the same pair |
| `maxFrontier` | Shows the memory saving, not just the time saving |
| `relaxations` | Distinguishes "A\* was fast" from "the graph was tiny" |
| `pathCostM` + node sequence | Proves both algorithms agree on cost (they must) |
| `runtimeMs` | Honest caveat: at campus scale (a few thousand nodes) both are sub-millisecond, so wall-clock time is dominated by noise. Lead with `nodesExpanded`; report time as an appendix. |
| `heuristicUsed` | `'euclidean3d' \| 'zero'` — so an uncalibrated floor cannot silently look like a win |

## Storage and caching of floor plans

### v1: local disk, content-hashed, immutable cache headers

* `sharp` normalises **before** the image is written and **before** calibration: EXIF-rotate, re-encode, cap dimensions. **This ordering is load-bearing** — `meters_per_pixel` is only meaningful against the stored pixel grid, so re-encoding after calibration invalidates every node coordinate.
* Filename contains the content hash, so the response can carry `Cache-Control: public, max-age=31536000, immutable` safely. A changed plan gets a new URL; nothing has to be purged.
* Serve with `express.static(..., { maxAge: '1y', immutable: true })` or a dedicated route that sets the header. Note Express 5 changed `express.static`'s `dotfiles` default to `"ignore"` and dropped the `hidden`/`from` options — use `root` and `dotfiles`.
* Store `image_path`, `image_sha256`, `width_px`, `height_px` on the `floors` row. The client needs `width_px`/`height_px` to lay out the canvas before the image arrives.

### If deployment has an ephemeral filesystem

### Mobile offline cache protocol

| Artifact | Where | Invalidation |
|---|---|---|
| Graph snapshot (`nodes`, `edges`, `floors` incl. `metersPerPixel`, `buildings`) | `getApplicationSupportDirectory()/graph.json`, written atomically (temp file → rename) | `graph_revision` integer returned by `GET /v1/graph/snapshot`; refetch when the server's revision is higher |
| Floor-plan images | `cached_network_image` disk cache (keyed by the immutable URL) | New URL per content hash — automatic |
| Session/JWT | `shared_preferences` | Expiry claim |
- **Never cache per-user data in `graph.json`.** It is a shared artefact; mixing in session state makes invalidation ambiguous.
- On startup: try the cached graph first (instant map), then refresh in the background. Do not gate the UI on a network call — indoor dead zones are the normal case (`PROJECT.md`).
- If `/v1/graph/snapshot` fails *and* there is no cache, show an explicit "no map cached — connect once to enable offline navigation" state. A blank map looks like a bug; that message looks like a design decision.
- Offline route computation is a **Dart port of the same Dijkstra only** (`FEATURES.md` D8 already flags the conflict with the A\* comparison). Porting both is wasted effort: the offline path exists to never fail, not to be compared. Parity-test the Dart port against fixture graphs exported from the TS tests.

## Monorepo shape

| Option | Verdict |
|---|---|
| **npm workspaces** | Zero installation, native since npm 7, `npm run test -ws` fan-out, one lockfile, `node_modules` hoisting for free. Nothing to configure and nothing to break. |
| pnpm workspaces | Faster, stricter about phantom dependencies — but it is a **second toolchain** the student must install and explain, and Flutter sits outside the JS graph either way. Not worth it at 3 packages. |
| Turborepo | Solves remote caching and task-graph scheduling. Real payoff at 5+ packages with CI minutes to save. Here: a config file, a cache directory, and a new failure mode for a build that takes 4 seconds. |
| Nx | Generators, plugin ecosystem, project graph, module boundaries. Orders of magnitude more than this project needs. |

## Installation

# ── root ────────────────────────────────────────────────────────────────

# add "workspaces": ["apps/api","apps/admin","packages/shared"] to package.json

# ── apps/api ────────────────────────────────────────────────────────────

# PIN prisma. `npm i prisma` resolves latest → 8.0.0-rc.25 (an RC).

# ── apps/admin ──────────────────────────────────────────────────────────

# ── mobile (separate toolchain) ─────────────────────────────────────────

# ── database ────────────────────────────────────────────────────────────

## Alternatives Considered

| Recommended | Alternative | When to Use the Alternative | Conf. |
|---|---|---|---|
| `@xyflow/react` 12.12.0 | `react-konva` 19.3.2 + `konva` 10.9.0 | **When the canvas is the product**, not the nodes. Konva gives you a superb `Konva.Image` backdrop and excellent hit-testing/transforms — but you then implement node dragging, marquee selection, edge creation (click-drag-connect), deletion, z-ordering, keyboard undo and viewport fitting yourself. For a 12–15 day editor budget, that is the difference between shipping the editor and shipping a canvas. React Flow's peers accept React 19.3.1; Konva's do too (`konva ^10`). | HIGH |
| `@xyflow/react` 12.12.0 | `svg-pan-zoom` 3.6.2 | Only if you already have a finished SVG floor plan with embedded node geometry and need pan/zoom semantics on it. Last published 2024-10-20, and it does **pan/zoom only** — you still build the entire editor on top. | HIGH |
| `@xyflow/react` 12.12.0 | `reactflow` 11.11.4 (legacy) | Never for a new project. v12 lives under the `@xyflow/react` package name; `reactflow` is the frozen v11 line. Most tutorials you will find online are v11 — the API changed (hooks moved to `useReactFlow`, `screenToFlowPosition` replaced `project`). | HIGH |
| Hand-rolled Dijkstra + A\* | `graphology` + `graphology-shortest-path` | If you were building a *product* and only needed "a shortest path", `graphology` 0.26.0 is well-maintained, TypeScript-native and pleasant. It loses here because its A\* is bidirectional-only and it exposes no expansion counters — both fatal for the report table. | HIGH |
| Hand-rolled Dijkstra + A\* | `@dagrejs/graphlib` 4.0.5 | As a graph *container* with topology helpers (`topsort`, `findCycles`, `isAcyclic`) it is genuinely good, zero-dependency and TS-native — useful if the graph validator (D5) grows. It still has no A\*. | MEDIUM |
| Local disk + `express.static` | `@aws-sdk/client-s3` 3.1155.0 / `minio` 8.0.7 | Only when the deploy target has an ephemeral filesystem. Not a v1 concern. | HIGH |
| npm workspaces | pnpm workspaces (12.15.0) | If install time becomes painful or you want strict dependency isolation. At 3 packages it buys nothing and adds a tool. | MEDIUM |
| npm workspaces | Turborepo 2.11.10 | Once there are 5+ packages and CI caching actually saves minutes. A `turbo.json` and a `.turbo` cache directory are pure overhead for a 4-second build. | MEDIUM |
| `bcryptjs` 3.0.3 | `bcrypt` 6.0.0 | If you want the native C implementation for throughput. At campus scale (a few logins per minute) the difference is unmeasurable, and the Windows build toolchain requirement is a real cost. | HIGH |
| `jsonwebtoken` 9.0.3 | `jose` 6.2.13 | If you move to an edge runtime / WebCrypto, or want ESM-only. For HS256 + Express, `jsonwebtoken` is simpler and every tutorial matches it. | MEDIUM |
| Plain HTML/CSS bars | `recharts` / `chart.js` | For the usage-monitoring dashboard (TS14). Plain HTML/CSS bars are enough for count-per-building; reach for a chart library only if you need time series with axes. **Not version-verified here — check before adding.** | LOW |

## What NOT to Use

| Avoid | Why | Use Instead | Conf. |
|---|---|---|---|
| **`npm install prisma`** (unpinned) | The npm `latest` tag for `prisma` currently resolves to **`8.0.0-rc.25`** — a release candidate — while `@prisma/client@latest` is **7.10.1**. You get a CLI two majors ahead of the client, and every Prisma command fails in a confusing way. The `prev` tag is `7.10.1`. | Pin `prisma@7.10.1` and `@prisma/client@7.10.1` explicitly (or use `prisma@prev` exactly as Prisma's own quickstart does). | HIGH |
| **TypeScript 7.0.2** | It is npm `latest`, but it is the Go port: **no compiler API**, several tsconfig options removed (`baseUrl`, `es5`, `node10`, AMD/UMD), new defaults (`types: []`, `rootDir: ./`). `typescript-eslint@8.72.0` declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"`, so linting breaks immediately. Prisma 7 documents TypeScript 5.9.x as recommended. | `typescript@5.9.3`. Revisit after TS 7.1 and a typescript-eslint release that supports it. | HIGH |
| **`qr_code_scanner`** | Last published **2022-08-15**, marked "Maintenance Mode Only" on pub.dev. No Flutter 3.4x compatibility guarantees. | `mobile_scanner` ^7.4.2. | HIGH |
| **`graphlib` 2.1.8** | No A\* in its `alg` namespace at all; last published 2019-12-03; depends on `lodash` (the whole of it). | The hand-rolled routing module. | HIGH |
| **`js-priority-queue` 0.1.5** | Last published 2016, untyped, and a binary heap is 40 lines. | Hand-written `heap.ts`. | HIGH |
| **`reactflow` 11.11.4** | Frozen v11 package. Every v12 hook you read about on reactflow.dev will not exist under this import name. | `@xyflow/react@12.12.0`. | HIGH |
| **`jsdom` 30.x** for admin tests | Requires Node ≥22.22.2; the project's Node is 22.14.0. | `happy-dom@21.0.4`. | HIGH |
| **`bcrypt` 6.x** | Native module — needs `node-gyp` + MSVC Build Tools on Windows, and fails the moment a prebuilt binary is missing for the Node version. | `bcryptjs@3.0.3`. | HIGH |
| **`express-async-handler` / `express-async-errors`** | Express 5 forwards rejected promises from handlers and middleware to the error middleware natively (documented in the v5 migration guide). These packages were Express 4 workarounds and are now dead weight. | Nothing — write plain `async` handlers. | HIGH |
| **`body-parser`** | Bundled as `express.json()` / `express.urlencoded()` since 4.16. In Express 5, `req.body` is `undefined` when nothing parsed it — a real behavioural change to code against. | `express.json()`. | HIGH |
| **Tailwind v3 setup instructions** | v4 is CSS-first: no `tailwind.config.js` by default, and integration is `@tailwindcss/vite@4.3.3` rather than PostCSS. Following a v3 guide wastes an afternoon on a config file that should not exist. | Follow the v4 docs (`@import "tailwindcss";` in CSS + Vite plugin). | HIGH |
| **`photo_view`** for the map | It is a photo-*gallery* widget: it owns the gesture space and gives you no stable coordinate system to draw a route painter into. Your overlay and its zoom fighting each other is the predictable outcome. | `InteractiveViewer` → `Stack([Image, CustomPaint])`, with `constrained: false` and the painter sized to the image's natural pixels. | MEDIUM |
| **`google_mlkit_barcode_scanning`** directly | You would rebuild camera preview, lifecycle (`WidgetsBindingObserver`), permission flow and detection throttling — all of which `mobile_scanner` already implements, tested across 1.94M downloads. | `mobile_scanner`. | HIGH |
| **`flutter_compass` 0.8.1** for heading | Last published 2024-11-17; predates the AGP 8/Kotlin DSL changes that trip older plugins on current Flutter. | `flutter_device_compass@2.2.0` — and only if a compass needle is ever added. | MEDIUM |
| **`@prisma/adapter-mysql2`** | Does not exist (registry returns 404). It is a plausible-sounding name that will cost you a `npm ERR! 404` and a search detour. | `@prisma/adapter-mariadb@7.10.1`. | HIGH |
| **`prisma-client-js` generator** | Deprecated in Prisma 7; generates into `node_modules`, needs `@prisma/client` internals, and does not support the ESM/TS-source model the rest of the stack uses. | `prisma-client` with an explicit `output`. | HIGH |

## Stack Patterns by Variant

- Build Flutter + API + Prisma + the *seed script* first; keep the graph editor as the last large item.
- Because `ARCHITECTURE.md` step 3 (routing) and step 4–5 (mobile) can both run against the **seeded** synthetic campus. The editor is the credibility feature, but it is not a dependency of a demonstrable navigation app.
- Swap the plan-storage function for `@aws-sdk/client-s3` (or `minio`).
- Because uploaded floor plans otherwise vanish on every deploy, and the failure looks like "the editor lost my map".
- Keep `docker compose up -d db` + `storage/` on local disk, serve the admin's production build from Express (`express.static`) so the whole system is one origin and one port.
- Because it removes CORS, ports and two-terminal coordination from the viva setup — the failure modes most likely to appear at exactly the wrong moment.
- Force `h = 0` (Dijkstra) and put `heuristicUsed: 'zero'` in the response.
- Because an A\* with a guessed scale overestimates and returns non-shortest paths, silently. A slower correct route beats a fast wrong one.
- Turn off `allowImportingTsExtensions`, set `importFileExtension = "js"` in the Prisma generator, build `packages/shared` with `tsc -b`, and run `node dist/index.js`.
- Because the tsx-in-production choice is an optimisation for *development friction*, not a permanent architectural commitment.
- Add Turborepo, not Nx.
- Because caching `test`/`lint`/`build` across two people is where the payoff starts; Nx's generators would still be overhead.

## Version Compatibility

| Package A | Compatible With | Notes | Conf. |
|---|---|---|---|
| Flutter 3.47.7 / Dart 3.13.5 | `mobile_scanner ^7.4.2` (needs Flutter ≥3.29.0, Dart ^3.7.0) | Satisfied comfortably. | HIGH |
| Flutter 3.47.7 | `cached_network_image ^4.0.5` (needs **Flutter ≥3.44.0**) | The binding constraint on the SDK version. | HIGH |
| Flutter 3.47.7 | `go_router ^18.1.1` (needs **Flutter ≥3.44.0**) | Same floor. | HIGH |
| Flutter 3.47.7 | `path_provider ^2.1.6` (≥3.38.0), `shared_preferences ^2.5.6` (≥3.41.0), `permission_handler ^13.0.2` (≥3.24.0) | All satisfied. | HIGH |
| `crypto` `^3.0.0` | Flutter SDK's transitive `crypto` 3.0.x | **Do not pin `^3.0.7`**; a tight pin can conflict with the SDK's own constraint. | MEDIUM |
| Prisma 7.10.1 | Node 20.19+ / 22.x, TypeScript 5.4+ (5.9.x recommended) | Node 22.14.0 is in range. | HIGH |
| `prisma@7.10.1` | `@prisma/client@7.10.1` + `@prisma/adapter-mariadb@7.10.1` | All three must track the same minor. Never upgrade one alone. | HIGH |
| `@prisma/adapter-mariadb` | `mariadb@3.5.4` against MySQL 8.0 | The adapter is the official MySQL/MariaDB connector; `mariadb` is its transitive driver. | HIGH |
| `prisma-client` generator (`importFileExtension = "ts"`) | `tsx@4.23.15` | Without this, `tsx` throws `Cannot find module './internal/class.js'`. Documented by Prisma. | HIGH |
| `typescript-eslint@8.72.0` | `typescript >=4.8.4 <6.1.0` | Hard ceiling. This is why TS is pinned to 5.9.3, not 7.x. | HIGH |
| `@xyflow/react@12.12.0` | `react >=17`, `react-dom >=17` | React 19.3.1 fine. Bundles `zustand@^4` internally — independent of your `zustand@5`. | HIGH |
| `react-konva@19.3.2` | `react ^19.3.0`, `konva ^10.0.0` | Only relevant if you choose Konva. | HIGH |
| `jsdom@30` | Node **≥22.22.2** | Incompatible with Node 22.14.0 → use `happy-dom@21.0.4`. | HIGH |
| `@types/node@22.20.5` | Node 22.14.0 runtime | Do not install `@types/node@26.x` against a Node 22 runtime. | HIGH |
| Express 5.3.0 | Node ≥18 | Behavioural changes to code for: `req.body` is `undefined` (not `{}`) when unparsed; wildcards must be named (`/*splat`); `?` optional segments replaced by braces; `express.static` `dotfiles` defaults to `"ignore"`. | HIGH |
| Express 5.3.0 | `@types/express@5.0.6` | v4 types will not compile against v5 handlers. | HIGH |
| npm workspaces | npm 7+ | One root lockfile; `mobile/` deliberately excluded from the workspace graph. | HIGH |
| Tailwind 4.3.3 | `@tailwindcss/vite@4.3.3` | Versions must match; v4 has no PostCSS-based default setup. | HIGH |

## Divergences from the sibling research — resolve these in the roadmap

| Topic | `ARCHITECTURE.md` says | This document says | Why |
|---|---|---|---|
| Graph editor canvas | "Canvas (Konva/Fabric or SVG) over an `<img>` backdrop" | **`@xyflow/react` 12.12.0** | `ARCHITECTURE.md` is deliberately technology-agnostic here and describes the *capability* (bitmap backdrop + vector overlay + pan/zoom + snap). React Flow satisfies that capability with the least code. If the roadmap prefers Konva, nothing else in the stack changes — only the editor's internal implementation. **This is a preference, not a conflict.** |
| Routing library | "`graphology` (or a hand-rolled adjacency map)" | **Hand-rolled, no library** | `ARCHITECTURE.md` already offers the hand-rolled option. The decisive additional evidence: `graphology`'s A\* is **bidirectional-only**, and no candidate library exposes node-expansion counters, so the Dijkstra-vs-A\* table `PROJECT.md` requires cannot be produced from any of them without re-implementing the loop. |

## Confidence summary

| Area | Conf. | Basis |
|---|---|---|
| Version numbers | HIGH | Every version read from `registry.npmjs.org` / `pub.dev/api/packages` on 2026-10-22 with publish dates, not from memory |
| Flutter package selection | HIGH | `mobile_scanner` vs deprecated `qr_code_scanner` is documented on pub.dev; the compass packages are ranked by publish date and SDK constraints |
| Prisma 7 migration mechanics | HIGH | Official v7 quickstart + generators reference: `prisma-client` + `output`, `prisma7.config.ts`, `PrismaMariaDb`, explicit `generate`/`db seed`, the `tsx` + `importFileExtension` note |
| Express 5 behaviour | HIGH | Official migration guide |
| Pathfinding "hand-roll" decision | HIGH on the facts (no `aStar` in graphlib; bidirectional-only in graphology; reversed paths in `ngraph.path`), MEDIUM on the effort judgement |
| A\* admissibility rule | HIGH | Derivation from the triangle inequality + the invariance `cost_m ≥ euclid3d`; this is the standard admissibility condition, not a project-specific invention |
| React Flow vs Konva | MEDIUM | A code-volume judgement. The capability comparison is HIGH; the "which is less work for one student" call is MEDIUM |
| Storage strategy | MEDIUM | Local disk is clearly right for a single-host demo; the S3 cutover depends on a deployment decision not yet made |
| `connectivity_plus` list-shaped stream | MEDIUM | v6+ changed the stream type; verify against the installed version's changelog when you wire it |
| Chart library for analytics | LOW | Not researched; deliberately left open |

## Sources

- `https://registry.npmjs.org/<pkg>` for every npm package above — `dist-tags`, `time`, `peerDependencies`, `engines`
- `https://pub.dev/api/packages/<pkg>` for every Flutter package — `latest.version`, `published`, `environment`
- `https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json` — Flutter 3.47.7 / Dart 3.13.5 (2026-10-08)
- Prisma — *MySQL quickstart (v7)*: https://www.prisma.io/docs/v7/prisma-orm/quickstart/mysql — `prisma@prev`, `PrismaMariaDb`, `prisma7.config.ts`, ESM layout, explicit `generate`
- Prisma — *Generators (v7)*: https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators — `prisma-client` requires `output`; the `tsx` / `importFileExtension = "ts"` note
- Prisma — *Upgrade to v7*: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 — driver-adapter requirement, removed `datasource.url`, no auto-seed
- Express — *Upgrade to Express 5*: https://expressjs.com/en/guide/migrating-5.html — native rejected-promise forwarding, `req.body === undefined`, wildcard/static changes
- React Flow — *Background component*: https://reactflow.dev/api-reference/components/background — only `lines` / `dots` / `cross` variants, no image backdrop
- React Flow — issue #3380: https://github.com/xyflow/xyflow/issues/3380 — the maintainer-blessed pattern for an image backdrop via `useViewport()` + CSS transform
- Flutter — `InteractiveViewer` API: https://api.flutter.dev/flutter/widgets/InteractiveViewer-class.html — `constrained`, `transformationController.toScene()`, `clipBehavior`
- pub.dev — `mobile_scanner`: https://pub.dev/packages/mobile_scanner — CameraX/ML Kit, bundled vs unbundled, lifecycle handling
- pub.dev — `qr_code_scanner`: https://pub.dev/packages/qr_code_scanner — "Maintenance Mode Only", last publish 2022-08-15
- graphology — `graphology-shortest-path` README (v2.1.0): https://unpkg.com/graphology-shortest-path@2.1.0/README.md — only `astar.bidirectional`, no unidirectional A\*
- dagrejs — `graphlib` repository/`alg` surface: https://github.com/dagrejs/graphlib — `dijkstra`, `bellmanFord`, `floydWarshall`, `tarjan`, `topsort`, `prim`; **no A\***
- anvaka — `ngraph.path`: https://github.com/anvaka/ngraph.path — `aStar(graph, {distance, heuristic})`, reversed result order, `ngraph.graph` dependency
- Wikipedia — *A\* search algorithm*: https://en.wikipedia.org/wiki/A*_search_algorithm — admissibility and consistency conditions
- npm — `qrcode` API surface: https://www.npmjs.com/package/qrcode — `toBuffer`, `toFile`, `toDataURL`, SVG `toString`
- `graphlib` 2.1.8 and `@dagrejs/graphlib` 4.0.5 export **no** `aStar` (export lists read from the published bundles)
- `@prisma/adapter-mysql2` does not exist (registry 404)
- `qr_code_scanner` has had no release since 2022-08-15
- `js-priority-queue` has had no release since 2016

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
