import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestUser, deleteAuthTestUsers, testApp } from "./helpers/auth.ts";

describe("Graph snapshot and monitoring", () => {
  afterAll(async () => {
    await deleteAuthTestUsers();
  });

  it("returns graph snapshot for authenticated user", async () => {
    const user = await createTestUser({ role: "user" });
    const res = await request(testApp)
      .get("/v1/graph/snapshot")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.graphRevision).toBeDefined();
    expect(Array.isArray(res.body.nodes)).toBe(true);
    expect(Array.isArray(res.body.edges)).toBe(true);
  });

  it("blocks non-admin from monitoring summary", async () => {
    const user = await createTestUser({ role: "user" });
    const res = await request(testApp)
      .get("/v1/monitoring/summary")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(403);
  });

  it("returns monitoring summary for admin", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(testApp)
      .get("/v1/monitoring/summary")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.scans).toBeDefined();
    expect(res.body.sessions).toBeDefined();
  });
});
