// Turn-by-turn direction generation

import { getNode } from "./graph.ts";
import type { RouteInstruction, RoutingGraph } from "./types.ts";

function calculateBearing(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function getTurnDirection(bearing1: number, bearing2: number): "straight" | "turn" {
  let diff = bearing2 - bearing1;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  
  if (Math.abs(diff) < 20) return "straight";
  return "turn";
}

function getTurnText(diff: number): string {
  if (diff > 20 && diff < 160) return "Turn right";
  if (diff < -20 && diff > -160) return "Turn left";
  if (diff >= 160 || diff <= -160) return "Make a U-turn";
  return "Continue straight";
}

export function generateDirections(graph: RoutingGraph, path: string[]): RouteInstruction[] {
  if (path.length === 0) return [];
  if (path.length === 1) {
    const p0 = path[0];
    if (p0 === undefined) return [];
    const node = getNode(graph, p0);
    if (!node) return [];
    return [
      {
        step: 1,
        type: "start",
        text: `Start at ${node.code}${node.label ? ` (${node.label})` : ""}`,
        distanceM: 0,
        nodeId: p0,
        floorId: node.floorId || "",
        floorLevel: node.level,
      },
      {
        step: 2,
        type: "arrive",
        text: `You are at your starting location`,
        distanceM: 0,
        nodeId: p0,
        floorId: node.floorId || "",
        floorLevel: node.level,
      },
    ];
  }

  const instructions: RouteInstruction[] = [];
  let step = 1;
  let totalDistance = 0;

  // Start instruction
  const startNodeId = path[0];
  if (startNodeId === undefined) return instructions;
  const startNode = getNode(graph, startNodeId);
  instructions.push({
    step: step++,
    type: "start",
    text: `Start at ${startNode?.code || startNodeId}${startNode?.label ? ` (${startNode.label})` : ""} on Floor ${startNode?.level ?? 0}`,
    distanceM: 0,
    nodeId: startNodeId,
    floorId: startNode?.floorId || "",
    floorLevel: startNode?.level ?? 0,
  });

  let currentFloor = startNode?.level ?? 0;
  let currentFloorId = startNode?.floorId ?? "";
  let segmentStart = 0;
  let segmentDistance = 0;

  for (let i = 1; i < path.length; i++) {
    const prevNodeId = path[i - 1];
    const currNodeId = path[i];
    if (prevNodeId === undefined || currNodeId === undefined) continue;
    const prevNode = getNode(graph, prevNodeId);
    const currNode = getNode(graph, currNodeId);
    if (!prevNode || !currNode) continue;

    // Check if floor changed
    if (currNode.level !== currentFloor || currNode.floorId !== currentFloorId) {
      // Add floor change instruction
      totalDistance += segmentDistance;
      const isStair = currNode.kind === "stair" || prevNode.kind === "stair";
      const isLift = currNode.kind === "lift" || prevNode.kind === "lift";
      instructions.push({
        step: step++,
        type: "floor_change",
        text: `Take ${isStair ? "stairs" : isLift ? "lift" : "stairs/lift"} to Floor ${currNode.level}`,
        distanceM: segmentDistance,
        nodeId: currNodeId,
        floorId: currNode.floorId || "",
        floorLevel: currNode.level,
      });
      
      currentFloor = currNode.level;
      currentFloorId = currNode.floorId;
      segmentStart = i;
      segmentDistance = 0;
      continue;
    }

    // Calculate distance for this edge
    const dx = currNode.x - prevNode.x;
    const dy = currNode.y - prevNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    segmentDistance += dist;
  }

  // Add final arrival
  const endNodeId = path[path.length - 1];
  if (endNodeId === undefined) return instructions;
  const endNode = getNode(graph, endNodeId);
  totalDistance += segmentDistance;
  if (endNode) {
    instructions.push({
      step: step++,
      type: "arrive",
      text: `Arrive at ${endNode.code}${endNode.label ? ` (${endNode.label})` : ""} on Floor ${endNode.level}`,
      distanceM: totalDistance,
      nodeId: endNodeId,
      floorId: endNode.floorId,
      floorLevel: endNode.level,
    });
  } else {
    instructions.push({
      step: step++,
      type: "arrive",
      text: `Arrive at destination`,
      distanceM: totalDistance,
      nodeId: endNodeId,
    });
  }

  return instructions;
}
