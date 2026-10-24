// Catalog schemas shared by the API routers and the admin forms.
//
// Every create schema is the source of truth for a valid row; every update
// schema is the same schema with all fields optional but at least one present,
// so `PATCH {}` is a 400 rather than a silent no-op (threat T-01-17).

import { z } from "zod";

/** A cuid or any opaque id; length-bounded so a hostile payload cannot be huge. */
const id = z.string().trim().min(1).max(36);

/** Natural-key charset. Real codes are upper-case by convention; lower-case is allowed so tests can use a prefix. */
const code = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[A-Za-z0-9-]+$/, "must contain letters, digits or hyphens only");

export const buildingCreateSchema = z.object({
  code,
  name: z.string().trim().min(1).max(120),
  campus: z.string().trim().max(120).optional(),
});

export const floorCreateSchema = z.object({
  buildingId: id,
  level: z.coerce.number().int().min(0).max(20),
  name: z.string().trim().max(120).optional(),
  imagePath: z.string().trim().max(255).optional(),
  imageSha256: z.string().trim().length(64).optional(),
  widthPx: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      if (typeof v === "number" && Number.isNaN(v)) return undefined;
      return v;
    },
    z.coerce.number().int().positive().max(20_000).optional(),
  ),
  heightPx: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      if (typeof v === "number" && Number.isNaN(v)) return undefined;
      return v;
    },
    z.coerce.number().int().positive().max(20_000).optional(),
  ),
  // Metres per pixel. Positive and sane: 1 px = 1 m is the classic unit bug.
  metersPerPixel: z.coerce
    .number()
    .positive()
    .max(10)
    .refine((v) => Math.abs(v - 1.0) > 1e-9, {
      message: "metersPerPixel must not be 1.0 (1px = 1m is almost certainly incorrect)",
    }),
});

export const classroomCreateSchema = z.object({
  roomNumber: z.string().trim().min(1).max(24),
  name: z.string().trim().max(120).optional(),
  floorId: id,
  departmentId: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), id.optional()),
  entranceNodeId: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), id.optional()),
  capacity: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      if (typeof v === "number" && Number.isNaN(v)) return undefined;
      return v;
    },
    z.coerce.number().int().positive().max(2_000).optional(),
  ),
});

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code,
});

export const facultyCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  designation: z.string().trim().max(120).optional(),
  departmentId: id,
});

const EMPTY_UPDATE = { message: "at least one field is required" };

export const buildingUpdateSchema = buildingCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, EMPTY_UPDATE);

export const floorUpdateSchema = floorCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, EMPTY_UPDATE);

export const classroomUpdateSchema = classroomCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, EMPTY_UPDATE);

export const departmentUpdateSchema = departmentCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, EMPTY_UPDATE);

export const facultyUpdateSchema = facultyCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, EMPTY_UPDATE);

export type BuildingCreateInput = z.infer<typeof buildingCreateSchema>;
export type BuildingUpdateInput = z.infer<typeof buildingUpdateSchema>;
export type FloorCreateInput = z.infer<typeof floorCreateSchema>;
export type FloorUpdateInput = z.infer<typeof floorUpdateSchema>;
export type ClassroomCreateInput = z.infer<typeof classroomCreateSchema>;
export type ClassroomUpdateInput = z.infer<typeof classroomUpdateSchema>;
export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
export type FacultyCreateInput = z.infer<typeof facultyCreateSchema>;
export type FacultyUpdateInput = z.infer<typeof facultyUpdateSchema>;
