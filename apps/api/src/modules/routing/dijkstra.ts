// Dijkstra's algorithm with instrumentation

import { getNeighbors, getNode } from "./graph.ts";
import { MinHeap } from "./heap.ts";
import type { PathResult, RouteMetrics, RoutingGraph } from "./types.ts";
import { generateDirections } from "./directions.ts";

export function findPathDijkstra(
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
    heuristicUsed: "zero",
    algorithm: "dijkstra",
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

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  dist.set(startId, 0);
  heap.push({ nodeId: startId, priority: 0 });

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

      // `??` not `||`: the start node's tentative distance is 0, and `0 || Infinity`
      // is Infinity. That single character made every edge from the start node
      // fail its relaxation test, so no path was ever found.
      const newDist = (dist.get(current.nodeId) ?? Infinity) + edge.costM;
      if (newDist < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, newDist);
        prev.set(edge.to, current.nodeId);
        heap.push({ nodeId: edge.to, priority: newDist });
      }
    }
  }

  metrics.maxFrontier = maxFrontier;

  if (dist.get(endId) === undefined) {
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

  const totalCostM = dist.get(endId) ?? 0;
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
