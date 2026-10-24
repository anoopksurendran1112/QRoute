// Routing service - resolves IDs, loads graph, computes routes

import type { RouteComputeInput } from "@qroute/shared";
import { ApiError } from "../../lib/apiError.ts";
import { prisma } from "../../lib/prisma.ts";
import { findPathAStar } from "./astar.ts";
import { findPathDijkstra } from "./dijkstra.ts";
import { loadGraphFromDb } from "./loader.ts";
import type { PathResult } from "./types.ts";

export interface RouteComputeResult {
  dijkstra?: PathResult;
  astar?: PathResult;
  agreed: boolean;
}

async function resolveNodeId(
  nodeId?: string,
  classroomId?: string,
): Promise<string> {
  if (nodeId) {
    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) {
      throw new ApiError(404, "NOT_FOUND", `Node not found: ${nodeId}`);
    }
    return node.id;
  }

  if (classroomId) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) {
      throw new ApiError(404, "NOT_FOUND", `Classroom not found: ${classroomId}`);
    }
    if (!classroom.entranceNodeId) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        `Classroom ${classroom.roomNumber} has no entrance node bound`,
      );
    }
    return classroom.entranceNodeId;
  }

  throw new ApiError(400, "VALIDATION_ERROR", "No start location provided");
}

export async function computeRoute(input: RouteComputeInput): Promise<RouteComputeResult> {
  const startNodeId = await resolveNodeId(input.startNodeId, input.startClassroomId);
  const endNodeId = await resolveNodeId(input.endNodeId, input.endClassroomId);

  const graph = await loadGraphFromDb();

  const algorithm = input.algorithm ?? "astar";

  if (algorithm === "dijkstra") {
    const result = findPathDijkstra(graph, startNodeId, endNodeId);
    return { dijkstra: result, agreed: true };
  }

  if (algorithm === "astar") {
    const result = findPathAStar(graph, startNodeId, endNodeId);
    return { astar: result, agreed: true };
  }

  // both
  const dijkstra = findPathDijkstra(graph, startNodeId, endNodeId);
  const astar = findPathAStar(graph, startNodeId, endNodeId);

  const agreed =
    dijkstra.found === astar.found &&
    (!dijkstra.found || Math.abs(dijkstra.totalCostM - astar.totalCostM) < 0.01);

  return { dijkstra, astar, agreed };
}
