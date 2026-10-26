import { describe, expect, it } from "vitest";
import { findPathAStar } from "../astar.ts";
import { findPathDijkstra } from "../dijkstra.ts";
import { buildGraph } from "../graph.ts";
import type { RoutingEdge, RoutingNode } from "../types.ts";

// Regression: the start node's tentative distance is 0, and both algorithms
// used `dist.get(id) || Infinity`. `0 || Infinity` is Infinity, so the first
// relaxation from the start node always failed and no route was ever found —
// yet `nodesExpanded` still read 1, which looked like a graph problem.
function lineGraph(): ReturnType<typeof buildGraph> {
  const nodes: RoutingNode[] = [
    { id: "n1", floorId: "f1", buildingId: "b1", level: 0, x: 0, y: 0, kind: "junction", code: "N1" },
    { id: "n2", floorId: "f1", buildingId: "b1", level: 0, x: 10, y: 0, kind: "junction", code: "N2" },
  ];
  const edges: RoutingEdge[] = [
    { id: "e1", from: "n1", to: "n2", costM: 4, kind: "walk", accessible: true, bidirectional: true },
  ];
  return buildGraph(nodes, edges);
}

describe("first relaxation out of the start node", () => {
  it("dijkstra reaches a neighbour of the start node", () => {
    const result = findPathDijkstra(lineGraph(), "n1", "n2");
    expect(result.found).toBe(true);
    expect(result.path).toEqual(["n1", "n2"]);
    expect(result.totalCostM).toBe(4);
  });

  it("astar reaches a neighbour of the start node", () => {
    const result = findPathAStar(lineGraph(), "n1", "n2");
    expect(result.found).toBe(true);
    expect(result.path).toEqual(["n1", "n2"]);
    expect(result.totalCostM).toBe(4);
  });

  it("traverses the reverse direction of a bidirectional edge", () => {
    const result = findPathDijkstra(lineGraph(), "n2", "n1");
    expect(result.found).toBe(true);
    expect(result.path).toEqual(["n2", "n1"]);
  });
});

describe("heuristic units", () => {
  // 100 px apart on a 0.1 m/px floor = 10 m. The edge costs 12 m, so a metre
  // based heuristic stays admissible. Using raw pixels (100) as the heuristic
  // against a 12 m edge would overestimate and void the shortest-path
  // guarantee.
  it("keeps the euclidean heuristic admissible when x/y are pixels", () => {
    const nodes: RoutingNode[] = [
      { id: "n1", floorId: "f1", buildingId: "b1", level: 0, x: 0, y: 0, kind: "junction", code: "N1", metersPerPixel: 0.1 },
      { id: "n2", floorId: "f1", buildingId: "b1", level: 0, x: 100, y: 0, kind: "junction", code: "N2", metersPerPixel: 0.1 },
    ];
    const edges: RoutingEdge[] = [
      { id: "e1", from: "n1", to: "n2", costM: 12, kind: "walk", accessible: true, bidirectional: true },
    ];
    const graph = buildGraph(nodes, edges);

    const astar = findPathAStar(graph, "n1", "n2");
    const dijkstra = findPathDijkstra(graph, "n1", "n2");

    expect(astar.found).toBe(true);
    expect(astar.totalCostM).toBe(dijkstra.totalCostM);
    expect(astar.metrics.heuristicUsed).toBe("euclidean3d");
  });

  it("falls back to h=0 and says so when a floor is uncalibrated", () => {
    const graph = lineGraph(); // no metersPerPixel on either node
    const result = findPathAStar(graph, "n1", "n2");
    expect(result.found).toBe(true);
    expect(result.metrics.heuristicUsed).toBe("zero");
  });
});

describe("directions", () => {
  it("reports segment distances in metres, not pixels", () => {
    const nodes: RoutingNode[] = [
      { id: "n1", floorId: "f1", buildingId: "b1", level: 0, x: 0, y: 0, kind: "junction", code: "N1", metersPerPixel: 0.05 },
      { id: "n2", floorId: "f1", buildingId: "b1", level: 0, x: 200, y: 0, kind: "junction", code: "N2", metersPerPixel: 0.05 },
    ];
    const edges: RoutingEdge[] = [
      { id: "e1", from: "n1", to: "n2", costM: 10, kind: "walk", accessible: true, bidirectional: true },
    ];
    const result = findPathDijkstra(buildGraph(nodes, edges), "n1", "n2");

    const arrive = result.instructions.find((instruction) => instruction.type === "arrive");
    expect(arrive?.distanceM).toBe(10);
  });

  it("emits a turn at an intermediate junction", () => {
    const nodes: RoutingNode[] = [
      { id: "n1", floorId: "f1", buildingId: "b1", level: 0, x: 0, y: 0, kind: "junction", code: "N1" },
      { id: "n2", floorId: "f1", buildingId: "b1", level: 0, x: 10, y: 0, kind: "junction", code: "N2" },
      { id: "n3", floorId: "f1", buildingId: "b1", level: 0, x: 10, y: 10, kind: "junction", code: "N3" },
    ];
    const edges: RoutingEdge[] = [
      { id: "e1", from: "n1", to: "n2", costM: 10, kind: "walk", accessible: true, bidirectional: true },
      { id: "e2", from: "n2", to: "n3", costM: 10, kind: "walk", accessible: true, bidirectional: true },
    ];
    const result = findPathDijkstra(buildGraph(nodes, edges), "n1", "n3");

    const turn = result.instructions.find((instruction) => instruction.type === "turn");
    expect(turn).toBeDefined();
    expect(turn?.nodeId).toBe("n2");
  });
});
