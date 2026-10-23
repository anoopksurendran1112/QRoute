// Helpers for the AUTH-01 suite.
//
// Fixtures are inserted directly through Prisma (not through /register) so a
// test can choose the role, and every natural key carries the `t-auth-` prefix
// that afterAll deletes.

import type { Role } from "@qroute/shared";
import request from "supertest";
import { createApp } from "../../src/app.ts";
import { signToken } from "../../src/utils/jwt.ts";
import { hashPassword } from "../../src/utils/password.ts";
import { prisma, uniqueSuffix } from "./db.ts";

export const AUTH_TEST_PREFIX = "t-auth-";

export const DEFAULT_TEST_PASSWORD = "TestPass123!";

/** One app instance for the whole suite; supertest drives it in-process. */
export const testApp = createApp();

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: Role;
  token: string;
}

export async function createTestUser(
  options: { role?: Role; email?: string; password?: string; name?: string } = {},
): Promise<TestUser> {
  const role = options.role ?? "user";
  const email = options.email ?? `${AUTH_TEST_PREFIX}${uniqueSuffix()}@example.com`;
  const password = options.password ?? DEFAULT_TEST_PASSWORD;

  const user = await prisma.user.create({
    data: {
      email,
      name: options.name ?? "Auth Test User",
      password: await hashPassword(password),
      role,
    },
  });

  return {
    id: user.id,
    email: user.email,
    password,
    role: user.role,
    token: signToken({ id: user.id, email: user.email, role: user.role }),
  };
}

export async function loginAs(email: string, password: string) {
  return request(testApp).post("/v1/auth/login").send({ email, password });
}

export async function deleteAuthTestUsers(): Promise<number> {
  const result = await prisma.user.deleteMany({
    where: { email: { startsWith: AUTH_TEST_PREFIX } },
  });
  return result.count;
}
