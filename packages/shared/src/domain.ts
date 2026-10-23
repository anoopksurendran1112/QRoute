// The cross-tier domain contract.
//
// Imported by the API, the admin panel (and later the Flutter client's
// generated types), so it must stay free of runtime dependencies on Prisma or
// Express — it is bundled for the browser.
//
// Decimals are typed as `string`: Prisma serialises Decimal to a string at the
// API boundary, and typing them as `number` turns a 0.02 m/px calibration into
// an unpredictable float on the way through JSON.

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const NODE_KINDS = ["junction", "door", "stair", "lift", "entrance"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_KINDS = ["walk", "stair", "lift"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface BuildingDto {
  id: string;
  code: string;
  name: string;
  campus: string | null;
}

export interface FloorDto {
  id: string;
  buildingId: string;
  level: number;
  name: string | null;
  imagePath: string | null;
  imageSha256: string | null;
  widthPx: number | null;
  heightPx: number | null;
  /** Metres per pixel. Non-nullable: an uncalibrated floor cannot be routed on. */
  metersPerPixel: string;
}

export interface ClassroomDto {
  id: string;
  roomNumber: string;
  name: string | null;
  floorId: string;
  departmentId: string | null;
  entranceNodeId: string | null;
  capacity: number | null;
}

export interface DepartmentDto {
  id: string;
  name: string;
  code: string;
}

export interface FacultyDto {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  departmentId: string;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}
