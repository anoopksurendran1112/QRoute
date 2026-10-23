// A deliberately invalid mini-graph for Phase 2's validator tests.
//
// Every defect here is one the graph validator MUST reject. Keeping them in a
// throwaway `FIX-` building means the demo campus can stay clean while the
// negative cases are real rows, not hand-built mocks (SEED-01).
//
// Defects present:
//   1. an orphan node with no edges at all
//   2. a classroom with a null entrance node
//   3. a stair node with no vertical counterpart
//   4. a node whose x coordinate lies outside the floor image
//   5. a `walk` edge between two different floors
//   6. a second and third connected component

import type { SeedClient } from "./graph.ts";

const BUILDING_CODE = "FIX-DEMO";
const IMAGE_WIDTH_PX = 500;
const IMAGE_HEIGHT_PX = 500;
const METERS_PER_PIXEL = 0.05;

interface FixtureNode {
  code: string;
  level: 0 | 1;
  kind: "junction" | "door" | "stair" | "lift";
  x: number;
  y: number;
  label: string;
}

const NODES: FixtureNode[] = [
  // Connected component #1: A — B, A — STAIR, A — UP (cross-floor, defect 5).
  { code: "FIX-A", level: 0, kind: "junction", x: 100, y: 100, label: "Fixture A" },
  { code: "FIX-B", level: 0, kind: "junction", x: 200, y: 100, label: "Fixture B" },
  { code: "FIX-STAIR", level: 0, kind: "stair", x: 100, y: 400, label: "Fixture stair" },
  { code: "FIX-UP", level: 1, kind: "junction", x: 100, y: 100, label: "Fixture upper" },
  // Defect 4: x = 900 on a 500 px wide floor.
  { code: "FIX-OOB", level: 0, kind: "junction", x: 900, y: 100, label: "Fixture out of bounds" },
  // Defect 6: isolated nodes.
  { code: "FIX-C", level: 0, kind: "junction", x: 400, y: 400, label: "Fixture C (isolated)" },
  { code: "FIX-ORPHAN", level: 0, kind: "door", x: 300, y: 300, label: "Fixture orphan" },
];

export async function seedFixtures(client: SeedClient): Promise<void> {
  const building = await client.building.upsert({
    where: { code: BUILDING_CODE },
    create: {
      code: BUILDING_CODE,
      name: "Fixture Block (intentionally invalid)",
      campus: "Test fixtures",
    },
    update: { name: "Fixture Block (intentionally invalid)" },
  });

  const floors = new Map<number, string>();
  for (const level of [0, 1] as const) {
    const floor = await client.floor.upsert({
      where: { buildingId_level: { buildingId: building.id, level } },
      create: {
        buildingId: building.id,
        level,
        name: `Fixture Level ${level}`,
        widthPx: IMAGE_WIDTH_PX,
        heightPx: IMAGE_HEIGHT_PX,
        metersPerPixel: METERS_PER_PIXEL,
      },
      update: {
        name: `Fixture Level ${level}`,
        widthPx: IMAGE_WIDTH_PX,
        heightPx: IMAGE_HEIGHT_PX,
        metersPerPixel: METERS_PER_PIXEL,
      },
    });
    floors.set(level, floor.id);
  }

  const nodeIds = new Map<string, string>();
  for (const node of NODES) {
    const floorId = floors.get(node.level);
    if (!floorId) throw new Error(`Fixture error: level ${node.level} was not created.`);

    const row = await client.node.upsert({
      where: { floorId_code: { floorId, code: node.code } },
      create: {
        floorId,
        code: node.code,
        kind: node.kind,
        x: node.x,
        y: node.y,
        label: node.label,
      },
      update: { kind: node.kind, x: node.x, y: node.y, label: node.label },
    });
    nodeIds.set(node.code, row.id);
  }

  function id(code: string): string {
    const value = nodeIds.get(code);
    if (value === undefined) throw new Error(`Fixture error: node ${code} was not created.`);
    return value;
  }

  const edges: Array<{ from: string; to: string; kind: "walk" | "stair"; costM: number }> = [
    { from: "FIX-A", to: "FIX-B", kind: "walk", costM: 2.0 },
    { from: "FIX-A", to: "FIX-STAIR", kind: "walk", costM: 3.0 },
    { from: "FIX-B", to: "FIX-OOB", kind: "walk", costM: 1.5 },
    // Defect 5: both endpoints exist, but they live on different floors.
    { from: "FIX-A", to: "FIX-UP", kind: "walk", costM: 5.0 },
  ];

  for (const edge of edges) {
    await client.edge.upsert({
      where: {
        fromNodeId_toNodeId_kind: {
          fromNodeId: id(edge.from),
          toNodeId: id(edge.to),
          kind: edge.kind,
        },
      },
      create: {
        fromNodeId: id(edge.from),
        toNodeId: id(edge.to),
        kind: edge.kind,
        costM: edge.costM,
      },
      update: { costM: edge.costM },
    });
  }

  // Defect 2: a classroom with no entrance node.
  const groundFloor = floors.get(0);
  if (!groundFloor) throw new Error("Fixture error: ground floor was not created.");

  await client.classroom.upsert({
    where: { floorId_roomNumber: { floorId: groundFloor, roomNumber: "FIX-R1" } },
    create: {
      floorId: groundFloor,
      roomNumber: "FIX-R1",
      name: "Fixture room without an entrance",
      entranceNodeId: null,
      capacity: 30,
    },
    update: { name: "Fixture room without an entrance", entranceNodeId: null, capacity: 30 },
  });
}
