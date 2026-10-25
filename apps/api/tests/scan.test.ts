import request from "supertest";
import { describe, expect, it } from "vitest";
import { testApp } from "./helpers/auth.ts";
import { prisma } from "../src/lib/prisma.ts";
import { generateQRToken } from "../src/modules/qr/service.ts";

describe("POST /v1/scan/resolve (public)", () => {
  it("resolves a valid QR token without authentication", async () => {
    const node = await prisma.node.findFirst({ include: { floor: { include: { building: true } } } });
    if (!node) return;
    const token = generateQRToken(node.id);
    const res = await request(testApp).post("/v1/scan/resolve").send({ token });
    expect(res.status).toBe(200);
    expect(res.body.node?.id).toBe(node.id);
    expect(res.body.location).toBeDefined();
  });

  it("rejects invalid QR token", async () => {
    const res = await request(testApp).post("/v1/scan/resolve").send({ token: "bad.token" });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe("INVALID_QR");
  });
});
