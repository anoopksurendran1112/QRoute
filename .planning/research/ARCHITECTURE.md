# Architecture Research

**Domain:** Indoor campus navigation (QR-code anchored wayfinding, multi-floor, multi-building)
**Project:** QR-Based Indoor Navigation System — St. Joseph's College of Engineering and Technology, Palai
**Researched:** 2026-10-22
**Confidence:** MEDIUM-HIGH (component decomposition and multi-floor modelling cross-checked across multiple independent vendor + academic sources; API contract details are design recommendations, not sourced facts)

> **Scope note.** This document describes the architecture **for the design already fixed** in `PROJECT.md`:
> monorepo with `mobile/` (Flutter), `server/` (Node + Express + TypeScript), `admin/` (React + Vite + TypeScript),
> `shared/` (shared TS types); server-side pathfinding in TypeScript over one global graph spanning all floors;
> turn instructions as a pure function over the path; opaque signed QR tokens; a first-class admin graph editor;
> and a client-side graph cache for offline fallback. Nothing here proposes an alternative architecture — it
> fills in the *structure* of the fixed design: component boundaries, data flow, build order, and API contracts.

---

## Standard Architecture

### System Overview

The canonical decomposition for this class of system is three working parts — **positioning (the anchor fix)**,
**a map modelled as a connected graph**, and **a routing engine** — with **wayfinding** (the presentation of
directions to the user) layered on top ([Ariadne, *Indoor Navigation Systems: How Indoor Wayfinding Actually
Works*, Sep 2025](https://www.ariadne.inc/resources/blogs/indoor-navigation-digital-wayfinding-guide/);
[Zapworks, *The Complete Guide to Indoor Navigation*](https://zap.works/guide-to-indoor-navigation/)). Our
design maps onto that decomposition almost exactly, with QR codes standing in for a positioning hardware layer
and the admin graph editor standing in for the map-production layer.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                          CAMPUS GRAPH  (single source of truth)                      │
│  buildings ── floors ── nodes ── edges   +  floors.meters_per_pixel  +  graph_revision│
│  classrooms(→ entrance_node_id)  departments  faculty  qr_tokens(→node)                │
└──────────────────────────────────────────────────────────────────────────────────────┘
        ▲                    ▲                    ▲                     ▲
        │ admin writes       │ admin reads        │ server reads        │ server reads
        │ (draft)            │                    │                     │
┌───────┴────────┐   ┌───────┴────────┐   ┌──────┴──────────────┐  ┌───┴──────────────┐
│  admin/  React │   │  server/  Node │   │  server/routing    │  │ server/qr        │
│  ├ catalog     │──►│  ├ catalog     │   │  ├ graph-loader     │  │  ├ mint (HMAC)   │
│  ├ graph-editor│   │  ├ graph       │◄──┤  ├ dijkstra         │  │  ├ verify        │
│  │  (canvas)   │──►│  ├ routing    │   │  ├ astar            │  │  └ token→node    │
│  ├ qr-manager  │──►│  ├ guidance    │   │  └ route-adapter    │  └──────────────────┘
│  └ analytics   │   │  ├ qr         │   └─────────────────────┘
└────────────────┘   │  ├ session    │            ▲
                     │  ├ validation │            │ same pure functions
                     │  └ http/routes│────┐       │ (port mirrored in Dart)
                     └────────────────┘   │
                            ▲             │
                     ┌──────┴──────┐      │
                     │  server/    │──────┘
                     │  db (Prisma)│
                     │  + MySQL 8  │
                     └─────────────┘
                            ▲
        ┌───────────────────┼───────────────────────┐
        │                   │                       │
┌───────┴─────────┐  ┌──────┴────────┐  ┌───────────┴──────────┐
│  mobile/ Flutter│  │  offline pack │  │  assets/ (floor plan │
│  ├ scanner      │  │  graph cache  │  │  images, QR images)  │
│  ├ api-client   │──┤ (node/edge +  │  └──────────────────────┘
│  ├ map-renderer │  │  floor images)│
│  ├ guidance-UI  │  └───────────────┘
│  └ offline-router◄┘ (local Dijkstra fallback)
└─────────────────┘
        ▲
        │  /v1 (public)              ┌──────────────────────┐
        └────────────────────────────┤  shared/             │
                                     │  types/domain.ts    │
                                     │  types/api.ts        │
                                     │  constants.ts        │
                                     └──────────┬───────────┘
                                                │ imported by server/ + admin/
                                                │ (NOT by mobile/ — Dart cannot import TS)
                                                ▼
                                     ┌──────────────────────┐
                                     │  contracts/fixtures  │
                                     │  golden JSON payloads │
                                     │  used by both sides  │
                                     └──────────────────────┘
```

### Component Responsibilities

| Component | Layer | Responsibility | Typical Implementation |
|-----------|-------|----------------|------------------------|
| `server/db` | server | Owns the 14-table schema; the only writer of campus-graph state | Prisma schema + MySQL 8; migration + seed script producing the synthetic campus |
| `server/catalog` | server | CRUD for `buildings`, `floors`, `departments`, `faculty`, `classrooms`; the destination directory | Express route handlers over Prisma; feeds `GET /v1/destinations` |
| `server/graph` | server | CRUD for `nodes` / `edges`; draft editing + publish (`graph_revision` bump) | Express route handlers; `graph_revision` counter on a `campus` singleton row |
| `server/validation` | server | Topology checks over a candidate graph (orphans, dangling edges, unreachable classrooms, missing vertical pairs, uncalibrated floors) | Pure functions over an in-memory graph snapshot — no DB writes |
| `server/routing` | server | **Pure** graph construction from a DB snapshot; Dijkstra and A\*; path → legs | `graphology` (or a hand-rolled adjacency map) + pure functions, unit-tested against fixture graphs |
| `server/guidance` | server | **Pure** path → instructions: leg grouping by floor, floor-change detection, bearing classification | Pure functions; no DB, no I/O, no clock |
| `server/qr` | server | Mint opaque signed tokens (`SJCETNAV:v1:<nodeId>.<hmac8>`); verify; token→node map; retire codes | HMAC-SHA256 truncated to 8 hex chars, key from server env; `qr_tokens` table |
| `server/session` | server | `nav_sessions`, `scan_events`, `audit_log` | Append-only writes; usage analytics for the admin dashboard |
| `server/http` | server | Routing, auth middleware, role checks, error envelope, ETag/revision headers | Express routers under `/v1` and `/v1/admin` |
| `server/assets` | server | Serve floor-plan images and generated QR images | Static file serving (local disk in dev; object storage later) |
| `admin/catalog-admin` | admin | Manage buildings, floors, departments, faculty, classrooms | React + Vite forms backed by `/v1/admin/*` |
| `admin/graph-editor` | admin | **First-class component.** Bitmap floor-plan backdrop, vector node/edge overlay, grid snapping, calibration, edge creation, preview | Canvas (Konva/Fabric or SVG) over an `<img>` backdrop; pan/zoom; all writes via `/v1/admin/nodes|edges` |
| `admin/validation-panel` | admin | Surface server-side validation issues against the current draft | Reads `POST /v1/admin/graph/validate` output |
| `admin/qr-manager` | admin | Generate, preview, bulk-download and print QR codes per node; retire codes | Calls `/v1/admin/qr-tokens`; renders PNG/SVG returned by the server |
| `admin/analytics` | admin | Scan-event and session dashboards (usage monitoring requirement) | Reads `/v1/admin/analytics/*` |
| `mobile/scanner` | mobile | Camera capture via `mobile_scanner` (ML Kit); extract payload string; offline HMAC pre-check | Flutter plugin wrapper; rejects tampered payloads before any network call |
| `mobile/api-client` | mobile | Typed HTTP client for `/v1`; auth token storage; error handling | Dart HTTP client over hand-mirrored DTOs from `shared/` wire format |
| `mobile/search` | mobile | Destination search by room no., department, faculty, building, floor | Remote `GET /v1/destinations`; local SQLite index as fallback |
| `mobile/map-renderer` | mobile | Draw floor-plan raster + route polyline + markers; pan/zoom | `CustomPaint` + `CustomPainter` inside `InteractiveViewer` (`TransformationController`); image-pixel coordinate space |
| `mobile/guidance-ui` | mobile | Render the step list and the "next checkpoint" prompt | Consumes `RouteResponse.instructions` verbatim; no local re-derivation |
| `mobile/offline-cache` | mobile | Cache graph bundle + floor images; invalidate on `graph_revision` change | File/DB store keyed by revision; ETag-aware fetch |
| `mobile/offline-router` | mobile | Client-side pathfinding fallback in a dead zone | Dart port of the same Dijkstra/A\* + leg/bearing logic; **parity-tested** against the server |
| `shared/` | contract | Domain enums, DTOs, error codes, token format constants, validation schemas | Consumed by `server/` and `admin/`; mirrored into Dart via `contracts/` fixtures |

---

## Recommended Project Structure

```
deepak/
├── shared/                        # TS types shared by server + admin (NOT importable from Dart)
│   └── src/
│       ├── domain.ts              # NodeKind, EdgeKind, TurnType, FloorTransition, Role
│       ├── dto/
│       │   ├── graph.dto.ts       # GraphBundle, GraphNode, GraphEdge, FloorMeta
│       │   ├── route.dto.ts       # RouteRequest, RouteResponse, Leg, Instruction
│       │   ├── catalog.dto.ts     # Building, Floor, Classroom, Department, Faculty, Destination
│       │   └── admin.dto.ts       # Admin CRUD payloads, ValidationIssue, QrToken
│       ├── errors.ts              # ErrorCode enum + HTTP status map
│       └── constants.ts           # QR_PREFIX='SJCETNAV', QR_VERSION='v1', API_VERSION='v1'
│
├── contracts/                     # wire-format golden fixtures — the server↔mobile contract
│   ├── route.sample.json
│   ├── graph-bundle.sample.json
│   └── destinations.sample.json
│
├── server/                        # Node + Express + TypeScript
│   └── src/
│       ├── index.ts               # bootstrap: express app, middleware, routes, error envelope
│       ├── config.ts              # env: DATABASE_URL, JWT_SECRET, QR_SIGNING_KEY, PORT
│       ├── prisma/
│       │   ├── schema.prisma      # the 14 tables — the contract everything else depends on
│       │   └── seed.ts            # synthetic campus: buildings, floors, nodes, edges, QR tokens
│       ├── modules/
│       │   ├── auth/              # register/login, JWT issue+verify, requireRole('admin')
│       │   ├── catalog/           # buildings, floors, departments, faculty, classrooms
│       │   ├── graph/             # nodes/edges CRUD, calibration, publish (revision bump)
│       │   ├── validation/        # PURE topology validators over a graph snapshot
│       │   ├── routing/           # PURE: snapshot builder, dijkstra.ts, astar.ts, route-service.ts
│       │   ├── guidance/          # PURE: legs.ts, turns.ts, instructions.ts
│       │   ├── qr/                # token mint/verify, token→node resolution, retire
│       │   ├── session/           # nav_sessions, scan_events, audit_log
│       │   └── analytics/         # admin summary queries
│       ├── http/
│       │   ├── public.routes.ts   # /v1/*
│       │   ├── admin.routes.ts    # /v1/admin/*
│       │   └── errors.ts          # uniform error envelope {error:{code,message,details}}
│       └── assets/                # floor-plan images, QR images (static serving)
│
├── admin/                         # React + Vite + TypeScript
│   └── src/
│       ├── api/client.ts          # typed fetch wrapper, admin auth header
│       ├── pages/
│       │   ├── Catalog.tsx        # buildings/floors/departments/faculty/classrooms
│       │   ├── GraphEditor.tsx    # hosts the editor below
│       │   ├── QrManager.tsx
│       │   └── Analytics.tsx
│       ├── components/editor/
│       │   ├── FloorCanvas.tsx    # bitmap backdrop + vector overlay, pan/zoom
│       │   ├── NodeLayer.tsx      # node handles (kind-coloured), drag, snap
│       │   ├── EdgeLayer.tsx      # edge drawing, kind/accessible toggles
│       │   ├── CalibrationPanel.tsx  # meters_per_pixel from a reference line
│       │   └── ValidationPanel.tsx   # issues from /graph/validate
│       └── state/graphStore.ts    # local draft graph; commit to server on save
│
├── mobile/                        # Flutter / Dart
│   └── lib/
│       ├── main.dart
│       ├── core/
│       │   ├── api_client.dart
│       │   ├── models/            # Dart mirrors of shared/ DTOs (generated or hand-kept in sync)
│       │   └── result.dart
│       ├── features/
│       │   ├── auth/              # register/login screens
│       │   ├── scan/              # scanner_screen.dart + mobile_scanner wrapper
│       │   ├── search/            # destination search
│       │   ├── navigate/          # map screen + step list + checkpoint prompt
│       │   │   └── renderer/      # map_renderer.dart, painter.dart
│       │   └── offline/
│       │       ├── graph_cache.dart     # revision-keyed store
│       │       ├── offline_router.dart  # local dijkstra/astar
│       │       └── guidance_local.dart  # local leg/turn derivation
│       └── assets/floorplans/
│
├── seed/                          # synthetic campus source data (floor plan PNGs + node specs)
├── tools/                         # scripts: generate QR set, parity test harness
└── docs/
```

### Structure Rationale

- **`shared/` is a TS package consumed by `server/` and `admin/` only.** Flutter is Dart and cannot import a
  TypeScript package. The server↔mobile contract is therefore enforced by `contracts/` golden JSON fixtures
  plus a Dart mirror of the DTOs, not by a shared build artifact. Keeping `shared/` TS-only avoids a
  codegen toolchain that would dwarf the project; keeping `contracts/` explicit prevents silent drift.
- **`routing/` and `guidance/` are separated from `http/`.** The pathfinding and instruction code is the
  academic core of the project (it produces the Dijkstra-vs-A\* comparison table). Isolating it from Express
  makes it unit-testable without a server or a database and lets the Dart port mirror it file-for-file.
- **`graph/` (write side) and `routing/` (read side) are separate modules.** The admin writes graph rows;
  the router reads a snapshot. Nothing in `routing/` mutates graph state, so "the editor changed something"
  and "the router's view changed" are never entangled.
- **`validation/` is a module, not an editor feature.** Topology problems (orphan nodes, classrooms that
  cannot be reached, a stair on floor 1 with no partner on floor 2) must be enforceable on the server,
  otherwise a bad graph can be published and served to users. The editor renders the results; it does not
  compute them.
- **The graph editor is a top-level `components/editor/` group, not a page.** It is the largest and most
  intricate piece of the admin app and needs its own state, canvas abstraction and test surface.
- **`contracts/` sits outside all three apps.** It is the artifact both the server tests and the Flutter
  tests assert against, so a contract change breaks a test in one of them rather than silently.

---

## Architectural Patterns

### Pattern 1: One global graph with explicit vertical transitions

**What:** A single node/edge graph spans every floor of every building. A vertical transition is modelled as
an edge joining **two co-located node rows** — a `stair` node on floor *N* and a `stair` node on floor *N+1*
— with the edge itself carrying `kind='stair'`. Lift shafts are the same shape with `kind='lift'`. Node
coordinates stay floor-scoped (`nodes.x`, `nodes.y` are pixels in that floor's plan image), so the horizontal
geometry never has to encode the vertical dimension.

**When to use:** Always, for a campus of this size. The literature and every production vendor converge on
this: MIT's multi-building topological model represents "stair and elevator spaces … as source and
destination nodes" in one topological data model; Lorenz et al. propose "hierarchically structured graphs
with typed edges"; Ariadne (Aug 2026) warns that "a router that treats floors as stacked copies produces
routes that are technically connected and practically hostile."

**Trade-offs:**

| Aspect | One global graph (chosen) | Per-floor graphs + floor meta-graph |
|--------|---------------------------|-------------------------------------|
| Pathfinding | One implementation, one algorithm, one set of tests | Two-level: meta-graph over floors, then intra-floor; portal stitching |
| Cross-floor routes | Native — Dijkstra/A\* just traverses vertical edges | Requires explicit portal registry and stitching logic; portal mismatch = silent unreachable |
| A\* heuristic | Must be metric-aware and *floor-aware* (a plain Euclidean heuristic in 2-D is inadmissible across floors) | Heuristic is simple per floor, but the meta-graph needs its own |
| Client cache | Whole campus in one bundle (fine: campus-scale is ~10 buildings / ~50 floors / a few thousand nodes) | Per-floor bundles reduce payload, but a cross-floor route needs several |
| Editing isolation | A floor edit can break a vertical pair; the server must validate pairs | Naturally isolated |
| Validation surface | One validator over the whole graph | One per floor plus a cross-floor pair validator — more code, not less |
| Cost of a wrong model | Rework of routing + guidance + client cache | Rework of routing + stitching + client cache |

**Verdict:** Keep the single global graph. It is strictly less code for the same result at campus scale, and
it is what makes "shortest path across buildings and floors" a single pure function.

**Non-obvious consequences of this choice:**

1. **The A\* heuristic must be admissible across floors.** A Euclidean heuristic over 2-D pixel coordinates
   is *not* admissible when a route may drop a floor. Use `max(0, horizontalDistance) + floorPenalty` where
   `floorPenalty` is a conservative lower bound on any vertical traversal, or fall back to Dijkstra when the
   heuristic is not provably admissible. This is a concrete correctness item for the routing phase and it
   belongs in the Dijkstra-vs-A\* report.
2. **Vertical transitions need a cost model, not a distance.** A stair edge's cost is not its pixel distance;
   a lift edge's cost includes a wait penalty. `cost_m` alone cannot express "lift takes 40 s". Carry the
   edge `kind` and apply a kind-specific cost multiplier/penalty in the routing layer — Ariadne makes the
   same point: "lift wait time is a real, variable cost the router should model honestly rather than
   pretend away." A lift edge should also be flagged `accessible=true` and a stair edge `accessible=false`,
   with the lift *node* present on each floor it serves.
3. **Step-free routing is a mode, not a filter.** Ariadne: "The step-free route is often a genuinely
   different route (different corridors, different transitions, sometimes a different building wing), not the
   standard route with stairs removed." The `accessible` flag on edges is therefore a *filter applied during
   the search* (exclude non-accessible edges from the candidate set when `accessible=true` is requested),
   not a post-hoc re-run that expects the same answer.
4. **Every floor transition resets the user's mental map.** The first instruction after arriving on a new
   floor matters more than any other, and it should be phrased against what the user *sees* ("turn right at
   the corridor end") rather than an abstract bearing. This constrains the guidance module's output format.

**Example — the vertical pair:**

```ts
// Floor 1 and Floor 2 each own a node row for the same physical stair shaft.
const stairF1 = { id: 'n_a1', floorId: 'f_1', kind: 'stair', x: 812, y: 430 };
const stairF2 = { id: 'n_a2', floorId: 'f_2', kind: 'stair', x: 812, y: 430 };

// The edge that makes the campus one graph. cost_m is the vertical distance only;
// the horizontal run to the shaft is carried by the walk edges on each floor.
const vertical = {
  from: 'n_a1', to: 'n_a2',
  costM: 4.2,               // ~ floor-to-floor rise
  kind: 'stair',
  accessible: false,        // step-free routing must skip this edge
  bidirectional: true,      // you can go up or down
};
```

---

### Pattern 2: A pure routing + guidance core behind thin adapters

**What:** The heart of the system is a set of **pure functions** over plain data:

```
graphSnapshot + fromNodeId + toNodeId + options  →  path
path                                             →  legs
legs                                             →  instructions
```

No database access, no HTTP, no clock, no randomness inside these functions. Adapters around them do the
I/O: `routing/route-service.ts` loads a snapshot from Prisma and calls the pure functions; `http/public.routes.ts`
serialises the result.

**When to use:** Always here. The project's stated reason for server-side pathfinding is exactly this:
"pure functions are trivially unit-testable — which also produces the Dijkstra-vs-A\* comparison table for
the report."

**Trade-offs:** You give up the ability to stream a route across requests (irrelevant at campus scale) and you
must be disciplined about keeping the snapshot loader and the pure core separate. In exchange, the same
core is mirrored in Dart for offline mode and can be fuzz-tested.

**Example — the instruction contract the pure core produces:**

```ts
export type TurnType = 'left' | 'right' | 'straight' | 'uturn';

export type Instruction =
  | { kind: 'move';    floorId: string; toNodeId: string; distanceM: number;
                      bearingDeg: number; text: string }
  | { kind: 'turn';    atNodeId: string; turn: TurnType; bearingChangeDeg: number;
                      text: string }
  | { kind: 'transition'; viaNodeId: string; transition: 'stairs' | 'lift';
                      fromFloorId: string; toFloorId: string; direction: 'up' | 'down';
                      floors: number; text: string }
  | { kind: 'arrive';  nodeId: string; text: string };

export interface Leg {
  floorId: string;
  buildingId: string;
  nodeIds: string[];        // consecutive same-floor nodes
  distanceM: number;
  startBearingDeg: number;
  endBearingDeg: number;
}

export interface RouteResponse {
  algorithm: 'dijkstra' | 'astar';
  graphRevision: number;
  nodeIds: string[];
  edges: Array<{ from: string; to: string; costM: number; kind: string }>;
  legs: Leg[];
  instructions: Instruction[];
  distanceM: number;
  etaS: number;
  floorsVisited: string[];
  checkpoints: Array<{ nodeId: string; floorId: string; isQr: boolean; index: number }>;
}
```

**Bearing classification — use the established four-way convention.** ArcGIS's turn category evaluator
classifies every two-edge transition into exactly four types — Left Turn, Right Turn, Straight Ahead,
Reverse — using a *turn azimuth* range, with **30° and 150° as the default bounds** for left and right
(right clockwise, left counterclockwise); straight is a rotation below the minimum azimuth, and reverse is
either a U-turn or a rotation beyond the maximum azimuth. ArcGIS also notes that creating an explicit turn
feature for every turn is "often infeasible because of the quantity of turns", which is precisely why a
generalised azimuth classifier is the right approach for a hand-authored campus graph.

```ts
// Pure function. `incoming` is the bearing of the edge we arrived on,
// `outgoing` the bearing of the edge we leave on (0 = +x, clockwise degrees).
export function classifyTurn(incomingDeg: number, outgoingDeg: number): TurnType {
  const delta = normalizeSigned(outgoingDeg - incomingDeg); // (-180, 180]
  const abs = Math.abs(delta);
  if (abs < 30) return 'straight';
  if (abs >= 150) return 'uturn';
  return delta > 0 ? 'right' : 'left';
}
```

**Example — grouping the path into legs and detecting floor changes:**

```ts
export function buildLegs(path: GraphNode[]): Leg[] {
  const legs: Leg[] = [];
  let current: GraphNode[] = [];
  for (const node of path) {
    if (current.length && current[0].floorId !== node.floorId) {
      legs.push(summariseLeg(current));   // floor changed -> close the leg
      current = [];
    }
    current.push(node);
  }
  if (current.length) legs.push(summariseLeg(current));
  return legs;
}

// A floor change is a *transition*, not a turn: the two nodes either side of it
// live on different floors, so their pixel bearings are not comparable.
export function detectTransitions(path: GraphNode[]): Transition[] {
  const out: Transition[] = [];
  for (let i = 1; i < path.length; i++) {
    if (path[i].floorId !== path[i - 1].floorId) {
      out.push({
        viaNodeId: path[i].id,
        transition: path[i].kind === 'lift' ? 'lift' : 'stairs',
        fromFloorId: path[i - 1].floorId,
        toFloorId: path[i].floorId,
        direction: floorIndex(path[i].floorId) > floorIndex(path[i - 1].floorId) ? 'up' : 'down',
      });
    }
  }
  return out;
}
```

---

### Pattern 3: Opaque signed capability tokens with offline pre-verification

**What:** The QR payload is `SJCETNAV:v1:<nodeId>.<hmac8>` — an unguessable node id plus a truncated
HMAC-SHA256 over `v1:<nodeId>` using a server-held signing key. The server keeps the token→node mapping in
`qr_tokens`, so a code can be **retired without reprinting** (the row is deactivated; the node may also be
deleted from the graph; the printed code stops resolving).

**When to use:** Whenever a printed code grants a capability (here: "your location is here"). It prevents a
user from spoofing a location by editing the QR, and it decouples the physical artefact from the graph node
lifetime.

**Trade-offs / honest caveat:** The stated goal is that the scanner rejects tampered codes **offline, before
any network call**. That requires the client to hold a verification key. Two options:

| Option | How | Trade-off |
|--------|-----|-----------|
| A. Shared secret in the app binary (chosen) | Ship the HMAC key inside the Flutter app; client recomputes the HMAC over the node id and compares | The key is extractable from the app bundle. It raises the bar against casual tampering but is **not** a cryptographic guarantee against a determined attacker. The server remains the authority — an offline-accepted token still has to resolve server-side before a route is served |
| B. Server-only verification | Client sends the raw payload; server verifies | True security, but loses the "reject offline before any network call" property and makes dead zones worse |

Recommendation: **A**, plus a server-side re-verification on every resolve. Document it honestly in the
report as *tamper-evident, not tamper-proof*. The unguessable node id does the heavy lifting; the HMAC adds
integrity checking that works with no connectivity.

A retired token must fail on both paths: the client check rejects it if the key was rotated, and the
server check rejects it authoritatively via `qr_tokens.active = false`. Never let the client be the sole
authority on validity.

---

### Pattern 4: Publish/version the graph; treat the client cache as a revisioned artefact

**What:** The admin edits a *draft* graph. A **publish** action validates it and bumps a monotonically
increasing `graph_revision`. Every client-visible artefact — the graph bundle, floor-plan metadata, and the
route response — is stamped with that revision. The client stores its cached bundle under the revision it
fetched and drops it when the server advertises a newer one.

**Why:** It solves three problems at once:
1. **Cache invalidation** — the client knows when its offline copy is stale without a diff protocol.
2. **Route attribution** — every route records the revision it was computed against, so a wrong route can
   be traced to a specific graph state.
3. **Editor safety** — unpublished drafts never leak into the graph the router reads.

The publish workflow (draft → review → push to default) is exactly how ArcGIS Indoors Floor Plan Editor
models it: edits live in a working "plan" that is reviewed and then pushed to the "default plan" shared
across the organisation.

**Trade-offs:** Adds a draft/publish concept to every graph write. For a single-admin mini project this is
*over*-engineering if taken to the extreme — but a **single** `graph_revision` counter plus a
`GET /v1/graph/revision` probe is cheap and gives most of the benefit. Recommended middle ground:

- Node/edge edits write immediately (no separate draft table) but **do not** bump `graph_revision`.
- `POST /v1/admin/graph/publish` runs validation and, on success, bumps the revision.
- The router reads the live rows (so the admin sees their edits reflected in preview routes instantly) but
  stamps routes with the current revision.
- The client cache is invalidated by revision.

**Example — cache negotiation:**

```
GET /v1/graph
→ 200 OK
   ETag: "graph-rev-42"
   { "revision": 42, "floors": [...], "nodes": [...], "edges": [...] }
```

Client stores `{revision: 42, payload}` in its local store. On next launch it calls
`GET /v1/graph/revision` (cheap); if the server's revision ≠ 42 it re-fetches the bundle. If the network
is unavailable it keeps revision 42 and routes locally.

---

### Pattern 5: The graph editor writes the graph the router reads; it never re-implements routing

**What:** The editor has exactly one relationship with the routing engine: **the graph is the interface**.
The editor edits rows; the router reads rows. There is no editor-side pathfinding.

**How it should talk to the routing engine:** through the server, over two endpoints:

1. `POST /v1/admin/graph/preview-route` — body `{fromNodeId, toNodeId, accessible?}` → the *same*
   `RouteResponse` shape the mobile app receives. The editor renders it on the same canvas with the same
   overlay code the mobile app uses. This gives the admin a live "will this actually work?" preview, and
   guarantees that the preview and the production route are the same computation.
2. `POST /v1/admin/graph/validate` — body `{scope: 'draft'|'published'}` → `ValidationIssue[]`.

**Consequences for the editor's own logic:**

- **Edge cost is derived, not typed.** The admin should not type metres. The editor measures the edge's
  pixel length, multiplies by the floor's `meters_per_pixel`, and shows the derived `cost_m`. The admin may
  override it (stairs are not a straight-line distance), but the default is derived. This is what keeps the
  calibration decision (`floors.meters_per_pixel`) load-bearing instead of decorative.
- **Calibration precedes edge authoring.** A floor with no calibration must block edge creation, because
  every derived cost on that floor would be wrong. Set calibration by drawing a reference line of known
  length and entering its real length in metres — the same "corner-based control points" idea the Open
  Location Stack Floor Plan Editor uses to align a bitmap floor plan to vector geometry, but applied to
  scale rather than position.
- **Node kinds are a palette, not free text.** ArcGIS Indoors' Floor Plan Editor "Place" tool inserts
  *entryways, windows, floor transitions and furniture* from a palette. Our palette is
  `junction | door | stair | lift | entrance`. The kind drives renderer colour, the route instruction
  wording, and the editor's validation rules — it is a closed enum end-to-end.
- **Grid snapping.** ArcGIS exposes a "Grid" tool (spacing, rotation, placement) precisely because
  hand-placed freehand nodes produce an unusable graph. Provide a configurable snap grid (and optionally
  snap-to-existing-node) in the editor.
- **Validation must run before publish, and the editor must show the issues in place.** An orphan node, a
  classroom whose entrance node is unreachable, a stair node with no partner on the adjacent floor, or a
  floor with no calibration are all publish blockers. Showing them highlighted on the canvas is what makes
  the editor usable by a non-expert.

---

## Data Flow

### End-to-end user journey

```
USER                    MOBILE (Flutter)                 SERVER (Node/Express)            DB
 │                          │                                  │                          │
 │ 1. scan QR ─────────────►│                                  │                          │
 │                          │ offline HMAC check (key in app)  │                          │
 │                          │ ── reject if tampered ──► (never reaches network)          │
 │                          │                                  │                          │
 │ 2. resolve token         │                                  │                          │
 │                          │ POST /v1/qr/resolve {token,sessionId?}                      │
 │                          │─────────────────────────────────►│ verify HMAC + active       │
 │                          │                                  │──qr_tokens, nodes───────►│
 │                          │                                  │                          │
 │                          │◄── {node, floor, isExpectedCheckpoint, remainingRoute}──────│
 │                          │                                  │                          │
 │ 3. pick destination      │                                  │                          │
 │                          │ GET /v1/destinations?q=&buildingId=                        │
 │                          │─────────────────────────────────►│──classrooms/faculty───►│
 │                          │◄── Destination[] (label, building, floor, entranceNodeId)──│
 │                          │   (offline: local index)        │                          │
 │                          │                                  │                          │
 │ 4. compute route         │                                  │                          │
 │                          │ POST /v1/routes {from,to,accessible?}                       │
 │                          │─────────────────────────────────►│ routing: snapshot→Dijkstra │
 │                          │                                  │ guidance: path→legs→steps │
 │                          │◄── RouteResponse {legs, instructions, distanceM, etaS} ────│
 │                          │                                  │                          │
 │ 5. render                │                                  │                          │
 │                          │ GET /v1/floors/:id/plan (cached image) ───────────────────►│
 │                          │ CustomPaint: raster + polyline in image-pixel space        │
 │                          │ (offline: cached bundle + cached image, local router)       │
 │                          │                                  │                          │
 │ 6. advance checkpoint    │                                  │                          │
 │   (scan next QR) ───────►│ POST /v1/qr/resolve {token, sessionId}                    │
 │                          │─────────────────────────────────►│ recompute remaining path  │
 │                          │◄── {node, checkpointIndex, remainingRoute}────────────────│
 │                          │ trim path, redraw, next step     │                          │
 │                          │                                  │                          │
 │ 7. arrive                │ POST /v1/sessions/:id/events {type:'arrive', nodeId}        │
 │                          │─────────────────────────────────►│──nav_sessions, scan_events►│
 │                          │ "You have arrived at CS-402"    │                          │
```

**Key invariants in this flow:**

- **The mobile app never computes a route it did not receive** (except in offline mode, where it must
  reproduce the server's result — see the parity test below). Guidance text is never re-derived on the
  client; the client renders `instructions[]` verbatim. One source of truth for wording.
- **A scan is always a server round-trip** except for the offline tamper pre-check. The server decides
  whether the scanned node is the expected next checkpoint or a re-anchor.
- **Re-anchor and checkpoint-advance are the same call.** If the resolved node is on the remaining path, the
  server trims and returns the remaining route. If not (the user wandered, or scanned a different building),
  the server restarts the route from the new node to the same destination and returns a fresh full route.
  One endpoint, two behaviours, decided server-side — this keeps the client's state machine trivial.
- **The scan event and the route are consistent.** `scan_events` records the resolved node; the returned
  route is stamped with the graph revision it was computed against.

### Admin authoring flow

```
ADMIN (React/Vite)                      SERVER                       DB
 │                                       │                            │
 │ GET /v1/admin/floors/:id/plan         │                            │
 │──────────────────────────────────────►│──floors, nodes, edges──►│
 │◄── {imageUrl, widthPx, heightPx, metersPerPixel}──────────────────│
 │                                       │                            │
 │ local draft edits (nodes/edges)       │                            │
 │ PATCH /v1/admin/nodes/:id             │                            │
 │──────────────────────────────────────►│──upsert node───────────►│
 │                                       │                            │
 │ POST /v1/admin/graph/preview-route    │                            │
 │──────────────────────────────────────►│ routing+guidance (same core as mobile)
 │◄── RouteResponse (rendered on canvas) │                            │
 │                                       │                            │
 │ POST /v1/admin/graph/validate         │                            │
 │──────────────────────────────────────►│──pure validators───────►│
 │◄── ValidationIssue[] (shown in place) │                            │
 │                                       │                            │
 │ POST /v1/admin/graph/publish          │                            │
 │──────────────────────────────────────►│──bump graph_revision───►│
 │◄── {revision: 43}                     │                            │
 │                                       │                            │
 │ POST /v1/admin/qr-tokens {nodeIds[]}   │                            │
 │──────────────────────────────────────►│──mint tokens──────────►│
 │◄── {tokens[], pngUrls[]}              │                            │
```

### Offline fallback flow (dead zone)

```
Mobile detects no connectivity (or route request times out)
   │
   ├─► load cached GraphBundle (revision R) from local store
   ├─► load cached floor-plan image for the needed floors
   ├─► run local Dijkstra/A* over the cached graph      ← mobile/offline-router
   ├─► run local leg/turn derivation                    ← mobile/offline-local
   └─► render from cache; banner "Offline — using cached map (rev R)"
```

**Parity requirement:** the client router must produce the *same* path as the server for the same
`(graph, from, to)`. Implement a test harness (`tools/parity.ts`) that runs both implementations over a
set of fixture (graph, from, to) triples and asserts identical node sequences. This is the single most
valuable test in the project for the offline phase, because a divergence produces guidance that is subtly
wrong — the worst failure mode for a navigation app.

### State ownership

| State | Owner | Notes |
|-------|-------|-------|
| Campus graph (nodes, edges, floors, calibration) | `server/db` | Admin writes; router reads |
| `graph_revision` | `server/db` | Bumped on publish; stamped into every route and graph bundle |
| QR tokens | `server/db` | Server is authoritative; client holds only the signing key for pre-checks |
| Auth identity | `server/db` (`users`) + client token store | JWT issued by server |
| Navigation session state (`nav_sessions`, `scan_events`) | `server/db` | Append-only; analytics read them |
| Cached graph + floor images | `mobile/offline-cache` | Revision-keyed; invalidated on revision change |
| Current route, current leg, next checkpoint | `mobile` (in-memory) | Rebuilt from the server's `remainingRoute` after each scan |
| Draft editor state | `admin` (client-side store) | Committed to server per edit; not part of the published graph |

---

## Build Order Implications

### Component dependency graph

`A → B` reads as "A depends on B" (B must exist first).

```
shared/types  (TS contract)
    │
    ├──► server/prisma (schema + seed) ──► everything below that touches data
    │       │
    │       ├──► server/auth
    │       ├──► server/catalog ──────────────────────┐
    │       ├──► server/graph (nodes/edges CRUD)       │
    │       │       │                                   │
    │       │       ├──► server/validation (pure)      │
    │       │       │                                   │
    │       │       └──► admin/graph-editor ───────────┤
    │       │                                           │
    │       ├──► server/routing (pure) ◄───────────────┤   (reads the same graph rows)
    │       │       │
    │       │       └──► server/guidance (pure) ──► server/http/public.routes
    │       │                                          ▲
    │       └──► server/qr (mint/verify) ─────────────┤
    │                                                  │
    │       contracts/fixtures ──► server/http tests ──┤
    │                                                  │
    └──────────────────────────────────────────────────┤
                                                       ▼
                                            mobile/api-client + Dart DTO mirrors
                                                       │
              ┌────────────────────┬───────────────────┼──────────────────┐
              ▼                    ▼                   ▼                  ▼
        mobile/scanner      mobile/search       mobile/map-renderer  mobile/guidance-ui
                                                                    │
                                                                    ▼
                                              mobile/offline-cache ──► mobile/offline-router
```

### Stage-by-stage build order

| # | Stage | Depends on | Why it must be here |
|---|-------|-----------|---------------------|
| 0 | **Foundation** — monorepo skeleton, `shared/` types, Prisma schema for all 14 tables, seed of the synthetic campus, JWT auth + roles | — | The schema is the load-bearing artefact of the whole project. The editor's payloads, the router's snapshot, the mobile DTOs and the seed all read it. A schema change later rewrites all four surfaces at once. Settle it first, even for the tables (audit_log, faculty) that are not needed immediately. |
| 1 | **Catalog + floor plans** — CRUD for buildings/floors/departments/faculty/classrooms, floor-plan image upload, `meters_per_pixel` calibration, `GET /v1/destinations` | 0 | The destination directory and the floor-plan assets are inputs to both the editor and the renderer. Nothing can be routed to a classroom that does not exist yet, and no edge can be costed on an uncalibrated floor. |
| 2 | **Graph authoring (data + editor)** — nodes/edges CRUD, `admin/graph-editor` canvas (bitmap backdrop, node palette, edge drawing, grid snap, derived `cost_m`), validation endpoint, publish/revision bump | 1 | Requires calibrated floors (step 1) to derive costs. The editor is the long pole — it is the largest single component and the source of all graph truth. Start it early and let it run in parallel with step 3. |
| 3 | **Routing + guidance core (pure)** — snapshot builder, Dijkstra, A\*, leg grouping, turn classification, floor-transition detection, unit tests over fixture graphs | 0 (schema), 2 (real graph data — but **can be built against fixtures in parallel**) | Pure functions need no UI and no server. This is the academic core and produces the Dijkstra-vs-A\* comparison table. **This is the key parallelisation opportunity:** step 3 can proceed while the editor is still being built, because it only needs the schema shape and hand-written fixture graphs. |
| 4 | **Public API + QR + sessions** — `/v1` routes: `qr/resolve`, `destinations`, `routes`, `graph` bundle, `floors/:id/plan`, `sessions`; QR token minting/retirement; scan-event recording | 3 | The route endpoint is meaningless without the routing core. QR minting must exist before any end-to-end scan test. |
| 5 | **Mobile app (online)** — scanner, resolve, destination search, map renderer (raster + polyline), step list, checkpoint advance, arrive | 4 | The renderer consumes `RouteResponse`; the guidance UI consumes `instructions[]`. The route contract must be frozen before this starts, or the UI and the server will churn against each other. |
| 6 | **Offline mode** — revision-keyed graph + image cache, local router, local guidance, offline banner, parity harness | 5 | The client router must reproduce the server's output. Doing this **immediately after** the online client, while the route contract is still fresh, is far cheaper than retrofitting it later. The parity harness is the acceptance criterion, not "it seems to work". |
| 7 | **QR management + analytics** — bulk QR generation/print, retirement UI, scan/session analytics dashboard | 2, 4 | Depends on the editor (which nodes get codes) and on the session tables (which record usage). Lowest risk, lowest coupling — a natural tail for the milestone. |

### Dependency notes that are easy to get wrong

- **Calibration before edge authoring.** If the editor permits drawing edges before `meters_per_pixel` is set,
  every derived `cost_m` is wrong and must be recomputed after calibration. Make calibration a hard
  precondition for edge creation on that floor.
- **The routing core does not need the editor.** Steps 2 and 3 can run in parallel against fixture graphs.
  This is the largest available schedule saving and it should be planned for explicitly.
- **The mobile app does not need the editor either.** Steps 4→5 can proceed against the seeded synthetic
  campus while the editor is still being polished. The seeded graph is the contract between the two
  streams.
- **Offline mode must not be deferred to the end of the milestone.** It is the requirement most likely to be
  quietly dropped under deadline pressure, and it is the one that constrains the route response shape
  (the client must be able to reproduce it). Decide the contract in step 4; implement in step 6.
- **QR codes are downstream of the graph, not parallel to it.** A code names a node. Minting before the
  graph is stable means reprinting. The `qr_tokens` table exists precisely so codes *can* be retired
  without reprinting — use it.
- **Do not let `faculty`/`departments`/`audit_log` block stage 1.** They are in the schema (stage 0) but only
  need CRUD later; they are search filters and analytics surfaces, not navigation prerequisites.

---

## API Contracts

### Shared conventions

- **Versioning:** all paths under `/v1`. The version is in the path, not in a header, so it is visible in
  server logs and in the admin network panel.
- **Envelope:** success → the resource JSON directly (no wrapper). Error →
  `{ "error": { "code": "GRAPH_NOT_FOUND", "message": "…", "details": { … } } }` with the code from the
  shared `ErrorCode` enum. The mobile app branches on `code`, never on `message`.
- **Auth:** `Authorization: Bearer <jwt>`. `users.role` ∈ {`student`, `faculty`, `admin`}. All `/v1/admin/*`
  routes require `role === 'admin'` (the in-app Flutter admin surface uses the same routes — there is no
  second admin API).
- **Revision propagation:** every response that depends on the graph carries `graphRevision`, and the graph
  bundle sets `ETag: "graph-rev-<n>"`. The client uses the revision for cache invalidation and the server
  stamps it into `RouteResponse`.
- **Idempotency:** `POST /v1/qr/resolve` is idempotent for a given token within a session; a repeat scan of
  the same node returns the same remaining route and does not double-count the scan event.
- **Errors the client must handle explicitly:** `TOKEN_INVALID`, `TOKEN_RETIRED`, `NODE_UNKNOWN`,
  `NO_ROUTE`, `GRAPH_UNPUBLISHED`, `OFFLINE_STALE` (revision mismatch on a cached route).

### server ↔ mobile (public API)

| Method & path | Purpose | Request | Response |
|---------------|---------|---------|----------|
| `POST /v1/auth/register` | Create an account | `{email, password, name, role?}` | `{token, user}` |
| `POST /v1/auth/login` | Sign in | `{email, password}` | `{token, user}` |
| `GET /v1/buildings` | Building list for filters | — | `Building[]` |
| `GET /v1/floors?buildingId=` | Floors of a building (with plan metadata) | — | `Floor[]` |
| `GET /v1/floors/:floorId/plan` | Floor-plan image metadata | — | `{imageUrl, widthPx, heightPx, metersPerPixel, revision}` |
| `GET /v1/graph/revision` | Cheap cache-validity probe | — | `{revision}` |
| `GET /v1/graph` | Full graph bundle (the offline pack) | `?buildingIds=` optional | `{revision, floors[], nodes[], edges[]}` + `ETag` |
| `GET /v1/destinations` | Destination search | `?q=&buildingId=&floorId=&departmentId=&facultyId=` | `Destination[]` — `{id, type:'classroom', label, roomNo, buildingId, buildingName, floorId, floorName, departmentId, departmentName, facultyId?, entranceNodeId}` |
| `POST /v1/routes` | Compute a route | `{fromNodeId, toNodeId, accessible?: boolean, algorithm?: 'dijkstra'|'astar'}` | `RouteResponse` (see Pattern 2) |
| `POST /v1/qr/resolve` | Resolve a scanned token | `{token, sessionId?}` | `{node: {id, floorId, buildingId, kind, label}, floor: {id, name, ordinal}, isExpectedCheckpoint: boolean, checkpointIndex: number, remainingRoute?: RouteResponse, sessionId?: string}` |
| `POST /v1/sessions` | Start a navigation session | `{fromNodeId, destinationId}` | `{sessionId}` |
| `POST /v1/sessions/:id/events` | Record progress | `{type: 'scan'|'arrive'|'abandon', nodeId?}` | `{ok: true}` |
| `GET /v1/sessions/:id` | Session detail (for "resume navigation") | — | `{id, fromNodeId, destinationId, currentNodeId, status, createdAt, updatedAt}` |

**Why `/v1/routes` is a POST and not a GET:** the request body carries routing *options* (`accessible`,
`algorithm`) and will grow to carry user preferences. A POST body keeps the contract extensible without
breaking anything, and a route computation is not a safe/idempotent GET in the caching sense (the response
depends on the current graph revision). This is the same choice HERE and Mapbox made for their routing
endpoints.

**Why `remainingRoute` rides on the resolve response rather than being a separate call:** the checkpoint
advance and the re-anchor are the same server decision, and returning the new remaining route with the
resolve eliminates a round-trip and a class of client-state bugs. If the client and server ever disagree
about which node is next, the server's `remainingRoute` wins.

### server ↔ admin (admin API)

All under `/v1/admin`, all requiring `role === 'admin'`.

| Method & path | Purpose | Notes |
|---------------|---------|-------|
| `GET/POST/PATCH/DELETE /v1/admin/buildings` | Buildings | |
| `GET/POST/PATCH/DELETE /v1/admin/floors` | Floors | Includes `ordinal` (the vertical ordering used by floor-change detection) |
| `PUT /v1/admin/floors/:id/plan` | Upload floor-plan image (multipart) | Returns `{imageUrl, widthPx, heightPx}` |
| `PUT /v1/admin/floors/:id/calibration` | Set scale | `{metersPerPixel}` **or** `{referencePx, referenceM}` — the latter is what the editor's calibration tool measures from a drawn reference line |
| `GET/POST/PATCH/DELETE /v1/admin/departments` | Departments | |
| `GET/POST/PATCH/DELETE /v1/admin/faculty` | Faculty (with `departmentId`, optional `officeClassroomId`) | |
| `GET/POST/PATCH/DELETE /v1/admin/classrooms` | Classrooms | `entranceNodeId` points at a `door`/`entrance` node |
| `GET/POST/PATCH/DELETE /v1/admin/nodes` | Graph nodes | `{floorId, x, y, kind, label?}` — coordinates are in that floor's image pixel space |
| `GET/POST/PATCH/DELETE /v1/admin/edges` | Graph edges | `{from, to, kind, costM, accessible, bidirectional}` — `costM` may be omitted, in which case the server derives it from pixel distance × the floor's `meters_per_pixel` |
| `POST /v1/admin/graph/validate` | Topology validation | `{scope:'draft'}` → `ValidationIssue[]` |
| `POST /v1/admin/graph/preview-route` | Preview a route over the current graph | `{fromNodeId, toNodeId, accessible?}` → the **same** `RouteResponse` the mobile app gets |
| `POST /v1/admin/graph/publish` | Validate + bump revision | → `{revision}` |
| `POST /v1/admin/qr-tokens` | Mint tokens for nodes | `{nodeIds: string[]}` → `{tokens: [{nodeId, token, pngUrl, svgUrl}]}` |
| `GET /v1/admin/qr-tokens?nodeId=&active=` | List/inspect tokens | |
| `POST /v1/admin/qr-tokens/:id/retire` | Retire a code (no reprint needed) | → `{ok:true}` |
| `GET /v1/admin/audit-log` | Audit trail | Filter by entity/actor/time |
| `GET /v1/admin/analytics/summary` | Usage monitoring | `{scansTotal, sessionsTotal, topNodes, topDestinations, scansByDay}` |
| `GET /v1/admin/analytics/scans` | Paginated scan events | |

### The editor ↔ routing-engine contract (the important one)

The editor **must not** contain a second implementation of cost derivation, leg grouping or turn
classification. Two specific rules:

1. **Cost derivation lives on the server.** The editor measures pixel length and sends it; the server
   multiplies by `meters_per_pixel` and stores `cost_m`. If the editor computed it, the two would drift the
   moment the calibration changed, and every previously-authored edge would be silently wrong.
   *Exception:* vertical edges (stair/lift) always carry an explicit `costM`, because their real cost is not
   a straight-line distance.
2. **Preview routes come from the server.** `POST /v1/admin/graph/preview-route` returns the exact
   `RouteResponse` the mobile app will receive, so the admin sees the true user experience — including the
   instruction wording — before publishing.

### The server↔mobile contract, enforced

Because `shared/` cannot be imported by Dart, the contract is enforced by:

- `contracts/*.sample.json` — golden payloads committed to the repo.
- A server test that asserts each live endpoint's response matches the golden shape (shape-level, not
  value-level).
- A Flutter test that deserialises the golden payload into the Dart models and asserts no field is dropped.
- The `ErrorCode` enum is mirrored in Dart with a test asserting the two lists are identical.

A change to the route response that does not update `contracts/` breaks a test — which is the whole point.

---

## Scaling Considerations

The realistic ceiling for this project is one campus: ~10 buildings, ~50 floors, ~3–10k nodes, ~5–15k
edges, a few hundred concurrent students. Everything below is sized to that, deliberately.

| Concern | At demo scale (1 campus, <100 concurrent) | At campus scale (10 buildings, 1000 users) | Beyond that |
|---------|-----------------------------------------|--------------------------------------------|-------------|
| Graph loading | Load the snapshot per route request (a few thousand rows — sub-10 ms) | Cache the snapshot in memory on the server, invalidate on `graph_revision` change | Shard the graph per building; partition the route search |
| Route computation | Dijkstra/A\* on a few thousand nodes is instantaneous | Still instantaneous; consider `dijkstra.singleSource` precomputation per floor | Hierarchical / multi-level routing (Contraction Hierarchies) |
| Floor-plan image bandwidth | Serve from local disk | Serve from object storage with immutable hashed filenames + long cache headers | CDN |
| Database | Single MySQL instance, Prisma | Add a read replica for analytics queries (they should not touch the hot path) | Shard `scan_events` by month |
| Auth | JWT, stateless | Same | Move to short-lived access + refresh tokens |
| Client cache | Whole-campus bundle, revision-keyed | Same; consider per-building bundles if the payload grows | Delta updates instead of full re-fetch |

### Scaling priorities

1. **First bottleneck: repeated graph snapshot loading.** Every route request re-reads thousands of rows.
   Fix: an in-memory snapshot keyed by `graph_revision`, rebuilt on publish. Cheap, and it makes the
   revision concept load-bearing rather than decorative.
2. **Second bottleneck: floor-plan image transfer.** Images are large and are re-requested on every floor
   switch. Fix: immutable filenames (content hash) + long-lived `Cache-Control` + a revision-scoped local
   cache in the app. Already implied by the offline-cache design.
3. **Third bottleneck (only at scale): analytics queries over `scan_events`.** Fix: aggregate into a daily
   rollup table, or move analytics reads to a replica. Never let an admin dashboard query share the
   connection pool with route requests.

**Not worth optimising:** the QR verification (one HMAC), the destination search (indexed LIKE over a few
hundred classrooms), and the A\* vs Dijkstra difference (both are sub-millisecond at campus scale — the
report's comparison table is about *demonstrating* the difference, not about needing it).

---

## Anti-Patterns

### Anti-Pattern 1: The editor re-implements cost derivation

**What people do:** the admin canvas measures the edge length and multiplies by a calibration constant it
holds locally, then writes the resulting `cost_m`.

**Why it's wrong:** the calibration changes (a new floor plan is uploaded, the scale is corrected) and every
previously-authored edge is now wrong — but nothing recomputes it. The graph silently reports wrong
distances and wrong ETAs, and the report's numbers are wrong.

**Do this instead:** the editor sends the raw pixel geometry; the server derives `cost_m` from
`floors.meters_per_pixel` and owns the derivation. Vertical edges (stair/lift) carry an explicit `cost_m`
because their real cost is not a straight-line distance.

### Anti-Pattern 2: Two routers that disagree

**What people do:** implement Dijkstra in TypeScript on the server and, separately, in Dart on the client,
with no test that they agree.

**Why it's wrong:** the offline route silently diverges from the online route. Guidance points at a wall
the user does not face. The bug is invisible in demo conditions (usually online) and appears exactly when
it matters (dead zone).

**Do this instead:** mirror the algorithms file-for-file, and gate the offline phase on a **parity harness**
that runs both over the same fixture triples and asserts identical node sequences. Treat identical output as
the acceptance criterion, not "the demo looked right".

### Anti-Pattern 3: "Current floor" state on the server

**What people do:** the route request carries `currentFloorId`, and the router picks the floor graph and
then hops floors via a lookup table of stairs.

**Why it's wrong:** it re-introduces the two-level pathfinding that the single global graph was chosen to
avoid. It also produces "technically connected but practically hostile" routes, because the floor hop is
chosen by a lookup rather than by the cost of the transition.

**Do this instead:** the router receives a `fromNodeId` and a `toNodeId` and nothing else. Vertical edges are
ordinary edges with a kind and a cost. Floor context is derived from the path, never supplied as input.

### Anti-Pattern 4: Distances stored in pixels

**What people do:** store the pixel length of an edge and convert to metres at render time.

**Why it's wrong:** the ETA and the accessibility story collapse. A 400-pixel edge is 8 m or 40 m depending
on the floor's scale, so "distance" and "ETA" are fiction — exactly the failure the project's
`meters_per_pixel` decision exists to prevent.

**Do this instead:** `cost_m` is the stored, authoritative cost. `meters_per_pixel` is calibration metadata
on the floor, used to *derive* cost at authoring time and to render the scale bar.

### Anti-Pattern 5: Plaintext node ids in the QR payload

**What people do:** encode the node id (or the classroom id) directly in the QR.

**Why it's wrong:** anyone can print a code that says "you are here: the Principal's Office", which spoofs
the user's position — the one thing the whole localisation model rests on. It also couples the printed
artefact to the database row's lifetime.

**Do this instead:** `SJCETNAV:v1:<nodeId>.<hmac8>` with an unguessable node id, a truncated HMAC for offline
tamper checks, and a server-side token→node mapping so codes can be retired without reprinting.

### Anti-Pattern 6: The client derives its own instructions

**What people do:** the mobile app recomputes turns and floor transitions from the node sequence it received.

**Why it's wrong:** two wordings and two thresholds for the same route; the admin's preview and the user's
screen disagree; a wording change requires an app release — which defeats the stated reason for server-side
routing ("admin graph edits propagate live with no app release").

**Do this instead:** the server returns `instructions[]`; the client renders it. The only client-side
derivation is in offline mode, where it must reproduce the server's output exactly (see Anti-Pattern 2).

### Anti-Pattern 7: `shared/` types "shared" with Flutter

**What people do:** assume `shared/` is a single source of truth for all three apps, and hand-mirror the DTOs
into Dart without any mechanism to detect drift.

**Why it's wrong:** Dart cannot import TypeScript. The mirror drifts the first time someone adds a field
server-side, and the failure is a runtime `null` in the app, not a compile error.

**Do this instead:** `shared/` is authoritative for `server/` and `admin/`. `contracts/` golden JSON plus
Dart-side contract tests are the enforcement mechanism for `mobile/`. Make the drift impossible to ship by
gating on the contract test.

### Anti-Pattern 8: Publish without validation

**What people do:** the admin clicks "Save", the rows change, and the router immediately serves the new graph.

**Why it's wrong:** an orphan node, a classroom whose entrance node is unreachable, or a stair with no
partner on the adjacent floor becomes a user-facing failure. With server-side routing, one bad edit is
served to every user simultaneously, and the router may return `NO_ROUTE` for a classroom that worked
yesterday.

**Do this instead:** `POST /v1/admin/graph/validate` is a publish precondition; the editor renders the
issues on the canvas; publish is a separate, explicit action that bumps `graph_revision`.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| MySQL 8 | Prisma client, connection pooling | Dev via Docker; `DATABASE_URL` in env. `meters_per_pixel` as `DECIMAL(8,4)`; node `x`/`y` as `INT` |
| Local filesystem / object storage | Static serving of floor-plan images and QR PNG/SVG | Use content-hashed filenames so the URL is immutable and cacheable |
| HMAC secret | Server env (`QR_SIGNING_KEY`) | A separate key from `JWT_SECRET`. Rotating it invalidates printed codes — plan for that |
| JWT secret | Server env (`JWT_SECRET`) | Local JWT auth; no external identity provider (Firebase Auth is explicitly out of scope) |
| Camera (mobile) | `mobile_scanner` (ML Kit) | `qr_code_scanner` is deprecated — do not use |
| No external maps SDK | — | Google Maps SDK / commercial indoor mapping APIs are out of scope; the custom `CustomPainter` renderer is the deliberate choice |

### Internal Boundaries

| Boundary | Communication | Considerations |
|----------|---------------|---------------|
| `admin/` → `server/` | HTTPS/JSON, `/v1/admin/*`, JWT with `role=admin` | The admin panel is a *client* of the server; it holds no graph truth. Never let the browser compute costs |
| `server/` → `mobile/` | HTTPS/JSON, `/v1/*`, JWT (optional for read-only endpoints) | The route response shape is the contract; changes require a `contracts/` update and a Dart mirror update |
| `server/http` → `server/routing` → `server/guidance` | In-process function calls over plain data | The pure core must not import Express, Prisma, or `Date.now()`. That is what makes the Dart mirror and the unit tests possible |
| `server/routing` → `server/db` | One-way: the snapshot loader reads; the router never writes | No write path from the router to the graph |
| `server/validation` → `server/db` | Reads a candidate snapshot only | Validation must be runnable against a *draft* graph before publish |
| `mobile/` → `server/` | HTTPS/JSON + revision-aware caching | The mobile app never writes graph state; it only reads graph, resolves tokens and records sessions |
| `mobile/offline-router` → `mobile/offline-cache` | Reads the cached bundle | The offline router is a mirror of the server core, not a second algorithm |
| `admin/graph-editor` → `server/routing` | Indirectly, through the graph + `preview-route` | This is the intended design: the graph *is* the interface |

---

## Sources

**Domain architecture and component decomposition**
- Ariadne Maps — *Indoor Navigation Systems: How Indoor Wayfinding Actually Works* (Sep 25, 2025) — three-part decomposition: positioning / digital map graph / routing engine; wayfinding as the presentation layer. https://www.ariadne.inc/resources/blogs/indoor-navigation-digital-wayfinding-guide/ — **MEDIUM-HIGH** (cross-checked)
- Zapworks — *The Complete Guide to Indoor Navigation* — positioning, map, route guidance; the "navigation mesh"; the indoor-route factors list (multi-floor, doors, dead ends, walkable areas, accessibility). https://zap.works/guide-to-indoor-navigation/ — **MEDIUM** (cross-checked)
- Ariadne Maps — *Indoor Map Data Standards: IMDF, GeoJSON, and IndoorGML Explained* (Jul 2, 2026) — IndoorGML's dual representation: cellular space plus a first-class node-relation graph that the routing engine traverses. https://www.ariadne.inc/resources/blogs/indoor-map-data-standards/ — **MEDIUM**

**Multi-floor modelling**
- Ariadne Maps — *Multi-Floor Indoor Routing: Where Navigation Actually Gets Hard* (Aug 17, 2026) — vertical transitions are not interchangeable edges (capability, cost, direction, disorientation); stacked floors produce hostile routes; accessibility is a routing mode, not a filter; the orientation-reset problem. https://www.ariadne.inc/resources/blogs/multi-floor-indoor-routing/ — **HIGH** (cross-checked)
- Whiting, E.J. et al. (MIT RVSN), *Geometric, Topological & Semantic Analysis of Multi-Building* (2006) — stair and elevator spaces represented as source/destination nodes in one topological model. https://rvsn.csail.mit.edu/content/Pubs/master_whiting_2006june_bmgwriteup.pdf — **MEDIUM** (PDF not machine-readable; abstract/snippet only)
- Lorenz, B. et al. (LMU), *A Hybrid Spatial Model for Representing Indoor Environments* (2006) — hierarchically structured graphs with typed edges. https://www.pms.ifi.lmu.de/publikationen/PMS-FB/PMS-FB-2006-13/indoor.pdf — **MEDIUM** (snippet only)
- Stoffel, E.P. et al. (LMU), *Applying Hierarchical Graphs to Pedestrian Indoor Navigation* (2008). https://www.pms.ifi.lmu.de/publikationen/PMS-FB/PMS-FB-2008-6/PMS-FB-2008-6-paper.pdf — **MEDIUM** (snippet only)

**Graph editor / map authoring**
- Esri — *ArcGIS Indoors: Create and edit floor plans* — Draw/Place (entryways, windows, floor transitions), Grid snapping, Images bitmap overlay, Plan→default-plan publish workflow. https://doc.esri.com/en/arcgis-indoors/latest/floor-plan-editor/create-and-edit-floor-plans.html — **MEDIUM-HIGH**
- Open Location Stack — *Floor Plan Editor* — React + Vite + TS + IndexedDB + MapLibre; IMDF-oriented authoring; explicit routing-path editing; corner-based control points to align a bitmap floor plan with vector geometry; import/export + validation. https://openlocationstack.com/floor-plan-editor/ — **MEDIUM-HIGH**

**Routing / turn generation**
- Esri — *Turn category evaluator (ArcGIS Pro)* — two-edge transitions classified into Left / Right / Straight / Reverse via turn azimuth; default 30°–150° bounds; reverse = U-turn or beyond max azimuth; explicit per-turn features infeasible at scale. https://pro.arcgis.com/en/pro-app/3.5/help/analysis/networks/turn-category-evaluator.htm — **MEDIUM-HIGH**
- graphology official docs via Context7 (`/graphology/graphology`) — `dijkstra.bidirectional` / `astar.bidirectional` with custom weight getters and an optional heuristic; `#.export()` → `{attributes, nodes[], edges[]}` JSON for the client cache. — **MEDIUM**
- GIS StackExchange — *How to create turn-by-turn directions from a generic polyline route* — corroborating implementations. — **MEDIUM**

**Offline**
- Google Maps / HERE / Mapbox offline-region documentation — download-ahead venue packs, local routing against cached data, offline managers with predictive caching. — **MEDIUM** (vendor docs; indoor-specific offline literature is thin)

**Rendering**
- Flutter official docs via Context7 (`/flutter/website`) — `CustomPaint` + `CustomPainter` drawing raster and polyline in one canvas; `InteractiveViewer` + `TransformationController` for pan/zoom; `RenderBox.globalToLocal` to convert screen positions into image-pixel space. — **MEDIUM**

---

## Gaps and Open Questions

- **A\* heuristic admissibility across floors** is the highest-risk correctness item in the routing phase and
  was not settled by this research. Needs a decision in the routing phase: either a metric-aware heuristic
  with a conservative floor penalty, or A\* restricted to same-floor searches with Dijkstra handling
  cross-floor routes. Flag for deeper research at the routing phase.
- **Lift wait-time modelling** — the domain model has `cost_m` on edges but no field for a wait penalty or a
  capacity/state. Ariadne's "cost-honest" vertical transitions suggest a `vertical_penalty` or a
  time-based cost attribute. Decide whether v1 models lift wait at all (recommended: no — keep `cost_m` and
  apply a constant kind multiplier in the routing layer) or extends the edge schema.
- **Outdoor / inter-building edges** — the domain model has `entrance` nodes and buildings, but it is not
  stated whether campus walkways between buildings are modelled as `walk` edges between entrance nodes
  (which would let one global graph span the whole campus including outdoors) or whether cross-building
  routing is a separate concern. This materially changes the graph editor's scope. Needs a decision before
  the graph editor phase.
- **The in-app Flutter admin surface** is mentioned in `PROJECT.md` (quick phone-side edits) but has no
  defined boundary. The recommendation here is that it reuses the same `/v1/admin/*` endpoints with no
  separate API — but its scope (which entities are editable on the phone) is not decided.
- **No reference implementation was found** for an open-source indoor campus navigation server with a QR
  anchoring model of exactly this shape. The component decomposition is a consensus convention across
  vendors and academic work, not a template that can be copied. The specifics in this document are
  therefore design recommendations rather than sourced facts, and should be validated by building the
  fixture-based routing core first (stage 3).

---

*Architecture research for: QR-based indoor campus navigation (SJCET Palai)*
*Researched: 2026-10-22*
*Researcher: GSD project researcher (architecture dimension)*
