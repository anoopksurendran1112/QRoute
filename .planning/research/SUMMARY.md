# Project Research Summary

**Project:** QR-Based Indoor Navigation System (SJCET Palai)
**Domain:** Indoor campus navigation / QR-code checkpoint wayfinding (multi-floor, multi-building)
**Researched:** 2026-10-22
**Confidence:** HIGH

## Executive Summary

This is a QR-code anchored indoor wayfinding system for a university campus. The architecture centers on a hand-authored graph of walkable corridors (nodes/edges) over uploaded floor-plan images, server-side pathfinding (Dijkstra and A*), and a checkpoint-based navigation model where position is only known at QR scan instants. The design is intentionally honest about its limitations — no continuous blue-dot tracking, QR-only localisation, with guidance framed as "checkpoint navigation" rather than real-time positioning.

The recommended approach is to build a three-tier system (Flutter mobile app, Node/Express/TypeScript API, React/Vite admin panel) with MySQL/Prisma, hand-roll routing with careful metric calibration, and enforce strict graph validation. The biggest risks are claiming continuous tracking, using pixel-based edge costs instead of metres, publishing disconnected graphs, and mishandling multi-floor vertical transitions. All of these are avoidable with deliberate design choices and validation gates.

## Key Findings

### Recommended Stack

The stack is largely fixed by PROJECT.md; research focused on correct usage. Key technologies and patterns:

**Core Technologies:**
- **Flutter 3.47.7 / Dart 3.13.5** — Mobile app with `mobile_scanner ^7.4.2` (ML Kit) for QR scanning
- **Node.js 22.14.0 / Express 5.3.0 / TypeScript 5.9.3** — API runtime with native async error handling
- **Prisma 7.10.1 + @prisma/adapter-mariadb** — ORM with mandatory driver adapter; requires explicit config
- **React 19.3.1 / Vite 8.3.5 / @xyflow/react 12.12.0** — Admin panel with graph editor canvas
- **MySQL 8.0** — Relational datastore via Docker

**Critical Stack Decisions:**
- **Pathfinding is hand-rolled** (no graph library) — Required for Dijkstra-vs-A* comparison table with node expansion counts; existing libraries don't support both algorithms with instrumentation
- **Edge costs in metres** — Derived from pixel length × per-floor `meters_per_pixel` calibration; vertical edges use configured costs
- **Opaque signed QR tokens** — `SJCETNAV:v1:<tokenId>.<hmac8>` with server-side token→node mapping, allowing code retirement without reprinting
- **npm workspaces monorepo** — Shared TypeScript types consumed by API and admin; Flutter is a separate toolchain

### Expected Features

**Must have (Table Stakes):**
- **Scan-to-locate** (M2) — QR scanning identifies current position via signed tokens
- **Destination search** (M3) — Search by room number, building, floor, department, faculty
- **Interactive multi-floor map** (M4) — Floor switching, pan/zoom, route rendering with markers
- **Server-side routing** (M5) — Dijkstra and A* across buildings/floors with cross-floor transitions
- **Turn-by-turn guidance** (M6) — Instruction list with floor transitions and checkpoint model
- **Graph editor + calibration** (M8) — Admin tool to build navigation graph over floor plans with metre-scale calibration
- **Auth + roles** (M1) — User/admin authentication with JWT
- **Usage monitoring** (M7/M8) — Scan events, sessions, analytics dashboard
- **Offline fallback** (M2/M5) — Cached graph/images with degraded navigation

**Should have (Differentiators):**
- **Signed opaque tokens with offline pre-check** (D1) — Tamper-evident QR codes with server retirement
- **Dijkstra-vs-A* comparison** (D2) — Quantitative evidence for report (nodes expanded, agreement rate)
- **Checkpoint-progress guidance** (D4) — Honest "walk to next checkpoint and scan" model
- **Graph validator/linter** (D5) — Catches disconnected graphs, orphan nodes, missing vertical links
- **Accessibility-first routing** (D7) — Step-free mode with honest failure messages

**Defer (v2+):**
- Continuous real-time tracking/blue dot, AR navigation, 3D maps, BLE beacons, AI auto-tracing, multi-language support, room booking/timetable sync

### Architecture Approach

The system follows a **graph-centric architecture** with clear separation between authoring and routing:

**Major components:**
1. **Data layer** (Prisma/MySQL) — 14-table schema with campus graph, QR tokens, sessions
2. **Routing engine** (pure TS) — Dijkstra/A*, leg grouping, turn classification, floor transitions
3. **API layer** (Express) — Public routes for mobile, admin routes for graph management
4. **Admin panel** (React + XYFlow) — Graph editor canvas with validation, calibration, QR generation
5. **Mobile app** (Flutter) — Scanner, map renderer, guidance UI, offline cache/router
6. **Shared contracts** — TypeScript DTOs for API/admin; Dart mirrors for mobile

**Key patterns:**
- **Single global graph** spanning all buildings/floors with explicit vertical transition edges (stair/lift)
- **Pure routing core** separated from HTTP/DB for testability and Dart porting
- **Revisioned graph publishing** — Draft edits, validation gates, monotonic `graph_revision` for cache invalidation
- **Checkpoint model** — Position known only at QR scans; guidance is checkpoint-to-checkpoint

### Critical Pitfalls

1. **Over-claiming continuous tracking** — Must frame as checkpoint navigation with last-known-position model. Never interpolate marker between scans or use "real-time/live/tracking" terminology.
2. **Pixel costs masquerading as metres** — Edge costs MUST be in metres via per-floor calibration. Vertical edges need configured costs. Uncalibrated floors block publishing.
3. **Disconnected/broken graphs** — Validator must enforce single connected component, no orphans, complete vertical links, bound classrooms to entrances. Publish gates on validation.
4. **Broken vertical connectivity** — Model stair/lift as explicit edges between floors with declared served levels. Heuristic must be 0 across floors (Dijkstra-equivalent). Turn generator detects floor changes only via stair/lift edges.
5. **QR token security issues** — Use opaque token IDs (not node IDs) in payload, server-side resolution, key rotation support, distinct error codes for invalid/retired/unknown tokens.
6. **Non-admissible heuristics/unit mixing** — A* must use metres-consistent heuristic; Dijkstra is oracle for correctness tests. Turn bearings need y-axis flip correction. Property test: Dijkstra and A* agree on cost.
7. **Offline/dead-zone failures** — Must cache graph/images, port or precompute routing, never gate static content on connectivity, show staleness indicators.

## Implications for Roadmap

### Suggested Phase Structure

#### Phase 1: Foundation & Data Model
**Rationale:** Schema is load-bearing for everything else. Must get domain model right first.
**Delivers:** Monorepo setup, Prisma schema (14 tables), synthetic campus seed, auth with roles
**Addresses:** TS13 (auth), TS16 (seeded campus), M1/M7 foundation
**Avoids:** Schema migration churn later (Pitfall 2 schema requirements)
**Research:** Standard patterns — skip deep research

#### Phase 2: Graph Core & Routing Engine
**Rationale:** Routing is the academic core and can be built against fixtures in parallel with editor work.
**Delivers:** Pure routing module (Dijkstra/A*), guidance/turn generation, graph snapshot loader, unit tests with property tests
**Addresses:** M5 pathfinding, TS5 turn instructions, TS6 floor transitions, D2 comparison
**Avoids:** Pixel costs (enforce metres), non-admissible heuristics (admissible heuristic rules), mutable state
**Research:** Needs careful implementation — flag for validation of heuristic correctness

#### Phase 3: Graph Authoring & Validation
**Rationale:** Editor creates the data routing consumes; validation prevents broken graphs.
**Delivers:** Admin graph editor (XYFlow), calibration UI, validation endpoint/panel, publish/revision mechanism
**Addresses:** TS9 editor, TS10 calibration, TS11 QR generation, TS12 CRUD, D5 validator
**Avoids:** Disconnected graphs, pixel costs, broken vertical links
**Research:** Standard canvas patterns but needs graph-specific UX — moderate research

#### Phase 4: API & QR System
**Rationale:** Wire routing and graph to HTTP endpoints with secure QR handling.
**Delivers:** Public/admin routes, QR token mint/verify, scan resolution, session tracking
**Addresses:** TS1 scan-to-locate, D1 signed tokens, TS14 usage monitoring
**Avoids:** Token forgery, orphaned codes
**Research:** Security patterns — standard but needs careful implementation

#### Phase 5: Mobile App (Online)
**Rationale:** Consume API with correct UX framing.
**Delivers:** Flutter app with scanner, search, map renderer, guidance UI, checkpoint model
**Addresses:** TS2 search, TS3 map, TS4 route rendering, TS7 distance/ETA, TS8 accessible routing
**Avoids:** Over-claiming tracking, permission issues, lifecycle bugs
**Research:** Mobile scanner patterns — well-documented but Flutter-specific gotchas

#### Phase 6: Offline Support & Polish
**Rationale:** Add resilience for dead zones and complete differentiators.
**Delivers:** Graph/image caching, offline router (Dijkstra port), parity tests, staleness UI
**Addresses:** TS15 offline fallback, D4 checkpoint guidance polish, D7 accessibility explanations
**Avoids:** Offline failures, stale graph routing
**Research:** Cross-platform parity testing — needs planning attention

### Phase Ordering Rationale

- **Dependencies drive order:** Schema → Routing (fixtures) + Editor (parallel) → API → Mobile → Offline
- **Risk mitigation:** Critical pitfalls (tracking claims, metres, validation) addressed in early phases with gates
- **Parallelization:** Routing core and graph editor can proceed in parallel after schema
- **Academic requirements:** Dijkstra-vs-A* comparison needs routing core early for testing

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Routing Engine):** A* admissibility across floors, heuristic unit consistency, turn classification with y-axis flip — complex algorithmic correctness
- **Phase 3 (Graph Editor):** Canvas UX for non-technical admins, validation UX, calibration workflow — domain-specific editor patterns
- **Phase 5 (Mobile):** `mobile_scanner` v7 API, permission lifecycle, secure storage, offline map rendering performance — Flutter ecosystem gotchas
- **Phase 6 (Offline):** Dart port parity strategy, cache coherence, topology hashing — cross-platform consistency

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Prisma schema, auth, monorepo setup — well-documented
- **Phase 4 (API):** REST endpoints, middleware, QR generation — standard Express patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified from registries on 2026-10-22; Prisma 7 gotchas well-documented; package compatibility checked |
| Features | HIGH | Extensive competitor analysis, clear MVP definition, dependencies mapped; academic requirements explicit |
| Architecture | HIGH | Component decomposition cross-checked across sources; patterns well-established for this domain |
| Pitfalls | HIGH | Comprehensive coverage of known failure modes with concrete mitigations; based on vendor docs and academic literature |

**Overall confidence:** HIGH

### Gaps to Address

- **User research with SJCET students** — Feature priorities inferred from vendors; quick interviews would validate search patterns
- **QR print-legibility testing** — Need to verify token fits at readable sizes with error correction
- **Graph editor UX details** — Cheapest interaction model for single admin not fully specified
- **Flutter performance on large floor plans** — CustomPainter performance on mid-range Android needs testing
- **Real SJCET floor plan structure** — Synthetic campus must be realistic enough to demo well

## Sources

### Primary (HIGH confidence)
- Package registries (npm, pub.dev) — versions, dependencies, publish dates (2026-10-22)
- Prisma v7 docs — migration mechanics, generators, driver adapters
- Express 5 migration guide — async error handling, breaking changes
- React Flow v12 docs — canvas patterns
- Flutter InteractiveViewer/mobile_scanner docs — rendering and scanning

### Secondary (MEDIUM confidence)
- Vendor docs: Zapworks, ExpoFP, Mappedin, MazeMap, Navigine, Ariadne — feature landscape and patterns
- Academic: Marciniak et al. (turn instructions), Veloz et al. (offline nav), floor plan graph extraction papers
- Indoor positioning literature — QR as checkpoint vs continuous tracking

### Tertiary (LOW confidence)
- LLM floor plan parsing (arXiv preprint) — noted as future possibility only
- Chart library selection — not researched, deferred

---
*Research completed: 2026-10-22*  
*Ready for roadmap: yes*
