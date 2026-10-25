import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.ts";
import { prisma } from "../../lib/prisma.ts";
import { ApiError } from "../../lib/apiError.ts";

export const navigationRouter = Router();

const startSchema = z.object({
  startNodeId: z.string().min(1),
  endNodeId: z.string().min(1),
  algorithm: z.enum(["dijkstra", "astar"]).optional(),
  distanceM: z.number().optional(),
  routeJson: z.any().optional(),
});

navigationRouter.post("/sessions", requireAuth, async (req, res) => {
  const input = startSchema.parse(req.body);
  const userId = (req as any).user?.sub;
  const session = await prisma.navigationSession.create({
    data: {
      userId,
      startNodeId: input.startNodeId,
      endNodeId: input.endNodeId,
      algorithm: input.algorithm ?? "astar",
      distanceM: input.distanceM,
      routeJson: input.routeJson,
      status: "active",
    },
  });
  res.status(201).json({ session });
});

const completeSchema = z.object({
  status: z.enum(["completed", "cancelled"]),
  durationSec: z.number().int().nonnegative().optional(),
});

navigationRouter.patch("/sessions/:id/complete", requireAuth, async (req, res) => {
  const userId = (req as any).user?.sub;
  const input = completeSchema.parse(req.body);
  const session = await prisma.navigationSession.findUnique({
    where: { id: req.params.id as string },
  });
  if (!session) throw new ApiError(404, "NOT_FOUND", "Session not found");
  if (session.userId && session.userId !== userId) throw new ApiError(403, "FORBIDDEN", "Not your session");
  const updated = await prisma.navigationSession.update({
    where: { id: session.id },
    data: {
      status: input.status,
      durationSec: input.durationSec ?? null,
      endedAt: new Date(),
    },
  });
  res.status(200).json({ session: updated });
});

navigationRouter.get("/sessions/me", requireAuth, async (req, res) => {
  const userId = (req as any).user?.sub;
  const sessions = await prisma.navigationSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  res.status(200).json({ sessions });
});
