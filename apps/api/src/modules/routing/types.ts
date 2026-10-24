// Routing types for QRoute pathfinding

export interface RoutingNode {
  id: string;
  floorId: string;
  buildingId: string;
  level: number;
  x: number;
  y: number;
  kind: "junction" | "door" | "stair" | "lift" | "entrance";
  code: string;
  label?: string | null;
}

export interface RoutingEdge {
  id: string;
  from: string;
  to: string;
  costM: number;
  kind: "walk" | "stair" | "lift";
  accessible: boolean;
  bidirectional: boolean;
}

export interface RoutingGraph {
  nodes: Map<string, RoutingNode>;
  adjacency: Map<string, RoutingEdge[]>;
}

export interface RouteMetrics {
  nodesExpanded: number;
  maxFrontier: number;
  relaxations: number;
  runtimeMs: number;
  heuristicUsed: "euclidean3d" | "zero";
  algorithm: "dijkstra" | "astar";
}

export interface RouteInstruction {
  step: number;
  type: "start" | "straight" | "turn" | "floor_change" | "arrive";
  text: string;
  distanceM: number;
  nodeId?: string;
  floorId?: string;
  floorLevel?: number;
}

export interface PathResult {
  found: boolean;
  path: string[]; // sequence of node IDs
  totalCostM: number;
  nodes: RoutingNode[];
  instructions: RouteInstruction[];
  metrics: RouteMetrics;
}
