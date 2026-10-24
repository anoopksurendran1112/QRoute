// Graph schemas for floor plan upload and graph management

import { z } from "zod";

export const floorUploadSchema = z.object({
  metersPerPixel: z.coerce.number().positive().max(10).optional(),
});

export const nodeCreateSchema = z.object({
  floorId: z.string().min(1),
  code: z.string().trim().min(1).max(32),
  kind: z.enum(["junction", "door", "stair", "lift", "entrance"]),
  x: z.coerce.number(),
  y: z.coerce.number(),
  label: z.string().trim().max(120).optional(),
});

export const nodeUpdateSchema = nodeCreateSchema.partial();

export const edgeCreateSchema = z.object({
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  kind: z.enum(["walk", "stair", "lift"]).default("walk"),
  costM: z.coerce.number().positive(),
  accessible: z.boolean().default(true),
  bidirectional: z.boolean().default(true),
});

export const edgeUpdateSchema = edgeCreateSchema.partial();

export type FloorUploadInput = z.infer<typeof floorUploadSchema>;
export type NodeCreateInput = z.infer<typeof nodeCreateSchema>;
export type NodeUpdateInput = z.infer<typeof nodeUpdateSchema>;
export type EdgeCreateInput = z.infer<typeof edgeCreateSchema>;
export type EdgeUpdateInput = z.infer<typeof edgeUpdateSchema>;
