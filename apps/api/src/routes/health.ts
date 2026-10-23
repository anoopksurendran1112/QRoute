import { Router } from "express";
import { prisma } from "../lib/prisma.ts";

export const healthRouter = Router();

// The only probe in the system that proves the database is actually reachable.
// A 200 here means the HTTP stack, the driver adapter and MySQL are all alive.
healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      db: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (error) {
    // The real driver message can carry host, port and user names. Log it, do
    // not return it (threat T-01-06).
    _req.log.error({ err: error }, "health check failed: database unreachable");
    res.status(503).json({
      status: "degraded",
      db: "unreachable",
      error: "database unreachable",
    });
  }
});
