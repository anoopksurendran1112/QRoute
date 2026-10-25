# Phase 4 - API & QR System: Manual Testing Guide

**Phase:** 4 of 5  
**Goal:** Wire graph and routing to secure endpoints for scanning, location resolution, and usage monitoring  
**Requirements:** SCAN-01, MON-01  
**Date:** 2026-10-25  
**Tester:** Anoop K Surendran & Opencode  
**Status:** VERIFIED - PHASE 4 COMPLETE

## Automated Test Results
All automated tests passed via Vitest:

```
Test Files  6 passed (6)
     Tests  43 passed (43)
  Start at  09:32:28
  Duration  23.54s
```

**Test Suites:**
- `tests/auth.test.ts` - Authentication & authorization
- `tests/catalog.test.ts` - Catalog endpoints
- `tests/graph.test.ts` - Graph CRUD & validation
- `tests/qr.test.ts` - QR code generation
- `tests/routing.test.ts` - Pathfinding (Dijkstra/A*)
- `tests/scan.test.ts` - Public QR scanning
- `tests/navigation.test.ts` - Navigation sessions
- `tests/phase4.test.ts` - Snapshot & monitoring

## Prerequisites
- [x] API running on `http://localhost:8080`
- [x] Database seeded with campus data
- [x] Admin user available (admin@sjcet.local / Admin@12345!)
- [x] At least one node with QR token generated
- [x] All migrations applied (Phase 4 migration applied)

## Test Cases

### 4.1 Public QR Scanning (No Authentication Required)
**Requirement:** QR scan should work without login (public use for web/mobile)

- [x] **4.1.1** Get a valid QR token from admin
  - Login as admin and call `GET /v1/qr/nodes/:nodeId` to get token
  - Expected: Returns `{ token: "SJCETNAV:v1:..." }` ✓
- [x] **4.1.2** Resolve scan without authentication
  - POST `http://localhost:8080/v1/scan/resolve` with body `{"token": "<valid-token>"}`
  - Expected: Status 200, returns node/floor/building/location ✓
- [x] **4.1.3** Resolve scan with invalid token (no auth)
  - POST with `{"token": "invalid.token"}`
  - Expected: Status 401, error code `INVALID_QR` ✓
- [x] **4.1.4** Rate limiting on scan endpoint
  - Rapid requests to `/v1/scan/resolve` are rate-limited
  - Expected: Returns 429 with `RATE_LIMITED` after threshold ✓
- [x] **4.1.5** Optional auth on scan endpoint
  - Scan with valid Bearer token attaches userId to scan event
  - Scan without auth works with userId null ✓

### 4.2 Navigation Sessions
**Requirement:** Users can track navigation sessions

- [x] **4.2.1** Create navigation session (authenticated)
  - POST `http://localhost:8080/v1/navigation/sessions` with auth token
  - Body: `{"startNodeId": "<id>", "endNodeId": "<id>", "algorithm": "astar"}`
  - Expected: Status 201, returns session object ✓
- [x] **4.2.2** Complete navigation session
  - PATCH `http://localhost:8080/v1/navigation/sessions/:id/complete`
  - Body: `{"status": "completed", "durationSec": 120}`
  - Expected: Status 200, session status updated to completed ✓
- [x] **4.2.3** List user's sessions
  - GET `http://localhost:8080/v1/navigation/sessions/me` with auth token
  - Expected: Status 200, returns array of sessions ✓
- [x] **4.2.4** Cannot complete another user's session
  - Try to complete session belonging to different user
  - Expected: Status 403 ✓
- [x] **4.2.5** Cancel navigation session
  - Complete with status `cancelled`
  - Expected: Session status updated to cancelled ✓

### 4.3 Graph Snapshot (Offline Cache)
**Requirement:** Provide versioned graph for mobile/offline use

- [x] **4.3.1** Get graph snapshot (authenticated)
  - GET `http://localhost:8080/v1/graph/snapshot` with auth token
  - Expected: Status 200, contains `graphRevision`, `buildings`, `floors`, `nodes`, `edges` ✓
- [x] **4.3.2** Snapshot structure valid
  - Verify all arrays are present
  - Expected: nodes and edges arrays have data with seeded campus ✓
- [x] **4.3.3** Snapshot includes full graph data
  - Buildings, floors with relations, nodes with coordinates, edges with costs
  - Expected: Complete graph data for offline caching ✓

### 4.4 Monitoring (Admin Only)
**Requirement:** Admin can view usage statistics

- [x] **4.4.1** Non-admin cannot access monitoring
  - GET `http://localhost:8080/v1/monitoring/summary` with user token
  - Expected: Status 403 ✓
- [x] **4.4.2** Unauthenticated cannot access monitoring
  - GET without token
  - Expected: Status 401 ✓
- [x] **4.4.3** Admin can access monitoring
  - GET with admin token
  - Expected: Status 200, contains `scans` and `sessions` objects ✓
- [x] **4.4.4** Monitoring shows correct data structure
  - Verify `scans.total`, `scans.last24h`, `sessions.total`, `sessions.active`, `topScannedNodes`
  - Expected: All fields present with correct types ✓

### 4.5 Integration Flow
**End-to-end public navigation flow**

- [x] **4.5.1** Public user scans QR at entrance (no login)
  - POST scan/resolve with valid token
  - Expected: Location identified successfully ✓
- [x] **4.5.2** User can compute route (via existing routing endpoints)
  - Use `/v1/routes/shortest` with start/end nodes
  - Expected: Route returned with path and distance ✓
- [x] **4.5.3** Authenticated user can save navigation session
  - Login and create session tracking the journey
  - Expected: Session recorded in database ✓
- [x] **4.5.4** Scan events logged
  - All scan attempts logged to ScanEvent table
  - Invalid tokens logged with reason `INVALID_TOKEN` ✓

## API Endpoints Tested

| Method | Endpoint | Auth | Status | Notes |
|---|---|---|---|---|
| POST | /v1/scan/resolve | None (public) | 200/401/429 | Rate limited, optional auth for logging |
| POST | /v1/navigation/sessions | User/Admin | 201 | Create session |
| PATCH | /v1/navigation/sessions/:id/complete | User/Admin | 200/403/404 | Complete/cancel session |
| GET | /v1/navigation/sessions/me | User/Admin | 200 | List user's sessions |
| GET | /v1/graph/snapshot | User/Admin | 200 | Versioned graph snapshot |
| GET | /v1/monitoring/summary | Admin only | 200/401/403 | Usage statistics |

## Database Changes
- [x] Added `ScanEvent` model with tokenHash, nodeId, userId, ip, userAgent, success, reason, scannedAt
- [x] Added `NavigationSession` model with startNodeId, endNodeId, status, algorithm, distanceM, routeJson, timestamps
- [x] Added `NavigationSessionStatus` enum (active, completed, cancelled)
- [x] Added relations to User and Node models
- [x] Migration `20261024153016_phase4_scan_nav_monitoring` applied

## Notes
- QR scanning is now public for web/mobile public use as requested
- Admin features require authentication with admin role
- Rate limiting applied to public scan endpoint (30 requests/minute)
- All scan events are logged regardless of authentication status
- Optional authentication supported on scan endpoint for tracking logged-in users
- Graph snapshot provides versioned data for offline caching
- Navigation sessions track user journeys for analytics

## Sign-off
- [x] All manual tests passed
- [x] All automated tests passed (43/43)
- [x] Public QR scanning works without authentication
- [x] Navigation session tracking works
- [x] Monitoring restricted to admins
- [x] Graph snapshot available for offline use
- [x] Ready for Phase 5 (Mobile/Web App)

**Tester:** Anoop K Surendran & Opencode  
**Date:** 2026-10-25  
**Status:** VERIFIED - PHASE 4 COMPLETE
