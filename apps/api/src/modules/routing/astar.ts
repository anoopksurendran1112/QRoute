// A* algorithm with an admissible 3D heuristic.
//
// Node `x`/`y` are pixels on a floor plan and edge `costM` values are metres,
// so the heuristic must convert pixels to metres before it can be compared with
// an edge cost. Two things make that safe:
//   * `planDistanceM` scales by the floor's `metersPerPixel`, using the smaller
//     of the two floors so the estimate can only undershoot;
//   * `graph.heuristicScale` is measured from the graph's edges, so authored
//     costs that are far below the drawn geometry still cannot be overestimated.
// Comparing raw pixels against metres (the previous behaviour) overestimated by
// ~1/metersPerPixel and made A* return non-shortest paths.

import { getNeighbors, getNode, planDistanceM } from "./graph.ts";
import { MinHeap } from "./heap.ts";
import type { PathResult, RouteMetrics, RoutingGraph, RoutingNode } from "./types.ts";
import { generateDirections } from "./directions.ts";

/**
 * True when both endpoints sit on calibrated floors, i.e. when a metre-based
 * heuristic is meaningful. An uncalibrated floor falls back to `h = 0` (plain
 * Dijkstra) rather than silently guessing.
 */
function canUseHeuristic(startNode: RoutingNode, endNode: RoutingNode): boolean {
  return planDistanceM(startNode, endNode) !== undefined;
}

function heuristic(
  graph: RoutingGraph,
  nodeId: string,
  endId: string,
  useEuclidean: boolean,
): number {
  if (!useEuclidean) return 0;

  const node = getNode(graph, nodeId);
  const endNode = getNode(graph, endId);
  if (!node || !endNode) return 0;

  const distance = planDistanceM(node, endNode);
  if (distance === undefined) return 0;

  return distance * graph.heuristicScale;
}

export function findPathAStar(
  graph: RoutingGraph,
  startId: string,
  endId: string,
): PathResult {
  const startTime = Date.now();
  const metrics: RouteMetrics = {
    nodesExpanded: 0,
    maxFrontier: 0,
    relaxations: 0,
    runtimeMs: 0,
    heuristicUsed: "euclidean3d",
    algorithm: "astar",
  };

  const startNode = getNode(graph, startId);
  const endNode = getNode(graph, endId);

  if (!startNode || !endNode) {
    metrics.runtimeMs = Date.now() - startTime;
    return {
      found: false,
      path: [],
      totalCostM: 0,
      nodes: [],
      instructions: [],
      metrics,
    };
  }

  // Report the heuristic that is actually in force, so an uncalibrated floor
  // cannot masquerade as a win for A*.
  const useEuclidean = canUseHeuristic(startNode, endNode);
  metrics.heuristicUsed = useEuclidean ? "euclidean3d" : "zero";

  const gScore = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  gScore.set(startId, 0);
  heap.push({ nodeId: startId, priority: heuristic(graph, startId, endId, useEuclidean) });

  let maxFrontier = 1;

  while (!heap.isEmpty()) {
    const current = heap.pop();
    if (!current) break;

    if (visited.has(current.nodeId)) continue;
    if (current.nodeId === endId) break;

    visited.add(current.nodeId);
    metrics.nodesExpanded++;

    const neighbors = getNeighbors(graph, current.nodeId);
    maxFrontier = Math.max(maxFrontier, heap.size() + 1);

    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;
      metrics.relaxations++;

      // `??` not `||`: the start node's gScore is 0 and `0 || Infinity` is
      // Infinity, which blocked every relaxation out of the start node.
      const tentativeG = (gScore.get(current.nodeId) ?? Infinity) + edge.costM;
      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        prev.set(edge.to, current.nodeId);
        gScore.set(edge.to, tentativeG);
        const f = tentativeG + heuristic(graph, edge.to, endId, useEuclidean);
        heap.push({ nodeId: edge.to, priority: f });
      }
    }
  }

  metrics.maxFrontier = maxFrontier;

  if (gScore.get(endId) === undefined) {
    metrics.runtimeMs = Date.now() - startTime;
    return {
      found: false,
      path: [],
      totalCostM: 0,
      nodes: [],
      instructions: [],
      metrics,
    };
  }

  // Reconstruct path
  const path: string[] = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    if (current === startId) break;
    current = prev.get(current) || "";
    if (!current) break;
  }

  if (path[0] !== startId) {
    metrics.runtimeMs = Date.now() - startTime;
    return {
      found: false,
      path: [],
      totalCostM: 0,
      nodes: [],
      instructions: [],
      metrics,
    };
  }

  const totalCostM = gScore.get(endId) ?? 0;
  const nodes = path.map((id) => getNode(graph, id)!).filter(Boolean);
  const instructions = generateDirections(graph, path);

  metrics.runtimeMs = Date.now() - startTime;

  return {
    found: true,
    path,
    totalCostM,
    nodes,
    instructions,
    metrics,
  };
}
