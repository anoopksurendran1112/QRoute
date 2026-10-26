// Route computation client.
//
// The API speaks `startNodeId` / `endNodeId` (or `startClassroomId` /
// `endClassroomId`) and answers `{ dijkstra?, astar?, agreed }` with `path` as
// an array of node **ids**. The map and guidance screens want node objects and
// a flat `distance`, so the response is normalised exactly once, here.

import { api } from "./client.ts";

export interface RouteRequest {
  startNodeId?: string;
  startClassroomId?: string;
  endNodeId?: string;
  endClassroomId?: string;
  /** Defaults to `both` so the UI can show the Dijkstra/A* comparison. */
  algorithm?: "dijkstra" | "astar" | "both";
}

export interface RouteNodeRef {
  id: string;
  floorId?: string;
  buildingId?: string;
  level?: number;
  x: number;
  y: number;
  kind?: string;
  code?: string;
  label?: string | null;
}

export interface RouteStep {
  step: number;
  type: string;
  text: string;
  distanceM: number;
  nodeId?: string;
  floorId?: string;
  floorLevel?: number;
}

export interface RouteMetrics {
  nodesExpanded: number;
  maxFrontier: number;
  relaxations: number;
  runtimeMs: number;
  heuristicUsed: string;
  algorithm: string;
}

interface RawPathResult {
  found: boolean;
  path: string[];
  totalCostM: number;
  nodes: RouteNodeRef[];
  instructions: RouteStep[];
  metrics: RouteMetrics;
}

interface RawRouteResponse {
  dijkstra?: RawPathResult;
  astar?: RawPathResult;
  agreed?: boolean;
}

export interface ComputedRoute {
  found: boolean;
  algorithm: "dijkstra" | "astar";
  /** Total walking distance in metres. */
  distance: number;
  distanceM: number;
  /** Node objects, in order — what MapView draws. */
  path: RouteNodeRef[];
  /** The same path as ids, for anything that only needs identities. */
  nodeIds: string[];
  nodes: RouteNodeRef[];
  instructions: RouteStep[];
  metrics: RouteMetrics;
  dijkstra?: RawPathResult;
  astar?: RawPathResult;
  agreed: boolean;
}

function normalise(raw: RawRouteResponse, requested: "dijkstra" | "astar" | "both"): ComputedRoute {
  const primary =
    requested === "dijkstra" ? raw.dijkstra : requested === "astar" ? raw.astar : raw.astar ?? raw.dijkstra;

  if (!primary) {
    throw new Error("The server did not return a route. Please try again.");
  }

  return {
    found: primary.found,
    algorithm: primary.metrics.algorithm === "dijkstra" ? "dijkstra" : "astar",
    distance: primary.totalCostM,
    distanceM: primary.totalCostM,
    path: primary.nodes ?? [],
    nodeIds: primary.path ?? [],
    nodes: primary.nodes ?? [],
    instructions: primary.instructions ?? [],
    metrics: primary.metrics,
    dijkstra: raw.dijkstra,
    astar: raw.astar,
    agreed: raw.agreed ?? true,
  };
}

/** Extracts a readable message from the API's `{ error: { message } }` shape. */
function messageFromBody(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text || `Route request failed (${status})`;
}

export async function getShortestPath(input: RouteRequest): Promise<ComputedRoute> {
  const algorithm = input.algorithm ?? "both";

  if (!input.startNodeId && !input.startClassroomId) {
    throw new Error("Unknown start location — scan a QR code first.");
  }
  if (!input.endNodeId && !input.endClassroomId) {
    throw new Error("No destination selected.");
  }

  const body: Record<string, unknown> = { algorithm };
  if (input.startNodeId) body.startNodeId = input.startNodeId;
  if (input.startClassroomId) body.startClassroomId = input.startClassroomId;
  if (input.endNodeId) body.endNodeId = input.endNodeId;
  if (input.endClassroomId) body.endClassroomId = input.endClassroomId;

  let res: Response;
  try {
    res = await fetch(`${api.API_BASE}/v1/routes/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Network error: cannot reach the server. Check that the API is running and the phone is on the same network.",
    );
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(messageFromBody(text, res.status));
  }

  const route = normalise(JSON.parse(text) as RawRouteResponse, algorithm);

  if (!route.found) {
    throw new Error(
      "No walkable route exists between these two points. The graph may not connect them yet.",
    );
  }

  return route;
}
