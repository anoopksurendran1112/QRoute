// Graph validation service

import { ApiError } from "../../lib/apiError.ts";
import { prisma } from "../../lib/prisma.ts";

export interface ValidationIssue {
  type: "error" | "warning";
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    componentCount: number;
  };
}

export async function validateFloorGraph(floorId: string): Promise<ValidationResult> {
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

  const issues: ValidationIssue[] = [];
  const nodes = floor.nodes;
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Edges may legitimately point at nodes on another floor (stairs/lifts), so
  // existence must be checked against the whole graph, not just this floor.
  const referencedIds = new Set<string>();
  for (const node of nodes) {
    for (const edge of node.edgesFrom) referencedIds.add(edge.toNodeId);
  }
  const existing = await prisma.node.findMany({
    where: { id: { in: [...referencedIds] } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((n) => n.id));

  // Check for orphan nodes (no edges)
  for (const node of nodes) {
    const hasEdges = node.edgesFrom.length > 0 || node.edgesTo.length > 0;
    if (!hasEdges && nodes.length > 1) {
      issues.push({
        type: "warning",
        code: "ORPHAN_NODE",
        message: `Node ${node.code} has no connected edges`,
        nodeId: node.id,
      });
    }
  }

  // Check for missing floor plan calibration
  if (!floor.metersPerPixel) {
    issues.push({
      type: "warning",
      code: "NO_CALIBRATION",
      message: "Floor has no metersPerPixel calibration set",
    });
  }

  // Check for edges with invalid costs
  for (const node of nodes) {
    for (const edge of node.edgesFrom) {
      if (!edge.costM || Number(edge.costM) <= 0) {
        issues.push({
          type: "error",
          code: "INVALID_EDGE_COST",
          message: `Edge has invalid cost`,
          edgeId: edge.id,
        });
      }
      if (!nodeIds.has(edge.toNodeId) && !existingIds.has(edge.toNodeId)) {
        issues.push({
          type: "error",
          code: "BROKEN_EDGE",
          message: `Edge references non-existent node`,
          edgeId: edge.id,
        });
      }
    }
  }

  // Vertical circulation nodes must actually be wired into a stair/lift edge,
  // otherwise a route can reach the stairwell and stop dead.
  for (const node of nodes) {
    if (node.kind !== "stair" && node.kind !== "lift") continue;
    const allEdges = [...node.edgesFrom, ...node.edgesTo];
    const hasVertical = allEdges.some((e) => e.kind === "stair" || e.kind === "lift");
    if (!hasVertical) {
      issues.push({
        type: "warning",
        code: "BROKEN_VERTICAL_LINK",
        message: `${node.kind} node ${node.code} has no stair/lift edge connecting it to another floor`,
        nodeId: node.id,
      });
    }
  }

  // Find disconnected components
  const visited = new Set<string>();
  let componentCount = 0;

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    componentCount++;
    const stack = [node.id];
    visited.add(node.id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      const currentNode = nodes.find((n) => n.id === current);
      if (!currentNode) continue;
      for (const edge of currentNode.edgesFrom) {
        if (!visited.has(edge.toNodeId)) {
          visited.add(edge.toNodeId);
          stack.push(edge.toNodeId);
        }
      }
      for (const edge of currentNode.edgesTo) {
        if (!visited.has(edge.fromNodeId)) {
          visited.add(edge.fromNodeId);
          stack.push(edge.fromNodeId);
        }
      }
    }
  }

  if (componentCount > 1 && nodes.length > 0) {
    issues.push({
      type: "warning",
      code: "DISCONNECTED_COMPONENTS",
      message: `Graph has ${componentCount} disconnected components`,
    });
  }

  const hasErrors = issues.some((i) => i.type === "error");

  return {
    valid: !hasErrors,
    issues,
    stats: {
      nodeCount: nodes.length,
      edgeCount: nodes.reduce((sum, n) => sum + n.edgesFrom.length, 0),
      componentCount,
    },
  };
}
