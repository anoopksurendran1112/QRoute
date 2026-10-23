// Geometry helpers shared by the seed sets.
//
// Edge costs are computed ONCE, server-side, in metres. Storing pixel distances
// is the bug that makes every reported route length fiction once two floors use
// different calibration (PITFALLS.md Pitfall 15).

import type { Prisma } from "../../src/generated/prisma/client.ts";

/**
 * Either the long-lived client or a transaction client. The seed always runs
 * inside one transaction, so it is handed the latter.
 */
export type SeedClient = Prisma.TransactionClient;

export interface Point {
  x: number;
  y: number;
}

/** No walk edge may claim to be shorter than half a pace. */
export const MIN_WALK_COST_M = 0.3;

/** A door spur is a fixed, human-scale cost rather than a pixel distance. */
export const DOOR_SPUR_COST_M = 0.6;

/**
 * Euclidean pixel distance on one floor, converted to metres by that floor's
 * calibration, floored at MIN_WALK_COST_M and rounded to 2 decimals (the
 * precision of Edge.costM).
 */
export function costFromPixels(from: Point, to: Point, metersPerPixel: number): number {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const metres = Math.sqrt(dx * dx + dy * dy) * metersPerPixel;
  return Math.round(Math.max(metres, MIN_WALK_COST_M) * 100) / 100;
}

/**
 * A vertical link is a fixed configured cost. It is never derived from x/y,
 * because those coordinates exist on different floors and the distance between
 * them is meaningless.
 */
export function verticalCost(kind: "stair" | "lift"): number {
  return kind === "stair" ? 18.0 : 22.0;
}
