import { z } from "zod";

export const navigationSessionStartSchema = z.object({
  startNodeId: z.string().min(1),
  endNodeId: z.string().min(1),
  algorithm: z.enum(["dijkstra", "astar"]).optional(),
  distanceM: z.number().optional(),
  routeJson: z.any().optional(),
});

export const navigationSessionCompleteSchema = z.object({
  status: z.enum(["completed", "cancelled"]),
  durationSec: z.number().int().nonnegative().optional(),
});

export type NavigationSessionStartInput = z.infer<typeof navigationSessionStartSchema>;
export type NavigationSessionCompleteInput = z.infer<typeof navigationSessionCompleteSchema>;
