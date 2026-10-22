# Pitfalls Research

**Domain:** Indoor campus navigation / QR-code checkpoint wayfinding (multi-floor, admin floor-plan graph editor)
**Project:** QR-Based Indoor Navigation System (SJCET Palai) — Flutter + Node/Express/TS + React/Vite + MySQL/Prisma
**Researched:** 2026-10-22
**Confidence:** MEDIUM — domain literature and vendor standards were cross-checked across multiple independent sources; nothing could be verified against a live codebase (greenfield). Claims about *this* codebase's behaviour are therefore prescriptive, not observed.

---

## Executive warning (read this before anything else)

Three failures in this project are **not recoverable by fixing code later** — they are recoverable only by having not made them:

1. **Claiming continuous localisation.** The system knows the user's position at scan instants and at no other time. Every word, screen, report sentence and viva answer that implies otherwise is a permanent liability, because the examiner can disprove it in one sentence ("where exactly are you between two QR codes?").
2. **Storing edge cost in pixels.** Once seeded, printed and demonstrated, every distance, ETA and "shortest path" in the product is fiction. It cannot be patched; the whole graph must be re-derived.
3. **Letting the graph editor publish a disconnected graph.** A disconnected graph is the single most damaging user-visible failure in indoor wayfinding — "no route found" between two places a person can plainly walk between. It looks like a broken app, and it looks broken in the demo.

Everything below is written to prevent exactly those three, plus the ~20 lesser ways this design fails.

---

## Critical Pitfalls

### Pitfall 1: The Over-Claim Trap — "Real-Time Navigation" the System Cannot Deliver

**What goes wrong:**
The synopsis promises *"real-time visual navigation"* and *"updates navigation based on the user's movement."* With QR-only localisation the position is known **only at scan instants**. The two honest failure modes are both fatal in an exam:

- *The demo lies.* The app shows a marker on the map and it does not move. The examiner asks "why isn't it tracking?" and the team has no answer that isn't "it isn't supposed to."
- *The report lies.* The written abstract says "real-time" while the limitations chapter (if it exists) says "checkpoint". An examiner reading both finds the discrepancy deliberately, and grades the discrepancy, not the code.

This is the single biggest reputational risk in the project, and it is *entirely avoidable at zero cost* — the capability is genuinely useful, it just has to be described accurately.

**Why it happens:**
The word "real-time" is inherited from the synopsis, and the software-design instinct is to make the demo *look* live. The cheap way to make it look live is to interpolate the marker along the route between scans — which is a fabricated position presented as a measurement. The industry precedent is the opposite: Google Maps' Navigation SDK shows *"Searching for GPS…"* after 10 seconds without a fix and **holds the chevron at the last known point** rather than interpolating. Indoor-positioning literature treats QR landmarking as a first-class proximity method, explicitly noting it *"provides snapshots of people's locations, meaning that QR code landmarking on its own is not capable of tracking people in real-time."*

**The honest framing (use this):**

> **Checkpoint navigation with a last-known-position model.** The app determines your position exactly when you scan a QR code, and *only* at that instant. Between checkpoints your position is unknown; the uncertainty grows with the distance you have walked from the last scan. The app therefore guides you *checkpoint to checkpoint*: it shows the route, identifies the next QR code to look for, and confirms your progress when you scan it. On the seeded campus, checkpoints are spaced ≤ 15 m apart, so the worst-case position uncertainty is ≤ 15 m and the typical uncertainty ≈ 7 m.

This framing is **stronger**, not weaker, than "real-time navigation" because it is quantified, falsifiable, and it names the mechanism. It also converts a weakness into a report chapter: you can *measure* checkpoint spacing, *report* the error bound, and *show* how the bound shrinks as you densify QR placement — which is a genuine engineering result that a "real-time" system cannot produce.

**What an examiner will probe, and the correct answers:**

| Probe | Correct answer |
|---|---|
| "Where is the user between two QR codes?" | Unknown. We model it as last-known-position with a bounded error equal to the checkpoint spacing. |
| "Why not use GPS indoors?" | Indoor GNSS is unusable: ~4 m RMS in small buildings, up to 60 m deep indoors, and in one 3-storey commercial walk test **more than half of all fixes placed the user outside the building**. |
| "Why not BLE/Wi-Fi beacons?" | Per-anchor hardware + power cost for an accuracy *worse* than our exact node identity; QR gives a categorical position ("Junction B, Floor 2") at zero battery cost. |
| "Is the distance real?" | Yes — edge costs are in metres, derived from a per-floor calibration validated against two independent known dimensions. (See Pitfall 2.) |
| "Does the QR prove the user is there?" | No. It proves the code was issued by us and has not been retired. It cannot prove a human is standing there. (See Pitfall 5.) |
| "What happens if the graph is wrong?" | A validator gates publication; unreachable classrooms are listed in the admin health panel and reportable from the app. (See Pitfall 3.) |

**How to avoid:**

1. **Write a capability statement before the first demo** — one page, in the repo (`docs/CAPABILITIES.md`), stating what is known, when, and to what accuracy. Repeat it in the README, in the app's About screen, and as the first paragraph of the report's Limitations section. All four must agree.
2. **Fix the vocabulary in the UI, not just the docs.** Rename "Your location" → **"Last scanned checkpoint"**. "Start navigation" → "Route from this checkpoint". "Live tracking" → "Checkpoint navigation". Show `≈ 45 m · ~1 min` (estimated), never a bare `45 m`.
3. **Never interpolate the marker.** Show three distinct things: the last scanned node (solid), the next checkpoint to look for (highlighted ring + name), and the route. Do not animate a marker along the path.
4. **Quantify the error bound and display it.** Compute the checkpoint-spacing distribution from the graph and surface it: *"Position is known at checkpoints spaced up to 15 m apart."* This converts the weakness into a measured property.
5. **Make dead reckoning a visibly labelled later phase.** When added, it must be presented as an *estimate between checkpoints with a stated drift error*, re-anchored at every QR — never as "real-time position". The README already says this; enforce it in the UI copy.
6. **Rehearse the answer.** The single sentence "our position is exact at scans and unknown between them" should be said confidently in the viva — it is the answer that marks the student as having thought about the problem.

**Warning signs:**
- The word "real-time", "live", "tracking" or "continuous" appears anywhere in the app, README, abstract or demo script.
- The map view animates a marker between checkpoints.
- The app shows a distance or ETA with no "estimated" qualifier.
- The abstract and the limitations chapter describe different systems.
- A slide says "GPS" anywhere.

**Phase to address:**
**Phase 1 (tracer slice)** — the capability statement, UI vocabulary and error-bound display must exist in the first demo, not at submission. **Phase 8 (dead reckoning)** is where the labelling rule applies. **Phase 9** is where the report framing is finalised.

**Phase ordering note:** If the framing is deferred to the report-writing phase, every earlier demo has already been filmed and shown. Settle it in Phase 1.

---

### Pitfall 2: Pixel Costs Masquerading as Metres (Uncalibrated Scale)

**What goes wrong:**
Edge cost is computed as a distance in **image pixels**. This is the default outcome of building a graph editor over a raster floor plan, because pixels are what you have immediately and metres require a physical reference, an admin action, and a unit convention nobody thinks about during a demo.

The consequences compound:

- **"Shortest path" degenerates to "fewest pixels."** If floor 1 is captured at 200 px/m and floor 2 at 100 px/m, a 20 m corridor on floor 2 costs *twice* as much as the same corridor on floor 1. The router will route around a physically shorter corridor to avoid a "cheaper" one. The route is optimal under a nonsense cost function.
- **Reported distance and ETA are fiction.** A door detected at "1200 units" is the classic symptom of running detection in pixels with scale never applied.
- **Per-floor scale drift.** Each floor plan exported at a different resolution silently gives each floor its own metres-per-pixel. Documented mitigation in professional indoor-mapping pipelines: compare ppm across levels and enforce a global calibration against a constant (e.g. a 1.5 m standard corridor width).
- **Resizing invalidates the calibration.** Halving the image width doubles m/px and halves every reported distance if the old factor is reused. If the admin re-uploads a floor plan at a different resolution, every edge cost on that floor silently becomes wrong.
- **Vertical edges are the worst case.** A stair node on floor 1 and its counterpart on floor 2 have x/y in **two different image coordinate spaces**. The pixel distance between them is meaningless — it is not "how far the stairs are", it is an artefact of two unrelated images. Any cost derived from it is garbage.
- **The scale placeholder hides the bug.** Seeded synthetic floors are naturally generated with 1 px = 1 m, so everything looks right in development and breaks the moment real floor plans arrive.

**Why it happens:**
Metres require a *physical act* (measuring a corridor) that a developer working on synthetic data never performs. The schema offers `x`, `y` (pixels) because those are what the editor produces; `cost_m` is optional because the shortest path works fine without it. And the display layer can always recompute a "distance" from rendered pixels, so nobody notices the server's number is missing.

**How to avoid:**

1. **Schema, from Phase 0 (non-negotiable):**
   ```
   floors.meters_per_pixel   DECIMAL(10,6) NOT NULL   -- per floor
   edges.cost_m              DECIMAL(8,2) NOT NULL   -- authoritative routing cost, metres
   ```
   Store node coordinates in **image pixel space** (as planned) but store **costs in metres**. `cost_m` is the only field the router reads.
2. **One derivation point, never two.** `cost_m` is derived **server-side at save time** as `euclidean_px × floors.meters_per_pixel` for same-floor walk edges. Do not let the client derive it, and do not let a second server path derive it. Both the indoor-mapping standard and CRITIR explicitly recommend scaling once, on the assembled geometry, "so a single metres-per-pixel factor governs the whole level and there is no chance of two segments ending up in different units."
3. **Vertical edges get a configured cost, never a pixel distance.** Stair/lift edge cost = a flat configured value per transition (e.g. 18 m equivalent for a 3 m flight plus landings), stored explicitly on the edge. Never compute it from x/y.
4. **Calibration tool (Phase 6) with a second-reference check.** The admin drags a line over a known-length reference (a dimensioned wall, a standard 1.5 m corridor width, a door leaf). The tool computes m/px, then **asks for a second, independent reference** and warns when the two disagree by more than ~2–5%. Industry practice (Floorbase) is exactly this: calibrate, then verify against a different dimension; skewed scans disagree between axes and must be re-scanned. CRITIR recommends 2–4 measurements with the **median** adopted and outliers flagged, so one misclicked endpoint cannot poison the whole floor.
5. **Refuse to publish an uncalibrated floor.** A floor with `meters_per_pixel IS NULL` must not accept edges, must not appear in search, and must be listed in the admin health panel. The indoor-mapping standard is explicit: if no reference is recoverable, *"the run should abort rather than emit pixel-space geometry"* because *"an invented scale corrupts every weight in the routing graph."*
6. **Refuse a floor whose implied scale is absurd.** After calibration, compute what a 1.5 m corridor would measure in pixels at the derived scale; if it is < 0.4 m or > 4 m, flag the calibration as wrong.
7. **Enforce cross-floor scale consistency within a building.** Allow ±5% between floors of the same building; beyond that, flag for review. Inconsistent per-floor scales break more than distances — they break the A\* heuristic's admissibility (see Pitfall 6).
8. **A regression test that actually catches this.** Seed one floor with `meters_per_pixel = 0.02` and another with `0.01`, and assert the router still prefers the physically shorter route. A test with a single uniform scale passes even when the implementation is in pixels — this is the single most valuable test in the whole project for this pitfall.
9. **Never compute distance from rendered pixels on the client.** The client renders the server's path; it does not re-derive length. (Also: the client must not compute a distance from the *displayed* size of the floor image, which varies by device.)

**Warning signs:**
- A floor-to-floor route whose total distance is shorter than the straight-line physical distance between the two buildings.
- Two floors of the same building reporting very different distances for the same corridor.
- `meters_per_pixel` still at a placeholder (1.0) weeks into the project.
- Reported distance changes when a floor plan is re-uploaded at a different resolution.
- ETA values that are implausible for the campus (e.g. "3 min" across two buildings).
- The admin UI has no calibration control at all.

**Phase to address:**
**Phase 0** — schema (`floors.meters_per_pixel`, `edges.cost_m` NOT NULL) and the divergent-scale seed fixture. **Phase 2** — cost derivation in metres + the calibration-aware router + the divergent-scale test. **Phase 6** — the calibration UI and the publish gate. Do **not** defer the schema to Phase 6; it is a data migration across every seeded row.

---

### Pitfall 3: The Graph Is the Product — and Digitisation Errors Are Invisible Until Someone Walks Them

**What goes wrong:**
The hard part of this project is not the scanner; it is the **floor plan → walkable graph** digitisation. A raster floor plan cannot be path-found on. Every error the admin editor makes in the graph becomes a routing bug, and — critically — **most of them are invisible in a screenshot**. The demo renders a plausible blue line. The user walks it and goes through a wall.

The specific, documented failure modes:

| Defect | User-visible symptom |
|---|---|
| **Disconnected graph** (2+ components) | "No route found" between two adjacent rooms. *The single most damaging user-visible failure in indoor wayfinding.* |
| **Orphan / floating node** (degree 0) | A QR code that scans to a dead end with no onward route |
| **Node off the corridor** (on a table, inside a wall, outside the building) | Route line visibly crosses a wall; turn instruction says "turn" at nothing |
| **Edge through a wall or a closed door** | Route line goes through solid wall |
| **Door node not attached to the room's entrance node** | Classroom unreachable even though its door is visibly on the corridor |
| **Duplicate edges** (double doors modelled twice) | Parallel edges, doubled cost ambiguity, nonsense turn instructions ("turn left, then turn right, then turn left") |
| **Stair not linked between floors** | Route exists on each floor but never crosses floors |
| **Lift linked to a floor it does not serve** | "Take the lift to Floor 3" — the lift stops at 1 and 2 |
| **Node too close to another** (< ~0.3 m) | Zero-length edge → division by zero in bearing computation; "turn left at 0 m" |
| **Node too far from its neighbour** (> ~15 m) | Coarse route, polyline cuts corners, distance under-reports (measured: 1.4 m under-report per corner at 1 m densification) |
| **Self-loop, zero or negative cost** | Infinite or nonsensical route expansion |
| **Node coordinates outside the image** (e.g. the default 0,0) | A phantom node pinned to the image corner |
| **Classroom with no `entrance_node_id`** | Classroom searchable but unroutable |

**Why it happens:**
Because the editor is a **drawing tool**, not a **modelling tool**. It feels finished the moment nodes and edges render. Nothing in the drawing surface tells you that the graph is in two pieces, that a classroom's door was never bound to the corridor, or that the lift's floor list came from a copy-paste. And the standard mistake — **the centroid graph** (one node per room, one edge per shared opening) — is *topologically correct*, so shortest-path works immediately, so it passes every smoke test, and yet the rendered polyline runs straight through walls. The indoor-mapping standard calls this out by name: *"The graph is correct; the drawing of it is wrong, and to a user those are the same thing."* A centroid graph also cannot express distance honestly (centroid-to-centroid across an L-shaped corridor badly understates the walk) and **cannot generate turn instructions at all**, because there are no junction nodes to hang "turn left" on.

**How to avoid — validation the editor MUST enforce at save time:**

Build the validator as a **pure function in the shared/server package during Phase 2** (not Phase 6), so both the router and the editor call the same code. The validator must:

1. **Exactly one connected component** across the whole published campus (or per building, with explicit inter-building links). Print the component sizes and the node ids of the smallest component — that list is the bug report. Refuse to publish. **A disconnected graph is a failure, not a warning**: *"Anything that logs and continues will eventually publish a building with a stranded wing."*
2. **Zero orphan nodes** (degree 0). Warn and list them; refuse on publish.
3. **Every classroom's `entrance_node_id` resolves**, and resolves to a node on that classroom's own floor.
4. **Every node belongs to exactly one floor; every edge's endpoints are on the same floor** unless `kind ∈ {stair, lift}`.
5. **Every stair/lift transition is complete**: a stair node on floor *F* has a linked counterpart on *F±1*; served levels are contiguous; a lift's served levels are declared on the transition, never inferred from which floors happen to have a node.
6. **No duplicate edges** between the same node pair (in either direction when bidirectional).
7. **No self-loops; no zero-length edges** (minimum ~0.3 m).
8. **All node coordinates inside the floor image bounds** (`0 ≤ x < map_width`, `0 ≤ y < map_height`).
9. **`cost_m > 0` on every edge**, recomputed from pixels × m/px for walk edges; explicit configured value for stair/lift.
10. **The floor has a validated `meters_per_pixel`** before any edge on it is accepted (see Pitfall 2).
11. **Warnings**: nodes < 0.3 m apart (likely a double-click), nodes > 15 m apart (needs an intermediate node), corridors with no junction node.
12. **Every published floor has a map image.**

**On "edges through walls" — be honest about the limit.** Detecting wall crossings requires wall geometry, which this project does not have. Do not pretend to detect it. Instead:
- Require the editor to place corridor nodes on the **centreline** (a snap-to-grid plus a visible corridor-centre guide overlay).
- Ship a **route preview in the editor**: draw the shortest path over the backdrop on demand, so the admin *sees* the line crossing a wall.
- Use the **door-node + spur** pattern rather than the centroid pattern: a node on the door opening, connected by a short (~0.6 m) perpendicular spur to the corridor node. This is the single cheapest structural fix for "the route leaves the room through the wall."
- State the limitation in the report: *"wall-crossing edges cannot be detected without wall geometry; they are prevented by the door/spur modelling convention plus visual route preview."* An examiner rewards a stated limitation far more than an unstated gap.

**Prevention strategy:**
- Write the validator **before** the editor, with **unit tests over deliberately broken fixtures**: a 2-component graph, a graph with an orphan, a graph with a missing stair link, a graph with an unbound classroom entrance, a graph with a duplicate edge. These fixtures are also the report's evidence that validation works.
- **Never publish without validation.** The validator runs *in the call path* of the save/publish endpoint, not beside it.
- **Admin "Campus Health" panel** showing: connected component count, orphan count, unreachable classrooms, uncalibrated floors, floors missing a map image, live QR tokens pointing at deleted/retired nodes, and the count of QR codes issued vs. placed.
- **Seed the demo campus with deliberate defects** (see "Seeded data must be non-trivial", below).

**Warning signs:**
- "No route found" between two rooms that are visibly adjacent.
- A route polyline visibly crossing a wall on the map render.
- A classroom that appears in search but produces no route.
- A floor that renders but has no nodes, or a node pinned at (0,0).
- An admin who says "I drew it and it looked fine."

**Phase to address:**
**Phase 2** — validator library + broken fixtures + graph model. **Phase 6** — editor calls the validator on every save; add the Campus Health panel and the route preview. **Phase 0/2** — seed the demo campus with realistic (defective) geometry.

---

### Pitfall 4: Broken Vertical Connectivity — the Multi-Floor Graph That Never Crosses Floors

**What goes wrong:**
The route works on one floor and stops dead at the stairs. The specific causes are all plausible-looking:

- **The stair is modelled as a name convention, not an edge.** Floor 1 has a node labelled `STAIR-A` and floor 2 has a node also labelled `STAIR-A`, but no edge joins them. The router sees two unrelated nodes.
- **The vertical edge is duplicated.** The admin draws the stair link while editing floor 1 *and* again while editing floor 2 → two parallel edges between the same pair → the cost is applied twice and the turn generator sees a spurious floor change.
- **Two competing data models.** Either a stair is (a) *one node with a `serves_floors` list*, or (b) *one node per floor joined by explicit edges*. Mixing them — one stair modelled as (a), another as (b) — produces a path representation the turn generator cannot parse. Pick one, in the schema, and validate that all transitions conform.
- **Floor identity is ambiguous.** `floors.level` (an int, per building) vs `floors.id` (a FK) vs a global floor number. If the admin enters level 2 for building B and level 2 means something else for building A, a stair link can join the wrong floors.
- **The lift serves a floor it does not stop at.** Lift nodes placed on every floor by copy-paste; the served-level list is inferred from geometry rather than declared.
- **The heuristic breaks on floors.** A Euclidean 2D heuristic across floors is not admissible — the straight-line distance between two floors' coordinates is not a lower bound on the walk, because vertical movement has cost that the 2D projection ignores. The documented fix: **the heuristic is 0 across floors**.

**Why it happens:**
Multi-floor graph editing is where the mental model breaks: the editor shows one floor at a time, so the vertical link is invisible while you author it, and there is no picture in the UI of "this stair connects these two floors" until you build it.

**How to avoid:**
1. **Model vertical transitions as explicit edges** between stair/lift nodes on different floors, with `kind ∈ {stair, lift}` and an explicit configured `cost_m`. Validate that every stair node on floor *F* has a counterpart on *F±1*.
2. **Declare served levels on the transition**, never infer them from which floors happen to contain a node. The indoor-mapping standard is explicit: *"Take served levels from the transition record, never from geometry."*
3. **Keep `floor_id` (FK) and `level` (int, per building) both**, and validate that `level` is unique within a building. Route on `floor_id`; display on `level` + building.
4. **Reject illegal cross-floor edges**: any edge whose endpoints are on different floors must have `kind ∈ {stair, lift}`. An accidental drag from floor 1 to floor 2 while editing floor 1 is otherwise silently created.
5. **Duplicate-edge rule applies with extra force to vertical edges** (see Pitfall 3, rule 6).
6. **Turn generator rule**: a floor change in the path is detected **only** across an edge of kind stair/lift. Never infer it from comparing floor ids of consecutive nodes.
7. **A dedicated "Vertical transitions" admin view** listing every stair/lift with its floors and its links, so a half-built staircase is visible before publish.

**Warning signs:**
- A route on one floor is fine; a route to another floor returns "no route".
- The turn generator says "Take the stairs to Floor 2" twice for the same staircase.
- The lift appears on a floor it does not serve.
- A cross-floor edge exists with `kind = 'walk'`.

**Phase to address:**
**Phase 2** — schema, vertical edge model, validation rules, A\* heuristic set to 0 across floors. **Phase 4/6** — the admin's vertical-transition view.

---

### Pitfall 5: QR Token Forgery, Replay, and the Orphaned Live Code

**What goes wrong:**
The QR payload is `SJCETNAV:v1:<nodeId>.<hmac8>`. Four distinct failures:

- **Client-side trust.** If the app reads `<nodeId>` out of the payload and uses it directly (even just to pre-fill a UI field), then anyone can hand-craft `SJCETNAV:v1:some-node-id.00000000` and the app believes the user is at a node of their choosing. The HMAC is then decorative.
- **Token leaks internal ids.** A payload containing the raw internal node id hands out schema information to anyone who scans a code, and makes the ids enumerable. The stated design goal — *"unguessable node ids plus a truncated HMAC"* — is undermined if the id itself is the guessable part.
- **Deleting a node orphans a live physical code.** The QR is printed and stuck on a wall. The admin deletes the node. The code is still there, still correct-looking, and now resolves to nothing. The user scans it and gets "unknown location" — and no amount of app debugging fixes it, because the failure is physical.
- **Rotating the HMAC secret in place invalidates every printed code on campus.** A single misconfigured secret rotation bricks every QR sticker in the building simultaneously.

**Why it happens:**
The HMAC and the *identity* of the node get conflated. The design already says the right thing — *"the server keeps the token→node mapping so codes can be retired without reprinting"* — but that only works if the payload carries an **opaque token id**, not a node id, and if the client sends the token to the server rather than resolving it locally.

**How to avoid:**

1. **Payload = opaque token id + HMAC, never a node id.**
   `SJCETNAV:v1:<tokenId>.<hmac8>` where `tokenId` is a nanoid (unguessable, opaque) and `hmac8` = first 8 hex chars of HMAC-SHA256 over `v1|tokenId|nodeId` with the server secret.
2. **The client never resolves the node.** It sends the whole token to the server; the server verifies the HMAC (over all active keys), looks up `qr_tokens`, and resolves `token → node`. The client's offline check is a **format** check only ("this looks like our code") — never an identity check. Do not pre-fill the location from the payload.
3. **Key ring, not a single secret.** Store `qr_signing_keys(id, secret, active_from, retire_at)`. Verification tries the current key and any key whose `retire_at` is in the future. Rotation = add a new key, retire the old one with a **90-day grace period**, then delete it. Document the rotation runbook *before* you ever need it. This directly mirrors QRAuth and PreArrive, both of which sign with HMAC-SHA256 truncated to 64 bits and keep the server secret off the client.
4. **Truncate deliberately, and don't lengthen the payload.** 64 bits of HMAC is far beyond what a rate-limited verification endpoint needs, and a longer payload makes the QR denser and therefore *harder to scan at print sizes*. QRAuth states the trade-off explicitly: *"a longer token would stretch the QR URL onto a denser module grid, shrinking each printed square below what a phone reads reliably at arm's length."* Keep the total payload under ~40 characters.
5. **Never hard-delete a node that has issued tokens.** Use a soft-delete (`deleted_at`) / deprecate flow: the node stops routing but its token row survives and the scan returns a specific error. Block deletion in the admin while `qr_tokens` rows are active for that node, and offer "retire the code" instead.
6. **Distinguish the failure modes in the API and the UI:**
   | Server response | UI message |
   |---|---|
   | `INVALID_SIGNATURE` | "This isn't a valid SJCET Nav code." |
   | `UNKNOWN_TOKEN` | "This code isn't recognised." |
   | `RETIRED_TOKEN` | "This code has been retired. Please scan a nearby code." (offer "report this") |
   | `NODE_UNAVAILABLE` | "This location is no longer active. Please scan a nearby code." |
   Collapsing these into one "invalid QR" message makes every physical failure look like a software bug.
7. **Document the threat model honestly.** Signing prevents *forged* codes pointing at nodes that were never issued. It **cannot** prevent a user photographing a code and scanning it elsewhere — the literature calls this "location faking" and the standard mitigation is a short validity period, which conflicts with "print once, keep forever". Choose: accept and document it, and never claim "prevents location spoofing". Say instead *"prevents forged or retired codes from being accepted"*.
8. **Give the user a report channel** for a code that is damaged, misprinted, or points somewhere wrong. Physical QR corruption is a documented, expected failure mode of printed signage, and the recommended mitigation in the indoor-positioning security literature is exactly this: let users report it through the app.

**Warning signs:**
- The app can show a location with the network switched off (that means it resolved the node locally).
- The payload contains an integer or a cuid that looks like a database id.
- Rotating the secret is a one-line env-var change.
- "Invalid QR" is the only error the app ever shows.
- A node deletion in the admin triggers a cascade that silently removes token rows.
- The QR payload exceeds ~45 characters.

**Phase to address:**
**Phase 0** — payload format and `qr_signing_keys` + `qr_tokens` schema, fixed before anything prints. **Phase 1** — scan + verify path with distinct error codes. **Phase 6** — admin token issue/retire/delete-guard flow and the rotation runbook.

---

### Pitfall 6: Non-Admissible Heuristic and Unit Mixing — "Shortest Path" That Isn't

**What goes wrong:**
The project will implement **both** Dijkstra and A\* (a deliberate choice, to produce the report's comparison table). That makes the correctness of A\* directly checkable — and directly checkable means it can be wrong in a way nobody notices, because a suboptimal route still *looks* like a route.

The failure modes:

- **Overestimating heuristic.** If `h(n)` ever exceeds the true remaining cost, A\* can terminate on a non-optimal path. The condition is `0 ≤ h(n) ≤ h*(n)` for all *n*, plus `h(goal) = 0`. A*'s optimality guarantee is *conditional on this*; the guarantee does not survive a heuristic change made for performance.
- **Unit mismatch between `g` and `h`.** `g` is accumulated in **metres** (from `cost_m`), but `h` is computed from node **pixel** coordinates. The heuristic is then in the wrong unit by a factor of ~1/m_per_px — which silently makes it either wildly inadmissible (if pixels > metres) or wildly over-conservative. Either way the report's "A\* expanded 12% fewer nodes" number is meaningless.
- **Cross-floor Euclidean.** The 2D straight-line distance between a node on floor 1 and the goal on floor 2 ignores vertical movement entirely, so it can *under*estimate, but it also ignores that the straight-line path may not exist at all. Standard practice for indoor multi-floor routing: the heuristic is **0 across floors** (i.e. fall back to Dijkstra-equivalent behaviour off-floor).
- **Directionality ignored.** The `bidirectional` flag on edges is ignored or inverted; a one-way escalator or a one-way corridor is traversed backwards.
- **`Infinity` weights break A\*.** Excluding an edge for accessibility by setting `cost = Infinity` makes the heuristic produce `NaN` on comparison; the documented mitigation is to fall back to Dijkstra whenever any edge weight is infinite.
- **Mutable shared graph state.** The adjacency map is built once at startup and mutated by a query, so one user's route affects the next user's route. Classic server-side bug; invisible in a single-user demo, catastrophic on the exam day if the server has been up for a while.
- **Unreachable endpoint returns a wrong-shaped error.** A `null` path or a generic 500 instead of a typed `NO_ROUTE` makes the client render an empty polyline — which reads as "the app is broken", not "these two points are not connected".

**Why it happens:**
The heuristic is the one part of a pathfinder that "looks right" without being testable by eye. And the units bug is invisible in a synthetic campus where 1 px = 1 m (then pixels and metres coincide!).

**How to avoid:**
1. **Dijkstra is the oracle.** Write Dijkstra first, then A\*. Then write the property test: **for N random (start, goal) pairs on the seeded graph, `dijkstraCost == astarCost`.** This is the cheapest possible regression test for a broken heuristic and it is also excellent report evidence.
2. **One cost type everywhere inside the algorithm.** `cost: number` in metres. Convert pixel coordinates to metres **once, at the boundary**, when building the graph from the database. Never inside the algorithm.
3. **Heuristic rule:**
   ```ts
   h(n) = (floorOf(n) === floorOf(goal))
        ? euclideanMetres(n, goal)   // metres, using the floor's validated m/px
        : 0;                          // across floors → Dijkstra-equivalent
   ```
   Plus `h(goal) === 0` by construction. Document why this is admissible in the report: any path must cover at least the straight-line in-plane distance on the goal's floor, and the vertical transition adds non-negative cost.
4. **Enforce per-building scale consistency** (Pitfall 2, rule 7). If floors of one building disagree on m/px beyond ±5%, the in-floor heuristic can become inadmissible even though each floor is internally consistent. The validator rejects this.
5. **Never `Infinity` an edge.** Model exclusion as *absent* edges in a filtered subgraph (a profile weight function returning "skip"), not as infinite weights.
6. **Typed routing results**, not exceptions or nulls:
   `OK | NO_ROUTE | NO_ACCESSIBLE_ROUTE | UNKNOWN_NODE | FLOOR_MISMATCH`. Each maps to a specific user-facing message.
7. **Immutable graph snapshot per request**, cached by a `topology_hash` that changes on every admin edit. Never mutate a shared graph.
8. **Edge direction is respected** — `bidirectional = false` means one traversal only, and the direction is explicit on the row.
9. **Turn generator: beware the y-axis flip.** Floor-plan image coordinates have **y increasing downward**. A naive `atan2(dy, dx)` in image space produces a **mirrored** bearing, so "left" and "right" come out **swapped**. Convert to a y-up frame (negate `dy`) before classifying the turn. This bug is invisible in a straight corridor and obvious on the first left turn — and it will be seen by every examiner who follows a route on the map.
10. **Suppress jitter turns.** Only emit "left/right" when the bearing change exceeds ~30–35°; otherwise "continue". A 3° wobble in the seed data should not produce "slight left" spam.
11. **Do not over-claim the speedup.** On a floor-plan-sized graph (a few hundred nodes) both Dijkstra and A\* are sub-millisecond; the honest report says *"A\* expanded X% fewer nodes; wall-clock difference is negligible at campus scale — the benefit is asymptotic"*. Claiming a dramatic speedup on a 300-node graph is the kind of over-claim that an examiner with a stopwatch can disprove.

**Warning signs:**
- Dijkstra and A\* disagree on cost for the same query.
- A\* is **never** faster than Dijkstra (the heuristic is probably always 0 or the graph too small to show it).
- The same request returns different paths on repeated calls (tie-breaking or shared mutable state).
- Turn instructions say "left" when the map shows a right turn.
- A route uses a one-way edge in the wrong direction.
- "No route" surfaces as a 500 or a blank polyline.

**Phase to address:**
**Phase 2** — the whole thing: cost model, Dijkstra, A\*, the property test, the turn generator, typed errors. This phase is the academic core; do not let it slip to Phase 8.

---

### Pitfall 7: Offline / Dead-Zone Failure — the App Dies in the Basement

**What goes wrong:**
Indoor dead zones are expected and documented as a constraint. But because pathfinding lives on the server, "no network" becomes "no navigation" — the user stands in a basement corridor with the app saying "Cannot reach server". The most damaging variant is not the error message; it is the app **having the data and refusing to use it**: the floor plan and graph are cached locally, but the client still pings the server before showing them. The offline-navigation literature is blunt about this: *"Static data that does not change between download and use — offline maps of areas already cached — must never be gated behind a live connection check."*

The subtler variant is **stale-graph routing**: the client's cached graph still contains an edge the admin deleted, so the user is routed into a corridor that has been closed. Documented as the most damaging cache-coherence failure in indoor wayfinding: *"A user is routed into a loop because the client's cached graph still believes a removed edge is traversable."* A second failure is **split-brain state**: the floor-plan image updated but the graph did not (or vice versa), so a "Routing Unavailable" fallback fires on a floor that is actually fully mapped.

**Why it happens:**
"Offline support" is usually added at the end, and is usually implemented as *route caching* rather than *graph caching*. Route caching only helps the user who is repeating a route they already took — which is exactly the user who is not lost.

**How to avoid:**
1. **Decide the offline model in Phase 2, not Phase 9.** Two defensible options:
   - **(a) Port the pathfinder to Dart** (~150 lines for the same pure algorithm). Gives genuine offline routing *and* a strong report chapter ("the same algorithm implemented twice, cross-validated against the server on 1,000 random queries"). Costs one extra implementation.
   - **(b) Ship a precomputed per-campus shortest-path artifact.** For ~300 nodes, an all-pairs matrix is ~90,000 entries — trivially cacheable as a static artifact, and it makes the server trivially fast too.
   - **(c) Route caching only** — cheapest, but weak. Acceptable **only** if the offline degradation is stated explicitly in the app ("offline: showing your last route") rather than implied.
   Whichever is chosen, record it as a Key Decision. Do not leave "client-side graph cache as the offline fallback" ambiguous in PROJECT.md — that phrase currently promises more than route caching delivers.
2. **Never gate static content on connectivity.** Search, map render, turn instructions and cached routes must all work in airplane mode. Only the scan→server resolution needs the network.
3. **Show the truth about staleness.** The offline-UX rules that production systems use: an offline indicator, a data-freshness tooltip, a confidence badge derived from last sync, and *"always show when data is stale and the estimated confidence of a route."* Google Maps' precedent for a stale fix is to **hold the marker at the last known point** and say so — never to interpolate.
4. **`topology_hash` per building/floor.** The client stores it; on reconnect it revalidates with a conditional request; on mismatch it replaces only the affected subgraph. This is what prevents the stale-route loop. It is cheap: a hash of the graph's node/edge set, recomputed on every admin save.
5. **Never tear down an in-progress route abruptly.** The documented degradation order is: latest validated graph → last-known-good client cache → a pre-baked egress graph → an explicit "Routing Unavailable" state. The client finishes guidance on its cached graph and reconciles afterwards.
6. **Degrade the scan, not the app.** If the network is down when a code is scanned, say *"You're offline — I'll use the cached campus map. Path may be out of date."* and continue with the cached graph. Do not throw the user out of navigation.

**Warning signs:**
- Any screen that shows a spinner before rendering an already-cached floor plan.
- The app crashes or blanks out when the network drops.
- The route drawn differs from the route the server returns for the same query.
- The app never tells the user it is offline.
- The cached graph has no version marker.

**Phase to address:**
**Phase 2** — the offline-model *decision*. **Phase 3** — cached floor plan + image rendering offline. **Phase 9** — offline graph + staleness UI + `topology_hash` revalidation.

---

### Pitfall 8: The Mobile Layer — Permissions, Torch, Light, Lifecycle

**What goes wrong:**
The scanner is the front door of the product and it has a documented set of ways to fail:

- **Infinite permission-prompt loop.** On Android, requesting the camera permission triggers a lifecycle change when the popup opens; denying it closes the popup and fires `didChangeAppLifecycleState` again. If that handler calls `start()` without checking permission state, the app re-prompts forever. This was a real upstream bug and the maintainer's guidance is explicit: do not call `start()` when the permission has been denied.
- **Stuck error screen after granting in Settings.** Only `controller.start()` updates `value.hasCameraPermission`, so a user who permanently denied, then granted in system Settings and returned to the app is left staring at the error builder. The fix is to consult `permission_handler` (`Permission.camera.status.isGranted`, `shouldShowRequestRationale`) in the lifecycle handler. On Android, `permission_handler`'s `status` never reports `permanentlyDenied` — you must call `request()` and branch on its result; `denied` + `shouldShowRequestRationale == false` means permanently denied.
- **Wrong package.** `qr_code_scanner` is deprecated and unmaintained; `mobile_scanner` (ML Kit) is the current line. Note the **v5→v7 API churn**: `onDetect` on the widget is gone (listen to `controller.barcodes`), `autoStart` is gone, `hasTorch` is gone (use `controller.value.torchState`), and `MobileScannerState.CameraFacing` gained `unknown` in v7. Code written from a v4-era blog post will not compile.
- **Torch assumptions.** `TorchState.unavailable` is a real state (no torch on the device). `toggleTorch()` had Android-14-specific bugs and torch-state desync issues. The torch is unavailable on web, and zoom is fixed at 1.0 on web.
- **Poor light / glare.** Indoor corridors are dim and often have specular overhead glare. A code that scans on a desk will not scan on a glossy wall under a downlight.
- **Double-firing.** The same code in view fires `onDetect` repeatedly, pushing several navigation screens. `detectionSpeed: noDuplicates` fixes the common case, but a `_handled` flag is still needed because frames keep arriving while the async navigation call is in flight.
- **Battery.** The camera is the largest battery consumer in the app. The controller holds the camera; it must be disposed with the scanner screen and stopped when the app backgrounds. Holding the camera open while the user reads the map is a straight waste.
- **Indoor GPS assumptions.** If anyone adds GPS "for outdoor campus navigation", note the measured degradation: indoor A-GPS is ~4 m RMS in small buildings and up to **60 m deep indoors**, and in a 3-storey commercial walk test **more than half of all fixes placed the user outside the building**. GPS must not be blended into indoor position — it is worse than the checkpoint.

**How to avoid:**
1. **Treat permission as a screen, not a dialog.** Show a one-line rationale ("Scan the QR code on the wall to find your route") before the OS prompt. Handle `permissionDenied` in `errorBuilder` with two distinct affordances: **"Grant permission"** (re-request) and **"Open settings"** (`openAppSettings`), decided by `shouldShowRequestRationale`.
2. **Lifecycle handler checks permission before `start()`.**
3. **Manual-entry fallback is mandatory.** Every code should be typeable by hand. Cameras break, lenses smudge, and some users never grant camera access. Also ship a "scan from gallery" path (`analyzeImage`) so a photographed code can be imported — useful for testing without printing.
4. **Restrict formats** to `[BarcodeFormat.qrCode]` (faster detection, fewer false positives) and set `detectionSpeed: noDuplicates` plus a `_handled` guard.
5. **Torch affordance with a graceful unavailable state**, plus a "hold steady / move closer" hint when detection is failing.
6. **Scanner lifecycle discipline:** dispose the controller with the screen; stop on background; start on resume *only if* permission is still granted.
7. **Test on physical devices only** — the iOS Simulator has no camera. Test matrix: dim light with and without torch, glare, a small code, a damaged code, permission denied then granted from Settings, backgrounding mid-scan, and an older cheap Android phone.
8. **Never claim GPS assistance.** If the app has any outdoor behaviour, keep it clearly separate and clearly labelled.

**Warning signs:**
- The app asks for camera permission more than once per session.
- The app is killed by the OS for battery use during navigation.
- A `TorchState.unavailable` value crashes a switch statement.
- The scanner keeps the camera on while the map is displayed.
- The demo relies on a code photographed from a screen (which is fine for testing, and must never be the only way it works).

**Phase to address:**
**Phase 1** — scanner, permission flow, error states, manual fallback. **Phase 5** — lifecycle discipline during guidance. **Phase 9** — device test matrix, torch/low-light polish.

---

### Pitfall 9: The Stack Traps (Flutter / Node / Prisma / React) That Will Cost a Week Each

These are not design risks — they are known, reproducible friction points in the fixed stack. They belong on the roadmap as explicit tasks, not as "things we will figure out".

**Flutter / Dart**
- `mobile_scanner` v5+ is a breaking rewrite: `onDetect`/`onStart`/`onPermissionSet` moved or removed, `autoStart` removed, `hasTorch` removed, `TorchState.unavailable` added, `controller.barcodes` is the stream. Write against the version you actually install, not a v4-era snippet.
- JWT storage: `flutter_secure_storage`, never `shared_preferences` / `NSUserDefaults`. Those are plaintext on disk and trivially readable from an unencrypted backup or a jailbroken device. `flutter_secure_storage` v10 defaults to RSA-OAEP + AES-GCM on Android and requires `minSdkVersion 23`.
- `flutter_secure_storage` requires `android:allowBackup="false"` (or a backup exclusion) in `AndroidManifest.xml`, otherwise restored devices throw `java.security.InvalidKeyException: Failed to unwrap key`. Use `KeychainAccessibility.first_unlock_this_device` on iOS so tokens do not migrate to a new device via backup.
- Secure storage is for **secrets only** (the JWT). The cached floor plan and graph belong in ordinary storage — secure storage is far too slow for per-frame reads and has size limits.
- `flutter_secure_storage` does not work on Flutter Web (noted here so it is not attempted later).

**Node / Express**
- CORS: the **port is part of the origin**, so `http://localhost:5173` → `http://localhost:8080` is cross-origin, and `localhost` vs `127.0.0.1` are *different origins*. `curl` and Postman ignore CORS, so **"it works in Postman" is a false negative** — always test in a browser. Fix with an explicit origin allowlist (`origin: ['http://localhost:5173']`, exact scheme+host+port, no trailing slash) or a Vite `server.proxy` for `/api`.
- With credentials, `Access-Control-Allow-Origin: *` is **rejected by the browser** — the API must echo the exact origin plus `Access-Control-Allow-Credentials: true`. This is the classic "works locally, broken on deploy" failure.
- Register `cors()` **before** routes and **before** error handlers whose responses also need the headers.
- **CORS is not access control.** Every mutating admin route needs its own server-side role check.

**Prisma + MySQL**
- **Do not use native Windows MySQL.** It lower-cases table names under the hood, which makes `prisma migrate dev` report spurious drift on the second consecutive run ("Your database schema is not in sync with your migration history"), and the Prisma maintainer's own advice is to develop against MySQL in **Docker or WSL**, because developing on Windows MySQL and deploying to Linux is buggy. Use the Docker Compose MySQL 8 that the project already has Docker for.
- **Seeding on Windows silently fails** — `prisma db seed` reports success but `prisma/seed.ts` never runs. The known workaround is the ts-node escape hatch with an explicit CommonJS module override (`ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts`) plus `isolatedModules: true` in tsconfig; a plain `.js` seed file also works. Do not lose a day to this.
- **Make the seed idempotent.** Seeding is only automatic on reset in Prisma v6 and earlier; in v7 it must be triggered explicitly (`npx prisma db seed`). Prisma's own issue tracker closed "always run seeds" with the rationale that seeds must therefore be **idempotent** — use `upsert` on stable natural keys (building code, floor level, room number), never `create`.
- **`migrate dev` can reset the dev database and lose data.** Use `migrate deploy` outside development. Never point `migrate dev` at a database you care about.
- **Migrations are provider-specific.** A MySQL migration history cannot be reused against SQLite/Postgres.
- **utf8mb4 everywhere** (server, database, table, column, connection) or 4-byte characters (emoji, some CJK) fail with `ERROR 1366`. Note MySQL's legacy `utf8` alias is only 3 bytes.
- **Indexed string length**: utf8mb4 costs 4 bytes/char, so `VARCHAR(255)` indexed = 1020 bytes; with a 4KB `innodb_page_size` the InnoDB limit is 768 bytes. Keep indexed strings ≤ 191 chars, or use Prisma's MySQL-only `length:` prefix argument.

**React + Vite (admin / graph editor)**
- **Re-render discipline is the whole game.** Documented benchmark: with an inline anonymous `onNodeClick` prop, dragging 100 nodes dropped from 60 FPS to **10 FPS** (and to 2 FPS with heavy nodes); wrapping custom node components in `React.memo` restored 50–60 FPS. A separate upstream issue profiling a ~50-node graph recorded **736 `EdgeWrapper` renders and 1472 `EdgeAnchor` renders per drag frame** because internal wrappers subscribe to the whole store.
- **Do not read the whole `nodes`/`edges` array inside node components.** Use granular selectors (`useNodesData` / `useNodeConnections`) or keep selection in a separate store slice.
- **Memoize everything on the `<ReactFlow>` boundary**: `useCallback` for handlers, `useMemo` for `nodeTypes`/`edgeTypes`/`defaultEdgeOptions`/`snapGrid`, and declare custom node components outside the render path.
- **Canvas beats SVG ~4–5×** for large graphs. For this project's expected ~150–300 nodes and ~200–400 edges, SVG is fine **if** the above rules are followed; canvas is only warranted if profiling shows it.
- **The floor-plan backdrop must not be re-rendered by React.** Render the image once into a cached bitmap / positioned layer and apply a single transform to both the image and the node/edge coordinates.
- **Single transform between image space and widget space.** If the client fits the floor image to the widget at a different size but draws nodes using raw image pixels, everything is offset. Define one transform and apply it to both.

**QR generation / printing**
- Export **SVG** (or 300 DPI raster at final size with a whole number of pixels per module) — a 72 DPI raster anti-aliases module edges into grey and fails to scan.
- **Quiet zone of exactly 4 modules** on all four sides (ISO/IEC 18004). It is part of the code, not a margin the layout may borrow.
- **Error correction: level Q (~25%) is the print default**; M for clean print; H only with a centre logo or heavy handling. Critically, **raising ECC does not rescue a weak design** — a controlled 48-pair test found L→H slightly *worse*, because the extra data makes the symbol denser and each module smaller and more fragile. ECC fixes damage covering *part* of a code; it is close to useless against whole-symbol blur/noise from poor light.
- **Dark modules on a light background only.** In the same test, OpenCV read 40/40 dark-on-light codes and **0/8** light-on-dark ones. ZXing tries both polarities; OpenCV does not. Never invert.
- **Size for the reading distance**: roughly 1 cm of code width per 10 cm of reading distance; minimum 2×2 cm printed; modules ≥ 0.4 mm on coated stock (≥ 0.5 mm uncoated); target contrast ~7:1 for print (ink spread and glare eat it). A 3 m read distance needs ~30 cm of code.
- **Proof at final size on the real stock, scanned with two different phones, in the light the code will live in.** Matte overlaminate; opaque backer on dark flooring; eye-level placement rather than floor decals (floor codes fail on foreshortening, abrasion, anti-slip texture and glare).
- **Do not put a logo in the centre of a level-M code** without going to level H, and re-check the module size after the logo shrinks the data area.

**Warning signs (stack):**
- `migrate dev` reports drift on a clean database → native Windows MySQL.
- `prisma db seed` says "seeded" but the tables are empty → the Windows seed-path bug.
- The admin panel works in Postman but the browser blocks the request → CORS.
- Dragging a node in the graph editor drops the frame rate → missing memoization.
- A printed QR scans on a desk but not on the wall → print spec, not code.

**Phase to address:**
**Phase 0** — Docker MySQL, idempotent seed, ts-node/`.js` seed wiring, `meters_per_pixel` schema, QR payload format, key-ring schema. **Phase 1** — mobile_scanner v7 API, permission flow, `flutter_secure_storage`, CORS allowlist, Vite proxy. **Phase 6** — graph-editor performance budget, QR print-sheet spec.

---

## Moderate Pitfalls

### Pitfall 10: Search Finds the Room but the Router Can't Reach It

**What goes wrong:**
The user types "Lab 3" and gets a result. They tap it and get "No route found." This is the same underlying defect as the disconnected graph (Pitfall 3), but it has a second, independent cause that survives a *connected* graph: **the search result is not bound to a routable node**.

- Classrooms exist as rows in `classrooms` with an `entrance_node_id` that is `NULL`, or points at a node that has since been deleted.
- The search index covers **rooms** but the router needs **nodes**, and nothing enforces the join.
- Aliases and legacy names ("Drawing Hall", "DH", "Survey Lab") are entered in free text that no one normalises, so the room is findable under one spelling and invisible under the one students actually use.
- Floor/block ambiguity: three rooms named "Seminar Hall" in three buildings, and the picker silently returns the first.

**Why it happens:**
Search and routing are built by different people (or the same person on different days) against different tables, and the seam between them is untested.

**How to avoid:**
1. **One search result type, one invariant**: every searchable destination must resolve to a node id, and the search endpoint returns `{label, nodeId, floorId, buildingId}` — never a room row without a node.
2. **Server-side `ROUTE_INELIGIBLE` state on the result**, not a post-tap failure: if a room has no entrance node, mark the result disabled with a reason ("not yet mapped") rather than letting the user tap into an error.
3. **Alias table, admin-editable**: `room_aliases(room_id, alias, normalised)`. Normalise case, whitespace, punctuation and common abbreviations at write time. This also solves the "students call it something else" problem without touching the room record.
4. **Disambiguate by building in the result row**, not after selection.
5. **Cover it with an E2E test**: seed a room with no entrance node and assert search shows it as disabled, not as a tappable dead end.

**Warning signs:**
- Any code path where a `classroom` is converted to a route request without a node lookup.
- Search results that render identically whether or not the destination is routable.
- An admin has to remember to "link the door" as a separate step with no reminder.

**Phase to address:**
**Phase 2** — the search→route contract and the eligibility rule. **Phase 6** — alias management in the admin. **Phase 7** — E2E coverage of the disabled-result state.

---

### Pitfall 11: Scope Creep Into "Real" Indoor Positioning

**What goes wrong:**
Somewhere around week six, someone says: *"We could add BLE beacons / Wi-Fi fingerprinting / AR arrows / step counting so it's actually real-time."* Each addition is individually plausible and collectively fatal to a fixed-deadline academic project, because:

- BLE needs hardware (beacons, batteries, mounting), a site survey, and a calibration pass — weeks, not days — and the achievable accuracy (~2–5 m with careful tuning) **does not beat** the exact categorical position a QR node gives you.
- Wi-Fi fingerprinting needs a survey walk per floor, is unstable when access points are re-configured, and performs badly in exactly the corridors where you demo it.
- AR turn arrows need continuous pose estimation, which needs continuous localisation, which is the thing you don't have.
- Step counting (PDR) drifts metres within 30–60 seconds and needs a heading source that a phone compass in a steel-framed building cannot provide reliably.

The result is that the *core* — a correct graph, a correct router, a working editor — is 60% done at submission, and the demo shows a half-built AR view and an unreliable beacon.

**Why it happens:**
Because the honest framing (Pitfall 1) feels like a limitation, and adding technology feels like removing the limitation. It isn't; it's changing which limitation you have, at the cost of the deadline.

**How to avoid:**
1. **Write the non-goals into PROJECT.md** — explicitly: no BLE, no Wi-Fi fingerprinting, no AR, no continuous tracking, no GPS indoors. A written non-goal is the only thing that survives a mid-project enthusiasm spike.
2. **Park ideas, don't kill them**: a `docs/FUTURE.md` with a one-paragraph design sketch for each (including why it is out of scope for the current deadline). This gives the enthusiastic teammate somewhere to put the energy.
3. **Gate any addition on the core being done**: the routing/validation test suite green, the editor publishing a validated campus, and the demo walk working end-to-end on a real device. This is a falsifiable gate, not a vibe.
4. **If you must add one thing, add dead reckoning *after* checkpoint navigation works** (already Phase 8), and label it as an estimate with a stated drift.

**Warning signs:**
- A dependency appears in `pubspec.yaml` that is not the scanner, secure storage, HTTP, or state management.
- The phrase "wouldn't it be cool if" in a standup.
- Graph work paused while a positioning experiment runs.

**Phase to address:**
**Phase 0** — non-goals written down. **Every phase gate** — enforce.

---

### Pitfall 12: The Admin Editor Has No Auth Model — and No Undo

**What goes wrong:**
Two distinct failures that both bite late:

- **Anyone can edit the campus.** The admin panel is protected by "it's on localhost" or a single shared password in the Flutter app. An examiner asks "who can change the map?" and the honest answer is "anyone with the URL". Worse, if the same JWT is used for student and admin roles, a student token can POST `/api/nodes`.
- **An edit destroys work with no recovery.** The admin drags a selection, hits delete, and 40 nodes vanish. There is no undo, no audit log, no revision. Because the graph is the product (Pitfall 3), this is losing the product.

A third, subtler failure: **concurrent editing**. Two admins (or two browser tabs) open the same floor; both save; the second save silently overwrites the first because both wrote the whole node/edge set.

**Why it happens:**
Auth is treated as a login screen rather than a **role check on every mutating route**, and the editor is treated as a canvas rather than a database client.

**How to avoid:**
1. **Roles in the token and enforced server-side**: `role ∈ {student, staff, admin}`. Every `/api/admin/*` route checks the role *in the handler*, not in the router middleware only. Reject with 403, not 401.
2. **Separate token audience for the admin panel** and a short expiry; never reuse the student token type.
3. **Audit log**: `graph_revisions(id, actor, building_id, floor_id, summary, topology_hash_before, topology_hash_after, payload_json, created_at)`. Every publish writes one row. This gives you undo (restore a revision), a demo-worthy "history" panel, and a defensible answer to "how do you know the map is correct?".
4. **Optimistic concurrency**: the client sends the `topology_hash` it loaded; the server rejects with `409 STALE_GRAPH` if it no longer matches. This is the same hash used for offline invalidation (Pitfall 7) — one mechanism, two payoffs.
5. **Soft delete for nodes** (already required by Pitfall 5) doubles as undo.
6. **Confirm destructive actions with the count** ("Delete 40 nodes and 62 edges?") and make the delete button not the default focus.

**Warning signs:**
- The admin API has no middleware listing, or a single `authMiddleware` applied to a whole router that also serves public reads.
- `localStorage` holds an admin token with no expiry.
- There is no table whose name contains `revision`, `audit` or `history`.
- Refreshing the editor loses unsaved work with no warning.

**Phase to address:**
**Phase 1** — auth foundation, roles, route guards. **Phase 6** — audit log, optimistic concurrency, undo. **Phase 9** — the audit/revision story belongs in the report's design chapter.

---

### Pitfall 13: The ETA Is a Made-Up Number

**What goes wrong:**
`distance / 1.4 m/s` produces a confident-looking "2 min" that is wrong in every way that matters: it ignores stairs (a floor change costs 20–40 s, not 2 s of horizontal distance), it ignores doors, crowds, and the fact that a user walks slower while reading a map, and it ignores that the user's *starting* point is one or two checkpoints stale. On a campus with a 15 m checkpoint spacing, the ETA can be off by more than the walk itself for short trips.

The failure mode that gets noticed: the app says "2 min" and the examiner walks it in 90 seconds, or in 6 minutes. Either way the number was fabricated.

**Why it happens:**
The distance is available, so dividing by a constant feels like arithmetic rather than modelling.

**How to avoid:**
1. **Model it explicitly, with named constants**: walking speed 1.2 m/s (slower than the 1.4 m/s textbook figure because people reading a map walk slowly), plus a fixed 25 s per floor transition, plus a 5 s door/lift-wait allowance. Put them in one config file, not scattered literals.
2. **Round aggressively and label**: "≈ 3 min". Never "2 min 47 s". False precision is the tell.
3. **Show distance and time as a pair with the caveat** — "≈ 180 m · ~3 min" — and let the About screen state the assumptions.
4. **Calibrate against reality once**: walk three seeded routes with a stopwatch, compare, adjust the speed constant, and report the comparison. That single table is worth more in the viva than the number itself.
5. **Never show an ETA when the route is `NO_ROUTE` or the graph is stale** — show the reason instead.

**Warning signs:**
- The constant `1.4` appears inline in more than one place.
- Stair edges have no time model distinct from their `cost_m`.
- The UI shows seconds.
- Nobody has timed a route.

**Phase to address:**
**Phase 2** — the cost/time model in the router output. **Phase 5** — display and labelling. **Phase 9** — the calibration table in the report.

---

### Pitfall 14: Accessibility Routing Claimed but Not Modelled

**What goes wrong:**
"We support wheelchair-accessible routes" is a sentence that is easy to write and hard to deliver. The failure is that the *claim* ships without the *model*: stairs are excluded by a flag, but the lift that supposedly replaces them is mis-linked (Pitfall 4), or the "accessible" route is longer by 300 m and the UI doesn't say so, or there is simply no accessible route and the app returns a generic "no route" instead of "no step-free route — nearest step-free entrance is at Block B".

For a campus navigation product this is not a nice-to-have: it is the feature most likely to be asked about by an examiner looking for social relevance, and the one most likely to be over-claimed in the synopsis.

**Why it happens:**
Accessibility is modelled as an *edge filter* rather than a *first-class route profile*, and the graph has no data to support it (no door widths, no ramp nodes, no lift-served lists that are trustworthy).

**How to avoid:**
1. **If you ship it, model it properly**: `edges.accessible BOOLEAN` and `edges.kind`; a route profile `step_free` that excludes `stair` edges and requires `lift` transitions with declared served levels. Validate that every published building has at least one step-free path between every pair of public destinations — or list the exceptions in the health panel.
2. **If you don't ship it, say so in the non-goals** and keep the UI free of the word "accessible". An unshipped feature is fine; a claimed-and-broken one is not.
3. **Distinguish `NO_ROUTE` from `NO_STEP_FREE_ROUTE`** in the typed result (Pitfall 6, rule 6) so the message can be specific and useful.
4. **Show the trade-off**: when the step-free route is materially longer, say "step-free route, ≈ 420 m (the stair route is ≈ 180 m)".
5. **Test it with a deliberately stair-only fixture** — a building where one floor is reachable only by stairs — and assert the step-free profile reports the specific failure.

**Warning signs:**
- The word "accessible" appears in the UI or report but not in the schema.
- The accessibility flag is a single boolean on a node rather than a property of transitions.
- There is no fixture where the step-free route is impossible.

**Phase to address:**
**Phase 2** — decide ship / don't ship, and if ship, the profile model. **Phase 6** — admin support for lift served-levels and accessible flags. **Phase 9** — the honest statement in the report either way.

---

### Pitfall 15: Seeded Data That Hides Every Bug

**What goes wrong:**
The seed campus is one building, three floors, straight corridors, one metre per pixel, and nodes placed on a perfect grid. Every pitfall in this document passes through it:

| Bug | Why the seed hides it |
|---|---|
| Pixel-vs-metre costs | 1 px = 1 m, so pixel distance *equals* metre distance |
| Non-admissible heuristic | Uniform scale per floor, so `h` in pixels happens to be `h` in metres |
| Cross-floor heuristic | Only two floors, both with the same layout, and the goal is usually on the same floor |
| Per-floor scale drift | Every floor generated with the same factor |
| L-shaped corridor under-measurement | Corridors are straight |
| Disconnected graph | The generator always produces one component |
| Turn instructions | Corridors are axis-aligned; a mirrored bearing still produces the right word on a right-angle grid |
| Search ambiguity | One room per name |
| U-turn / jitter suppression | No wobble in the geometry |
| Calibration | `meters_per_pixel` is 1.0 and looks fine |

The seed is not a convenience; it is the **test fixture for the entire product**, and a trivial seed means the product is untested against the only conditions it will actually run in.

**Why it happens:**
Synthetic data is generated by the same person who writes the router, on the assumption that "we'll swap in real floor plans later". Later never comes, or comes in week 10 when the cost of finding a pixel/unit bug is a rewrite.

**How to avoid — the seed is a deliverable:**
1. **Two campuses, both seeded:**
   - `demo` — realistic SJCET geometry: ≥ 3 buildings, ≥ 4 floors in the main block, at least one L-shaped corridor, at least one dead-end wing, three rooms sharing a name across buildings, one step-free-only route, one floor plan at a different DPI.
   - `fixtures` — deliberately broken graphs for the validator tests (2 components, orphan, missing stair link, unbound entrance, duplicate edge, zero-length edge, node outside bounds).
2. **Non-unit scales, on purpose**: floor 1 at `0.02`, floor 2 at `0.011`, floor 3 at `0.035`. If the router ever silently uses pixels, the demo route visibly breaks.
3. **Asymmetric geometry**: at least one corridor where the shortest path is *not* the straight line, and at least one pair of rooms where a plausible-but-wrong graph gives a visibly wrong answer.
4. **Realistic names**, including the messy ones (Malayalam-script room names, abbreviations, a room numbered "G-01" next to a "0-01") — these surface encoding and search bugs early.
5. **A written seed-state check**: a `npm run seed:verify` script that asserts the invariants (one component per building, every classroom has an entrance node, every floor calibrated, N nodes / M edges reported). Run it in CI and in the demo prep.
6. **Never let the seed be the only data path.** The editor must be able to produce the same graph from scratch; otherwise the seed is the product and the editor is decoration.

**Warning signs:**
- Every floor in the seed has the same node count.
- `meters_per_pixel` is 1.0 anywhere.
- No seeded building has more than one floor.
- A bug is found in the demo, and the fix is "the seed was wrong".
- The seed script creates rows with `create` rather than `upsert` (also a Prisma idempotency bug, Pitfall 9).

**Phase to address:**
**Phase 0** — the `demo` and `fixtures` seed sets and `seed:verify`. **Phase 2** — the fixtures used by the validator and router tests. **Phase 6** — the demo campus authored through the editor at least once, proving the editor can produce it.

---

### Pitfall 16: "It Works in the Demo" Is the Only Test

**What goes wrong:**
There are no automated tests around the three things that can fail catastrophically — the validator, the router, and the token verification — because those are "hard to test" and the demo is the acceptance criterion. The consequence is a project that cannot be changed safely in the last three weeks: every fix is a gamble, the graph editor is avoided near the deadline, and the final week is spent re-verifying by hand.

Academic projects lose marks here twice: once for the missing evidence of engineering rigour, and once because the demo breaks on a change made at 2 a.m.

**Why it happens:**
Testing a pathfinder feels redundant ("it returns a path, looks right"), and testing UI is slow. So the effort goes to features.

**How to avoid — five tests that cover 80% of the risk:**
1. **Dijkstra ⇄ A\* equivalence** over 500 random pairs on each seeded building (Pitfall 6). One test, catches heuristic and unit bugs.
2. **Validator fixtures**: one test per defect class, asserting the specific rejection code (Pitfall 3).
3. **Divergent-scale routing**: the two-floor test with `0.02` vs `0.01` (Pitfall 2).
4. **Token verification matrix**: valid, wrong HMAC, unknown token, retired token, retired key within grace, key past retire date (Pitfall 5). Pure function, no DB needed if the resolver takes injected rows.
5. **Search→route E2E**: one happy path and one disabled-destination path (Pitfall 10).

Add a **CI workflow that runs them on every push** — even a single-job GitHub Action. "We have CI" is a sentence that lands well in a viva, and it costs an hour.

**Warning signs:**
- `npm test` fails or does not exist.
- Tests exist but test only the health endpoint.
- The answer to "how do you know the router is correct?" is "we tried a few routes".
- A change to the graph model requires manual re-verification of the demo.

**Phase to address:**
**Phase 2** — tests 1–4 alongside the code they cover (not after). **Phase 7** — E2E and CI. **Phase 9** — report the test results as evidence.

---

### Pitfall 17: Demo-Day Physics — Printing, Mounting, Wi-Fi, Devices

**What goes wrong:**
The software works; the demo fails anyway, because the demo runs in the physical world:

- **Codes are printed too small or on the wrong stock** (Pitfall 9's print spec) and only scan under the office light.
- **Codes are mounted at floor level or on a glass door**, where foreshortening and reflection defeat them.
- **Campus Wi-Fi requires a captive-portal login** or blocks the LAN IP the API runs on, so the phone cannot reach the server during the walk.
- **The demo laptop sleeps / the API dies / the MySQL container stops** mid-walk.
- **The phone is a device the code has never run on**, and the camera permission flow is being exercised for the first time in front of the examiner.
- **Codes are taped up on the morning of the demo** and one is already peeling, or placed on the wrong side of a door.
- **The route crosses a locked door** or a corridor that is closed for an event, and the app confidently routes through it.

**Why it happens:**
Physical deployment is treated as a printing chore rather than a rehearsal. Every one of these is documented as a real failure mode of indoor QR deployments, and every one is cheap to prevent with one dry run.

**How to avoid:**
1. **Do a full dry run ≥ 1 week before**, on the actual devices, in the actual building, at the actual time of day, with codes actually mounted. Write down every failure.
2. **Print a spare set** and carry tape, a backup phone, and a mobile hotspot.
3. **Run the API and DB on the demo laptop with Docker Compose**, not on a campus server you don't control. Verify it survives sleep/wake; disable sleep.
4. **Ship a self-contained demo fallback**: a "demo mode" that serves the seeded campus from a local fixture if the API is unreachable — clearly labelled, so it is a fallback and not a lie.
5. **Pre-print an "out of service" overlay** for codes pointing at nodes that get retired before the demo.
6. **Walk the route yourself, twice**, including the stair transition, before showing it.
7. **Keep the camera permission already granted** on the demo device — but test the denied path separately so it isn't a surprise.

**Warning signs:**
- The codes are printed the day before.
- Nobody has scanned a printed code with the actual demo phone.
- The API runs on `localhost` and the demo plan is "we'll use the same laptop".
- The demo route uses a corridor nobody has walked.

**Phase to address:**
**Phase 6** — print spec, mounting plan, spare set. **Phase 8** — full dry run and fallback mode. **Phase 9** — the rehearsal, twice.

---

### Pitfall 18: Coordinate Spaces Multiply — Image Pixels, Widget Pixels, Screen Pixels

**What goes wrong:**
There are at least four coordinate spaces in play and each conversion is a chance to be off by a factor or an offset:

1. **Image space** — the floor plan's native pixel grid (what the DB stores).
2. **Editor widget space** — the React Flow canvas, pan/zoom applied.
3. **Map render space** — the Flutter widget, fitted to the device screen with `BoxFit.contain` (which introduces letterboxing offsets).
4. **Metres** — only for costs, never for rendering.

The documented symptom is a marker that is *almost* right: it drifts more the further it is from the origin, which means a scale factor rather than a translation. On a `BoxFit.contain` render with a different aspect ratio than the image, the offset is non-zero on both axes and looks like "the marker is just a bit off", so it gets shipped.

**Why it happens:**
Each space is reasonable in isolation, and the conversions are written inline where needed (`x * scale + offset`) instead of in one place.

**How to avoid:**
1. **One transform module** on each side: `imageToScreen(rect, imageSize, screenSize)` and its inverse — unit-tested with a landscape vs portrait screen, and with a non-matching aspect ratio.
2. **Store the image's native dimensions on the floor row** (`map_width`, `map_height`) so the transform never depends on the decoded image at runtime.
3. **Never mix spaces in one expression.** Node coordinates in the response are always image space; the widget converts once at the boundary.
4. **Visual acceptance test**: place nodes at the four corners and the centre of a floor plan, render on two device aspect ratios, and check all five land on their features.
5. **Draw the route polyline in image space** and transform the whole thing, so line and markers cannot diverge.

**Warning signs:**
- Marker error grows toward one corner.
- The map looks right on one phone and off on another.
- A `fit`/`alignment` property is changed without a corresponding transform change.
- Different code paths compute the scale for markers and for the route line.

**Phase to address:**
**Phase 3** — the map render + transform module and its tests. **Phase 5** — route polyline rendering through the same transform. **Phase 6** — editor canvas transform.

---

### Pitfall 19: API Contract Drift Between Flutter and Express

**What goes wrong:**
The Dart model and the TypeScript DTO are maintained by hand, in two languages, by people who are not looking at each other's code. The drift is silent because Dart's `fromJson` tolerates missing fields (they become `null`) and ignores extra ones:

- Server renames `cost_m` → `costM`; client silently reads `null` and displays "0 m".
- Server adds a required `floorId`; client omits it and the route request 400s only for cross-floor routes.
- Server changes a `200` with `[]` into a `404`; client treats it as an empty route.
- Enum values drift (`NO_ROUTE` vs `NoRoute` vs `no_route`) and the UI falls through to a generic error.

**Why it happens:**
No shared schema, no codegen, no contract test. Each side's tests mock the other.

**How to avoid:**
1. **One source of truth for the response shapes** — hand-written is fine at this size, but put it in `shared/` as TypeScript types, generate the JSON Schema (or use Zod → schema), and either generate Dart models or write a contract test from the schema.
2. **Strict parsing on the client**: fail loudly on missing required fields; do not default to zero. A null-cost edge showing as "0 m" is worse than an error.
3. **A contract test that runs the real server** against recorded fixtures and asserts every endpoint's response shape, including the error codes.
4. **Version the API path** (`/api/v1`) — cheap, and it makes the "what did you change" conversation possible.
5. **One error envelope** for every non-2xx: `{ code, message, details? }` with `code` from a closed enum mirrored on both sides.

**Warning signs:**
- A field name appears with two spellings across the repo.
- The client has `?? 0` or `?? ''` defaults on routing fields.
- Errors are handled by checking `response.statusCode == 200` only.
- A change to a DTO requires remembering to edit Dart.

**Phase to address:**
**Phase 1** — the shared types, error envelope, `/api/v1`. **Phase 7** — contract tests in CI. **Every phase** — no hand-edited duplicate models without a test.

---

### Pitfall 20: Killing the User's Context — Navigation Restart, Back Button, Deep Links

**What goes wrong:**
A wayfinding app is used *while walking*, one-handed, interrupted. The failure modes are mundane and universal:

- The user scans a code mid-route. Does the app start a **new** route from there (correct) or push a **second** navigation screen on top of the first (wrong — back button now unwinds through three screens)?
- The user backgrounds the app to answer a call, returns, and the route is gone or the camera is black (Pitfall 8's lifecycle discipline).
- Android back on the map exits the app instead of returning to the route list.
- The user scans the *next* checkpoint, which is the correct one, and the app says "You have arrived" because the arrival check compares to the destination regardless of intermediate nodes.
- The user scans a checkpoint that is *behind* them and the app silently reroutes forward, which looks like it ignored them.

**Why it happens:**
Navigation state is implicit in the widget tree rather than an explicit state machine, so every entry point creates a new state.

**How to avoid:**
1. **An explicit session state machine**: `idle → routeSelected → guiding(stepIndex) → arrived | aborted`. Every scan transitions from the current state; a scan while `guiding` **re-anchors** the session (updates last-known position, recomputes from the current step) rather than pushing a screen.
2. **Replace, don't push**, when the scan resolves to the same active session.
3. **Back button = "end navigation?"** confirmation, then `idle` — not app exit.
4. **Arrival is a node match, not a distance match**: arrived when `scannedNodeId == destination.entranceNodeId` (or within the destination's node set). Progress is `scannedNodeId ∈ route.nodes`, and the step index only advances forward.
5. **Restore on resume** from a persisted session (route id + last scanned node + step index), so a phone call doesn't cost the user the route.
6. **Say what happened**: "Checked in at Junction B — 2 of 4 checkpoints" beats a silent rerender.

**Warning signs:**
- `Navigator.push` appears in the scan handler.
- The back button behaves differently on the map than elsewhere.
- The session is reconstructed from constructor arguments only.
- A scan of an intermediate checkpoint produces "arrived".
- The step index can move backwards without an explicit "recalculating" state.

**Phase to address:**
**Phase 1** — the session state machine skeleton with the scan transition. **Phase 5** — progress, re-anchoring, resume, back handling. **Phase 7** — E2E tests for scan-mid-route and resume.

---

---

## Minor Pitfalls

Short entries — each costs hours, not weeks, but they accumulate into a demo that feels unfinished.

### Pitfall 21: Floor and Room Naming Conventions Collide

**What goes wrong:** Ground floor is `0` in the DB, `G` in signage and `1` in the admin dropdown (because the first floor is index 1). A route says "go to Floor 1" and the user, standing on the ground floor, walks up a flight for nothing. Room numbers prefix-matched (`G-01`, `F1-01`) drift from the `level` column.

**Prevention:** `floors.level INT` is the routing truth, per building, unique within building; `floors.label VARCHAR` is the human string ("Ground", "First"). Every user-facing message formats from a single `formatFloor(level, label)` helper. Never interpolate a raw `level` into UI copy. Seed the ground floor as `0` and write one test asserting "Floor 0 renders as Ground".

### Pitfall 22: Unicode Room Names Break at Some Layer

**What goes wrong:** Malayalam room names, "–" en-dashes and "·" separators render as `?` or mojibake in MySQL, in the JSON, or in the Flutter font. Sinhala/Tamil names behave the same way. The failure appears only for the rooms nobody tested.

**Prevention:** `utf8mb4` at every layer (Pitfall 9); `Content-Type: application/json; charset=utf-8`; a font that covers the script (Flutter's default `Roboto` does **not** include Malayalam — bundle `NotoSansMalayalam`); seed one room name per script and screenshot it. Normalise to NFC for search matching.

### Pitfall 23: Images and Cache Size on Cheap Devices

**What goes wrong:** Each floor plan is a 4000×3000 PNG (~2–6 MB). Five floors, cached naively at full resolution in memory inside an `Image` widget, and a low-end Android phone OOMs or takes 3 s to render a floor. Worse: the client caches every floor of every building it has ever opened.

**Prevention:** Serve a `thumb` (≤ 1200 px wide, WebP) and a `full` variant; render the thumb while panning, the full on idle. Cap the disk cache (LRU, ~50 MB) and evict by building. Decode with `cacheWidth` set to the widget's pixel width. Measure cold start on the cheapest device available.

### Pitfall 24: No Timestamps, No Ownership, No "Who Changed This"

**What goes wrong:** A room's name is wrong in the demo and nobody knows whether it came from the seed, the import, or an admin edit at 1 a.m. Without `created_at / updated_at / updated_by` on graph tables, the only debugging tool is re-reading the seed file.

**Prevention:** `created_at`, `updated_at` on every table; `updated_by` on graph and room tables; Prisma `@updatedAt`. Log the actor from the JWT into the audit row (Pitfall 12). This is three lines of schema and it pays for itself the first time someone asks "why is this node here?".

### Pitfall 25: Dark Mode, Contrast, One-Handed Reach

**What goes wrong:** The route line is drawn in a mid-blue that disappears over a floor plan's blue-grey corridors; the "next checkpoint" highlight is a 10% opacity ring that is invisible in daylight; the primary action sits at the top of the screen where a thumb cannot reach while walking.

**Prevention:** Define a small semantic palette (route, current, next, destination, warning) with **outline + fill**, not colour alone — a dashed line for "remaining" and a solid line for "walked" survives colour blindness and glare. Contrast-check against the actual floor plan images, not against white. Put the scan button bottom-centre. Test outdoors at 50% brightness.

### Pitfall 26: The Route Line Has No Direction

**What goes wrong:** A polyline shows *where* but not *which way*. The user at a junction cannot tell from the map which end of the line is the destination, especially on a symmetric corridor. This is the most common complaint about static route previews.

**Prevention:** Animate a subtle dash offset along the path (direction is legible even at a glance), marker at the start, distinct pin at the destination, and a "next checkpoint" callout naming the QR to look for. Direction should be readable with the phone held at 45° in one hand.

### Pitfall 27: Errors That Blame the User

**What goes wrong:** "Invalid QR code", "Network error", "Something went wrong". Every distinct failure (Pitfall 5's table) collapses into one message, so the user retries the same broken action and the team learns nothing from support reports.

**Prevention:** The closed error enum from Pitfall 19 maps 1:1 to a user-facing sentence and a suggested action. Every error has a next step ("scan a nearby code", "turn on mobile data", "report this code"). Log the code and the endpoint, never the token or the JWT.

### Pitfall 28: Unbounded Admin Lists and Missing Pagination

**What goes wrong:** The buildings/rooms/tokens lists load everything. Fine at 12 rooms, unusable at 400 (SJCET-scale) — and the token list is the one that grows without bound as codes are reissued. The admin panel becomes the slowest screen in the product, which is precisely the screen the examiner watches you use.

**Prevention:** Server-side pagination and `?q=` search from Phase 6, default page size 25. Index the search columns. Never `findMany()` without a `take`.

---

---

## Phase-Specific Warnings

The phase names below are the recommended roadmap structure this research implies (numbered as used throughout this document). The third column is the pitfall that phase is most likely to *introduce*, not the one it is meant to fix.

| Phase | Focus | Likely pitfall introduced here | Mitigation baked into the phase |
|---|---|---|---|
| **0 — Foundation & schema** | Repo, Docker MySQL, Prisma schema, seed sets, QR payload format, capability statement | **Pitfall 2** (schema without `meters_per_pixel` / `cost_m`) and **Pitfall 5** (payload that embeds a node id) | Decide every irreversible schema field now. Both are data migrations across every seeded row later. `seed:verify` exists from day one. |
| **1 — Tracer slice** | Scan → resolve → route → map, on a real device; auth foundation; roles | **Pitfall 1** (a demo that shows a moving marker) and **Pitfall 8** (first contact with camera permissions) | Capability statement and UI vocabulary ship *with* the slice. Permission flow built as a state machine, not a dialog. |
| **2 — Graph & routing core** | Cost model in metres, validator, Dijkstra + A\*, heuristics, typed errors, offline *decision* | **Pitfall 3** (validator written after the editor), **Pitfall 6** (heuristic units), **Pitfall 15** (a seed that hides both) | Validator and router tests are written against `fixtures` in this phase. Dijkstra⇄A\* property test is the phase's exit criterion. |
| **3 — Map rendering** | Floor plan caching, image transform, offline static content | **Pitfall 18** (coordinate spaces) and **Pitfall 7** (gating a cached image behind a spinner) | One transform module, unit-tested at two aspect ratios. Airplane-mode acceptance test. |
| **4 — Search & destinations** | Room search, aliases, multi-building picker, vertical transition view | **Pitfall 10** (search result with no routable node) and **Pitfall 4** (half-built staircase invisible in the UI) | Search returns node ids or a disabled state. A "Vertical transitions" admin view exists before publish. |
| **5 — Guided navigation UX** | Turn instructions, progress, re-anchoring, resume, ETA display | **Pitfall 20** (session restart chaos) and **Pitfall 13** (invented ETA) | Explicit session state machine. Y-axis flip handled before the first left turn is demoed. |
| **6 — Admin editor & operations** | Calibration tool, publish gate, token issue/retire, audit log, health panel, print sheet | **Pitfall 3** (editor as drawing tool), **Pitfall 12** (no auth/undo), **Pitfall 17** (print spec ignored) | Validator runs *in the save call path*. `409 STALE_GRAPH`. Print spec is a checklist in the phase, not a note. |
| **7 — Hardening & testing** | E2E, CI, contract tests, perf budget, accessibility profile | **Pitfall 16** (tests deferred to here instead of written earlier) and **Pitfall 14** (accessibility claimed, not modelled) | CI must be green before Phase 8. Accessibility is either modelled or removed from all copy. |
| **8 — Physical deployment & dry run** | Printing, mounting, device matrix, hotspot fallback, dead reckoning (optional) | **Pitfall 17** (demo-day physics) and **Pitfall 1** again (labeling dead reckoning as tracking) | Full dry run ≥ 1 week out, on the real devices, in the real building. Dead reckoning labelled as an estimate with drift. |
| **9 — Report, polish, rehearsal** | Documentation, limitations chapter, two rehearsals | **Pitfall 1** (abstract and limitations disagreeing) | One capability statement, quoted verbatim in README, About screen, abstract and limitations. Rehearse the "where are you between codes?" answer. |

### Cross-phase invariants (check at every gate)

1. **No pixel distance is ever displayed as metres.**
2. **No route is published from an invalid graph.**
3. **No screen says "real-time", "live", or "tracking".**
4. **Every QR payload resolves server-side; the client never trusts its contents.**
5. **Every seed change keeps `seed:verify` green and the divergent-scale fixture intact.**

---

## The three unrecoverable failures, restated as gates

| Failure | Gate that prevents it | Cost if missed |
|---|---|---|
| Over-claiming localisation | `docs/CAPABILITIES.md` merged in Phase 1 and quoted in every artefact | Permanent credibility loss in the viva; a contradiction the examiner can point at |
| Edge cost in pixels | `cost_m NOT NULL` + calibration gate + divergent-scale test, all in Phase 0–2 | Whole graph re-derivation; every distance, ETA and route ranking wrong |
| Publishing a disconnected graph | Validator in the save call path + health panel, Phase 2–6 | "No route" between adjacent rooms — the most damaging visible failure in wayfinding |

Everything else in this document is recoverable within a phase. These three are not.

---

## Sources

Confidence tags reflect source type, not certainty of the claim in context (greenfield project — nothing was verified against a running codebase).

**Indoor positioning & QR landmarking — MEDIUM**
- Indoor-positioning literature on QR landmarking as a proximity method: establishes that QR alone provides location *snapshots* and cannot track in real time; used for Pitfall 1's framing and the "location faking" limitation.
- Indoor GNSS degradation measurements (≈4 m RMS in small buildings, up to 60 m indoors; a 3-storey walk test with more than half of fixes outside the building) — used in Pitfalls 1 and 8.
- Commercial indoor-mapping pipelines on per-level scale calibration, cross-level ppm consistency, and adopting the median of 2–4 measurements — used in Pitfall 2.

**Wayfinding / graph modelling standards — MEDIUM**
- Indoor-mapping standard on graph correctness vs drawing correctness ("the graph is correct; the drawing of it is wrong"), centroid-graph failure, served levels taken from transition records rather than geometry, and aborting rather than emitting pixel-space geometry — used in Pitfalls 3 and 4.
- CRITIR guidance on single-point scale application across assembled geometry and outlier-robust measurement — Pitfall 2.

**QR token security — MEDIUM**
- QRAuth: HMAC-SHA256 truncated to 64 bits, server-side secret, payload-density/printability trade-off — Pitfall 5.
- PreArrive: same signed-token pattern applied to physical checkpoints — Pitfall 5.
- Security literature on printed-signage failure modes (damage, misprint, relocation) and user-reporting as the standard mitigation — Pitfall 5.

**Mobile / Flutter — MEDIUM**
- `mobile_scanner` package documentation and changelog (v5→v7 API churn: `controller.barcodes`, removal of `autoStart`/`hasTorch`, `TorchState.unavailable`, `detectionSpeed`) — Pitfalls 8, 9. <https://pub.dev/packages/mobile_scanner>
- `qr_code_scanner` deprecation status — Pitfall 8.
- `flutter_secure_storage` v10 docs (RSA-OAEP/AES-GCM defaults, `minSdkVersion 23`, `allowBackup` requirement, `KeychainAccessibility.first_unlock_this_device`, no web support) — Pitfall 9. <https://pub.dev/packages/flutter_secure_storage>
- `permission_handler` Android semantics: `status` never reports `permanentlyDenied`; branch on `request()` result plus `shouldShowRequestPermissionRationale` — Pitfall 8.
- Documented upstream scanner lifecycle bug (permission prompt → `didChangeAppLifecycleState` → repeated `start()`), and the maintainer guidance not to call `start()` after denial — Pitfall 8.

**Backend / Prisma / MySQL — MEDIUM**
- Prisma + native Windows MySQL table-name lower-casing causing spurious `migrate dev` drift; maintainer advice to use Docker/WSL — Pitfall 9.
- Windows `prisma db seed` no-op and the ts-node `module: CommonJS` / `.js` seed workarounds — Pitfall 9.
- Prisma issue tracker: seeds must be idempotent (closed "always run seeds" request) — Pitfalls 9, 15.
- MySQL/InnoDB utf8mb4 index byte limits (768-byte prefix with 4 KB pages; 191-char rule) — Pitfall 9.

**React Flow / editor performance — MEDIUM**
- React Flow performance guidance (memoize `nodeTypes`, `useCallback` handlers, granular selectors, avoid anonymous props) — Pitfall 9. <https://reactflow.dev/learn/advanced-use/performance>
- Documented benchmarks: 100-node drag at 60 → 10 FPS with inline handlers (2 FPS with heavy nodes), restored to 50–60 FPS with `React.memo`; ~736 `EdgeWrapper` + 1472 `EdgeAnchor` renders per drag frame on a ~50-node graph — Pitfall 9.

**QR printing — MEDIUM**
- ISO/IEC 18004 quiet zone (4 modules), error-correction level guidance, module-size and contrast recommendations — Pitfall 9.
- Controlled 48-pair print/scan test: L→H ECC slightly worse overall; OpenCV read 40/40 dark-on-light and 0/8 light-on-dark — Pitfall 9.

**Web platform — HIGH (well-specified, stable behaviour)**
- MDN / Fetch spec on CORS: port is part of the origin; `localhost` ≠ `127.0.0.1`; wildcard origin rejected with credentials — Pitfall 9. <https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS>

**Offline UX — MEDIUM**
- Google Maps Navigation SDK behaviour of holding the chevron at the last known fix and showing "Searching for GPS…" rather than interpolating — Pitfalls 1, 7.
- Production offline-UX rules (offline indicator, data-freshness tooltip, confidence badge from last sync, never gating static content on connectivity) — Pitfall 7.

---

## Metadata

- **Pitfalls catalogued:** 28 (9 critical, 11 moderate, 8 minor).
- **Unrecoverable if missed:** 3 (over-claiming, pixel costs, disconnected graph).
- **Highest-leverage artefacts produced by following this document:** `docs/CAPABILITIES.md`, the validator + broken fixtures, the Dijkstra⇄A\* equivalence test, the divergent-scale seed, `seed:verify`, and the audit log.
- **Assumption to re-check at roadmap time:** the project's phase count and naming. Every "Phase to address" above is a recommendation, not a commitment.
