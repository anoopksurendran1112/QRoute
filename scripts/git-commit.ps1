Set-Location "D:\DemoProjects\deepak"
git add -A
git reset Floor-0_Plan.png Floor-1_Plan.png Floor-2_Plan.png 2>$null
$files = git diff --cached --name-only | Where-Object { $_ -notmatch '\.png$' }
$files | ForEach-Object { Write-Host $_ }
git commit -m "Phase 2 & 3 complete: routing engine + graph authoring/validation with QR

- Phase 2: Dijkstra/A* pathfinding, turn-by-turn, meter calibration, tests
- Phase 3: floor plan upload + React Flow editor, node/edge CRUD, calibration, validation, QR generation/printing
- API/UI e2e verified, docs updated, manual testing signed off by Anoop K Surendran & Opencode"
git push origin main
