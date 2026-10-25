import { Router } from "express";
import { requireAuth } from "../../middleware/auth.ts";
import { requireRole } from "../../middleware/requireRole.ts";
import { prisma } from "../../lib/prisma.ts";

export const monitoringRouter = Router();

monitoringRouter.get("/summary", requireAuth, requireRole("admin"), async (_req, res) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [totalScans, scans24h, totalSessions, activeSessions, topNodes] = await Promise.all([
    prisma.scanEvent.count({ where: { success: true } }),
    prisma.scanEvent.count({ where: { success: true, scannedAt: { gte: dayAgo } } }),
    prisma.navigationSession.count(),
    prisma.navigationSession.count({ where: { status: "active" } }),
    prisma.scanEvent.groupBy({
      by: ["nodeId"],
      where: { success: true },
      _count: { nodeId: true },
      orderBy: { _count: { nodeId: "desc" } },
      take: 10,
    }),
  ]);

  res.status(200).json({
    scans: { total: totalScans, last24h: scans24h },
    sessions: { total: totalSessions, active: activeSessions },
    topScannedNodes: topNodes,
  });
});
