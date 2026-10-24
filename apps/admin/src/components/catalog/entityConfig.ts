import {
  buildingCreateSchema,
  buildingUpdateSchema,
  classroomCreateSchema,
  classroomUpdateSchema,
  departmentCreateSchema,
  departmentUpdateSchema,
  facultyCreateSchema,
  facultyUpdateSchema,
  floorCreateSchema,
  floorUpdateSchema,
} from "@qroute/shared";
import type { ZodType } from "zod";

export type InputType = "text" | "number" | "select" | "email";

export interface FieldDescriptor {
  name: string;
  label: string;
  type: InputType;
  required?: boolean;
  placeholder?: string;
  optionsSource?: "buildings" | "floors" | "departments";
  helpText?: string;
}

export interface EntityConfig<T = unknown> {
  key: string;
  label: string;
  pluralLabel: string;
  pathSegment: string;
  idField: string;
  columns: Array<{ key: string; label: string }>;
  fields: FieldDescriptor[];
  createSchema: ZodType<T>;
  updateSchema: ZodType<T>;
  toRow: (record: unknown) => Record<string, unknown>;
}

export const buildingConfig: EntityConfig = {
  key: "buildings",
  label: "Building",
  pluralLabel: "Buildings",
  pathSegment: "buildings",
  idField: "id",
  columns: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "campus", label: "Campus" },
  ],
  fields: [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "campus", label: "Campus", type: "text" },
  ],
  createSchema: buildingCreateSchema as unknown as ZodType,
  updateSchema: buildingUpdateSchema as unknown as ZodType,
  toRow: (record) => record as Record<string, unknown>,
};

export const floorConfig: EntityConfig = {
  key: "floors",
  label: "Floor",
  pluralLabel: "Floors",
  pathSegment: "floors",
  idField: "id",
  columns: [
    { key: "building", label: "Building" },
    { key: "level", label: "Level" },
    { key: "name", label: "Name" },
    { key: "metersPerPixel", label: "Meters per pixel" },
    { key: "imagePath", label: "Image" },
  ],
  fields: [
    { name: "buildingId", label: "Building", type: "select", required: true, optionsSource: "buildings" },
    { name: "level", label: "Level", type: "number", required: true },
    { name: "name", label: "Name", type: "text" },
    { name: "metersPerPixel", label: "Meters per pixel", type: "number", required: true, helpText: "Positive calibration; must not be 1.0 (e.g., 0.01–0.05)" },
    { name: "widthPx", label: "Width (px)", type: "number" },
    { name: "heightPx", label: "Height (px)", type: "number" },
    { name: "imagePath", label: "Image path", type: "text" },
  ],
  createSchema: floorCreateSchema as unknown as ZodType,
  updateSchema: floorUpdateSchema as unknown as ZodType,
  toRow: (record) => record as Record<string, unknown>,
};

export const classroomConfig: EntityConfig = {
  key: "classrooms",
  label: "Classroom",
  pluralLabel: "Classrooms",
  pathSegment: "classrooms",
  idField: "id",
  columns: [
    { key: "roomNumber", label: "Room" },
    { key: "floor", label: "Floor" },
    { key: "department", label: "Department" },
    { key: "entranceNodeId", label: "Entrance bound" },
    { key: "capacity", label: "Capacity" },
  ],
  fields: [
    { name: "roomNumber", label: "Room number", type: "text", required: true },
    { name: "floorId", label: "Floor", type: "select", required: true, optionsSource: "floors" },
    { name: "departmentId", label: "Department", type: "select", optionsSource: "departments" },
    { name: "entranceNodeId", label: "Entrance node ID", type: "text" },
    { name: "name", label: "Name", type: "text" },
    { name: "capacity", label: "Capacity", type: "number" },
  ],
  createSchema: classroomCreateSchema as unknown as ZodType,
  updateSchema: classroomUpdateSchema as unknown as ZodType,
  toRow: (record) => record as Record<string, unknown>,
};

export const departmentConfig: EntityConfig = {
  key: "departments",
  label: "Department",
  pluralLabel: "Departments",
  pathSegment: "departments",
  idField: "id",
  columns: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "code", label: "Code", type: "text", required: true },
  ],
  createSchema: departmentCreateSchema as unknown as ZodType,
  updateSchema: departmentUpdateSchema as unknown as ZodType,
  toRow: (record) => record as Record<string, unknown>,
};

export const facultyConfig: EntityConfig = {
  key: "faculty",
  label: "Faculty",
  pluralLabel: "Faculty",
  pathSegment: "faculty",
  idField: "id",
  columns: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "designation", label: "Designation" },
    { key: "department", label: "Department" },
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "designation", label: "Designation", type: "text" },
    { name: "departmentId", label: "Department", type: "select", required: true, optionsSource: "departments" },
  ],
  createSchema: facultyCreateSchema as unknown as ZodType,
  updateSchema: facultyUpdateSchema as unknown as ZodType,
  toRow: (record) => record as Record<string, unknown>,
};

export const entityConfigs = {
  buildings: buildingConfig,
  floors: floorConfig,
  classrooms: classroomConfig,
  departments: departmentConfig,
  faculty: facultyConfig,
} as const;
