// A* algorithm with admissible 3D heuristic

import { getNeighbors, getNode } from "./graph.ts";
import { MinHeap } from "./heap.ts";
import type { PathResult, RouteMetrics, RoutingGraph } from "./types.ts";
import { generateDirections } from "./directions.ts";

function heuristic(
  graph: RoutingGraph,
  nodeId: string,
  endId: string,
  useEuclidean: boolean = true,
): number {
  if (!useEuclidean) return 0;

  const node = getNode(graph, nodeId);
  const endNode = getNode(graph, endId);
  if (!node || !endNode) return 0;

  // Euclidean distance in 3D space (x,y in metres, z as floor difference)
  const dx = node.x - endNode.x;
  const dy = node.y - endNode.y;
  const dz = (node.level - endNode.level) * 3; // rough floor height in metres

  // Use Euclidean distance as lower bound (admissible if edge costs >= actual distance)
  // Since edge costs are in metres and represent actual walk distances, this is admissible
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // Ensure admissible - divide by max possible speed factor? Or just use as is
  // For admissibility, h(n) <= h*(n). Euclidean is admissible for grid with unit moves.
  // Here edge costs are actual distances, so Euclidean is admissible as lower bound.
  return dist;
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

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  gScore.set(startId, 0);
  fScore.set(startId, heuristic(graph, startId, endId, true));
  heap.push({ nodeId: startId, priority: fScore.get(startId)! });

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

      const tentativeG = (gScore.get(current.nodeId) || Infinity) + edge.costM;
      if (tentativeG < (gScore.get(edge.to) || Infinity)) {
        prev.set(edge.to, current.nodeId);
        gScore.set(edge.to, tentativeG);
        const f = tentativeG + heuristic(graph, edge.to, endId, true);
        fScore.set(edge.to, f);
        heap.push({ nodeId: edge.to, priority: f });
      }
    }
  }

  metrics.maxFrontier = maxFrontier;

  if (!visited.has(endId) && gScore.get(endId) === undefined) {
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

  const totalCostM = gScore.get(endId) || 0;
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
