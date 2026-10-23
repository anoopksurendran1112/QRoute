// AUTH-01 behaviour suite.
//
// Every assertion here is on an HTTP status and a response body. Nothing greps
// source text: a test that passes while the endpoint is missing is exactly the
// defect this suite exists to prevent.

import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { config } from "../src/config.ts";
import {
  AUTH_TEST_PREFIX,
  DEFAULT_TEST_PASSWORD,
  createTestUser,
  deleteAuthTestUsers,
  loginAs,
  testApp,
} from "./helpers/auth.ts";
import { uniqueSuffix } from "./helpers/db.ts";

interface AuthResponseBody {
  token?: string;
  user?: { id?: string; email?: string; name?: string; role?: string };
  error?: { code?: string; message?: string };
}

function newEmail(): string {
  return `${AUTH_TEST_PREFIX}${uniqueSuffix()}@example.com`;
}

afterAll(async () => {
  await deleteAuthTestUsers();
});

describe("POST /v1/auth/register", () => {
  it("creates a user-role account and returns a token", async () => {
    const res = await request(testApp)
      .post("/v1/auth/register")
      .send({ email: newEmail(), password: DEFAULT_TEST_PASSWORD, name: "New Visitor" });

    const body = res.body as AuthResponseBody;

    expect(res.status).toBe(201);
    expect(typeof body.token).toBe("string");
    expect(body.user?.role).toBe("user");
    expect(JSON.stringify(body)).not.toMatch(/password|hash/i);
  });

  it("ignores a role supplied in the request body (no self-escalation)", async () => {
    const res = await request(testApp)
      .post("/v1/auth/register")
      .send({
        email: newEmail(),
        password: DEFAULT_TEST_PASSWORD,
        name: "Would Be Admin",
        role: "admin",
      });

    const body = res.body as AuthResponseBody;

    expect(res.status).toBe(201);
    expect(body.user?.role).toBe("user");
  });

  it("returns 409 CONFLICT for a duplicate email", async () => {
    const email = newEmail();

    const first = await request(testApp)
      .post("/v1/auth/register")
      .send({ email, password: DEFAULT_TEST_PASSWORD, name: "First" });
    expect(first.status).toBe(201);

    const second = await request(testApp)
      .post("/v1/auth/register")
      .send({ email, password: DEFAULT_TEST_PASSWORD, name: "Second" });

    expect(second.status).toBe(409);
    expect((second.body as AuthResponseBody).error?.code).toBe("CONFLICT");
  });

  it("returns 400 VALIDATION_ERROR for an invalid email", async () => {
    const res = await request(testApp)
      .post("/v1/auth/register")
      .send({ email: "not-an-email", password: DEFAULT_TEST_PASSWORD, name: "Bad Email" });

    expect(res.status).toBe(400);
    expect((res.body as AuthResponseBody).error?.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR for a 7-character password", async () => {
    const res = await request(testApp)
      .post("/v1/auth/register")
      .send({ email: newEmail(), password: "1234567", name: "Short Password" });

    expect(res.status).toBe(400);
    expect((res.body as AuthResponseBody).error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /v1/auth/login", () => {
  it("returns a token that GET /v1/auth/me accepts", async () => {
    const user = await createTestUser({ role: "user" });

    const res = await loginAs(user.email, user.password);
    const body = res.body as AuthResponseBody;

    expect(res.status).toBe(200);
    expect(typeof body.token).toBe("string");
    expect(JSON.stringify(body)).not.toMatch(/password|hash/i);

    const me = await request(testApp)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${body.token ?? ""}`);

    expect(me.status).toBe(200);
    expect((me.body as { user?: { email?: string } }).user?.email).toBe(user.email);
  });

  it("returns an identical 401 for a wrong password and an unknown email", async () => {
    const user = await createTestUser({ role: "user" });

    const wrongPassword = await loginAs(user.email, "DefinitelyWrong123!");
    const unknownEmail = await loginAs(
      `${AUTH_TEST_PREFIX}${uniqueSuffix()}@example.com`,
      DEFAULT_TEST_PASSWORD,
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect((wrongPassword.body as AuthResponseBody).error?.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /v1/auth/me", () => {
  it("returns 401 without an Authorization header", async () => {
    const res = await request(testApp).get("/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 for a token signed with a different secret", async () => {
    const forged = jwt.sign(
      { role: "admin", email: "forged@example.com" },
      "a-completely-different-secret-value-32-chars",
      { subject: "forged-id", issuer: "qroute", algorithm: "HS256", expiresIn: "7d" },
    );

    const res = await request(testApp)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });
});

describe("GET /v1/admin/ping role gate", () => {
  it("returns 401 with no token", async () => {
    const res = await request(testApp).get("/v1/admin/ping");
    expect(res.status).toBe(401);
  });

  it("returns 403 with a regular user's token", async () => {
    const user = await createTestUser({ role: "user" });

    const res = await request(testApp)
      .get("/v1/admin/ping")
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(403);
    expect((res.body as AuthResponseBody).error?.code).toBe("FORBIDDEN");
  });

  it("returns 200 with an admin's token", async () => {
    const admin = await createTestUser({ role: "admin" });

    const res = await request(testApp)
      .get("/v1/admin/ping")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect((res.body as { status?: string }).status).toBe("ok");
  });
});

// Must stay last: the throttle budget is shared with every failed login above.
describe("failed-login throttling", () => {
  it("reaches 429 RATE_LIMITED", async () => {
    const email = `${AUTH_TEST_PREFIX}${uniqueSuffix()}@example.com`;
    const attemptLimit = config.rateLimitAuthMax + 2;

    let lastStatus = 0;
    let lastBody: AuthResponseBody = {};

    for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
      const res = await loginAs(email, "WrongPassword123!");
      lastStatus = res.status;
      lastBody = res.body as AuthResponseBody;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).toBe(429);
    expect(lastBody.error?.code).toBe("RATE_LIMITED");
  });
});
