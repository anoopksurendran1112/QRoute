# QR-Based Indoor Navigation System

## What This Is

An indoor campus navigation system for St. Joseph's College of Engineering and Technology, Palai.
Printed QR codes are placed at decision points across campus buildings; scanning one with the
mobile app identifies the user's position, and the system computes and displays the shortest
walkable route to a chosen classroom as turn-by-turn guidance on an interactive floor map.
Students, faculty, and visitors are the end users; campus administrators maintain the campus
graph, floor plans, and QR codes through an admin panel.

## Core Value

A user standing anywhere on campus can scan one QR code and receive an accurate, step-by-step
route to any classroom on any floor of any building.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can scan a QR code and have their current location identified
- [ ] User can search for a destination classroom by room number, department, faculty, building, or floor
- [ ] System computes the shortest path across buildings and floors using a weighted graph
- [ ] App displays an interactive floor map with the route drawn on it
- [ ] App delivers turn-by-turn guidance, including floor transitions via stairs or lifts
- [ ] Admin can create, edit and delete buildings, floors, classrooms, departments and faculty
- [ ] Admin can upload a floor plan and draw the walkable node/edge graph over it
- [ ] Admin can generate, download and print the QR codes for graph nodes
- [ ] Users can register and log in; admins are distinguished by role
- [ ] System records navigation sessions and scan events for usage monitoring
- [ ] A seeded synthetic campus exists so the system is demonstrable without manual setup

### Out of Scope

- **Google Maps SDK / commercial indoor mapping APIs** — wrong tool for custom indoor floor plans; requires an API key and billing, and cannot render a custom corridor graph.
- **Firebase Auth and Firestore** — adds an external account dependency for no benefit; the domain is a clean relational hierarchy that MySQL models better, and local JWT auth is fully demonstrable.
- **BLE beacons / UWB hardware** — per-anchor hardware cost is out of proportion to a mini project; QR codes achieve the same localisation at near-zero cost.
- **Continuous position tracking** — with QR-only localisation the position is known only at scan instants. The system claims checkpoint navigation honestly; dead reckoning is an optional later enhancement, not a baseline promise.
- **Live classroom occupancy / real-time availability** — a status flag or timetable-derived status is sufficient for v1.
- **GPS outdoor navigation, attendance, timetable sync, parking, visitor management, evacuation routing** — listed in the synopsis as future scope; each is a separate project.
- **React Native frontend** — one Flutter codebase covers the mobile requirement.
- **Real SJCET floor-plan digitisation** — optional final phase; the build ships against the synthetic campus.

## Context

- **Source**: the project synopsis (`docs/synopsis.pdf`) and abstract report (`docs/QR code based app.pdf`), analysed in full in `PROJECT_ANALYSIS.md`.
- **Academic context**: MCA mini project, code 24SJMCA245, guide Prof. Neethu Paulose. The cover dates (17/07/2026 and 08/07/2026) have already passed — the real deadline is unconfirmed.
- **Core insight**: a QR code is just a named graph node. Everything else — routing, mapping, guidance — derives from the node graph, not from the QR itself.
- **The hard part is not the scanner, it is the graph**: a raster floor plan cannot be path-found on. The admin needs a floor-plan graph editor (place nodes, connect edges) over an uploaded image backdrop.
- **Scale calibration matters**: edge cost must be in metres, not pixels, or "distance" and "ETA" are fiction. The admin calibrates a per-floor `meters_per_pixel` against a known-length reference.
- **QR payload format**: opaque signed token, e.g. `SJCETNAV:v1:<nodeId>.<hmac8>`. Unguessable node ids plus a truncated HMAC let the scanner reject tampered codes offline, while the server keeps the token→node mapping so codes can be retired without reprinting.
- **Domain model** (proposed): `users`, `departments`, `buildings`, `floors` (with `meters_per_pixel`), `nodes` (floor-scoped x/y in image pixel space, kind = junction|door|stair|lift|entrance), `edges` (from/to node, cost_m, kind = walk|stair|lift, accessible, bidirectional), `classrooms` (entrance_node_id), `faculty`, `qr_tokens`, `nav_sessions`, `scan_events`, `audit_log`.
- **Pathfinding lives on the server** in TypeScript: admin graph edits propagate live with no app release, and pure functions are trivially unit-testable — which also produces the Dijkstra-vs-A\* comparison table for the report.
- **Turn instructions** are a pure function over the returned path: group same-floor nodes into legs, detect floor changes as stair/lift transitions, and classify each bearing change as left/right/straight/u-turn.
- **Environment**: Node v22.14.0, Docker, Git, MySQL 8 client, Java, VS Code present. Flutter/Dart and the Android SDK were being installed at project init. GSD Core v1.18.0 installed globally for OpenCode.

## Constraints

- **Tech stack**: Flutter/Dart mobile app, Node.js + Express + TypeScript API, React + Vite + TypeScript admin panel, MySQL 8 via Prisma. Fixed by the synopsis and the decisions of 2026-10-22.
- **Stack hygiene**: `qr_code_scanner` is deprecated — use `mobile_scanner` (ML Kit). Do not add Google Maps SDK, Firebase, ZXing-on-mobile, or React Native.
- **Two admin surfaces**: a web admin panel is primary (it hosts the graph editor); a minimal in-app admin in Flutter covers quick phone-side edits.
- **Pathfinding**: server-side, with a client-side graph cache as the offline fallback.
- **Guidance model**: checkpoint navigation is the spine. Dead reckoning (compass + accelerometer step count) is a later enhancement and must be labelled as such.
- **Data**: build against a seeded synthetic campus. Real campus floor plans are optional and non-blocking.
- **Network dependency**: indoor dead zones are expected; the client must degrade to a cached graph rather than fail.
- **Scope**: single-student mini project — the phase count must stay within a single milestone and the graph editor must not be allowed to sprawl.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web admin panel **and** a minimal in-app admin | The graph editor is far cheaper and more pleasant in a browser; phone-side quick edits are still wanted on the floor | — Pending |
| Checkpoint guidance first, dead reckoning later | QR localisation is only known at scan instants; over-claiming continuous tracking is the top exam risk | — Pending |
| Synthetic seeded campus | Fully controllable, no dependency on obtaining floor plans, no privacy concerns about the real campus | — Pending |
| Pathfinding on the server | Admin graph edits propagate live; pure functions are testable and yield the Dijkstra-vs-A\* report data | — Pending |
| Custom map renderer instead of Google Maps SDK | Google Maps cannot render a custom corridor graph and needs API billing; a custom painter gives full control | — Pending |
| Prisma + MySQL over Firebase | The domain is a relational hierarchy; Firebase adds an account dependency without benefit | — Pending |
| `mobile_scanner` over `qr_code_scanner` | The latter is deprecated and unmaintained | — Pending |
| Signed opaque QR tokens over raw node ids | Prevents spoofing a location; allows retiring a code without reprinting | — Pending |
| Edge cost in metres, calibrated per floor | Without scale calibration, reported distance and ETA are fiction | — Pending |
| Implement both Dijkstra and A\* | Produces the algorithm-comparison evidence the project report needs | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-22 after initialization*
