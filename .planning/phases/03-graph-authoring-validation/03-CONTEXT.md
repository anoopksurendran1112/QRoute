# Phase 3: Graph Authoring & Validation

**Goal:** Enable admins to build and validate the navigation graph over floor plans with QR code generation  
**Depends on:** Phase 1, Phase 2  
**Requirements:** ADMIN-02, QR-01  
**Status:** Complete

## Phase Goal
Turn the static graph from Phase 1 into an authorable, validatable graph. Enable admins to upload floor plans, draw nodes/edges on a canvas, validate the graph structure, and generate QR codes for nodes.

## Success Criteria
1. Admin can upload a floor plan and draw the walkable node/edge graph over it ✓
2. Graph validation catches disconnected components, orphan nodes, and broken vertical links ✓
3. Admin can generate, download and print QR codes for graph nodes ✓

## Plans

- [x] 03-01-PLAN.md — Floor plan upload, storage, and metadata (Wave 1)
- [x] 03-02-PLAN.md — Graph editor API and React Flow canvas (Wave 2)
- [x] 03-03-PLAN.md — Edge costing, calibration, and auto-calculation (Wave 3)
- [x] 03-04-PLAN.md — Graph validation engine (Wave 4)
- [x] 03-05-PLAN.md — QR code generation, printing, and testing (Wave 5)

## Progress
**5 plans planned | 5/5 complete | 100%**

**Verified:** 2026-10-24 by Anoop K Surendran & Opencode — API 31/31, Playwright UI 5/5 passing, all manual tests complete

## Key Deliverables
- Floor plan upload with image processing (multer + sharp)
- React Flow canvas editor for nodes/edges
- Auto-calculation of edge costs in metres from pixel distances
- Graph validation (disconnected components, orphans, vertical links)
- QR code generation with signed tokens
- Print-friendly QR sheets
