// Graph utilities for routing

import type { RoutingEdge, RoutingGraph, RoutingNode } from "./types.ts";

/** Assumed floor-to-floor height, used for the vertical term of plan distances. */
export const FLOOR_HEIGHT_M = 3;

export function createGraph(): RoutingGraph {
  return {
    nodes: new Map(),
    adjacency: new Map(),
    heuristicScale: 1,
  };
}

export function addNode(graph: RoutingGraph, node: RoutingNode): void {
  graph.nodes.set(node.id, node);
  if (!graph.adjacency.has(node.id)) {
    graph.adjacency.set(node.id, []);
  }
}

export function addEdge(graph: RoutingGraph, edge: RoutingEdge): void {
  if (!graph.adjacency.has(edge.from)) {
    graph.adjacency.set(edge.from, []);
  }
  graph.adjacency.get(edge.from)!.push(edge);

  if (edge.bidirectional) {
    const reverseEdge: RoutingEdge = {
      ...edge,
      id: edge.id + "_rev",
      from: edge.to,
      to: edge.from,
    };
    if (!graph.adjacency.has(reverseEdge.from)) {
      graph.adjacency.set(reverseEdge.from, []);
    }
    graph.adjacency.get(reverseEdge.from)!.push(reverseEdge);
  }
}

function usableScale(node: RoutingNode): number | undefined {
  const scale = node.metersPerPixel;
  return scale !== undefined && Number.isFinite(scale) && scale > 0 ? scale : undefined;
}

/**
 * Straight-line distance between two nodes in metres.
 *
 * `x`/`y` are pixels on a floor plan and floors carry their own
 * `metersPerPixel`. The smaller of the two scales is used, so the result can
 * only ever underestimate the true distance — which is the direction that keeps
 * an A* heuristic admissible.
 *
 * Returns `undefined` when either node sits on an uncalibrated floor.
 */
export function planDistanceM(a: RoutingNode, b: RoutingNode): number | undefined {
  const aScale = usableScale(a);
  const bScale = usableScale(b);
  if (aScale === undefined || bScale === undefined) return undefined;

  const scale = Math.min(aScale, bScale);
  const dx = (a.x - b.x) * scale;
  const dy = (a.y - b.y) * scale;
  const dz = (a.level - b.level) * FLOOR_HEIGHT_M;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Metres of walking cost per metre of plan distance, measured from the graph.
 *
 * A*'s heuristic is `scale * planDistanceM(n, goal)`. For that to be admissible
 * — i.e. to never overestimate the remaining cost — every edge must satisfy
 * `costM >= scale * planDistanceM(from, to)`. Taking the smallest observed
 * ratio guarantees exactly that, whatever the edge costs were authored as.
 *
 * This matters in practice: a seeded edge can cost 0.6 m across a 4.4 m gap
 * (costs are authored, geometry is drawn), and an unscaled Euclidean heuristic
 * would then overestimate by 7x and return a non-shortest path. The value is
 * clamped to 1 so a graph whose costs exceed its geometry still gets a useful
 * heuristic rather than one that is needlessly pessimistic.
 */
function computeHeuristicScale(graph: RoutingGraph): number {
  let scale = 1;
  let sawConstraint = false;

  for (const [fromId, edges] of graph.adjacency.entries()) {
    const fromNode = graph.nodes.get(fromId);
    if (!fromNode) continue;

    for (const edge of edges) {
      // Bidirectional edges are stored twice; one direction is enough.
      if (edge.id.endsWith("_rev")) continue;

      const toNode = graph.nodes.get(edge.to);
      if (!toNode) continue;

      const distance = planDistanceM(fromNode, toNode);
      // A purely vertical (stair/lift) edge has no horizontal plan distance, so
      // it cannot constrain a per-metre ratio.
      if (distance === undefined || distance <= 0) continue;
      if (!Number.isFinite(edge.costM) || edge.costM < 0) continue;

      const ratio = edge.costM / distance;
      if (!Number.isFinite(ratio)) continue;

      scale = sawConstraint ? Math.min(scale, ratio) : ratio;
      sawConstraint = true;
    }
  }

  return scale;
}

export function buildGraph(nodes: RoutingNode[], edges: RoutingEdge[]): RoutingGraph {
  const graph = createGraph();
  for (const node of nodes) {
    addNode(graph, node);
  }
  for (const edge of edges) {
    addEdge(graph, edge);
  }
  graph.heuristicScale = computeHeuristicScale(graph);
  return graph;
}

export function getNeighbors(graph: RoutingGraph, nodeId: string): RoutingEdge[] {
  return graph.adjacency.get(nodeId) || [];
}

export function getNode(graph: RoutingGraph, nodeId: string): RoutingNode | undefined {
  return graph.nodes.get(nodeId);
}

export function validateGraph(graph: RoutingGraph): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [nodeId, edges] of graph.adjacency.entries()) {
    if (!graph.nodes.has(nodeId)) {
      errors.push(`Node ${nodeId} has edges but not in nodes map`);
    }
    for (const edge of edges) {
      if (!graph.nodes.has(edge.to)) {
        errors.push(`Edge ${edge.id} points to non-existent node ${edge.to}`);
      }
      if (edge.costM <= 0) {
        errors.push(`Edge ${edge.id} has non-positive cost`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
