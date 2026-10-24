# Phase 2: Graph Core & Routing Engine

**Goal:** Implement server-side pathfinding with Dijkstra and A* over a metre-calibrated graph with turn-by-turn guidance  
**Depends on:** Phase 1  
**Requirements:** PATH-01, GUIDE-01  
**Status:** Complete (2026-10-24)

## Phase Goal
Turn the static graph from Phase 1 into a navigable graph. Implement shortest path algorithms with full instrumentation, metre calibration using floor.metersPerPixel, and generate turn-by-turn directions including floor transitions.

## Success Criteria
1. System computes shortest paths across buildings and floors using a weighted graph ✓
2. Route includes floor transitions via stairs or lifts ✓  
3. App delivers turn-by-turn guidance derived from the computed path ✓
4. A* and Dijkstra agree on cost, and A* expands fewer nodes on tested pairs (instrumented) ✓
5. Metre calibration converts pixel distances using floor.metersPerPixel ✓

## Plans

- [x] 02-01-PLAN.md — Graph types, structures, and loader from DB/fixtures (Wave 1) ✓
- [x] 02-02-PLAN.md — Dijkstra and A* implementations with binary heap and instrumentation (Wave 2) ✓
- [x] 02-03-PLAN.md — Turn-by-turn direction generation with floor transitions (Wave 3) ✓
- [x] 02-04-PLAN.md — Routing API endpoints and schemas (Wave 4) ✓
- [x] 02-05-PLAN.md — Tests for routing algorithms and API (Wave 5) ✓

## Progress
**5 plans completed | 5/5 complete | 100%**

## Key Deliverables
- In-memory routing graph with metre-calibrated edges
- Dijkstra and A* pathfinding with instrumentation (nodesExpanded, maxFrontier, relaxations, runtimeMs, heuristicUsed)
- Admissible 3D heuristic for A* (x,y,floor)
- Turn-by-turn instructions with floor transition detection
- POST /v1/routes/compute API endpoint
- Comprehensive tests proving algorithm correctness
