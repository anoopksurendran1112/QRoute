// SEED-01 suite.
//
// The seed is checked the way it will be used: run it twice over the real
// database and demand that (a) the row counts do not grow, (b) every documented
// invariant holds, and (c) the deliberately-broken fixture set stays isolated
// from the demo signal.

import { describe, expect, it } from "vitest";
import { runSeed } from "../prisma/seed.ts";
import { verifyDemoCampus } from "../prisma/seed-verify.ts";
import { config } from "../src/config.ts";
import { prisma } from "../src/lib/prisma.ts";

const DEMO_BUILDING_CODES = ["MAIN", "CSB", "LIB"];
const DEMO_DEPARTMENT_CODES = ["CSE", "ECE", "MECH", "CIVIL", "EEE"];
const FIXTURE_PREFIX = "FIX-";

interface DemoCounts {
  buildings: number;
  floors: number;
  classrooms: number;
  departments: number;
  faculty: number;
  nodes: number;
  edges: number;
  users: number;
}

/** Counts scoped to the demo data, so another suite's rows cannot perturb them. */
async function demoCounts(): Promise<DemoCounts> {
  const inDemoBuildings = { floor: { building: { code: { in: DEMO_BUILDING_CODES } } } };

  const [buildings, floors, classrooms, departments, faculty, nodes, edges, users] =
    await Promise.all([
      prisma.building.count({ where: { code: { in: DEMO_BUILDING_CODES } } }),
      prisma.floor.count({ where: { building: { code: { in: DEMO_BUILDING_CODES } } } }),
      prisma.classroom.count({ where: inDemoBuildings }),
      prisma.department.count({ where: { code: { in: DEMO_DEPARTMENT_CODES } } }),
      prisma.faculty.count({ where: { department: { code: { in: DEMO_DEPARTMENT_CODES } } } }),
      prisma.node.count({ where: inDemoBuildings }),
      prisma.edge.count({ where: { fromNode: inDemoBuildings } }),
      prisma.user.count({
        where: { email: { in: [config.seedAdminEmail, config.seedUserEmail] } },
      }),
    ]);

  return { buildings, floors, classrooms, departments, faculty, nodes, edges, users };
}

describe("demo campus", () => {
  it("seeds the documented campus shape", async () => {
    const counts = await runSeed("demo");

    expect(counts.buildings).toBeGreaterThanOrEqual(3);
    expect(counts.floors).toBeGreaterThanOrEqual(6);
    expect(counts.classrooms).toBeGreaterThanOrEqual(20);
    expect(counts.departments).toBeGreaterThanOrEqual(5);
    expect(counts.faculty).toBeGreaterThanOrEqual(10);
    expect(counts.nodes).toBeGreaterThanOrEqual(60);
    expect(counts.edges).toBeGreaterThanOrEqual(60);

    const demo = await demoCounts();
    expect(demo.buildings).toBe(3);
    expect(demo.floors).toBe(9);
    expect(demo.classrooms).toBe(21);
    expect(demo.departments).toBe(5);
    expect(demo.faculty).toBe(10);
    expect(demo.users).toBe(2);

    const admins = await prisma.user.count({ where: { role: "admin" } });
    expect(admins).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent: a second run changes no demo row count", async () => {
    await runSeed("demo");
    const first = await demoCounts();

    await runSeed("demo");
    const second = await demoCounts();

    expect(second).toEqual(first);
  });

  it("satisfies every demo invariant", async () => {
    await runSeed("demo");
    expect(await verifyDemoCampus()).toEqual([]);
  });
});

describe("fixture set", () => {
  it("seeds every documented defect", async () => {
    await runSeed("fixtures");

    const fixFloor = { building: { code: { startsWith: FIXTURE_PREFIX } } };

    // Orphan nodes: no edges in either direction.
    const isolated = await prisma.node.count({
      where: { floor: fixFloor, edgesFrom: { none: {} }, edgesTo: { none: {} } },
    });
    expect(isolated).toBeGreaterThanOrEqual(2);

    // A classroom with a null entrance node.
    const noEntrance = await prisma.classroom.count({
      where: { floor: { building: { code: { startsWith: FIXTURE_PREFIX } } }, entranceNodeId: null },
    });
    expect(noEntrance).toBeGreaterThanOrEqual(1);

    // A stair node with no stair edge.
    const stairNodes = await prisma.node.findMany({
      where: { kind: "stair", floor: fixFloor },
      include: { edgesFrom: true, edgesTo: true },
    });
    expect(stairNodes.length).toBeGreaterThanOrEqual(1);
    expect(
      stairNodes.some(
        (node) => ![...node.edgesFrom, ...node.edgesTo].some((edge) => edge.kind === "stair"),
      ),
    ).toBe(true);

    // A node outside its floor image.
    const fixtureNodes = await prisma.node.findMany({
      where: { floor: fixFloor },
      include: { floor: { select: { widthPx: true, heightPx: true } } },
    });
    expect(
      fixtureNodes.some((node) => {
        const x = Number(node.x.toString());
        const y = Number(node.y.toString());
        const width = node.floor.widthPx ?? 0;
        const height = node.floor.heightPx ?? 0;
        return x < 0 || y < 0 || x > width || y > height;
      }),
    ).toBe(true);

    // A walk edge whose endpoints sit on different floors.
    const walkEdges = await prisma.edge.findMany({
      where: { kind: "walk", fromNode: { floor: fixFloor } },
      include: {
        fromNode: { select: { floorId: true } },
        toNode: { select: { floorId: true } },
      },
    });
    expect(
      walkEdges.some((edge) => edge.fromNode.floorId !== edge.toNode.floorId),
    ).toBe(true);
  });

  it("does not contaminate the demo invariants", async () => {
    await runSeed("fixtures");
    expect(await verifyDemoCampus()).toEqual([]);
  });

  it("rejects a duplicate edge on the same (from, to, kind) triple", async () => {
    const existing = await prisma.edge.findFirst({
      where: { fromNode: { floor: { building: { code: { in: DEMO_BUILDING_CODES } } } } },
    });

    expect(existing).not.toBeNull();
    if (existing === null) return;

    await expect(
      prisma.edge.create({
        data: {
          fromNodeId: existing.fromNodeId,
          toNodeId: existing.toNodeId,
          kind: existing.kind,
          costM: 1,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
