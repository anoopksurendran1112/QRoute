// Graph HTTP surface - floor plans, nodes, edges

import { edgeCreateSchema, edgeUpdateSchema, nodeCreateSchema, nodeUpdateSchema } from "@qroute/shared";
import { Router } from "express";
import { ApiError } from "../../lib/apiError.ts";
import { requireAuth } from "../../middleware/auth.ts";
import { requireRole } from "../../middleware/requireRole.ts";
import { upload } from "../../lib/upload.ts";
import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  getFloorGraph,
  updateEdge,
  updateNode,
  uploadFloorPlan,
} from "./service.ts";
import { validateFloorGraph } from "./validation.ts";
import type { ZodType } from "zod";
import { prisma } from "../../lib/prisma.ts";

export const graphRouter = Router();

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Invalid request body",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

// Upload floor plan (admin only)
graphRouter.post(
  "/floors/:id/upload",
  requireAuth,
  requireRole("admin"),
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "VALIDATION_ERROR", "No image file uploaded");
    }
    const metersPerPixel = req.body.metersPerPixel
      ? Number(req.body.metersPerPixel)
      : undefined;
    const floor = await uploadFloorPlan(req.params.id as string, req.file, metersPerPixel);
    res.status(200).json({ floor });
  },
);

// Get floor graph
graphRouter.get("/floors/:id/graph", requireAuth, async (req, res) => {
  const graph = await getFloorGraph(req.params.id as string);
  res.status(200).json({ graph });
});

// Validate floor graph (admin only)
graphRouter.get("/floors/:id/validate", requireAuth, requireRole("admin"), async (req, res) => {
  const result = await validateFloorGraph(req.params.id as string);
  res.status(200).json(result);
});

// Node CRUD (admin only)
graphRouter.post("/nodes", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(nodeCreateSchema, req.body);
  const node = await createNode(input as any);
  res.status(201).json({ node });
});

graphRouter.patch("/nodes/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(nodeUpdateSchema, req.body);
  const node = await updateNode(req.params.id as string, input as any);
  res.status(200).json({ node });
});

graphRouter.delete("/nodes/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await deleteNode(req.params.id as string);
  res.status(204).send();
});

// Edge CRUD (admin only)
graphRouter.post("/edges", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(edgeCreateSchema, req.body);
  const edge = await createEdge(input as any);
  res.status(201).json({ edge });
});

graphRouter.patch("/edges/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(edgeUpdateSchema, req.body);
  const edge = await updateEdge(req.params.id as string, input as any);
  res.status(200).json({ edge });
});

graphRouter.delete("/edges/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await deleteEdge(req.params.id as string);
  res.status(204).send();
});

graphRouter.get("/snapshot", async (_req, res) => {
  const [buildings, floors, nodes, edges] = await Promise.all([
    prisma.building.findMany({ orderBy: { code: "asc" } }),
    prisma.floor.findMany({ include: { building: true }, orderBy: [{ buildingId: "asc" }, { level: "asc" }] }),
    prisma.node.findMany({ orderBy: [{ floorId: "asc" }, { code: "asc" }] }),
    prisma.edge.findMany({ orderBy: [{ fromNodeId: "asc" }] }),
  ]);

  const generatedAt = new Date().toISOString();

  res.status(200).json({
    graphRevision: generatedAt,
    generatedAt,
    buildings,
    floors,
    nodes,
    edges,
  });
});
