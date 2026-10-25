# Phase 5: Public Web Navigation App - Context

**Phase:** 5  
**Goal:** Deliver the complete navigation experience for end users via a mobile-responsive React web app (apps/web). Users can scan QR codes, search destinations, view routes on interactive floor maps, and get checkpoint-based turn-by-turn guidance.  
**Depends on:** Phase 4 (API & QR System)  
**Requirements:** SRCH-01, MAP-01  

## Decisions

### Scope
- **Web-only:** Drop Flutter mobile app. Focus entirely on `apps/web` (React + Vite + TypeScript + Tailwind).
- **No auth required:** Public-facing app. Anyone can scan QR codes or search for routes.
- **Mobile-first:** Optimized for phones (since users will scan with their own devices).
- **Leverage existing APIs:** Use all Phase 4 endpoints (`/v1/scan/resolve`, `/v1/graph/snapshot`, route APIs) without creating new ones unless absolutely necessary.

### UX Flow
1. **Home** (`/`) - Clear entry points: "Scan QR Code" or "Search Destination"
2. **Scan** (`/scan`) - Use camera via `html5-qrcode` to scan QR codes placed around campus. Also handle direct token URLs (`/scan/:token`). On success, resolve location and proceed to route/search flow.
3. **Search** (`/search`) - Search destinations by room number, classroom name, department, faculty, building, or floor. Show results with context (building/floor/room).
4. **Route/Map** (`/route`) - Show origin (from scan or manual) and destination. Display interactive floor map with route overlay drawn on it. Allow switching floors if route spans multiple floors.
5. **Guidance** (`/guide`) - Checkpoint-based turn-by-turn instructions with clear next steps, floor transitions (stairs/elevators), and progress indicator.

### Technical
- **Tech stack:** React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, react-router-dom, html5-qrcode
- **Map rendering:** Render floor plan images with route overlay. Can adapt the admin's canvas approach to be read-only (simpler overlay). Use SVG or canvas for drawing path nodes/edges.
- **Data fetching:** Fetch graph snapshot on app load for offline resilience. Cache in memory + localStorage as fallback.
- **State management:** Use React hooks + TanStack Query. Keep minimal client state.
- **API base:** Configurable via `VITE_API_BASE` env var (default to `http://localhost:4000`)
- **Integration with shared types:** Use `@qroute/shared` schemas where applicable

### UI/UX Style
- Match the clean, modern aesthetic established in the admin panel (maritime blue theme #006699, clean cards, good mobile spacing)
- Prioritize clarity for on-the-go use (large touch targets, readable text)
- Show loading states and helpful error messages
- Graceful handling of network issues (fallback to cached data)

## Key Constraints
- Must work in mobile browsers (Chrome/Safari on iOS/Android)
- Camera permissions required for QR scanning
- Floor plans must load correctly with proper scaling
- Route must span multiple floors if needed (using stairs/elevators as per graph)
- Keep bundle size reasonable for mobile

## Success Criteria
1. ✅ User can search for a destination classroom by room number, department, faculty, building, or floor
2. ✅ App displays an interactive floor map with the route drawn on it  
3. ✅ App provides turn-by-turn guidance with floor transitions using checkpoint navigation model
