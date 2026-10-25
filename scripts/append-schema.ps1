$path = "D:\DemoProjects\deepak\apps\api\prisma\schema.prisma"
Add-Content -Path $path -Value @"

model ScanEvent {
  id        String   @id @default(cuid())
  tokenHash String   @db.VarChar(64)
  nodeId    String
  node      Node     @relation(fields: [nodeId], references: [id])
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  ip        String?  @db.VarChar(45)
  userAgent String?  @db.Text
  success   Boolean  @default(true)
  reason    String?  @db.VarChar(64)
  scannedAt DateTime @default(now())

  @@index([nodeId])
  @@index([userId])
  @@index([scannedAt])
  @@map(\"scan_events\")
}

model NavigationSession {
  id          String                   @id @default(cuid())
  userId      String?
  user        User?                    @relation(fields: [userId], references: [id])
  startNodeId String
  startNode   Node                     @relation(\"NavStart\", fields: [startNodeId], references: [id])
  endNodeId   String
  endNode     Node                     @relation(\"NavEnd\", fields: [endNodeId], references: [id])
  status      NavigationSessionStatus @default(active)
  algorithm   String?                  @db.VarChar(16)
  distanceM   Decimal?                 @db.Decimal(10, 3)
  durationSec Int?
  routeJson   Json?
  startedAt   DateTime                 @default(now())
  endedAt     DateTime?

  @@index([userId])
  @@index([status])
  @@index([startedAt])
  @@map(\"navigation_sessions\")
}
"@
Write-Host "done"
