import { describe, expect, it } from "vitest";
import { buildGraph } from "../graph.ts";
import { findPathAStar } from "../astar.ts";
import { findPathDijkstra } from "../dijkstra.ts";
import type { RoutingEdge, RoutingNode } from "../types.ts";

function createTestGraph(): ReturnType<typeof buildGraph> {
  const nodes: RoutingNode[] = [
    { id: "n1", floorId: "f1", buildingId: "b1", level: 0, x: 0, y: 0, kind: "junction", code: "N1", metersPerPixel: 1 },
    { id: "n2", floorId: "f1", buildingId: "b1", level: 0, x: 10, y: 0, kind: "junction", code: "N2", metersPerPixel: 1 },
    { id: "n3", floorId: "f1", buildingId: "b1", level: 0, x: 20, y: 0, kind: "junction", code: "N3", metersPerPixel: 1 },
  ];
  const edges: RoutingEdge[] = [
    { id: "e1", from: "n1", to: "n2", costM: 10, kind: "walk", accessible: true, bidirectional: true },
    { id: "e2", from: "n2", to: "n3", costM: 10, kind: "walk", accessible: true, bidirectional: true },
  ];
  return buildGraph(nodes, edges);
}

function createMultiFloorGraph(): ReturnType<typeof buildGraph> {
  const nodes: RoutingNode[] = [
    { id: "n1", floorId: "f0", buildingId: "b1", level: 0, x: 0, y: 0, kind: "entrance", code: "E1", metersPerPixel: 1 },
    { id: "s1", floorId: "f0", buildingId: "b1", level: 0, x: 5, y: 0, kind: "stair", code: "S1", metersPerPixel: 1 },
    { id: "s2", floorId: "f1", buildingId: "b1", level: 1, x: 5, y: 0, kind: "stair", code: "S2", metersPerPixel: 1 },
    { id: "n2", floorId: "f1", buildingId: "b1", level: 1, x: 20, y: 0, kind: "junction", code: "N2", metersPerPixel: 1 },
  ];
  const edges: RoutingEdge[] = [
    { id: "e1", from: "n1", to: "s1", costM: 5, kind: "walk", accessible: true, bidirectional: true },
    { id: "e2", from: "s1", to: "s2", costM: 3, kind: "stair", accessible: true, bidirectional: true },
    { id: "e3", from: "s2", to: "n2", costM: 15, kind: "walk", accessible: true, bidirectional: true },
  ];
  return buildGraph(nodes, edges);
}

describe("A*", () => {
  it("finds shortest path on simple line graph", () => {
    const graph = createTestGraph();
    const result = findPathAStar(graph, "n1", "n3");
    expect(result.found).toBe(true);
    expect(result.path).toEqual(["n1", "n2", "n3"]);
    expect(result.totalCostM).toBe(20);
    expect(result.metrics.algorithm).toBe("astar");
    expect(result.metrics.heuristicUsed).toBe("euclidean3d");
  });

  it("agrees with Dijkstra on path cost", () => {
    const graph = createTestGraph();
    const dijkstra = findPathDijkstra(graph, "n1", "n3");
    const astar = findPathAStar(graph, "n1", "n3");
    expect(dijkstra.found).toBe(true);
    expect(astar.found).toBe(true);
    expect(Math.abs(dijkstra.totalCostM - astar.totalCostM)).toBeLessThan(0.01);
  });

  it("agrees with Dijkstra on multi-floor route cost", () => {
    const graph = createMultiFloorGraph();
    const dijkstra = findPathDijkstra(graph, "n1", "n2");
    const astar = findPathAStar(graph, "n1", "n2");
    expect(dijkstra.found).toBe(true);
    expect(astar.found).toBe(true);
    expect(Math.abs(dijkstra.totalCostM - astar.totalCostM)).toBeLessThan(0.01);
  });

  it("expands fewer or equal nodes than Dijkstra", () => {
    const graph = createMultiFloorGraph();
    const dijkstra = findPathDijkstra(graph, "n1", "n2");
    const astar = findPathAStar(graph, "n1", "n2");
    expect(astar.metrics.nodesExpanded).toBeLessThanOrEqual(dijkstra.metrics.nodesExpanded);
  });

  it("returns not found for disconnected graph", () => {
    const graph = buildGraph(
      [
        { id: "n1", floorId: "f1", buildingId: "b1", level: 0, x: 0, y: 0, kind: "junction", code: "N1" },
        { id: "n2", floorId: "f1", buildingId: "b1", level: 0, x: 10, y: 0, kind: "junction", code: "N2" },
      ],
      [],
    );
    const result = findPathAStar(graph, "n1", "n2");
    expect(result.found).toBe(false);
  });
});
