// Catalog persistence.
//
// Two rules are enforced here and nowhere else:
//   1. Decimals leave this module as strings. Prisma's Decimal serialises to a
//      string anyway; doing it explicitly means `metersPerPixel` can never
//      arrive at the admin UI as `{ s, e, d }` or as a lossy float.
//   2. Parent deletes are counted before they are attempted, so a seeded
//      building cannot be erased by one request that silently cascades
//      (threat T-01-18).

import type {
  BuildingCreateInput,
  BuildingUpdateInput,
  ClassroomCreateInput,
  ClassroomUpdateInput,
  DepartmentCreateInput,
  DepartmentUpdateInput,
  FacultyCreateInput,
  FacultyUpdateInput,
  FloorCreateInput,
  FloorUpdateInput,
} from "@qroute/shared";
import { ApiError } from "../../lib/apiError.ts";
import { prisma } from "../../lib/prisma.ts";

interface BuildingSummary {
  id: string;
  code: string;
  name: string;
}

interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
}

interface FloorSummary {
  id: string;
  level: number;
  name: string | null;
  building: BuildingSummary;
}

// ── DTO mappers ─────────────────────────────────────────────────────────────

interface BuildingRow {
  id: string;
  code: string;
  name: string;
  campus: string | null;
  _count: { floors: number };
}

function toBuildingDto(row: BuildingRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    campus: row.campus,
    floorCount: row._count.floors,
  };
}

interface FloorRow {
  id: string;
  buildingId: string;
  level: number;
  name: string | null;
  imagePath: string | null;
  imageSha256: string | null;
  widthPx: number | null;
  heightPx: number | null;
  metersPerPixel: { toString(): string };
  building: BuildingSummary;
}

function toFloorDto(row: FloorRow) {
  return {
    id: row.id,
    buildingId: row.buildingId,
    level: row.level,
    name: row.name,
    imagePath: row.imagePath,
    imageSha256: row.imageSha256,
    widthPx: row.widthPx,
    heightPx: row.heightPx,
    metersPerPixel: row.metersPerPixel.toString(),
    building: row.building,
  };
}

interface ClassroomRow {
  id: string;
  roomNumber: string;
  name: string | null;
  floorId: string;
  departmentId: string | null;
  entranceNodeId: string | null;
  capacity: number | null;
  floor: FloorSummary;
  department: DepartmentSummary | null;
}

function toClassroomDto(row: ClassroomRow) {
  return {
    id: row.id,
    roomNumber: row.roomNumber,
    name: row.name,
    floorId: row.floorId,
    departmentId: row.departmentId,
    entranceNodeId: row.entranceNodeId,
    capacity: row.capacity,
    floor: row.floor,
    department: row.department,
  };
}

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  _count: { faculty: number; classrooms: number };
}

function toDepartmentDto(row: DepartmentRow) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    facultyCount: row._count.faculty,
    classroomCount: row._count.classrooms,
  };
}

interface FacultyRow {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  departmentId: string;
  department: DepartmentSummary;
}

function toFacultyDto(row: FacultyRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    designation: row.designation,
    departmentId: row.departmentId,
    department: row.department,
  };
}

// ── Prisma error translation ────────────────────────────────────────────────

/**
 * Turns a known Prisma request error into an ApiError.
 *
 * P2002 = unique constraint, P2025 = record not found, P2003 = foreign key
 * violation. Anything else is rethrown untouched so it reaches the 500 handler
 * with its stack intact.
 */
function translatePrismaError(error: unknown, entity: string, naturalKey: string): never {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  if (code === "P2002") {
    throw new ApiError(409, "CONFLICT", `A ${entity} with that ${naturalKey} already exists.`);
  }
  if (code === "P2025") {
    throw new ApiError(404, "NOT_FOUND", `${entity} not found.`);
  }
  if (code === "P2003") {
    throw new ApiError(
      409,
      "CONFLICT",
      `${entity} is still referenced by other rows; remove them first.`,
    );
  }

  throw error;
}

const BUILDING_INCLUDE = { _count: { select: { floors: true } } } as const;
const FLOOR_INCLUDE = {
  building: { select: { id: true, code: true, name: true } },
} as const;
const CLASSROOM_INCLUDE = {
  floor: {
    select: {
      id: true,
      level: true,
      name: true,
      building: { select: { id: true, code: true, name: true } },
    },
  },
  department: { select: { id: true, name: true, code: true } },
} as const;
const DEPARTMENT_INCLUDE = {
  _count: { select: { faculty: true, classrooms: true } },
} as const;
const FACULTY_INCLUDE = {
  department: { select: { id: true, name: true, code: true } },
} as const;

// ── Buildings ───────────────────────────────────────────────────────────────

export async function listBuildings() {
  const rows = await prisma.building.findMany({
    orderBy: { code: "asc" },
    include: BUILDING_INCLUDE,
  });
  return rows.map((row) => toBuildingDto(row));
}

export async function getBuilding(id: string) {
  const row = await prisma.building.findUnique({ where: { id }, include: BUILDING_INCLUDE });
  if (!row) throw new ApiError(404, "NOT_FOUND", "building not found.");
  return toBuildingDto(row);
}

export async function createBuilding(input: BuildingCreateInput) {
  try {
    const row = await prisma.building.create({ data: input, include: BUILDING_INCLUDE });
    return toBuildingDto(row);
  } catch (error) {
    translatePrismaError(error, "building", "code");
  }
}

export async function updateBuilding(id: string, input: BuildingUpdateInput) {
  try {
    const row = await prisma.building.update({
      where: { id },
      data: input,
      include: BUILDING_INCLUDE,
    });
    return toBuildingDto(row);
  } catch (error) {
    translatePrismaError(error, "building", "code");
  }
}

export async function deleteBuilding(id: string): Promise<void> {
  const row = await prisma.building.findUnique({
    where: { id },
    include: { _count: { select: { floors: true } } },
  });
  if (!row) throw new ApiError(404, "NOT_FOUND", "building not found.");

  if (row._count.floors > 0) {
    throw new ApiError(
      409,
      "CONFLICT",
      `Building ${row.code} still has ${row._count.floors} floor(s). Delete the floors first.`,
    );
  }

  try {
    await prisma.building.delete({ where: { id } });
  } catch (error) {
    translatePrismaError(error, "building", "code");
  }
}

// ── Floors ──────────────────────────────────────────────────────────────────

export async function listFloors(filter: { buildingId?: string } = {}) {
  const rows = await prisma.floor.findMany({
    where: filter.buildingId ? { buildingId: filter.buildingId } : {},
    orderBy: [{ buildingId: "asc" }, { level: "asc" }],
    include: FLOOR_INCLUDE,
  });
  return rows.map((row) => toFloorDto(row));
}

export async function getFloor(id: string) {
  const row = await prisma.floor.findUnique({ where: { id }, include: FLOOR_INCLUDE });
  if (!row) throw new ApiError(404, "NOT_FOUND", "floor not found.");
  return toFloorDto(row);
}

export async function createFloor(input: FloorCreateInput) {
  try {
    const row = await prisma.floor.create({ data: input, include: FLOOR_INCLUDE });
    return toFloorDto(row);
  } catch (error) {
    translatePrismaError(error, "floor", "buildingId/level");
  }
}

export async function updateFloor(id: string, input: FloorUpdateInput) {
  try {
    const row = await prisma.floor.update({
      where: { id },
      data: input,
      include: FLOOR_INCLUDE,
    });
    return toFloorDto(row);
  } catch (error) {
    translatePrismaError(error, "floor", "buildingId/level");
  }
}

export async function deleteFloor(id: string): Promise<void> {
  const row = await prisma.floor.findUnique({
    where: { id },
    include: { _count: { select: { classrooms: true, nodes: true } } },
  });
  if (!row) throw new ApiError(404, "NOT_FOUND", "floor not found.");

  if (row._count.classrooms > 0 || row._count.nodes > 0) {
    throw new ApiError(
      409,
      "CONFLICT",
      `Floor ${id} still has ${row._count.classrooms} classroom(s) and ` +
        `${row._count.nodes} graph node(s). Delete them first.`,
    );
  }

  try {
    await prisma.floor.delete({ where: { id } });
  } catch (error) {
    translatePrismaError(error, "floor", "buildingId/level");
  }
}

// ── Classrooms ──────────────────────────────────────────────────────────────

export interface ClassroomFilter {
  floorId?: string;
  buildingId?: string;
  departmentId?: string;
}

export async function listClassrooms(filter: ClassroomFilter = {}) {
  const where: {
    floorId?: string;
    departmentId?: string;
    floor?: { buildingId: string };
  } = {};

  if (filter.floorId) where.floorId = filter.floorId;
  if (filter.departmentId) where.departmentId = filter.departmentId;
  if (filter.buildingId) where.floor = { buildingId: filter.buildingId };

  const rows = await prisma.classroom.findMany({
    where,
    orderBy: [{ roomNumber: "asc" }],
    include: CLASSROOM_INCLUDE,
  });
  return rows.map((row) => toClassroomDto(row));
}

export async function getClassroom(id: string) {
  const row = await prisma.classroom.findUnique({ where: { id }, include: CLASSROOM_INCLUDE });
  if (!row) throw new ApiError(404, "NOT_FOUND", "classroom not found.");
  return toClassroomDto(row);
}

export async function createClassroom(input: ClassroomCreateInput) {
  try {
    const row = await prisma.classroom.create({ data: input, include: CLASSROOM_INCLUDE });
    return toClassroomDto(row);
  } catch (error) {
    translatePrismaError(error, "classroom", "roomNumber on this floor");
  }
}

export async function updateClassroom(id: string, input: ClassroomUpdateInput) {
  try {
    const row = await prisma.classroom.update({
      where: { id },
      data: input,
      include: CLASSROOM_INCLUDE,
    });
    return toClassroomDto(row);
  } catch (error) {
    translatePrismaError(error, "classroom", "roomNumber on this floor");
  }
}

export async function deleteClassroom(id: string): Promise<void> {
  try {
    await prisma.classroom.delete({ where: { id } });
  } catch (error) {
    translatePrismaError(error, "classroom", "roomNumber on this floor");
  }
}

// ── Departments ─────────────────────────────────────────────────────────────

export async function listDepartments() {
  const rows = await prisma.department.findMany({
    orderBy: { code: "asc" },
    include: DEPARTMENT_INCLUDE,
  });
  return rows.map((row) => toDepartmentDto(row));
}

export async function getDepartment(id: string) {
  const row = await prisma.department.findUnique({
    where: { id },
    include: DEPARTMENT_INCLUDE,
  });
  if (!row) throw new ApiError(404, "NOT_FOUND", "department not found.");
  return toDepartmentDto(row);
}

export async function createDepartment(input: DepartmentCreateInput) {
  try {
    const row = await prisma.department.create({ data: input, include: DEPARTMENT_INCLUDE });
    return toDepartmentDto(row);
  } catch (error) {
    translatePrismaError(error, "department", "name or code");
  }
}

export async function updateDepartment(id: string, input: DepartmentUpdateInput) {
  try {
    const row = await prisma.department.update({
      where: { id },
      data: input,
      include: DEPARTMENT_INCLUDE,
    });
    return toDepartmentDto(row);
  } catch (error) {
    translatePrismaError(error, "department", "name or code");
  }
}

export async function deleteDepartment(id: string): Promise<void> {
  const row = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { faculty: true, classrooms: true } } },
  });
  if (!row) throw new ApiError(404, "NOT_FOUND", "department not found.");

  if (row._count.faculty > 0 || row._count.classrooms > 0) {
    throw new ApiError(
      409,
      "CONFLICT",
      `Department ${row.code} still has ${row._count.faculty} faculty member(s) and ` +
        `${row._count.classrooms} classroom(s). Delete or reassign them first.`,
    );
  }

  try {
    await prisma.department.delete({ where: { id } });
  } catch (error) {
    translatePrismaError(error, "department", "name or code");
  }
}

// ── Faculty ─────────────────────────────────────────────────────────────────

export async function listFaculty(filter: { departmentId?: string } = {}) {
  const rows = await prisma.faculty.findMany({
    where: filter.departmentId ? { departmentId: filter.departmentId } : {},
    orderBy: { name: "asc" },
    include: FACULTY_INCLUDE,
  });
  return rows.map((row) => toFacultyDto(row));
}

export async function getFaculty(id: string) {
  const row = await prisma.faculty.findUnique({ where: { id }, include: FACULTY_INCLUDE });
  if (!row) throw new ApiError(404, "NOT_FOUND", "faculty member not found.");
  return toFacultyDto(row);
}

export async function createFaculty(input: FacultyCreateInput) {
  try {
    const row = await prisma.faculty.create({ data: input, include: FACULTY_INCLUDE });
    return toFacultyDto(row);
  } catch (error) {
    translatePrismaError(error, "faculty member", "email");
  }
}

export async function updateFaculty(id: string, input: FacultyUpdateInput) {
  try {
    const row = await prisma.faculty.update({
      where: { id },
      data: input,
      include: FACULTY_INCLUDE,
    });
    return toFacultyDto(row);
  } catch (error) {
    translatePrismaError(error, "faculty member", "email");
  }
}

export async function deleteFaculty(id: string): Promise<void> {
  try {
    await prisma.faculty.delete({ where: { id } });
  } catch (error) {
    translatePrismaError(error, "faculty member", "email");
  }
}
