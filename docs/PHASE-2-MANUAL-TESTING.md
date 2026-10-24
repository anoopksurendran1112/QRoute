# Phase 2 Manual Testing Guide - Graph Core & Routing Engine (QRoute)

This guide is for manual testing of all Phase 2 functionality. Update this document after each phase verification to include testing instructions for the next phase.

**Last Updated:** 2026-10-24  
**Phase:** 2 - Graph Core & Routing Engine  
**Status:** VERIFIED - Phase 2 Complete

---

## Prerequisites

Before testing, ensure the following are running:

### 1. Start Docker MySQL
```bash
cd D:\DemoProjects\deepak
docker compose up -d db
node scripts/wait-for-mysql.mjs
```
Verify: `docker compose ps` should show `qroute-mysql` as healthy on port 3307.

### 2. Environment Setup
Check `apps/api/.env` exists with proper values (DATABASE_URL should point to port 3307).

### 3. Install Dependencies (if not already done)
```bash
npm install
```

### 4. Start API Server
```bash
cd apps/api
npm run dev
```
API should be running on http://localhost:8080

### 5. Verify Seeded Data
```bash
cd apps/api
npx tsx scripts/_inspect-db.ts
```
Should show nodes and edges from seeded campus.

---

## Phase 2 Automated Tests

Run the following tests to verify Phase 2:

### Unit Tests - Routing Algorithms
```bash
cd apps/api
npx vitest run src/modules/routing/__tests__/dijkstra.test.ts src/modules/routing/__tests__/astar.test.ts
```

**Expected Results:**
- [x] Dijkstra finds shortest path on simple line graph
- [x] Dijkstra returns not found for disconnected graph
- [x] Dijkstra finds path across floors
- [x] A* finds shortest path on simple line graph
- [x] A* agrees with Dijkstra on path cost
- [x] A* agrees with Dijkstra on multi-floor route cost
- [x] A* expands fewer or equal nodes than Dijkstra
- [x] A* returns not found for disconnected graph

### Integration Tests - Routing API
```bash
cd apps/api
npx vitest run tests/routing.test.ts
```

**Expected Results:**
- [x] Route computation requires authentication
- [x] Route computation validates request body
- [x] Route computation with A* algorithm
- [x] Route computation with both algorithms

### Playwright Tests - End-to-End
```bash
npx playwright test tests/routing-phase2.spec.ts
```

**Expected Results:**
- [x] All 5 tests pass

### All API Tests
```bash
cd apps/api
npx vitest run
```
**Expected:** All tests pass (32 existing + 4 routing = 36 tests)

### Admin Tests
```bash
cd apps/admin
npx vitest run
```
**Expected:** All 10 tests pass

---

## Manual API Testing

Use curl or Postman to test the routing endpoint.

### 1. Login to get token
```bash
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sjcet.local","password":"Admin@12345!"}'
```

Save the `token` from response.

### 2. Get available nodes (for testing)
```bash
# Query nodes from database or use known seeded nodes
# Or use Prisma Studio: npx prisma studio
```

### 3. Test route computation with A* (default)
```bash
curl -X POST http://localhost:8080/v1/routes/compute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startNodeId":"NODE_ID_1","endNodeId":"NODE_ID_2","algorithm":"astar"}'
```

**Expected Response:**
```json
{
  "astar": {
    "found": true,
    "path": ["node1", "node2", "..."],
    "totalCostM": 25.5,
    "nodes": [...],
    "instructions": [
      {
        "step": 1,
        "type": "start",
        "text": "...",
        "distanceM": 0
      },
      ...
    ],
    "metrics": {
      "nodesExpanded": 10,
      "maxFrontier": 5,
      "relaxations": 15,
      "runtimeMs": 2,
      "heuristicUsed": "euclidean3d",
      "algorithm": "astar"
    }
  },
  "agreed": true
}
```

### 4. Test route computation with Dijkstra
```bash
curl -X POST http://localhost:8080/v1/routes/compute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startNodeId":"NODE_ID_1","endNodeId":"NODE_ID_2","algorithm":"dijkstra"}'
```

**Expected:** `metrics.heuristicUsed` should be `"zero"`, `metrics.algorithm` should be `"dijkstra"`

### 5. Test route computation with both algorithms
```bash
curl -X POST http://localhost:8080/v1/routes/compute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startNodeId":"NODE_ID_1","endNodeId":"NODE_ID_2","algorithm":"both"}'
```

**Expected:** Both `dijkstra` and `astar` present, `agreed` is boolean

### 6. Test route from classroom
```bash
curl -X POST http://localhost:8080/v1/routes/compute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startClassroomId":"CLASSROOM_ID","endNodeId":"NODE_ID","algorithm":"astar"}'
```

**Expected:** Resolves classroom's entrance node and computes route

### 7. Test validation errors
```bash
# Missing start and end
curl -X POST http://localhost:8080/v1/routes/compute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"astar"}'

# No auth
curl -X POST http://localhost:8080/v1/routes/compute \
  -H "Content-Type: application/json" \
  -d '{"startNodeId":"test","endNodeId":"test"}'
```

**Expected:** 400 and 401 respectively

### 8. Test multi-floor route (if available)
Find nodes on different floors and compute route between them. Check instructions contain floor change messages.

**Expected:** Instructions should include `type: "floor_change"` with text mentioning stairs/lift

---

## Phase 2 Success Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1. System computes shortest paths across buildings and floors using a weighted graph | [x] | Tested with seeded data, works across floors |
| 2. Route includes floor transitions via stairs or lifts | [x] | Directions generator detects floor changes and identifies stairs/lifts |
| 3. App delivers turn-by-turn guidance derived from the computed path | [x] | Instructions array with start, floor_change, arrive types |
| 4. A* and Dijkstra agree on cost, and A* expands fewer nodes on tested pairs (instrumented) | [x] | Tests verify cost agreement (within 0.01) and A* <= nodes expanded |
| 5. Metre calibration converts pixel distances using floor.metersPerPixel | [x] | Graph loader uses metre costs from DB, edge.costM in metres |

---

## Phase 2 Sign-Off

All automated and manual tests have been executed and passed:

- [x] All routing unit tests pass (Dijkstra & A*)
- [x] All routing API integration tests pass
- [x] Playwright E2E tests pass
- [x] All existing API tests still pass (32 tests)
- [x] All existing admin tests still pass (10 tests)
- [x] TypeScript compiles cleanly (api, admin, shared)
- [x] Route computation works with authentication
- [x] Both algorithms implemented with instrumentation
- [x] A* uses admissible 3D heuristic
- [x] Turn-by-turn directions generated
- [x] Floor transitions detected
- [x] API endpoints wired and functional

**Tester:** Anoop K Surendran & Opencode  
**Date:** 2026-10-24  
**Status:** VERIFIED - PHASE 2 COMPLETE

---

## Next Phase: Phase 3 - Graph Authoring & Validation

*This section will be updated after Phase 2 verification is complete and Phase 3 planning begins.*

**Planned Features:**
- Admin graph editor (React Flow) over floor plan images
- Graph validation (disconnected components, orphan nodes, broken vertical links)
- QR code generation for graph nodes
- Node/edge drawing and management

**Dependencies:** Phase 1 complete, Phase 2 complete (routing engine ready)
