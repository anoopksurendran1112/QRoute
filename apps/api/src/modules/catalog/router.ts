// Catalog HTTP surface.
//
// Reads require authentication only — the mobile client must be able to read
// classrooms for search. Every write stacks requireAuth then requireRole("admin"),
// so a single unguarded route fails the ADMIN-01 suite (threat T-01-16).
//
// Every body is parsed with a shared zod schema before it reaches Prisma, and a
// failure returns 400 VALIDATION_ERROR with the offending field paths
// (threat T-01-17). Handlers are plain async functions: Express 5 forwards
// rejections to the error middleware, which maps ApiError.

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
import { Router, type Request } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../../lib/apiError.ts";
import { requireAuth } from "../../middleware/auth.ts";
import { requireRole } from "../../middleware/requireRole.ts";
import {
  createBuilding,
  createClassroom,
  createDepartment,
  createFaculty,
  createFloor,
  deleteBuilding,
  deleteClassroom,
  deleteDepartment,
  deleteFaculty,
  deleteFloor,
  getBuilding,
  getClassroom,
  getDepartment,
  getFaculty,
  getFloor,
  listBuildings,
  listClassrooms,
  listDepartments,
  listFaculty,
  listFloors,
  updateBuilding,
  updateClassroom,
  updateDepartment,
  updateFaculty,
  updateFloor,
} from "./service.ts";

export const catalogRouter = Router();

/** Validates a body or throws a 400 carrying zod's issue paths. */
function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Invalid request body",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

/** Express's ParamsDictionary is index-typed; this narrows and 400s if absent. */
function routeId(req: Request, name = "id"): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", `Missing route parameter: ${name}`);
  }
  return value;
}

function queryString(req: Request, name: string): string | undefined {
  const value = req.query[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// ── Buildings ───────────────────────────────────────────────────────────────

catalogRouter.get("/buildings", requireAuth, async (_req, res) => {
  res.status(200).json({ buildings: await listBuildings() });
});

catalogRouter.get("/buildings/:id", requireAuth, async (req, res) => {
  res.status(200).json({ building: await getBuilding(routeId(req)) });
});

catalogRouter.post("/buildings", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(buildingCreateSchema, req.body);
  res.status(201).json({ building: await createBuilding(input) });
});

catalogRouter.patch("/buildings/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(buildingUpdateSchema, req.body);
  res.status(200).json({ building: await updateBuilding(routeId(req), input) });
});

catalogRouter.delete("/buildings/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await deleteBuilding(routeId(req));
  res.status(204).send();
});

// ── Floors ──────────────────────────────────────────────────────────────────

catalogRouter.get("/floors", requireAuth, async (req, res) => {
  res.status(200).json({
    floors: await listFloors({ buildingId: queryString(req, "buildingId") }),
  });
});

catalogRouter.get("/floors/:id", requireAuth, async (req, res) => {
  res.status(200).json({ floor: await getFloor(routeId(req)) });
});

catalogRouter.post("/floors", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(floorCreateSchema, req.body);
  res.status(201).json({ floor: await createFloor(input) });
});

catalogRouter.patch("/floors/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(floorUpdateSchema, req.body);
  res.status(200).json({ floor: await updateFloor(routeId(req), input) });
});

catalogRouter.delete("/floors/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await deleteFloor(routeId(req));
  res.status(204).send();
});

// ── Classrooms ──────────────────────────────────────────────────────────────

catalogRouter.get("/classrooms", requireAuth, async (req, res) => {
  res.status(200).json({
    classrooms: await listClassrooms({
      floorId: queryString(req, "floorId"),
      buildingId: queryString(req, "buildingId"),
      departmentId: queryString(req, "departmentId"),
    }),
  });
});

catalogRouter.get("/classrooms/:id", requireAuth, async (req, res) => {
  res.status(200).json({ classroom: await getClassroom(routeId(req)) });
});

catalogRouter.post("/classrooms", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(classroomCreateSchema, req.body);
  res.status(201).json({ classroom: await createClassroom(input) });
});

catalogRouter.patch("/classrooms/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(classroomUpdateSchema, req.body);
  res.status(200).json({ classroom: await updateClassroom(routeId(req), input) });
});

catalogRouter.delete("/classrooms/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await deleteClassroom(routeId(req));
  res.status(204).send();
});

// ── Departments ─────────────────────────────────────────────────────────────

catalogRouter.get("/departments", requireAuth, async (_req, res) => {
  res.status(200).json({ departments: await listDepartments() });
});

catalogRouter.get("/departments/:id", requireAuth, async (req, res) => {
  res.status(200).json({ department: await getDepartment(routeId(req)) });
});

catalogRouter.post("/departments", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(departmentCreateSchema, req.body);
  res.status(201).json({ department: await createDepartment(input) });
});

catalogRouter.patch("/departments/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(departmentUpdateSchema, req.body);
  res.status(200).json({ department: await updateDepartment(routeId(req), input) });
});

catalogRouter.delete("/departments/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await deleteDepartment(routeId(req));
  res.status(204).send();
});

// ── Faculty ─────────────────────────────────────────────────────────────────

catalogRouter.get("/faculty", requireAuth, async (req, res) => {
  res.status(200).json({
    faculty: await listFaculty({ departmentId: queryString(req, "departmentId") }),
  });
});

catalogRouter.get("/faculty/:id", requireAuth, async (req, res) => {
  res.status(200).json({ faculty: await getFaculty(routeId(req)) });
});

catalogRouter.post("/faculty", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(facultyCreateSchema, req.body);
  res.status(201).json({ faculty: await createFaculty(input) });
});

catalogRouter.patch("/faculty/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const input = parseBody(facultyUpdateSchema, req.body);
  res.status(200).json({ faculty: await updateFaculty(routeId(req), input) });
});

catalogRouter.delete("/faculty/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await deleteFaculty(routeId(req));
  res.status(204).send();
});
