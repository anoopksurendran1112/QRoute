// ADMIN-01 behaviour suite.
//
// Every entity is exercised through HTTP: create, read, update, delete, then a
// read that must return 404. A delete that returns 204 while leaving the row
// behind is exactly the failure a status-code-only assertion misses.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestUser,
  deleteAuthTestUsers,
  testApp,
  type TestUser,
} from "./helpers/auth.ts";
import { cleanupByPrefix, uniqueSuffix } from "./helpers/db.ts";

const PREFIX = "t-cat-";

let admin: TestUser;
let user: TestUser;

/** A unique natural key carrying the suite prefix, so cleanup can find it. */
function key(): string {
  return `${PREFIX}${uniqueSuffix()}`;
}

function adminHeader(): { Authorization: string } {
  return { Authorization: `Bearer ${admin.token}` };
}

function userHeader(): { Authorization: string } {
  return { Authorization: `Bearer ${user.token}` };
}

function post(path: string, body: Record<string, unknown>, token = admin.token) {
  return request(testApp)
    .post(path)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

function get(path: string, token = admin.token) {
  return request(testApp).get(path).set("Authorization", `Bearer ${token}`);
}

function patch(path: string, body: Record<string, unknown>) {
  return request(testApp).patch(path).set("Authorization", adminHeader().Authorization).send(body);
}

function del(path: string) {
  return request(testApp).delete(path).set("Authorization", adminHeader().Authorization);
}

async function makeBuilding(): Promise<string> {
  const res = await post("/v1/buildings", { code: key(), name: "Fixture Block" });
  expect(res.status).toBe(201);
  return (res.body as { building: { id: string } }).building.id;
}

async function makeFloor(buildingId: string, level = 0): Promise<string> {
  const res = await post("/v1/floors", {
    buildingId,
    level,
    name: key(),
    metersPerPixel: 0.02,
    widthPx: 800,
    heightPx: 600,
  });
  expect(res.status).toBe(201);
  return (res.body as { floor: { id: string } }).floor.id;
}

async function makeDepartment(): Promise<string> {
  const suffix = uniqueSuffix();
  const res = await post("/v1/departments", {
    name: `${PREFIX}${suffix}`,
    code: `${PREFIX}${suffix}`,
  });
  expect(res.status).toBe(201);
  return (res.body as { department: { id: string } }).department.id;
}

beforeAll(async () => {
  admin = await createTestUser({ role: "admin" });
  user = await createTestUser({ role: "user" });
});

afterAll(async () => {
  await cleanupByPrefix(PREFIX);
  await deleteAuthTestUsers();
});

describe("authorisation matrix", () => {
  const collections = [
    "/v1/buildings",
    "/v1/floors",
    "/v1/classrooms",
    "/v1/departments",
    "/v1/faculty",
  ];

  for (const path of collections) {
    it(`guards writes and opens reads on ${path}`, async () => {
      const anonymous = await request(testApp).post(path).send({});
      expect(anonymous.status).toBe(401);

      const asUser = await request(testApp)
        .post(path)
        .set("Authorization", `Bearer ${user.token}`)
        .send({});
      expect(asUser.status).toBe(403);
      expect((asUser.body as { error?: { code?: string } }).error?.code).toBe("FORBIDDEN");

      const read = await get(path, user.token);
      expect(read.status).toBe(200);
    });
  }
});

describe("buildings", () => {
  it("creates, reads, updates and deletes a building", async () => {
    const code = key();
    const created = await post("/v1/buildings", { code, name: "Test Block" });
    expect(created.status).toBe(201);

    const id = (created.body as { building: { id: string } }).building.id;

    const list = await get("/v1/buildings");
    expect(list.status).toBe(200);
    expect(
      (list.body as { buildings: Array<{ id: string }> }).buildings.map((row) => row.id),
    ).toContain(id);

    const read = await get(`/v1/buildings/${id}`);
    expect(read.status).toBe(200);
    expect((read.body as { building: { code: string } }).building.code).toBe(code);

    const updated = await patch(`/v1/buildings/${id}`, { name: "Renamed Block" });
    expect(updated.status).toBe(200);
    expect((updated.body as { building: { name: string } }).building.name).toBe("Renamed Block");

    expect((await del(`/v1/buildings/${id}`)).status).toBe(204);
    expect((await get(`/v1/buildings/${id}`)).status).toBe(404);
  });

  it("rejects a duplicate code with 409 CONFLICT", async () => {
    const code = key();
    expect((await post("/v1/buildings", { code, name: "First" })).status).toBe(201);

    const duplicate = await post("/v1/buildings", { code, name: "Second" });
    expect(duplicate.status).toBe(409);
    expect((duplicate.body as { error?: { code?: string } }).error?.code).toBe("CONFLICT");
  });

  it("rejects a missing required field and an empty PATCH with 400", async () => {
    const missing = await post("/v1/buildings", { name: "No Code" });
    expect(missing.status).toBe(400);
    expect((missing.body as { error?: { code?: string } }).error?.code).toBe("VALIDATION_ERROR");

    const id = await makeBuilding();
    const empty = await patch(`/v1/buildings/${id}`, {});
    expect(empty.status).toBe(400);
    expect((empty.body as { error?: { code?: string } }).error?.code).toBe("VALIDATION_ERROR");
  });

  it("refuses to delete a building that still has floors", async () => {
    const buildingId = await makeBuilding();
    const floorId = await makeFloor(buildingId);

    const blocked = await del(`/v1/buildings/${buildingId}`);
    expect(blocked.status).toBe(409);
    expect((blocked.body as { error?: { code?: string } }).error?.code).toBe("CONFLICT");

    expect((await del(`/v1/floors/${floorId}`)).status).toBe(204);
    expect((await del(`/v1/buildings/${buildingId}`)).status).toBe(204);
  });
});

describe("floors", () => {
  it("creates, reads, updates and deletes a floor, keeping decimals as strings", async () => {
    const buildingId = await makeBuilding();
    const name = key();

    const created = await post("/v1/floors", {
      buildingId,
      level: 0,
      name,
      metersPerPixel: 0.02,
      widthPx: 800,
      heightPx: 600,
    });
    expect(created.status).toBe(201);

    const floor = (created.body as { floor: { id: string; metersPerPixel: unknown } }).floor;
    expect(typeof floor.metersPerPixel).toBe("string");
    expect(floor.metersPerPixel).toBe("0.02");

    const read = await get(`/v1/floors/${floor.id}`);
    expect(read.status).toBe(200);

    const updated = await patch(`/v1/floors/${floor.id}`, { name: `${name}-renamed` });
    expect(updated.status).toBe(200);

    const filtered = await get(`/v1/floors?buildingId=${buildingId}`);
    expect(filtered.status).toBe(200);
    expect(
      (filtered.body as { floors: Array<{ id: string }> }).floors.map((row) => row.id),
    ).toContain(floor.id);

    expect((await del(`/v1/floors/${floor.id}`)).status).toBe(204);
    expect((await get(`/v1/floors/${floor.id}`)).status).toBe(404);
  });

  it("rejects a non-positive metersPerPixel with 400 VALIDATION_ERROR", async () => {
    const buildingId = await makeBuilding();

    for (const metersPerPixel of [0, -0.5]) {
      const res = await post("/v1/floors", {
        buildingId,
        level: 1,
        name: key(),
        metersPerPixel,
      });
      expect(res.status).toBe(400);
      expect((res.body as { error?: { code?: string } }).error?.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects a duplicate level in the same building with 409", async () => {
    const buildingId = await makeBuilding();
    await makeFloor(buildingId, 0);

    const duplicate = await post("/v1/floors", {
      buildingId,
      level: 0,
      name: key(),
      metersPerPixel: 0.02,
    });
    expect(duplicate.status).toBe(409);
    expect((duplicate.body as { error?: { code?: string } }).error?.code).toBe("CONFLICT");
  });

  it("refuses to delete a floor that still has classrooms", async () => {
    const buildingId = await makeBuilding();
    const floorId = await makeFloor(buildingId);

    const classroom = await post("/v1/classrooms", {
      roomNumber: key(),
      floorId,
      capacity: 60,
    });
    expect(classroom.status).toBe(201);
    const classroomId = (classroom.body as { classroom: { id: string } }).classroom.id;

    const blocked = await del(`/v1/floors/${floorId}`);
    expect(blocked.status).toBe(409);

    expect((await del(`/v1/classrooms/${classroomId}`)).status).toBe(204);
    expect((await del(`/v1/floors/${floorId}`)).status).toBe(204);
  });
});

describe("classrooms", () => {
  it("creates, reads, updates, filters and deletes a classroom", async () => {
    const buildingId = await makeBuilding();
    const floorId = await makeFloor(buildingId);
    const departmentId = await makeDepartment();
    const roomNumber = key();

    const created = await post("/v1/classrooms", {
      roomNumber,
      name: "Test Room",
      floorId,
      departmentId,
      capacity: 60,
    });
    expect(created.status).toBe(201);

    const classroom = (
      created.body as { classroom: { id: string; roomNumber: string } }
    ).classroom;
    expect(classroom.roomNumber).toBe(roomNumber);

    const read = await get(`/v1/classrooms/${classroom.id}`);
    expect(read.status).toBe(200);
    expect((read.body as { classroom: { departmentId: string } }).classroom.departmentId).toBe(
      departmentId,
    );

    const updated = await patch(`/v1/classrooms/${classroom.id}`, { capacity: 75 });
    expect(updated.status).toBe(200);
    expect((updated.body as { classroom: { capacity: number } }).classroom.capacity).toBe(75);

    for (const query of [
      `floorId=${floorId}`,
      `buildingId=${buildingId}`,
      `departmentId=${departmentId}`,
    ]) {
      const filtered = await get(`/v1/classrooms?${query}`);
      expect(filtered.status).toBe(200);
      expect(
        (filtered.body as { classrooms: Array<{ id: string }> }).classrooms.map((row) => row.id),
      ).toContain(classroom.id);
    }

    expect((await del(`/v1/classrooms/${classroom.id}`)).status).toBe(204);
    expect((await get(`/v1/classrooms/${classroom.id}`)).status).toBe(404);
  });

  it("rejects a duplicate roomNumber on the same floor with 409", async () => {
    const buildingId = await makeBuilding();
    const floorId = await makeFloor(buildingId);
    const roomNumber = key();

    expect((await post("/v1/classrooms", { roomNumber, floorId })).status).toBe(201);

    const duplicate = await post("/v1/classrooms", { roomNumber, floorId });
    expect(duplicate.status).toBe(409);
    expect((duplicate.body as { error?: { code?: string } }).error?.code).toBe("CONFLICT");
  });
});

describe("departments", () => {
  it("creates, reads, updates and deletes a department", async () => {
    const suffix = uniqueSuffix();
    const created = await post("/v1/departments", {
      name: `${PREFIX}${suffix}`,
      code: `${PREFIX}${suffix}`,
    });
    expect(created.status).toBe(201);

    const department = (
      created.body as { department: { id: string; code: string } }
    ).department;

    expect((await get(`/v1/departments/${department.id}`)).status).toBe(200);

    const updated = await patch(`/v1/departments/${department.id}`, {
      name: `${PREFIX}${suffix}-renamed`,
    });
    expect(updated.status).toBe(200);

    expect((await del(`/v1/departments/${department.id}`)).status).toBe(204);
    expect((await get(`/v1/departments/${department.id}`)).status).toBe(404);
  });

  it("refuses to delete a department that still has faculty", async () => {
    const departmentId = await makeDepartment();

    const faculty = await post("/v1/faculty", {
      name: "Blocking Teacher",
      email: `${key()}@example.com`,
      departmentId,
    });
    expect(faculty.status).toBe(201);
    const facultyId = (faculty.body as { faculty: { id: string } }).faculty.id;

    const blocked = await del(`/v1/departments/${departmentId}`);
    expect(blocked.status).toBe(409);
    expect((blocked.body as { error?: { code?: string } }).error?.code).toBe("CONFLICT");

    expect((await del(`/v1/faculty/${facultyId}`)).status).toBe(204);
    expect((await del(`/v1/departments/${departmentId}`)).status).toBe(204);
  });
});

describe("faculty", () => {
  it("creates, reads, updates, filters and deletes a faculty member", async () => {
    const departmentId = await makeDepartment();
    const email = `${key()}@example.com`;

    const created = await post("/v1/faculty", {
      name: "Test Faculty",
      email,
      designation: "Assistant Professor",
      departmentId,
    });
    expect(created.status).toBe(201);

    const faculty = (created.body as { faculty: { id: string; email: string } }).faculty;
    expect(faculty.email).toBe(email);

    expect((await get(`/v1/faculty/${faculty.id}`)).status).toBe(200);

    const updated = await patch(`/v1/faculty/${faculty.id}`, {
      designation: "Professor",
    });
    expect(updated.status).toBe(200);
    expect(
      (updated.body as { faculty: { designation: string } }).faculty.designation,
    ).toBe("Professor");

    const filtered = await get(`/v1/faculty?departmentId=${departmentId}`);
    expect(filtered.status).toBe(200);
    expect(
      (filtered.body as { faculty: Array<{ id: string }> }).faculty.map((row) => row.id),
    ).toContain(faculty.id);

    expect((await del(`/v1/faculty/${faculty.id}`)).status).toBe(204);
    expect((await get(`/v1/faculty/${faculty.id}`)).status).toBe(404);
  });

  it("rejects a missing departmentId with 400 VALIDATION_ERROR", async () => {
    const res = await post("/v1/faculty", {
      name: "No Department",
      email: `${key()}@example.com`,
    });
    expect(res.status).toBe(400);
    expect((res.body as { error?: { code?: string } }).error?.code).toBe("VALIDATION_ERROR");
  });
});
