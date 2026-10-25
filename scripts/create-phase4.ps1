$dir = "D:\DemoProjects\deepak\.planning\phases\04-api-qr-system"
New-Item -ItemType Directory -Path $dir -Force | Out-Null
@"
# Phase 4: API & QR System

**Goal:** Wire graph and routing to secure endpoints for scanning, location resolution, and usage monitoring  
**Depends on:** Phase 2, Phase 3  
**Requirements:** SCAN-01, MON-01  
**Status:** In Progress

## Phase Goal
Make the navigation stack consumable by end users. Connect signed QR codes to location resolution, allow authenticated users to compute routes, record navigation sessions/scan events for monitoring, and provide a versioned graph snapshot for offline cache.

## Success Criteria
1. User can scan a QR code and have their current location identified via signed tokens
2. System records navigation sessions and scan events for usage monitoring
3. API degrades gracefully when graph is cached for offline scenarios

## Tasks
- [ ] Add Prisma models for ScanEvent and NavigationSession
- [ ] Create scan module with POST /v1/scan/resolve
- [ ] Create navigation module with session management
- [ ] Create monitoring module with admin summary
- [ ] Add graph snapshot endpoint
- [ ] Add shared schemas
- [ ] Wire routes in app.ts
- [ ] Add tests
"@ | Out-File -FilePath "$dir\04-CONTEXT.md" -Encoding utf8
Write-Host "done"
