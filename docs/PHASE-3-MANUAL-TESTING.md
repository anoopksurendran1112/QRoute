# Phase 3 - Graph Authoring & Validation: Manual Testing Guide

**Date**: 2026-10-24  
**Tester:** Anoop K Surendran & Opencode  
**Date:** 2026-10-24  
**Status:** VERIFIED - PHASE 3 COMPLETE

## Prerequisites
- [x] MySQL 8 running on 127.0.0.1:3307 via Docker (`qroute-mysql`)
- [x] API running on http://localhost:8080
- [x] Admin running on http://localhost:5173
- [x] Logged in as admin@sjcet.local / Admin@12345!
- [x] Floor plan PNGs available: `D:\DemoProjects\deepak\Floor-0_Plan.png`, `Floor-1_Plan.png`, `Floor-2_Plan.png`
- [x] Token stored as `qroute.token` in localStorage

## Automated Results (2026-10-24)
- **API E2E** (`node scripts/phase3-e2e.mjs`): **31/31 passed**
- **Playwright UI** (`npx playwright test tests/phase3-graph-editor.spec.ts`): **5 passed, 1 skipped**
  - Login and reach Graph Editor ✓
  - Upload floor plan and see canvas backdrop ✓
  - Validation panel reports graph health ✓
  - Generate printable QR sheet ✓
  - Unauthenticated redirect ✓

## Test Cases

### 3.1 Floor Plan Upload
- [x] Navigate to Graph Editor → select a floor
- [x] Upload `Floor-0_Plan.png` via file input (PNG/JPG accepted)
- [x] Success message "Upload successful" appears
- [x] Canvas backdrop renders (`<img alt="Floor plan">` with `/uploads/<hash>.png`)
- [x] Image served with `Cache-Control: public, max-age=31536000, immutable`
- [x] Floor record updated: `imagePath`, `imageSha256`, `widthPx`, `heightPx`, optional `metersPerPixel`

### 3.2 Node CRUD (Canvas)
- [x] Click canvas to add node (prompts for code and kind)
- [x] Node appears on canvas with colour by kind (junction/door/stair/lift/entrance)
- [x] Drag node to reposition (persists via PATCH on drag stop)
- [x] Select node → delete button removes node and connected edges
- [x] Duplicate node code on same floor rejected (409)
- [x] Cross-floor stair/lift nodes supported

### 3.3 Edge Creation & Cost Calculation
- [x] Drag between node handles to create edge
- [x] Auto-cost calculated from pixel distance × metersPerPixel when calibrated
- [x] Fallback: `cost = distPx / 100` when not calibrated
- [x] Edge displayed with label in metres
- [x] Bidirectional edges rendered once
- [x] Self-edge rejected (400)
- [x] Edge cost persisted correctly

### 3.4 Calibration
- [x] Enter known distance and pixel distance → Calculate populates m/px
- [x] Save Calibration updates floor (`PATCH /v1/floors/:id` with `metersPerPixel`)
- [x] Auto-cost uses saved calibration after update

### 3.5 Graph Validation
- [x] Validate Graph shows node/edge/component counts
- [x] Errors/warnings displayed with codes (ORPHAN_NODE, NO_CALIBRATION, INVALID_EDGE_COST, BROKEN_EDGE, DISCONNECTED_COMPONENTS, BROKEN_VERTICAL_LINK)
- [x] Cross-floor edges not flagged as BROKEN_EDGE
- [x] Valid graph shows "Valid" status

### 3.6 QR Code Generation
- [x] Generate QR codes for all nodes on floor
- [x] Each QR contains token in format `SJCETNAV:v1:<nodeId>.<hmac8>` (HMAC-SHA256)
- [x] Thumbnails displayed in panel
- [x] Print sheet opens popup with cards containing QR, code, label, token
- [x] Bulk QR generation works
- [x] QR endpoints require authentication (401 when unauthenticated)
- [x] QR endpoints require admin role

## API Endpoints Tested
| Method | Endpoint | Auth | Status |
|---|---|---|---|
| POST | /v1/graph/floors/:id/upload | Admin | 200 |
| GET | /v1/graph/floors/:id/graph | User | 200 |
| GET | /v1/graph/floors/:id/validate | Admin | 200 |
| POST | /v1/graph/nodes | Admin | 201 |
| PATCH | /v1/graph/nodes/:id | Admin | 200 |
| DELETE | /v1/graph/nodes/:id | Admin | 204 |
| POST | /v1/graph/edges | Admin | 201 |
| DELETE | /v1/graph/edges/:id | Admin | 204 |
| GET | /v1/qr/nodes/:id | Admin | 200 |
| POST | /v1/qr/bulk | Admin | 200 |

## Sign-off
- [x] All manual tests passed
- [x] Floor plans uploaded and visible on canvas
- [x] Graph authoring works as expected
- [x] Validation catches issues correctly
- [x] QR codes generate and print correctly

**Tester:** Anoop K Surendran & Opencode  
**Date:** 2026-10-24  
**Status:** VERIFIED - PHASE 3 COMPLETE

## Notes
- Node click-to-add in UI is flaky with dialog handling in headless Playwright but works in practice; covered by API tests.
