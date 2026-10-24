// Typed CRUD for every catalog entity. One place for every call so the list
// of endpoints and their DTOs cannot drift from the API.

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
import { apiRequest } from "./client.ts";

export interface BuildingSummary {
  id: string;
  code: string;
  name: string;
  campus: string | null;
  floorCount?: number;
}

export interface FloorSummary {
  id: string;
  code: string;
  name: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
}

export interface BuildingDto extends BuildingSummary {}

export interface FloorDto {
  id: string;
  buildingId: string;
  level: number;
  name: string | null;
  imagePath: string | null;
  imageSha256: string | null;
  widthPx: number | null;
  heightPx: number | null;
  metersPerPixel: string;
  building: BuildingSummary;
}

export interface ClassroomDto {
  id: string;
  roomNumber: string;
  name: string | null;
  floorId: string;
  departmentId: string | null;
  entranceNodeId: string | null;
  capacity: number | null;
  floor: {
    id: string;
    level: number;
    name: string | null;
    building: BuildingSummary;
  };
  department: DepartmentSummary | null;
}

export interface DepartmentDto {
  id: string;
  name: string;
  code: string;
  facultyCount?: number;
  classroomCount?: number;
}

export interface FacultyDto {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  departmentId: string;
  department: DepartmentSummary;
}

export interface BuildingListResponse {
  buildings: BuildingDto[];
}
export interface FloorListResponse {
  floors: FloorDto[];
}
export interface ClassroomListResponse {
  classrooms: ClassroomDto[];
}
export interface DepartmentListResponse {
  departments: DepartmentDto[];
}
export interface FacultyListResponse {
  faculty: FacultyDto[];
}

export interface BuildingResponse {
  building: BuildingDto;
}
export interface FloorResponse {
  floor: FloorDto;
}
export interface ClassroomResponse {
  classroom: ClassroomDto;
}
export interface DepartmentResponse {
  department: DepartmentDto;
}
export interface FacultyResponse {
  faculty: FacultyDto;
}

function withQuery(path: string, query?: Record<string, string | undefined>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string" && value.length > 0) params.set(key, value);
  }
  const queryString = params.toString();
  return queryString.length > 0 ? `${path}?${queryString}` : path;
}

// Buildings
export async function listBuildings(): Promise<BuildingDto[]> {
  const response = await apiRequest<BuildingListResponse | BuildingDto[]>("/buildings");
  return Array.isArray(response) ? response : response.buildings;
}

export async function getBuilding(id: string): Promise<BuildingDto> {
  const response = await apiRequest<BuildingResponse | BuildingDto>(`/buildings/${id}`);
  return (response as BuildingResponse).building ?? (response as BuildingDto);
}

export async function createBuilding(input: BuildingCreateInput): Promise<BuildingDto> {
  const response = await apiRequest<BuildingResponse | BuildingDto>("/buildings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (response as BuildingResponse).building ?? (response as BuildingDto);
}

export async function updateBuilding(
  id: string,
  input: BuildingUpdateInput,
): Promise<BuildingDto> {
  const response = await apiRequest<BuildingResponse | BuildingDto>(`/buildings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return (response as BuildingResponse).building ?? (response as BuildingDto);
}

export async function deleteBuilding(id: string): Promise<void> {
  await apiRequest<void>(`/buildings/${id}`, { method: "DELETE" });
}

// Floors
export async function listFloors(filter: { buildingId?: string } = {}): Promise<FloorDto[]> {
  const response = await apiRequest<FloorListResponse | FloorDto[]>(
    withQuery("/floors", filter),
  );
  return Array.isArray(response) ? response : response.floors;
}

export async function getFloor(id: string): Promise<FloorDto> {
  const response = await apiRequest<FloorResponse | FloorDto>(`/floors/${id}`);
  return (response as FloorResponse).floor ?? (response as FloorDto);
}

export async function createFloor(input: FloorCreateInput): Promise<FloorDto> {
  const response = await apiRequest<FloorResponse | FloorDto>("/floors", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (response as FloorResponse).floor ?? (response as FloorDto);
}

export async function updateFloor(id: string, input: FloorUpdateInput): Promise<FloorDto> {
  const response = await apiRequest<FloorResponse | FloorDto>(`/floors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return (response as FloorResponse).floor ?? (response as FloorDto);
}

export async function deleteFloor(id: string): Promise<void> {
  await apiRequest<void>(`/floors/${id}`, { method: "DELETE" });
}

// Classrooms
export async function listClassrooms(
  filter: { floorId?: string; buildingId?: string; departmentId?: string } = {},
): Promise<ClassroomDto[]> {
  const response = await apiRequest<ClassroomListResponse | ClassroomDto[]>(
    withQuery("/classrooms", filter),
  );
  return Array.isArray(response) ? response : response.classrooms;
}

export async function getClassroom(id: string): Promise<ClassroomDto> {
  const response = await apiRequest<ClassroomResponse | ClassroomDto>(`/classrooms/${id}`);
  return (response as ClassroomResponse).classroom ?? (response as ClassroomDto);
}

export async function createClassroom(input: ClassroomCreateInput): Promise<ClassroomDto> {
  const response = await apiRequest<ClassroomResponse | ClassroomDto>("/classrooms", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (response as ClassroomResponse).classroom ?? (response as ClassroomDto);
}

export async function updateClassroom(
  id: string,
  input: ClassroomUpdateInput,
): Promise<ClassroomDto> {
  const response = await apiRequest<ClassroomResponse | ClassroomDto>(`/classrooms/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return (response as ClassroomResponse).classroom ?? (response as ClassroomDto);
}

export async function deleteClassroom(id: string): Promise<void> {
  await apiRequest<void>(`/classrooms/${id}`, { method: "DELETE" });
}

// Departments
export async function listDepartments(): Promise<DepartmentDto[]> {
  const response = await apiRequest<DepartmentListResponse | DepartmentDto[]>("/departments");
  return Array.isArray(response) ? response : response.departments;
}

export async function getDepartment(id: string): Promise<DepartmentDto> {
  const response = await apiRequest<DepartmentResponse | DepartmentDto>(`/departments/${id}`);
  return (response as DepartmentResponse).department ?? (response as DepartmentDto);
}

export async function createDepartment(input: DepartmentCreateInput): Promise<DepartmentDto> {
  const response = await apiRequest<DepartmentResponse | DepartmentDto>("/departments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (response as DepartmentResponse).department ?? (response as DepartmentDto);
}

export async function updateDepartment(
  id: string,
  input: DepartmentUpdateInput,
): Promise<DepartmentDto> {
  const response = await apiRequest<DepartmentResponse | DepartmentDto>(`/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return (response as DepartmentResponse).department ?? (response as DepartmentDto);
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiRequest<void>(`/departments/${id}`, { method: "DELETE" });
}

// Faculty
export async function listFaculty(filter: { departmentId?: string } = {}): Promise<FacultyDto[]> {
  const response = await apiRequest<FacultyListResponse | FacultyDto[]>(
    withQuery("/faculty", filter),
  );
  return Array.isArray(response) ? response : response.faculty;
}

export async function getFaculty(id: string): Promise<FacultyDto> {
  const response = await apiRequest<FacultyResponse | FacultyDto>(`/faculty/${id}`);
  return (response as FacultyResponse).faculty ?? (response as FacultyDto);
}

export async function createFaculty(input: FacultyCreateInput): Promise<FacultyDto> {
  const response = await apiRequest<FacultyResponse | FacultyDto>("/faculty", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (response as FacultyResponse).faculty ?? (response as FacultyDto);
}

export async function updateFaculty(id: string, input: FacultyUpdateInput): Promise<FacultyDto> {
  const response = await apiRequest<FacultyResponse | FacultyDto>(`/faculty/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return (response as FacultyResponse).faculty ?? (response as FacultyDto);
}

export async function deleteFaculty(id: string): Promise<void> {
  await apiRequest<void>(`/faculty/${id}`, { method: "DELETE" });
}
