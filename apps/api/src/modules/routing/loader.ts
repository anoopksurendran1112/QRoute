// Graph loader from DB and fixtures

import { prisma } from "../../lib/prisma.ts";
import { buildGraph } from "./graph.ts";
import type { RoutingEdge, RoutingGraph, RoutingNode } from "./types.ts";

export async function loadGraphFromDb(): Promise<RoutingGraph> {
  const nodes = await prisma.node.findMany({
    include: {
      floor: {
        include: {
          building: true,
        },
      },
    },
  });

  const edges = await prisma.edge.findMany();

  const routingNodes: RoutingNode[] = nodes.map((n) => ({
    id: n.id,
    floorId: n.floorId,
    buildingId: n.floor.buildingId,
    level: n.floor.level,
    x: Number(n.x),
    y: Number(n.y),
    kind: n.kind as RoutingNode["kind"],
    code: n.code,
    label: n.label,
    metersPerPixel: Number(n.floor.metersPerPixel),
  }));

  const routingEdges: RoutingEdge[] = edges.map((e) => ({
    id: e.id,
    from: e.fromNodeId,
    to: e.toNodeId,
    costM: Number(e.costM),
    kind: e.kind as RoutingEdge["kind"],
    accessible: e.accessible,
    bidirectional: e.bidirectional,
  }));

  return buildGraph(routingNodes, routingEdges);
}

export function loadGraphFromFixture(fixture: {
  nodes: RoutingNode[];
  edges: RoutingEdge[];
}): RoutingGraph {
  return buildGraph(fixture.nodes, fixture.edges);
}

export function exportGraphToFixture(graph: RoutingGraph): {
  nodes: RoutingNode[];
  edges: RoutingEdge[];
} {
  const nodes = Array.from(graph.nodes.values());
  const edges: RoutingEdge[] = [];
  
  for (const edgeList of graph.adjacency.values()) {
    for (const edge of edgeList) {
      // Avoid duplicates from bidirectional edges
      if (!edge.id.endsWith("_rev")) {
        edges.push(edge);
      }
    }
  }
  
  return { nodes, edges };
}
