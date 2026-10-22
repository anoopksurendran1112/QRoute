# Roadmap: QR-Based Indoor Navigation System

## Phases

- [ ] **Phase 1: Foundation & Data Model** - Monorepo setup, auth/roles, synthetic campus seed, core schema
- [ ] **Phase 2: Graph Core & Routing Engine** - Dijkstra/A* pathfinding, turn-by-turn generation, metre calibration
- [ ] **Phase 3: Graph Authoring & Validation** - Admin graph editor, validation, QR code generation
- [ ] **Phase 4: API & QR System** - Routes, signed tokens, scan resolution, sessions/monitoring
- [ ] **Phase 5: Mobile App** - Scanner, search, map renderer, guidance UI

## Phase Details

### Phase 1: Foundation & Data Model
**Goal**: Establish the data model, authentication, and seeded synthetic campus as the foundation for all features  
**Depends on**: Nothing (first phase)  
**Requirements**: AUTH-01, SEED-01, ADMIN-01  
**Success Criteria** (what must be TRUE):
  1. Users can register and log in with role-based access (admins distinguished from regular users)
  2. Admin can create, edit and delete buildings, floors, classrooms, departments and faculty
  3. A seeded synthetic campus exists and is loadable for demonstration without manual setup  
**Plans**: TBD

### Phase 2: Graph Core & Routing Engine
**Goal**: Implement server-side pathfinding with Dijkstra and A* over a metre-calibrated graph with turn-by-turn guidance  
**Depends on**: Phase 1  
**Requirements**: PATH-01, GUIDE-01  
**Success Criteria** (what must be TRUE):
  1. System computes shortest paths across buildings and floors using a weighted graph
  2. Route includes floor transitions via stairs or lifts
  3. App delivers turn-by-turn guidance derived from the computed path  
**Plans**: TBD

### Phase 3: Graph Authoring & Validation
**Goal**: Enable admins to build and validate the navigation graph over floor plans with QR code generation  
**Depends on**: Phase 1, Phase 2  
**Requirements**: ADMIN-02, QR-01  
**Success Criteria** (what must be TRUE):
  1. Admin can upload a floor plan and draw the walkable node/edge graph over it
  2. Graph validation catches disconnected components, orphan nodes, and broken vertical links
  3. Admin can generate, download and print QR codes for graph nodes  
**Plans**: TBD
**UI hint**: yes

### Phase 4: API & QR System
**Goal**: Wire graph and routing to secure endpoints for scanning, location resolution, and usage monitoring  
**Depends on**: Phase 2, Phase 3  
**Requirements**: SCAN-01, MON-01  
**Success Criteria** (what must be TRUE):
  1. User can scan a QR code and have their current location identified via signed tokens
  2. System records navigation sessions and scan events for usage monitoring
  3. API degrades gracefully when graph is cached for offline scenarios  
**Plans**: TBD

### Phase 5: Mobile App
**Goal**: Deliver the complete mobile experience with search, interactive map, and checkpoint-based guidance  
**Depends on**: Phase 4  
**Requirements**: SRCH-01, MAP-01  
**Success Criteria** (what must be TRUE):
  1. User can search for a destination classroom by room number, department, faculty, building, or floor
  2. App displays an interactive floor map with the route drawn on it
  3. App provides turn-by-turn guidance with floor transitions using checkpoint navigation model  
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Data Model | 0/0 | Not started | - |
| 2. Graph Core & Routing Engine | 0/0 | Not started | - |
| 3. Graph Authoring & Validation | 0/0 | Not started | - |
| 4. API & QR System | 0/0 | Not started | - |
| 5. Mobile App | 0/0 | Not started | - |
