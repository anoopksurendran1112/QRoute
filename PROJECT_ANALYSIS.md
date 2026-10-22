# QR-Based Indoor Navigation System — Project Analysis

Source documents: `docs/synopsis.pdf` (9 pp, full synopsis) and `docs/QR code based app.pdf` (4 pp, abstract/intro report).
Plain-text extraction of both: `docs/extracted_text.txt`.

---

## 1. Document context

| Field | Value |
|---|---|
| Institution | St. Joseph's College of Engineering and Technology, Palai |
| Department | MCA (Computer Applications) |
| Project code | 24SJMCA245 — Mini Project |
| Student | Deepak Jose Thomas (SJC25MCA-2025, Roll 25, Batch 2025–2027) |
| Guide | Prof. Neethu Paulose, Assistant Professor, MCA |
| Title | QR Code Based Classroom Navigation System / "QR based navigation app" |
| Submission date on cover | 17 / 07 / 2026 (abstract cover says 08 / 07 / 2026) |

> **Note:** both cover dates are already in the past relative to today (22 Oct 2026). Confirm the real deadline before planning backward from it.

---

## 2. The idea in one paragraph

Printed QR codes are physically placed at decision points across a campus (building entrances, corridor junctions, stair landings, lift lobbies). A user scans one with their phone, which tells the app *"you are at node X"*. The user then picks a destination classroom, and the server computes the shortest walkable route through a floor-spanning graph and returns turn-by-turn instructions rendered on the building's floor map. Admins maintain buildings, floors, rooms, the walkable graph, and the QR codes from a separate admin panel.

---

## 3. The mental model (6 steps)

1. **Localize** — scan QR → resolve to a graph node.
2. **Select** — search for a room by number / department / faculty, or pick from a building list.
3. **Plan** — server runs shortest-path over the campus graph.
4. **Visualize** — client draws the route on the floor plan, highlights current + next checkpoint.
5. **Guide** — app shows the next instruction ("Turn left at Junction B", "Take stairs to Floor 2").
6. **Arrive** — scan the QR at the destination → confirmation + logging.

The key realization: **a QR code is just a named graph node.** Everything else (routing, mapping, guidance) is derived from the node graph, not from the QR itself.

---

## 4. Why QR is the right anchor

| Property | Consequence for the design |
|---|---|
| Zero cost, no battery | Anchor density limited only by printing effort — ~1 sticker per junction |
| No pairing, no cloud account | Works with any phone, any user, instantly |
| Opaque token can be signed | Spamming/forging a node is prevented by an unguessable + checksummed payload |
| Readable at an angle / in bad light | Placed at eye level at junctions, corridors, lift lobbies |
| Acts as a *checkpoint*, not a tracker | No battery drain, no background location permission, no privacy debate |

The last row is the honest framing: **this is checkpoint-based navigation, not continuous tracking.** See §6.1.

---

## 5. The eight modules → concrete deliverables

| # | Module | What actually has to exist |
|---|---|---|
| 1 | User Authentication | Register / login (email or student ID), bcrypt password hash, JWT access token, role claim (`user` / `admin`), profile screen, password change |
| 2 | QR Code Scanning | Camera permission flow, live scanner (ML Kit), token parse, server validation, error states (unknown / retired code), auto-advance navigation session |
| 3 | Classroom Search | Search API across room number, department, faculty, building, floor; result list with building/floor/department; availability status |
| 4 | Indoor Map | Fetch floor image + node/edge overlay; floor switching; pan/zoom; current node marker; destination highlight; route polyline |
| 5 | Path Finding | Weighted graph build, Dijkstra **and** A* implementations, multi-floor traversal via stairs/lifts, distance + ETA estimate |
| 6 | Navigation Guidance | Turn instruction generation from path geometry, step list UI, progress tracker, checkpoint progression, destination alert |
| 7 | Database Management | Schema + migrations + seed data for buildings, floors, nodes, edges, rooms, departments, faculty, QR tokens, users, sessions |
| 8 | Admin Module | Building/floor CRUD, map image upload, **graph editor**, room CRUD, QR generation + PNG/SVG export + print sheet, usage dashboard, audit log |

Modules 5 and 6 are the academic core and the part the viva/examiners will probe. Modules 2–4 and 8 are engineering bulk. Module 7 is invisible but everything depends on it.

---

## 6. Critical technical analysis

### 6.1 The "real-time" honesty problem

The synopsis promises *"updates navigation based on the user's movement"* and *"real-time visual navigation."* With QR-only localization, **the app's position is only known at the instant of a scan.** There is no continuous tracking.

Three viable models:

| Model | How | Effort | Verdict |
|---|---|---|---|
| **A. Checkpoint** (recommended core) | Guidance = "walk to the next QR, scan it to confirm progress." Route shown on map, next checkpoint highlighted. | Low | Honest, robust, no drift, works with no GPS/extra hardware. Natural completion signal at destination. |
| **B. Dead reckoning** (enhancement) | Between checkpoints: compass heading + accelerometer step count to estimate position *along* the current edge; live arrow rotates as you turn. | Medium–High | Makes it *feel* real-time. Drifts without correction; step counting in a building is noisy. Must re-anchor at each QR. |
| C. BLE beacons / UWB | Continuous absolute position | Very high + hardware cost | Out of scope for a mini project |

**Recommendation:** build A as the spine, then add B in a later phase as a clearly-labelled enhancement. Never claim continuous tracking the system cannot deliver — the report will be graded on honesty as well as function.

### 6.2 Where should pathfinding run?

**Server-side (TypeScript).** Reasons:
- Admin edits the graph → changes are live immediately, no app release needed (matches the "administrative module… without affecting user accessibility" requirement).
- Pure functions → trivially unit-testable with Vitest. Lets you produce the **Dijkstra vs A\*** comparison table for the report, with real numbers.
- Single source of truth; the client only renders.

**Mitigation for dead zones:** the client caches the building graph + floor images after first fetch and can pathfind locally as a fallback. Implementing the algorithm twice is wasteful — decide later whether the Dart port is a stretch goal. A cheaper hedge: the server returns the full path in one call, so a single round-trip at scan time is enough.

### 6.3 The map is a graph, not a picture

"Upload maps" in the synopsis is the crux. A raster floor plan alone **cannot be path-found on**. The admin panel therefore needs a **graph editor**:

1. Upload floor plan PNG (a *backdrop*, not the data).
2. Click to place nodes (junction / door / stair / lift / entrance).
3. Click node → node to connect an edge; drag to reposition; delete.
4. Grid snapping, zoom, pan.

This is the single largest UI build in the project. It is also the most impressive and most defensible piece — "we built a mini floor-plan editor" beats "we uploaded a JPEG". Budget it as its own phase, not as part of generic admin CRUD.

### 6.4 Scale calibration (meters, not pixels)

Edge cost must be real distance to produce a credible "distance / ETA". Store `meters_per_pixel` per floor, set by the admin via a **calibration tool**: admin drags a line over a known-length feature (a 10 m corridor, a standard classroom width) and the tool computes the scale factor. Without this, "shortest path" is just "fewest pixels" and the reported distance is fiction.

### 6.5 Technology triage

The synopsis lists everything plausible. It must be cut down or the project will not finish.

| Listed | Verdict | Reason |
|---|---|---|
| Flutter + Dart | **KEEP — core** | Synopsis names Flutter; one codebase → Android + (later) web; best-in-class camera + custom painting |
| Node.js + Express | **KEEP** | TypeScript end-to-end with the client, Prisma ORM, JWT ecosystem, trivial to test |
| MySQL | **KEEP** | Relational fits building → floor → room → node hierarchy perfectly. Use Prisma + MySQL (Docker for dev) |
| Dijkstra + A* | **KEEP — implement both** | The academic core; A* with Euclidean heuristic as the optimisation |
| ML Kit Barcode Scanning | **KEEP** (via `mobile_scanner`) | Currently maintained ML Kit wrapper for Flutter. `qr_code_scanner` is deprecated — do not use it |
| Firebase Firestore | **CUT** | External dependency, no offline story, weak fit for a hierarchical relational domain |
| Firebase Auth | **CUT** | Local JWT + bcrypt is simpler, fully demonstrable, no account setup friction |
| ZXing | **CUT (mobile side)** | Superseded by `mobile_scanner` (ML Kit). Keep ZXing-*style* only server-side if you need QR *generation* — use the `qrcode` npm package |
| Google Maps SDK | **CUT** | Wrong tool for indoor floor plans; needs API key + billing; cannot render a custom corridor graph. Replace with a custom map widget |
| Indoor Map APIs | **CUT** | Same reason |
| React Native (optional) | **CUT** | Unnecessary second frontend |
| HTML / CSS / JS web version | **REPLACE** with **React + Vite + TypeScript admin panel** | A web admin is far easier to build and demo than a Flutter admin screen, and it doubles as the map editor host |
| Android Studio, VS Code, Git, GitHub | **KEEP** | Tooling |

**Resulting stack**

```
mobile/    Flutter (Dart)          — scanner, search, map renderer, guidance UI
server/    Node + Express + TS     — REST API, JWT auth, pathfinding, QR generation
admin/     React + Vite + TS       — graph editor, map upload, QR generation, dashboard
db/        MySQL 8 via Prisma      — schema + migrations + seed
shared/    TS types package        — API contract shared between server & admin
```

### 6.6 QR payload format

Encode an **opaque signed token**, not a raw node id:

```
SJCETNAV:v1:<nodeId>.<hmac8>
```

- `nodeId` — internal id, opaque/unguessable (nanoid, not sequential)
- `hmac8` — truncated HMAC-SHA256 over the payload with a server secret
- Server verifies HMAC → rejects tampered codes → maps to node

Practical consequence: the scanner can read and validate the *format* offline, so an invalid code gives an instant "invalid QR" message instead of a round-trip error. The server still owns the token→node mapping table, so codes can be retired and reissued without reprinting.

### 6.7 Data model (proposed)

```
users(id, email, student_id, name, password_hash, role, department_id, created_at)
departments(id, code, name, building_id)
buildings(id, code, name, description)
floors(id, building_id, level, label, map_image_url, map_width, map_height, meters_per_pixel)
nodes(id, floor_id, code, x, y, kind, label)          -- kind: junction|door|stair|lift|entrance|checkpoint
edges(id, from_node_id, to_node_id, kind, cost_m, accessible, bidirectional)
                                                     -- kind: walk|stair|lift
classrooms(id, room_no, building_id, floor_id, entrance_node_id, department_id,
           faculty_id, capacity, kind, status)
faculty(id, name, department_id, room_id)
qr_tokens(id, token, node_id, label, active, issued_at, printed_at)
nav_sessions(id, user_id, start_node_id, dest_classroom_id, path_json, started_at, ended_at, completed)
scan_events(id, user_id, session_id, node_id, scanned_at)
audit_log(id, actor_id, action, entity, entity_id, payload_json, created_at)
```

`nodes.x / nodes.y` are pixel coordinates in the floor image's space; the client transforms them for rendering. `edges.cost_m` is authoritative for routing (not recomputed from pixels) — the admin sets it, or it is derived from pixels × `meters_per_pixel` at save time.

### 6.8 Pathfinding + turn instructions (the interesting algorithm work)

**Routing.** One global graph across all floors. Vertical edges connect the stair/lift node on floor *F* to its counterpart on floor *F+1*. Run A* (heuristic = Euclidean distance to goal in meters, admissible because vertical distance ≥ Euclidean distance) and Dijkstra (baseline). Compare node-expansion counts and wall-clock time → report table.

**Path → instructions.** The path is a node sequence. Convert to a step list:
1. Walk the sequence, grouping consecutive same-floor nodes into a *leg*.
2. When a leg ends because the floor changed → emit a transition instruction: *"Take the stairs to Floor 2"* / *"Take the lift to Floor 2"*.
3. Within a leg, compute the bearing of each edge; compare consecutive bearings to classify the turn: left / right / slight left / straight / slight right / u-turn / arrive.
4. Attach to each step: the target node, its human label, the leg's floor, and the remaining distance.

This turn-instruction generator is a **pure function over the path** — perfect for unit testing and for a strong report chapter.

**Path leg rendering.** The client receives `legs: [{floorId, nodeIds[], floorLevel}]` plus transitions, and draws each leg on the corresponding floor.

### 6.9 Things to build early because everything depends on them

1. **Seed data.** Without it there is nothing to demo. Target: 2–3 buildings × 3 floors each, ~30 rooms, a believable corridor graph, ~40 QR tokens, a demo admin account. Ship a `seed` script.
2. **The graph editor.** Without it, every map change is a SQL update.
3. **Pathfinding + instruction generator**, with tests.

### 6.10 Real campus data vs. synthetic

- **Synthetic** (recommended for the build): fully controllable, realistic, no dependency on obtaining floor plans, no privacy concerns about the real campus. Ship it as the demo dataset.
- **Real SJCET Palai floor plans**: higher demo impact, but you need actual images + someone to digitise the graph into nodes/edges — that digitisation *is* the graph editor's job, so it becomes a data-entry project. Treat it as an optional final phase, not a blocker.

---

## 7. Suggested phase breakdown (maps cleanly onto the GSD phase loop)

| Phase | Goal | Key output |
|---|---|---|
| 0 | Monorepo scaffold, tooling, Prisma schema, seed script | repo runs, `npm test` green, DB seeded |
| 1 | **Tracer slice**: auth + scan one QR + hardcoded node + shortest path + one turn instruction | end-to-end vertical slice (this is what `/gsd-mvp-phase` / `--mvp` produces) |
| 2 | Pathfinding core: full graph, Dijkstra vs A*, multi-floor, turn generator + tests | tested algorithm library + comparison report data |
| 3 | Indoor map module: renderer, floors, pan/zoom, route polyline, markers | usable map view |
| 4 | Classroom search + destination selection + availability | search complete |
| 5 | Navigation guidance UX: step list, checkpoint progression, arrival, session logging | the demo moment |
| 6 | Admin — **web panel**: CRUD + map upload + **graph editor** + QR generation/export + dashboard | admin can operate the campus |
| 7 | Admin — **in-app** (Flutter): quick edits for rooms/status, QR lookup, campus health summary | phone-side admin |
| 8 | Dead reckoning enhancement (compass + step count) | live arrow between checkpoints |
| 9 | Polish: offline cache, accessibility, error states, report artefacts, demo script | shippable |

Phases 0–5 are the **user-facing app**; 6–7 are the **admin**; 8 is the **wow factor**; 9 is **submission**.

---

## 8. Environment readiness

| Tool | Status |
|---|---|
| Node.js | v22.14.0 — GSD declares `node >=24`; the EBADENGINE warning is advisory and `gsd-tools.cjs` runs fine under 22. Upgrade only if a tool actually misbehaves |
| npm | present (`npm.cmd` works; PowerShell blocks `npm.ps1` by execution policy) |
| GSD Core | ✅ v1.18.0 installed globally for OpenCode — 72 commands, 64 agents, 72 skills, `plugins/gsd-core.js`, `gsd` MCP server |
| Docker | ✅ present |
| Git | ✅ present (repo initialised, branch `main`) |
| MySQL 8 | ✅ client present |
| Java | ✅ present (needed for Flutter Android) |
| VS Code | ✅ present |
| **Flutter SDK** | ⏳ installing — 3.47.7 stable, download in progress |
| **Dart SDK** | ⏳ bundled with Flutter |
| adb / Android SDK | ❌ not on PATH — needed to run the app on a device/emulator |

**Gaps to close before Phase 0:** finish the Flutter install and add it to PATH, then install the Android SDK + platform-tools. The admin side (React/Vite/MySQL/Docker) has no blockers.

---

## 9. Decisions taken

Resolved with the project owner on 22 Oct 2026.

| # | Question | **Decision** |
|---|---|---|
| 1 | Admin panel: web or in-app? | **Both.** Web (React + Vite) is the primary admin surface — it hosts the graph editor. A minimal in-app admin in Flutter covers quick edits from a phone. |
| 2 | Continuous guidance or checkpoint guidance? | **Checkpoint first, dead reckoning later.** Checkpoint guidance is the spine; the compass + step-count live arrow is a later, clearly-labelled enhancement. |
| 3 | Real campus floor plans or synthetic campus? | **Synthetic, seeded.** 2–3 buildings × 3 floors, ~30 rooms, ~40 QR tokens. Real SJCET data stays an optional final phase. |
| 4 | Pathfinding on server or client? | **Server**, with a client-side graph cache as the offline fallback. |
| 5 | Guest/visitor access without an account? | **Open** — default assumption: guests can scan and navigate anonymously; an account is needed only for favourites, history and admin. |
| 6 | Faculty / department management in admin? | **Open** — default assumption: yes, required by the faculty-search feature. |
| 7 | Actual submission deadline (cover dates have passed)? | **Open** — confirm with the guide. |
| 8 | Scope of "classroom availability"? | **Open** — default assumption: a status flag or timetable-derived status, not live occupancy. |

---

## 10. What the GSD plugin buys us

`@opengsd/gsd-core` is a spec-driven development framework with a first-class OpenCode plugin (`main: .opencode/plugins/gsd-core.js`). It drives a disciplined loop per phase — **discuss → plan → execute → verify → ship** — running heavy work in fresh-context subagents so the main session does not rot.

Fits this project exactly:

```
npx @opengsd/gsd-core@latest     # install; pick "OpenCode", project-local
/gsd-new-project --auto @PROJECT_ANALYSIS.md
/gsd-plan-phase 1
/gsd-execute-phase 1
/gsd-verify-work 1
/gsd-ship 1
```

Notes:
- Requires Node ≥ 24; local Node is 22.14.0 → likely needs a Node upgrade first.
- `/gsd-new-project` wants a `PROJECT.md` / PRD. `PROJECT_ANALYSIS.md` (this file) is a strong seed; the open questions in §9 are the natural input to `/gsd-discuss-phase`.
- `--mvp` produces a Walking Skeleton — appropriate for Phase 1's tracer slice.

---

## 11. One-paragraph summary

Build a Flutter app + Node/Express API + React admin panel over a MySQL campus graph. QR codes are signed tokens bound to graph nodes. Scanning localises the user; the server A*-routes across floors; the client renders the floor plan with the route and generates turn-by-turn instructions. The distinguishing build is the admin **graph editor** that turns an uploaded floor plan into a routable graph. The distinguishing risk is over-promising "real-time" tracking — scope it honestly as checkpoint navigation with an optional dead-reckoning arrow.
