import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestUser, deleteAuthTestUsers, testApp } from "./helpers/auth.ts";
import { prisma } from "../src/lib/prisma.ts";

describe("Navigation sessions", () => {
  afterAll(async () => {
    await deleteAuthTestUsers();
  });

  it("creates and completes a session for an authenticated user", async () => {
    const user = await createTestUser({ role: "user" });
    const nodes = await prisma.node.findMany({ take: 2 });
    if (nodes.length < 2) return;
    const res = await request(testApp)
      .post("/v1/navigation/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ startNodeId: nodes[0]!.id, endNodeId: nodes[1]!.id, algorithm: "astar" });
    expect(res.status).toBe(201);
    const sessionId = res.body.session?.id;
    expect(sessionId).toBeDefined();
    const comp = await request(testApp)
      .patch(`/v1/navigation/sessions/${sessionId}/complete`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ status: "completed", durationSec: 60 });
    expect(comp.status).toBe(200);
    expect(comp.body.session?.status).toBe("completed");
  });

  it("lists sessions for the authenticated user", async () => {
    const user = await createTestUser({ role: "user" });
    const res = await request(testApp)
      .get("/v1/navigation/sessions/me")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
  });
});
