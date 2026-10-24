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

  it("requires authentication", async () => {
    const res = await request(app).post("/v1/routes/compute").send({
      startNodeId: "test",
      endNodeId: "test",
    });
    expect(res.status).toBe(401);
  });

  it("validates request body", async () => {
    if (!token) return;
    const res = await request(app)
      .post("/v1/routes/compute")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("computes route between nodes with astar", async () => {
    if (!token) return;
    const nodes = await prisma.node.findMany({ take: 2 });
    if (nodes.length < 2) return;
    
    const res = await request(app)
      .post("/v1/routes/compute")
      .set("Authorization", `Bearer ${token}`)
      .send({
        startNodeId: nodes[0].id,
        endNodeId: nodes[1].id,
        algorithm: "astar",
      });
    expect(res.status).toBe(200);
    expect(res.body.astar).toBeDefined();
  });

  it("computes route with both algorithms", async () => {
    if (!token) return;
    const nodes = await prisma.node.findMany({ take: 2 });
    if (nodes.length < 2) return;
    
    const res = await request(app)
      .post("/v1/routes/compute")
      .set("Authorization", `Bearer ${token}`)
      .send({
        startNodeId: nodes[0].id,
        endNodeId: nodes[1].id,
        algorithm: "both",
      });
    expect(res.status).toBe(200);
    expect(res.body.dijkstra).toBeDefined();
    expect(res.body.astar).toBeDefined();
    expect(typeof res.body.agreed).toBe("boolean");
  });
});
