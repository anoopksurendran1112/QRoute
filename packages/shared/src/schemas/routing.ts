// Routing schemas shared by API and clients

import { z } from "zod";

export const routeComputeSchema = z
  .object({
    startNodeId: z.string().trim().min(1).optional(),
    startClassroomId: z.string().trim().min(1).optional(),
    endNodeId: z.string().trim().min(1).optional(),
    endClassroomId: z.string().trim().min(1).optional(),
    algorithm: z.enum(["dijkstra", "astar", "both"]).default("astar"),
  })
  .refine(
    (data) => {
      const hasStart = data.startNodeId || data.startClassroomId;
      const hasEnd = data.endNodeId || data.endClassroomId;
      return hasStart && hasEnd;
    },
    {
      message: "Must provide either (startNodeId or startClassroomId) and (endNodeId or endClassroomId)",
    },
  );

export type RouteComputeInput = z.infer<typeof routeComputeSchema>;
