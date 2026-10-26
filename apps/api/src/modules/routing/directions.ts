// Turn-by-turn direction generation.
//
// Two unit traps live here and are both handled explicitly:
//   * node `x`/`y` are pixels, edge `costM` is metres — segment distances must
//     come from the edge cost (or pixels x metersPerPixel), never raw pixels;
//   * only junctions/stair heads/lifts are decision points. Turning at a door
//     node produces noise, so turns are emitted at junctions and floor changes.

import { getNeighbors, getNode } from "./graph.ts";
import type { RouteInstruction, RoutingGraph, RoutingNode } from "./types.ts";

/** Below this heading change the walk counts as "straight on". */
const TURN_THRESHOLD_DEG = 20;
/** Above this heading change the walk counts as doubling back. */
const UTURN_THRESHOLD_DEG = 160;

function calculateBearing(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/** Signed heading change in degrees, normalised to (-180, 180]. */
function bearingDelta(from: RoutingNode, via: RoutingNode, to: RoutingNode): number {
  const incoming = calculateBearing(from.x, from.y, via.x, via.y);
  const outgoing = calculateBearing(via.x, via.y, to.x, to.y);
  let diff = outgoing - incoming;
  while (diff > 180) diff -= 360;
  while (diff <= -180) diff += 360;
  return diff;
}

function turnText(diff: number): string | undefined {
  const magnitude = Math.abs(diff);
  if (magnitude < TURN_THRESHOLD_DEG) return undefined;
  if (magnitude >= UTURN_THRESHOLD_DEG) return "Make a U-turn";
  return diff > 0 ? "Turn right" : "Turn left";
}

/**
 * Length of the walk between two adjacent nodes, in metres.
 *
 * The stored edge cost is authoritative; the pixel geometry is only a fallback
 * for a pair whose edge cannot be found.
 */
function segmentLengthM(graph: RoutingGraph, from: RoutingNode, to: RoutingNode): number {
  const edge = getNeighbors(graph, from.id).find((candidate) => candidate.to === to.id);
  if (edge) return edge.costM;

  const scale = from.metersPerPixel ?? to.metersPerPixel ?? 0;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy) * scale;
}

/** Junctions, stair heads and lifts are where a user has to choose a direction. */
function isDecisionPoint(node: RoutingNode): boolean {
  return node.kind === "junction" || node.kind === "stair" || node.kind === "lift";
}

function locateInstruction(
  node: RoutingNode,
  text: string,
  kind: RouteInstruction["type"],
  distanceM: number,
): RouteInstruction {
  return {
    step: 0, // renumbered below so callers always get a contiguous sequence
    type: kind,
    text,
    distanceM,
    nodeId: node.id,
    floorId: node.floorId || "",
    floorLevel: node.level,
  };
}

export function generateDirections(graph: RoutingGraph, path: string[]): RouteInstruction[] {
  if (path.length === 0) return [];

  const nodes: RoutingNode[] = [];
  for (const id of path) {
    const node = getNode(graph, id);
    if (node) nodes.push(node);
  }
  if (nodes.length === 0) return [];

  const startNode = nodes[0]!;

  if (nodes.length === 1) {
    return [
      locateInstruction(
        startNode,
        `Start at ${startNode.code}${startNode.label ? ` (${startNode.label})` : ""}`,
        "start",
        0,
      ),
      locateInstruction(startNode, "You are at your starting location", "arrive", 0),
    ].map((instruction, index) => ({ ...instruction, step: index + 1 }));
  }

  const instructions: RouteInstruction[] = [
    locateInstruction(
      startNode,
      `Start at ${startNode.code}${startNode.label ? ` (${startNode.label})` : ""} on Floor ${startNode.level}`,
      "start",
      0,
    ),
  ];

  let segmentM = 0;
  let totalM = 0;

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]!;
    const curr = nodes[i]!;
    const next = nodes[i + 1];

    const walkedM = segmentLengthM(graph, prev, curr);
    segmentM += walkedM;
    totalM += walkedM;

    const floorChanged = curr.level !== prev.level || curr.floorId !== prev.floorId;

    if (floorChanged) {
      const usesStair = curr.kind === "stair" || prev.kind === "stair";
      const usesLift = curr.kind === "lift" || prev.kind === "lift";
      const conveyance = usesLift ? "lift" : usesStair ? "stairs" : "stairs or lift";
      instructions.push(
        locateInstruction(curr, `Take the ${conveyance} to Floor ${curr.level}`, "floor_change", segmentM),
      );
      segmentM = 0;
      continue;
    }

    // A turn only exists if the walk continues past this node.
    if (next && isDecisionPoint(curr)) {
      const text = turnText(bearingDelta(prev, curr, next));
      if (text) {
        instructions.push(
          locateInstruction(curr, `${text} at ${curr.code}`, "turn", segmentM),
        );
        segmentM = 0;
      }
    }
  }

  const endNode = nodes[nodes.length - 1]!;
  instructions.push(
    locateInstruction(
      endNode,
      `Arrive at ${endNode.code}${endNode.label ? ` (${endNode.label})` : ""} on Floor ${endNode.level}`,
      "arrive",
      segmentM > 0 ? segmentM : totalM,
    ),
  );

  return instructions.map((instruction, index) => ({ ...instruction, step: index + 1 }));
}
