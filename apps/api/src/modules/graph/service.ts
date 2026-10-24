// Graph service - floor plan upload and graph management

import fs from "node:fs";
import path from "node:path";
import { ApiError } from "../../lib/apiError.ts";
import { prisma } from "../../lib/prisma.ts";
import { processFloorPlan } from "../../lib/upload.ts";

export async function uploadFloorPlan(
  floorId: string,
  file: Express.Multer.File,
  metersPerPixel?: number,
) {
  const floor = await prisma.floor.findUnique({ where: { id: floorId } });
  if (!floor) {
    throw new ApiError(404, "NOT_FOUND", "Floor not found");
  }

  const fullPath = file.path;
  const processed = await processFloorPlan(fullPath);

  const updated = await prisma.floor.update({
    where: { id: floorId },
    data: {
      imagePath: processed.path,
      imageSha256: processed.sha256,
      widthPx: processed.widthPx,
      heightPx: processed.heightPx,
      ...(metersPerPixel !== undefined ? { metersPerPixel } : {}),
    },
  });

  return updated;
}

export async function getFloorGraph(floorId: string) {
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
    include: {
      nodes: {
        include: {
          edgesFrom: true,
          edgesTo: true,
        },
      },
    },
  });

  if (!floor) {
    throw new ApiError(404, "NOT_FOUND", "Floor not found");
  }

  return floor;
}

export async function createNode(data: {
  floorId: string;
  code: string;
  kind: "junction" | "door" | "stair" | "lift" | "entrance";
  x: number;
  y: number;
  label?: string;
}) {
  const floor = await prisma.floor.findUnique({ where: { id: data.floorId } });
  if (!floor) {
    throw new ApiError(404, "NOT_FOUND", "Floor not found");
  }

  const existing = await prisma.node.findUnique({
    where: { floorId_code: { floorId: data.floorId, code: data.code } },
  });
  if (existing) {
    throw new ApiError(409, "CONFLICT", "Node code already exists on this floor");
  }

  return prisma.node.create({ data });
}

export async function updateNode(
  id: string,
  data: Partial<{
    code: string;
    kind: "junction" | "door" | "stair" | "lift" | "entrance";
    x: number;
    y: number;
    label?: string;
  }>,
) {
  const node = await prisma.node.findUnique({ where: { id } });
  if (!node) {
    throw new ApiError(404, "NOT_FOUND", "Node not found");
  }

  return prisma.node.update({ where: { id }, data });
}

export async function deleteNode(id: string) {
  const node = await prisma.node.findUnique({ where: { id } });
  if (!node) {
    throw new ApiError(404, "NOT_FOUND", "Node not found");
  }

  await prisma.node.delete({ where: { id } });
}

export async function createEdge(data: {
  fromNodeId: string;
  toNodeId: string;
  kind: "walk" | "stair" | "lift";
  costM: number;
  accessible: boolean;
  bidirectional: boolean;
}) {
  if (data.fromNodeId === data.toNodeId) {
    throw new ApiError(400, "VALIDATION_ERROR", "Cannot create edge to self");
  }

  const [from, to] = await Promise.all([
    prisma.node.findUnique({ where: { id: data.fromNodeId } }),
    prisma.node.findUnique({ where: { id: data.toNodeId } }),
  ]);

  if (!from || !to) {
    throw new ApiError(404, "NOT_FOUND", "Node not found");
  }

  return prisma.edge.create({ data });
}

export async function updateEdge(
  id: string,
  data: Partial<{
    kind: "walk" | "stair" | "lift";
    costM: number;
    accessible: boolean;
    bidirectional: boolean;
  }>,
) {
  const edge = await prisma.edge.findUnique({ where: { id } });
  if (!edge) {
    throw new ApiError(404, "NOT_FOUND", "Edge not found");
  }

  return prisma.edge.update({ where: { id }, data });
}

export async function deleteEdge(id: string) {
  const edge = await prisma.edge.findUnique({ where: { id } });
  if (!edge) {
    throw new ApiError(404, "NOT_FOUND", "Edge not found");
  }

  await prisma.edge.delete({ where: { id } });
}
