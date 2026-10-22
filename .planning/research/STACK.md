# Stack Research

**Domain:** QR-checkpoint indoor campus navigation — Flutter mobile app, Node/Express/TypeScript API, React/Vite/TypeScript admin panel, MySQL 8 via Prisma
**Researched:** 2026-10-22
**Confidence:** HIGH on versions, MEDIUM on library-fit judgement (per-row confidence below)

## Scope: the stack is fixed, only the *inside* is open

`PROJECT.md` fixes Flutter/Dart, Node.js + Express + TypeScript, React + Vite + TypeScript, and MySQL 8 via Prisma. That was decided on 2026-10-22 and this document does **not** re-litigate it. Every recommendation below is about *how to use those five things well*, which is where the actual risk lives:

1. Which QR scanner, map-renderer, and compass packages in Flutter — and which of them are quietly dead.
2. Whether the routing engine is hand-rolled or a library (this turns out to be the single most consequential call in the stack).
3. What the A\* heuristic must be for a multi-floor graph to stay **admissible** — a correctness bug, not a style choice.
4. How floor-plan images are stored, served, and cached offline.
5. How the three codebases (Dart + two TS apps) are arranged without a build system becoming its own project.

**How confidence is assigned here.** `HIGH` = version *and* API verified against the package registry **and** official documentation, with no contradicting signal. `MEDIUM` = single authoritative source, or a fit/effort judgement that a reasonable engineer could argue with. `LOW` = untested inference. Version facts were pulled live from `registry.npmjs.org` and `pub.dev/api/packages/*` on 2026-10-22; nothing below is quoted from training data.

---

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

**Deliberately deferred (do not add to v1):**

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

**No pathfinding dependency.** See *The one real library decision* below — this is the most important call in the document.

### Data — Prisma 7 + MySQL 8

Prisma 7 is a genuine breaking release, and three of its changes will silently waste a day if you follow a v6 tutorial:

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

One package, no runtime dependencies of its own: `zod` schemas + `type` exports for every DTO (`Node`, `Edge`, `Floor`, `RouteResponse`, `RouteLeg`, `QrTokenPayload`). Consumed as **TypeScript source** (`"exports": { ".": "./src/index.ts" }`) so `tsx`, Vite and Vitest all resolve it without a build step. This is what stops the API, the admin editor, and the mobile DTOs from drifting apart — the failure mode `ARCHITECTURE.md` calls out as the editor/routing contract risk.

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

---

## The one real library decision: pathfinding is hand-rolled

This is the decision worth arguing about, because it is the one place where a dependency would actually *hurt*.

`PROJECT.md` requires **both** Dijkstra and A\*, and `FEATURES.md` D2 requires a quantitative comparison (nodes expanded, path length, runtime, agreement rate) for the report. That requirement eliminates most libraries on its own.

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

Four reasons, in order of weight:

1. **No library gives you the comparison table.** The report needs `nodesExpanded` per query. That counter lives *inside* the search loop. With `graphology` you would have to fork the package or wrap it in something that re-implements the loop — at which point you have written the algorithm anyway, with extra steps.
2. **`graphlib` has no A\* at all.** This is the decisive fact and it is easy to get wrong from memory: neither `graphlib@2.1.8` nor the maintained `@dagrejs/graphlib@4.0.5` exports an `aStar`. You would hand-write A\* anyway, then represent the graph twice to feed `graphlib`'s Dijkstra.
3. **`graphology`'s A\* is bidirectional-only.** Bidirectional search expands from both ends, so "nodes expanded" is not comparable to unidirectional Dijkstra — which quietly invalidates the very table the report is built on.
4. **`ngraph.path` returns paths in reverse order** (target first) and requires its own `ngraph.graph` object type, so the graph would exist in two representations (Prisma rows → your snapshot → `ngraph.graph` → reversed id list). More code, not less.

And the academic argument, which matters here: a student who hand-writes the two algorithms can defend them in a viva. A student who calls `astar.bidirectional()` cannot explain why the heuristic is admissible on their own graph.

**Shape of the module** (`apps/api/src/routing/`, pure, no Express/Prisma imports):

```
graph.ts        // adjacency Map<nodeId, {to, costM, kind, accessible}[]>
heap.ts         // binary min-heap, ~40 lines, keyed on f with a g tie-break
pathfind.ts     // ONE search loop, parameterised by a heuristic function
compare.ts      // runs both, returns {nodesExpanded, maxFrontier, relaxations, ms}
```

The single-loop-with-injected-heuristic design is what makes the comparison credible: Dijkstra *is* A\* with `h = () => 0`, so the only variable between the two runs is the heuristic. Say that explicitly in the report.

**Optional and cheap:** use `ngraph.path` in tests only, as an oracle — build an `ngraph.graph` from a fixture, compare path *cost* (not node order) against your implementation on 200 random pairs. That is a strong correctness claim for one test file, and it costs you nothing at runtime.

### The A\* heuristic must be admissible across floors

This is the highest-risk correctness item in the routing phase, and a plain 2-D Euclidean heuristic **is not admissible** on a multi-floor graph if you get the vertical term wrong.

Set up a metric coordinate space:

```ts
// per floor, from the calibrated meters_per_pixel
x_m = node.xPx * floor.metersPerPixel;
y_m = node.yPx * floor.metersPerPixel;
z_m = floor.ordinal * FLOOR_HEIGHT_M;      // e.g. 4.2 m storey height
```

Then:

```ts
function heuristic(n: Node, target: Node) {
  return Math.hypot(n.xM - target.xM, n.yM - target.yM, n.zM - target.zM);
}
```

This is admissible **if and only if** every edge cost is at least the 3-D Euclidean distance between its endpoints:

```
∀ edge (u,v):  cost_m(u,v) ≥ euclid3d(u,v)
```

*Why that suffices:* any path's cost is a sum of edge costs, each ≥ the corresponding Euclidean hop, and a sum of Euclidean hops is ≥ the straight-line distance by the triangle inequality. The same inequality gives consistency (`h(n) ≤ cost(n,n') + h(n')`), so no node is ever reopened.

**The trap.** An administrator draws a staircase as a short glyph — a 3 m arrow — while the edge's endpoints differ by 4.2 m in `z`. The stored `cost_m` is then *less* than the Euclidean distance, `h` overestimates, and A\* can return a route that is not shortest. Nothing crashes; the path just quietly disagrees with Dijkstra, and the "agreement rate" column in your report becomes an unexplainable number.

Three defences, use all of them:

1. **Derive `cost_m` on the server** (matching `ARCHITECTURE.md` — the editor must not compute cost), and clamp: `cost_m = Math.max(computed, euclid3d(a, b))`.
2. **Assert the invariant in the graph validator** (D5): iterate every edge and flag `cost_m < euclid3d` as a publish blocker. This turns a subtle search bug into a visible admin error.
3. **Fall back to `h = 0`** (i.e. Dijkstra) when any floor on the route lacks a `meters_per_pixel` calibration, and record which heuristic was used in the response. Never guess a scale to make A\* "work".

*Alternative admissible heuristic* if you cannot guarantee the invariant: `h(n) = horizontalEuclid(n, t) + floorPenalty × |floor(n) − floor(t)|`, where `floorPenalty` is a **lower bound** on the cost of any single vertical transition. Note the direction of the inequality — adding a penalty larger than the real vertical cost makes the heuristic inadmissible. That is the classic way this bug is introduced.

**Also:** keep `accessible = true` routing (no stair edges) as a filter over the same edge list. A subgraph has fewer edges, so an admissible heuristic stays admissible.

### Instrumentation to record per query

Because the table is the deliverable, define the metrics before writing the loop:

| Metric | Why it is in the report |
|---|---|
| `nodesExpanded` | The headline: A\* should expand strictly fewer nodes than Dijkstra on the same pair |
| `maxFrontier` | Shows the memory saving, not just the time saving |
| `relaxations` | Distinguishes "A\* was fast" from "the graph was tiny" |
| `pathCostM` + node sequence | Proves both algorithms agree on cost (they must) |
| `runtimeMs` | Honest caveat: at campus scale (a few thousand nodes) both are sub-millisecond, so wall-clock time is dominated by noise. Lead with `nodesExpanded`; report time as an appendix. |
| `heuristicUsed` | `'euclidean3d' \| 'zero'` — so an uncalibrated floor cannot silently look like a win |

---

## Storage and caching of floor plans

### v1: local disk, content-hashed, immutable cache headers

```
storage/plans/<floorId>/<sha256>.<png>
```

* `sharp` normalises **before** the image is written and **before** calibration: EXIF-rotate, re-encode, cap dimensions. **This ordering is load-bearing** — `meters_per_pixel` is only meaningful against the stored pixel grid, so re-encoding after calibration invalidates every node coordinate.
* Filename contains the content hash, so the response can carry `Cache-Control: public, max-age=31536000, immutable` safely. A changed plan gets a new URL; nothing has to be purged.
* Serve with `express.static(..., { maxAge: '1y', immutable: true })` or a dedicated route that sets the header. Note Express 5 changed `express.static`'s `dotfiles` default to `"ignore"` and dropped the `hidden`/`from` options — use `root` and `dotfiles`.
* Store `image_path`, `image_sha256`, `width_px`, `height_px` on the `floors` row. The client needs `width_px`/`height_px` to lay out the canvas before the image arrives.

Why not object storage for v1: it adds credentials, a network hop and a failure mode to a demo that runs on one laptop. Docker + a mounted `storage/` folder is the whole story.

### If deployment has an ephemeral filesystem

Render / Railway / Fly / Heroku wipe local disk on redeploy. Only then add S3-compatible storage: `@aws-sdk/client-s3` **3.1155.0** (works with AWS S3, Cloudflare R2, DigitalOcean Spaces, Backblaze B2) or `minio` **8.0.7** for a self-hosted MinIO. Serve presigned GETs or a public bucket behind a CDN. The Prisma model does not change — only the storage adapter behind `getPlanUrl()`.

This is a *variant*, not a baseline. Do not build an S3 abstraction "for later" — one function with two implementations is enough, and you may never need it.

### Mobile offline cache protocol

| Artifact | Where | Invalidation |
|---|---|---|
| Graph snapshot (`nodes`, `edges`, `floors` incl. `metersPerPixel`, `buildings`) | `getApplicationSupportDirectory()/graph.json`, written atomically (temp file → rename) | `graph_revision` integer returned by `GET /v1/graph/snapshot`; refetch when the server's revision is higher |
| Floor-plan images | `cached_network_image` disk cache (keyed by the immutable URL) | New URL per content hash — automatic |
| Session/JWT | `shared_preferences` | Expiry claim |

Rules that keep the offline story honest:

- **Never cache per-user data in `graph.json`.** It is a shared artefact; mixing in session state makes invalidation ambiguous.
- On startup: try the cached graph first (instant map), then refresh in the background. Do not gate the UI on a network call — indoor dead zones are the normal case (`PROJECT.md`).
- If `/v1/graph/snapshot` fails *and* there is no cache, show an explicit "no map cached — connect once to enable offline navigation" state. A blank map looks like a bug; that message looks like a design decision.
- Offline route computation is a **Dart port of the same Dijkstra only** (`FEATURES.md` D8 already flags the conflict with the A\* comparison). Porting both is wasted effort: the offline path exists to never fail, not to be compared. Parity-test the Dart port against fixture graphs exported from the TS tests.

---

## Monorepo shape

**Recommendation: npm workspaces, nothing else.**

```
deepak/
├── package.json                 # "workspaces": ["apps/api","apps/admin","packages/shared"]
├── package-lock.json            # one lockfile
├── docker-compose.yml           # mysql:8.0
├── apps/
│   ├── api/                     # Express + Prisma (prisma/ lives here)
│   │   ├── prisma/schema.prisma
│   │   ├── prisma7.config.ts
│   │   └── src/{routing,guidance,http,generated}/
│   └── admin/                   # React + Vite
│       └── src/components/editor/
├── packages/
│   └── shared/                  # zod schemas + DTO types, consumed as TS source
├── mobile/                      # Flutter — a sibling folder, NOT an npm workspace
└── storage/                     # dev-only floor plans (gitignored)
```

Why npm workspaces over the alternatives:

| Option | Verdict |
|---|---|
| **npm workspaces** | Zero installation, native since npm 7, `npm run test -ws` fan-out, one lockfile, `node_modules` hoisting for free. Nothing to configure and nothing to break. |
| pnpm workspaces | Faster, stricter about phantom dependencies — but it is a **second toolchain** the student must install and explain, and Flutter sits outside the JS graph either way. Not worth it at 3 packages. |
| Turborepo | Solves remote caching and task-graph scheduling. Real payoff at 5+ packages with CI minutes to save. Here: a config file, a cache directory, and a new failure mode for a build that takes 4 seconds. |
| Nx | Generators, plugin ecosystem, project graph, module boundaries. Orders of magnitude more than this project needs. |

**Flutter is not a workspace member.** `mobile/` has its own `pubspec.yaml`, its own lockfile and its own toolchain (`flutter pub get`, `flutter test`). Trying to route it through npm scripts only obscures error messages. Wire it as `npm run mobile:test` → `cd mobile && flutter test` if you want one entry point.

**Shared package caveat:** consuming `packages/shared` as TS source works for `tsx`, Vite and Vitest, but plain `node dist/...` cannot import `.ts`. That is why the API runs on `tsx` in production too (see *Installation*). If you later need a compiled deploy, add a `tsc -b` build to `packages/shared` and point `exports` at `dist/` — a 10-minute change, not an architecture change.

---

## Installation

```bash
# ── root ────────────────────────────────────────────────────────────────
npm init -y
# add "workspaces": ["apps/api","apps/admin","packages/shared"] to package.json

# ── apps/api ────────────────────────────────────────────────────────────
# PIN prisma. `npm i prisma` resolves latest → 8.0.0-rc.25 (an RC).
npm install -w apps/api prisma@7.10.1 --save-dev
npm install -w apps/api @prisma/client@7.10.1 @prisma/adapter-mariadb@7.10.1 dotenv

npm install -w apps/api express@5.3.0 zod jsonwebtoken bcryptjs multer sharp \
  qrcode helmet cors express-rate-limit compression pino pino-http

npm install -w apps/api -D typescript@5.9.3 tsx@4.23.15 vitest@5.0.5 \
  @vitest/coverage-v8@5.0.5 supertest@7.3.1 \
  @types/express@5.0.6 @types/node@22.20.5 @types/qrcode@1.5.6 \
  @types/bcryptjs@3.0.0 @types/multer@2.3.0 @types/jsonwebtoken@9.0.10 \
  @types/compression@1.8.1 @types/cors@2.8.19 \
  eslint@10.13.0 typescript-eslint@8.72.0 prettier@3.9.10

# ── apps/admin ──────────────────────────────────────────────────────────
npm install -w apps/admin react@19.3.1 react-dom@19.3.1 @xyflow/react@12.12.0 \
  react-router-dom@7.18.4 @tanstack/react-query@5.104.5 zustand@5.0.16 \
  react-hook-form@7.90.0 @hookform/resolvers@6.0.0 zod lucide-react@1.61.0

npm install -w apps/admin -D vite@8.3.5 @vitejs/plugin-react@6.1.2 \
  typescript@5.9.3 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 \
  @types/react@19.3.0 @types/react-dom@19.3.0 \
  vitest@5.0.5 @testing-library/react@16.3.3 happy-dom@21.0.4

# ── mobile (separate toolchain) ─────────────────────────────────────────
cd mobile
flutter create --org com.sjcet --project-name sjcetnav .
flutter pub add mobile_scanner permission_handler dio cached_network_image \
  path_provider shared_preferences connectivity_plus go_router provider
flutter pub add --dev flutter_lints
cd ..

# ── database ────────────────────────────────────────────────────────────
docker compose up -d db
cd apps/api
npx prisma init --datasource-provider mysql --output ../src/generated/prisma
npx prisma migrate dev --name init
npx prisma generate          # NOT automatic after migrate in v7
npx prisma db seed           # explicit in v7
```

**API `tsconfig.json`** (ESM, no build step — Prisma's own quickstart layout):

```jsonc
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "strict": true,
    "esModuleInterop": true,
    "noEmit": true,
    "allowImportingTsExtensions": true   // lets tsc typecheck while tsx runs .ts
  }
}
```

`package.json` needs `"type": "module"`. Run dev with `tsx watch src/index.ts`, typecheck with `tsc --noEmit`, and **run production with `tsx` as well** — it removes an entire build artefact, and `tsc` cannot emit anything anyway while `allowImportingTsExtensions` is on. Use `import.meta.dirname` (Node ≥20.11) where you would have reached for `__dirname`.

**Prisma generator block** — the `importFileExtension` line is what makes `tsx` work:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  importFileExtension = "ts"   // required for tsx; see Prisma generators docs
}

datasource db {
  provider = "mysql"           // no url here in v7
}
```

---

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

---

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

---

## Stack Patterns by Variant

**If the deadline forces a scope cut:**
- Build Flutter + API + Prisma + the *seed script* first; keep the graph editor as the last large item.
- Because `ARCHITECTURE.md` step 3 (routing) and step 4–5 (mobile) can both run against the **seeded** synthetic campus. The editor is the credibility feature, but it is not a dependency of a demonstrable navigation app.

**If you deploy to a platform with an ephemeral disk (Render / Railway / Fly / Heroku):**
- Swap the plan-storage function for `@aws-sdk/client-s3` (or `minio`).
- Because uploaded floor plans otherwise vanish on every deploy, and the failure looks like "the editor lost my map".

**If the demo machine is the same laptop that runs the dev stack:**
- Keep `docker compose up -d db` + `storage/` on local disk, serve the admin's production build from Express (`express.static`) so the whole system is one origin and one port.
- Because it removes CORS, ports and two-terminal coordination from the viva setup — the failure modes most likely to appear at exactly the wrong moment.

**If `meters_per_pixel` is missing for any floor:**
- Force `h = 0` (Dijkstra) and put `heuristicUsed: 'zero'` in the response.
- Because an A\* with a guessed scale overestimates and returns non-shortest paths, silently. A slower correct route beats a fast wrong one.

**If you want a compiled API deploy later:**
- Turn off `allowImportingTsExtensions`, set `importFileExtension = "js"` in the Prisma generator, build `packages/shared` with `tsc -b`, and run `node dist/index.js`.
- Because the tsx-in-production choice is an optimisation for *development friction*, not a permanent architectural commitment.

**If a second developer joins:**
- Add Turborepo, not Nx.
- Because caching `test`/`lint`/`build` across two people is where the payoff starts; Nx's generators would still be overhead.

---

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

---

## Divergences from the sibling research — resolve these in the roadmap

`ARCHITECTURE.md` was written in parallel and names two technologies this document does not recommend. Both are worth flagging explicitly rather than silently overriding:

| Topic | `ARCHITECTURE.md` says | This document says | Why |
|---|---|---|---|
| Graph editor canvas | "Canvas (Konva/Fabric or SVG) over an `<img>` backdrop" | **`@xyflow/react` 12.12.0** | `ARCHITECTURE.md` is deliberately technology-agnostic here and describes the *capability* (bitmap backdrop + vector overlay + pan/zoom + snap). React Flow satisfies that capability with the least code. If the roadmap prefers Konva, nothing else in the stack changes — only the editor's internal implementation. **This is a preference, not a conflict.** |
| Routing library | "`graphology` (or a hand-rolled adjacency map)" | **Hand-rolled, no library** | `ARCHITECTURE.md` already offers the hand-rolled option. The decisive additional evidence: `graphology`'s A\* is **bidirectional-only**, and no candidate library exposes node-expansion counters, so the Dijkstra-vs-A\* table `PROJECT.md` requires cannot be produced from any of them without re-implementing the loop. |

Everything else in the sibling documents is consistent with this stack (`mobile_scanner` over `qr_code_scanner`, pure-function routing core, server-side cost derivation, seeded synthetic campus, local-DB-then-offline-cache).

---

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

---

## Sources

**Package registries (versions + publish dates, fetched 2026-10-22)**
- `https://registry.npmjs.org/<pkg>` for every npm package above — `dist-tags`, `time`, `peerDependencies`, `engines`
- `https://pub.dev/api/packages/<pkg>` for every Flutter package — `latest.version`, `published`, `environment`
- `https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json` — Flutter 3.47.7 / Dart 3.13.5 (2026-10-08)

**Official documentation**
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

**Verified negatives (explicitly checked, not assumed)**
- `graphlib` 2.1.8 and `@dagrejs/graphlib` 4.0.5 export **no** `aStar` (export lists read from the published bundles)
- `@prisma/adapter-mysql2` does not exist (registry 404)
- `qr_code_scanner` has had no release since 2022-08-15
- `js-priority-queue` has had no release since 2016

---
*Stack research for: QR-checkpoint indoor campus navigation*
*Researched: 2026-10-22*
