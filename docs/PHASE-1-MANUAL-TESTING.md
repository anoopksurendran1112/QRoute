# Phase 1 Manual Testing Guide - QR-Based Indoor Navigation System (QRoute)

This guide is for manual testing of all Phase 1 functionality. Update this document after each phase verification to include testing instructions for the next phase.

**Last Updated:** 2026-10-24  
**Phase:** 1 - Foundation & Data Model  
**Status:** VERIFIED - Phase 1 Complete

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

### 4. Run Migrations & Seed (if needed)
```bash
cd apps/api
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run seed:verify
```

---

## Phase 1 Verification Checklist

Run these automated checks first:

```bash
# Schema validation
npm --prefix apps/api run prisma:validate

# Type checking
npm run typecheck

# API tests
npm --prefix apps/api run test

# Admin tests  
npm --prefix apps/admin run test

# Build all
npm run build
```

**Expected Results:**
- [x] Prisma schema valid
- [x] Typecheck passes for all workspaces
- [x] API tests pass (auth + catalog + seed + harness)
- [x] Admin tests pass (auth + catalog)
- [x] All builds succeed

---

## Manual Testing Instructions

### A. API Health & Infrastructure

#### Test 1: Health Endpoint
1. Start API server: `npm run dev:api` (or `cd apps/api && npm run dev`)
2. Open browser/curl: `http://localhost:8080/v1/health`
3. **Expected:** 
```json
{
  "status": "ok",
  "db": "ok",
  "uptimeSeconds": <number>
}
```

#### Test 2: Database Connection
- Verify MySQL is accessible on `127.0.0.1:3307`
- Check tables exist via Prisma Studio: `cd apps/api && npx prisma studio --config prisma7.config.ts`

### B. Authentication (AUTH-01)

#### Test 3: Login as Admin
**Endpoint:** `POST http://localhost:8080/v1/auth/login`  
**Body:**
```json
{
  "email": "admin@sjcet.local",
  "password": "Admin@12345!"
}
```
**Expected:** 200 OK with JWT token
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "...",
    "email": "admin@sjcet.local",
    "name": "...",
    "role": "admin"
  }
}
```

#### Test 4: Login as Regular User
**Endpoint:** `POST http://localhost:8080/v1/auth/login`  
**Body:**
```json
{
  "email": "student@sjcet.local",
  "password": "Student@12345!"
}
```
**Expected:** 200 OK with role "user"

#### Test 5: Invalid Credentials
**Endpoint:** `POST http://localhost:8080/v1/auth/login`  
**Body:** `{"email":"wrong@test.com","password":"wrong"}`  
**Expected:** 401 Unauthorized with identical message (prevents enumeration)

#### Test 6: Rate Limiting
Make 11 rapid login attempts to `/v1/auth/login` from same IP  
**Expected:** After 10 requests, 11th should return 429 Too Many Requests

#### Test 7: Role-Based Access
- Use admin token to access admin-only endpoint → should work
- Use user token to access admin-only endpoint → should return 403 Forbidden

### C. Seeded Campus Data (SEED-01)

#### Test 8: Verify Seed Data
Run: `cd apps/api && npm run seed:verify`  
**Expected:** All 10 invariants pass (4 buildings, 11 floors, 22 classrooms, 5 departments, 10 faculty, 82 nodes, 82 edges, 2 users)

#### Test 9: Check Seed via API/Prisma
Use Prisma Studio or API to verify:
- Buildings: MAIN, CSB, LIB (and possibly others)
- Floors have `metersPerPixel` set (non-null)
- Classrooms have floor and department relations
- Nodes and Edges exist for graph

### D. Admin Panel - Authentication

#### Test 10: Admin Panel Login
1. Start admin: `npm run dev:admin` (or `cd apps/admin && npm run dev`)
2. Open `http://localhost:5173`
3. Should redirect to `/login`
4. Login with admin credentials
5. **Expected:** Redirect to dashboard, shows user email and role

#### Test 11: Non-Admin Access Blocked
Try to login with student credentials  
**Expected:** Access denied or redirected (RequireAdmin blocks non-admins)

#### Test 12: Logout
Click sign out from dashboard  
**Expected:** Redirect to login, token cleared

### E. Admin Panel - Catalog CRUD (ADMIN-01)

#### Test 13: Buildings CRUD
Navigate to `/catalog/buildings`

**Create:**
1. Click "New building"
2. Fill: Code="TEST", Name="Test Building", Campus="Test Campus"
3. Click "Create"
4. **Expected:** Building appears in table, no page reload

**Edit:**
1. Click "Edit" on a building
2. Change name
3. Click "Save"
4. **Expected:** Updated in table

**Delete (Success):**
1. Create a test building with no children
2. Click "Delete", confirm
3. **Expected:** Building removed from table

**Delete (Conflict - 409):**
1. Try to delete MAIN building (has floors)
2. Click "Delete", confirm
3. **Expected:** Error message "Building MAIN still has X floor(s). Delete the floors first."

#### Test 14: Floors CRUD
Navigate to `/catalog/floors`

**Verify Calibration Visibility:**
- Table should show `metersPerPixel` column with values like "0.02"
- **Expected:** Calibration is visible

**Create Floor:**
1. Click "New floor"
2. Select building, enter level, metersPerPixel (e.g., 0.02)
3. Click "Create"
4. **Expected:** Floor appears with calibration shown

#### Test 15: Classrooms CRUD
Navigate to `/catalog/classrooms`

**Verify Entrance Visibility:**
- Table should show entrance node binding status (Yes/No)
- **Expected:** Can see if entrance is bound

**Create Classroom:**
1. Click "New classroom"
2. Fill room number, select floor, select department, optionally set entranceNodeId
3. Click "Create"
4. **Expected:** Classroom appears

#### Test 16: Departments CRUD
Navigate to `/catalog/departments`
Test create/edit/delete similarly

#### Test 17: Faculty CRUD
Navigate to `/catalog/faculty`
Test create/edit/delete similarly

### F. Form Validation

#### Test 18: Client-Side Validation
Try to submit forms with invalid data:
- Building with empty code/name
- Floor with negative or non-numeric metersPerPixel
- Classroom with missing required fields

**Expected:** Field-level validation errors shown before API call

#### Test 19: Server Validation Errors
Submit data that passes client validation but fails server (if possible)
**Expected:** API error message displayed in form

### G. Navigation & UX

#### Test 20: Navigation
- Dashboard has links to all 5 catalog pages
- All links work
- Sign out button accessible from all pages
- Routes are guarded (can't access without login/admin)

#### Test 21: Data Refresh
Create/edit/delete should update tables without manual refresh (React Query invalidation working)

---

## Testing Notes

### Known Issues to Check
- [ ] MySQL connection on port 3307 (not 3306 as in some examples)
- [ ] Smoke health test may fail due to mariadb/RSA issues in this environment - use manual API test instead
- [ ] Decimal values displayed as strings (metersPerPixel) - this is correct per design

### Test Credentials
- **Admin:** admin@sjcet.local / Admin@12345!
- **User:** student@sjcet.local / Student@12345!

### API Base URLs
- API: http://localhost:8080
- Admin: http://localhost:5173

---

## Phase 1 Sign-Off

All automated and manual tests have been executed and passed:

- [x] All automated checks pass
- [x] All manual tests pass
- [x] Phase 1 success criteria met:
  1. Users can register and log in with role-based access (admins distinguished from regular users) ✓
  2. Admin can create, edit and delete buildings, floors, classrooms, departments and faculty ✓
  3. A seeded synthetic campus exists and is loadable for demonstration without manual setup ✓
- [x] Browser CRUD testing completed via Playwright for all entities
- [x] Form validation and optional field handling verified
- [x] Test data cleaned up, only seed data remains

**Tester:** Anoop K Surendran & Opencode  
**Date:** 2026-10-24  
**Status:** VERIFIED - PHASE 1 COMPLETE

---

## Next Phase: Phase 2 - Graph Core & Routing Engine

*This section will be updated after Phase 1 verification is complete and Phase 2 planning begins.*

**Planned Features:**
- Server-side pathfinding with Dijkstra and A*
- Turn-by-turn guidance generation
- Metre calibration over graph
- Floor transitions via stairs/lifts
- Route computation across buildings and floors

**Dependencies:** Phase 1 complete (Node/Edge models already exist with 82 nodes, 82 edges seeded)
