// Self-test for the harness itself.
//
// If any of these fail, every behaviour test in the phase is meaningless: the
// runner cannot reach MySQL, or the isolation helpers are not actually scoped.

import { describe, expect, it } from "vitest";
import { ROLES } from "@qroute/shared";
import { cleanupByPrefix, prisma, uniqueSuffix } from "./helpers/db.ts";

describe("test harness", () => {
  it("resolves the shared domain contract from the API workspace", () => {
    expect(ROLES).toEqual(["user", "admin"]);
  });

  it("reaches the migrated MySQL database", async () => {
    const rows = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 AS result`;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("generates five distinct fixture keys", () => {
    const values = Array.from({ length: 5 }, () => uniqueSuffix());
    expect(new Set(values).size).toBe(5);
    for (const value of values) {
      expect(value).toMatch(/^[a-z0-9]{6,}$/);
    }
  });

  it("scopes cleanup to the supplied prefix", async () => {
    const removed = await cleanupByPrefix("ZZZ-NOT-PRESENT-");
    expect(removed).toBe(0);
  });
});
