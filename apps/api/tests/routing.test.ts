import { describe, expect, it, beforeAll } from "vitest";
import { createApp } from "../src/app.ts";
import request from "supertest";
import { prisma } from "../src/lib/prisma.ts";

describe("Routing API", () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeAll(async () => {
    app = createApp();
    // Login as admin
    const res = await request(app).post("/v1/auth/login").send({
      email: "admin@sjcet.local",
      password: "Admin@12345!",
    });
    if (res.status === 200) {
      token = res.body.token;
    }
  });

  it("is public and reports unknown nodes as 404", async () => {
    // Route computation is deliberately unauthenticated: a student needs a
    // route before logging in. Unknown ids are a 404, not a 401.
    const res = await request(app).post("/v1/routes/compute").send({
      startNodeId: "does-not-exist",
      endNodeId: "does-not-exist",
    });
    expect(res.status).toBe(404);
  });

  it("validates request body", async () => {
    const res = await request(app).post("/v1/routes/compute").send({});
    expect(res.status).toBe(400);
  });

  it("computes route between nodes with astar", async () => {
    // Two endpoints of a real seeded edge must always be routable. Asserting
    // only that a body came back is what let a total routing failure through:
    // `found: false` is still a 200.
    const edge = await prisma.edge.findFirst({ orderBy: { costM: "asc" } });
    if (!edge) return;

    const res = await request(app)
      .post("/v1/routes/compute")
      .send({
        startNodeId: edge.fromNodeId,
        endNodeId: edge.toNodeId,
        algorithm: "astar",
      });

    expect(res.status).toBe(200);
    expect(res.body.astar.found).toBe(true);
    expect(res.body.astar.path[0]).toBe(edge.fromNodeId);
    expect(res.body.astar.path[res.body.astar.path.length - 1]).toBe(edge.toNodeId);
    expect(res.body.astar.metrics.nodesExpanded).toBeGreaterThan(0);
    expect(res.body.astar.instructions.length).toBeGreaterThan(0);
  });

  it("computes route with both algorithms and they agree", async () => {
    const edge = await prisma.edge.findFirst({ orderBy: { costM: "asc" } });
    if (!edge) return;

    const res = await request(app)
      .post("/v1/routes/compute")
      .send({
        startNodeId: edge.fromNodeId,
        endNodeId: edge.toNodeId,
        algorithm: "both",
      });

    expect(res.status).toBe(200);
    expect(res.body.dijkstra.found).toBe(true);
    expect(res.body.astar.found).toBe(true);
    expect(res.body.agreed).toBe(true);
    expect(Math.abs(res.body.dijkstra.totalCostM - res.body.astar.totalCostM)).toBeLessThan(0.01);
  });

  it("round-trips a bidirectional edge in both directions", async () => {
    const edge = await prisma.edge.findFirst({
      where: { bidirectional: true },
      orderBy: { costM: "asc" },
    });
    if (!edge) return;

    const forward = await request(app)
      .post("/v1/routes/compute")
      .send({ startNodeId: edge.fromNodeId, endNodeId: edge.toNodeId, algorithm: "dijkstra" });
    const backward = await request(app)
      .post("/v1/routes/compute")
      .send({ startNodeId: edge.toNodeId, endNodeId: edge.fromNodeId, algorithm: "dijkstra" });

    expect(forward.body.dijkstra.found).toBe(true);
    expect(backward.body.dijkstra.found).toBe(true);
    expect(backward.body.dijkstra.path).toEqual([...forward.body.dijkstra.path].reverse());
  });

  it("authenticated callers still get the same result", async () => {
    if (!token) return;
    const edge = await prisma.edge.findFirst({ orderBy: { costM: "asc" } });
    if (!edge) return;

    const res = await request(app)
      .post("/v1/routes/compute")
      .set("Authorization", `Bearer ${token}`)
      .send({ startNodeId: edge.fromNodeId, endNodeId: edge.toNodeId, algorithm: "dijkstra" });

    expect(res.status).toBe(200);
    expect(res.body.dijkstra.found).toBe(true);
  });
});
