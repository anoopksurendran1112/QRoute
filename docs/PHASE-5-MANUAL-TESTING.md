# Phase 5 Manual Testing Guide - Web Navigation App

**Phase:** 5 - Web Navigation App  
**Date:** 2026-10-25  
**Status:** Ready for Testing  
**App:** `apps/web` (React + Vite + TypeScript)

## Prerequisites

Before testing, ensure the following services are running:

1. **API Server** (port 4000): `npm run dev:api` from root or `npm run dev` from `apps/api`
2. **Web App** (port 5174): `npm run dev:web` from root or `npm run dev` from `apps/web`
3. **Database** (MySQL): Running via Docker or local instance with seeded data
4. **Admin Panel** (optional, port 5173): For generating QR codes if needed

## Test Environment Setup

- [ ] API server is running at `http://localhost:4000`
- [ ] Web app is running at `http://localhost:5174`
- [ ] Database is seeded with campus data (buildings, floors, classrooms, nodes/edges)
- [ ] At least one QR code exists for testing scan functionality
- [ ] Floor plans are uploaded for map rendering (or test with placeholder)

---

## Test Cases

### 1. Home Page & Navigation Shell (Plan 05-01)

**URL:** `http://localhost:5174/`

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| 5.1.1 | Home page loads | Open `http://localhost:5174/` | QRoute branding, "Scan QR Code" and "Search Destination" buttons visible | ☐ Pass ☐ Fail |
| 5.1.2 | Scan button navigation | Click "Scan QR Code" | Navigates to `/scan` page | ☐ Pass ☐ Fail |
| 5.1.3 | Search button navigation | Click "Search Destination" | Navigates to `/search` page | ☐ Pass ☐ Fail |
| 5.1.4 | Mobile responsive | Resize browser to mobile viewport (375x667) or use dev tools mobile view | Layout adapts, buttons are touch-friendly, no horizontal scroll | ☐ Pass ☐ Fail |
| 5.1.5 | Back navigation | Navigate to any page and use back button | Returns to previous page correctly | ☐ Pass ☐ Fail |

---

### 2. Destination Search (Plan 05-02) - SRCH-01

**URL:** `http://localhost:5174/search`

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| 5.2.1 | Search page loads | Navigate to `/search` | Search input visible, "Start typing to search" message shown | ☐ Pass ☐ Fail |
| 5.2.2 | Search by room number | Type a classroom room number (e.g., "101", "A101") | Results appear showing matching classroom with building/floor | ☐ Pass ☐ Fail |
| 5.2.3 | Search by building name | Type building name (e.g., "Main", "Block A") | Classrooms in that building appear in results | ☐ Pass ☐ Fail |
| 5.2.4 | Search by floor | Type floor name or level (e.g., "Ground", "1") | Classrooms on that floor appear | ☐ Pass ☐ Fail |
| 5.2.5 | Search by department | Type department name | Classrooms associated with department appear | ☐ Pass ☐ Fail |
| 5.2.6 | Search by faculty | Type faculty name | Classrooms associated with faculty appear | ☐ Pass ☐ Fail |
| 5.2.7 | No results handling | Type non-existent search term | "No results found" message displayed | ☐ Pass ☐ Fail |
| 5.2.8 | Select destination | Click on a search result | Navigates to `/route` with destination data in state | ☐ Pass ☐ Fail |
| 5.2.9 | Search is case-insensitive | Type uppercase/lowercase variations | Results match regardless of case | ☐ Pass ☐ Fail |
| 5.2.10 | Results limited | Type broad search term | Results are limited (max ~20) for performance | ☐ Pass ☐ Fail |

---

### 3. QR Code Scanning (Plan 05-01/04)

**URL:** `http://localhost:5174/scan`

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| 5.3.1 | Scan page loads | Navigate to `/scan` | "Start Scanning" button visible, camera preview area shown | ☐ Pass ☐ Fail |
| 5.3.2 | Start camera | Click "Start Scanning" | Camera permission prompt appears (if first time), camera preview starts | ☐ Pass ☐ Fail |
| 5.3.3 | Scan QR code | Point camera at a valid QRoute QR code | Scanning succeeds, navigates to `/route` with origin location | ☐ Pass ☐ Fail |
| 5.3.4 | Cancel scanning | Click "Cancel" while scanning | Camera stops, returns to start screen | ☐ Pass ☐ Fail |
| 5.3.5 | Direct token URL | Navigate to `/scan/<token>` | Automatically resolves token and navigates to route page | ☐ Pass ☐ Fail |
| 5.3.6 | Invalid token handling | Scan/use invalid token | Error message displayed, can try again | ☐ Pass ☐ Fail |
| 5.3.7 | Camera permission denied | Deny camera permission | Appropriate error message shown | ☐ Pass ☐ Fail |

---

### 4. Route Display & Interactive Map (Plan 05-03) - MAP-01

**URL:** `http://localhost:5174/route` (reached from scan or search)

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| 5.4.1 | Route page loads from search | Search and select a destination | Shows origin/destination, map, route summary | ☐ Pass ☐ Fail |
| 5.4.2 | Route page loads from scan | Scan QR code then proceed | Shows scanned location as origin, can search/select destination | ☐ Pass ☐ Fail |
| 5.4.3 | Route calculation | Navigate to route with both origin and destination | Loading state shown, then route calculated and displayed | ☐ Pass ☐ Fail |
| 5.4.4 | Interactive map displays | View route page with calculated route | Floor plan image shown with map container | ☐ Pass ☐ Fail |
| 5.4.5 | Route path drawn on map | View map with route | Blue route line (polyline) drawn between nodes on SVG overlay | ☐ Pass ☐ Fail |
| 5.4.6 | Start marker shown | View map with route | Green circle marker at start point | ☐ Pass ☐ Fail |
| 5.4.7 | End marker shown | View map with route | Red circle marker at end point | ☐ Pass ☐ Fail |
| 5.4.8 | Floor switching | Route spans multiple floors | Floor selector buttons appear, clicking switches floor plan and route overlay | ☐ Pass ☐ Fail |
| 5.4.9 | Zoom in | Click zoom + button or use mouse wheel | Map zooms in (up to 4x) | ☐ Pass ☐ Fail |
| 5.4.10 | Zoom out | Click zoom - button or use mouse wheel | Map zooms out (down to 0.5x) | ☐ Pass ☐ Fail |
| 5.4.11 | Pan/drag map | Click and drag on map (or touch drag on mobile) | Map pans with mouse/touch, cursor changes to grabbing | ☐ Pass ☐ Fail |
| 5.4.12 | Reset zoom | Click reset button | Zoom returns to 1x and position resets to center | ☐ Pass ☐ Fail |
| 5.4.13 | Touch zoom/pan on mobile | Test on mobile device or mobile emulator | Pinch gestures and touch drag work smoothly | ☐ Pass ☐ Fail |
| 5.4.14 | Route summary | View route page | Shows distance in meters and number of steps | ☐ Pass ☐ Fail |
| 5.4.15 | Start navigation button | Click "Start Turn-by-Turn Navigation" | Navigates to `/guide` with route data | ☐ Pass ☐ Fail |
| 5.4.16 | Coordinate scaling | View route on different floor plans | Route markers align correctly with floor plan features | ☐ Pass ☐ Fail |

---

### 5. Turn-by-Turn Guidance (Plan 05-04) - GUIDE-01

**URL:** `http://localhost:5174/guide`

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| 5.5.1 | Guide page loads | Start navigation from route page | Shows route summary (from/to, distance) and directions list | ☐ Pass ☐ Fail |
| 5.5.2 | Step-by-step instructions | View guide page | Numbered steps displayed with clear instructions | ☐ Pass ☐ Fail |
| 5.5.3 | Floor transitions shown | Route includes floor change (stairs/elevator) | Instructions clearly indicate floor changes/transitions | ☐ Pass ☐ Fail |
| 5.5.4 | Step numbering | Count steps | Steps are numbered sequentially starting from 1 | ☐ Pass ☐ Fail |
| 5.5.5 | View on map button | Click "View on Map" | Returns to route page showing the map | ☐ Pass ☐ Fail |
| 5.5.6 | End navigation/Home | Click "Home" in header | Returns to home page | ☐ Pass ☐ Fail |
| 5.5.7 | No guidance fallback | Navigate directly to `/guide` without route data | Shows "No guidance available" with "Start Over" button | ☐ Pass ☐ Fail |
| 5.5.8 | Mobile readability | Test on mobile viewport | Instructions are readable, buttons are accessible | ☐ Pass ☐ Fail |

---

### 6. Graph Caching & Offline Resilience (Plan 05-05)

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| 6.1 | Graph preloading on home | Open home page, check network tab | Graph snapshot fetched on load (or from cache) | ☐ Pass ☐ Fail |
| 6.2 | Caching to localStorage | Load app, check localStorage | `qroute_graph_cache` and `qroute_graph_revision` stored | ☐ Pass ☐ Fail |
| 6.3 | Cache used on subsequent loads | Load home page again | Uses cached data, may refresh in background | ☐ Pass ☐ Fail |
| 6.4 | Route page uses cached graph | Navigate to route page | Loads floors/buildings from cached or fresh snapshot | ☐ Pass ☐ Fail |

---

### 7. End-to-End User Flows

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| 7.1 | Flow: Search → Route → Guide | Home → Search → Select destination → View route/map → Start navigation → Follow guide | Complete flow works smoothly, all data passed correctly | ☐ Pass ☐ Fail |
| 7.2 | Flow: Scan → Route → Guide | Home → Scan QR → Resolve location → Select destination → View route/map → Start navigation → Follow guide | Complete flow works smoothly | ☐ Pass ☐ Fail |
| 7.3 | Multi-floor route | Find route spanning different floors | Floor selector appears, can switch floors, route updates | ☐ Pass ☐ Fail |
| 7.4 | Mobile browser test | Test on actual mobile device (iOS Safari/Android Chrome) | All features work, camera works, touch gestures work | ☐ Pass ☐ Fail |

---

## Automated Testing

### TypeScript Compilation
```bash
cd apps/web
npx tsc --noEmit
```
**Expected:** No errors

### API Tests (Existing)
```bash
cd apps/api
npm test
```
**Expected:** All Phase 1-4 tests pass (43/43 as before)

---

## Playwright Testing (Recommended)

If Playwright is available, run these tests:

```bash
# Install if needed
npm install -D @playwright/test

# Run tests
npx playwright test
```

**Key scenarios to automate:**
- Home page loads and navigation works
- Search functionality
- Route calculation and map display
- Guide page rendering
- Mobile viewport testing

---

## Known Issues & Notes

- **Camera access:** Requires HTTPS in production, works on localhost with HTTP
- **Floor plans:** Map rendering depends on floor plans being uploaded in admin panel
- **Node coordinates:** Route markers depend on nodes having x/y coordinates
- **API dependency:** All features require API server running
- **Browser compatibility:** Best tested on Chrome/Edge/Safari modern versions

---

## Sign-off

**Tester:** ___________________  
**Date:** ___________________  
**Overall Status:** ☐ All Tests Pass ☐ Some Failures (see notes)  
**Notes:** ___________________
