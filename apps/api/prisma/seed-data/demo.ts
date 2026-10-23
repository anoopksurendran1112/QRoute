// The synthetic SJCET campus.
//
// Deliberately non-trivial, because a seed that is a straight line hides every
// bug: three buildings, nine floors, five departments, ten faculty, twenty-one
// classrooms, per-floor calibration that differs by design, and room numbers
// that repeat across buildings so search ambiguity exists from day one.
//
// Every write is an upsert on a natural key. `create` is never used, which is
// what makes a second `npm run db:seed` a no-op (SEED-01).

import { config } from "../../src/config.ts";
import { hashPassword } from "../../src/utils/password.ts";
import {
  DOOR_SPUR_COST_M,
  costFromPixels,
  verticalCost,
  type Point,
  type SeedClient,
} from "./graph.ts";

interface RoomSpec {
  number: string;
  departmentCode: string | null;
}

interface FloorSpec {
  level: number;
  metersPerPixel: number;
  rooms: RoomSpec[];
}

interface BuildingSpec {
  code: string;
  name: string;
  campus: string;
  floors: FloorSpec[];
}

const IMAGE_WIDTH_PX = 900;
const IMAGE_HEIGHT_PX = 600;
const CORRIDOR_Y = 300;
const DOOR_Y = 180;

const JUNCTIONS = [
  { code: "J1", x: 100 },
  { code: "J2", x: 350 },
  { code: "J3", x: 600 },
  { code: "J4", x: 850 },
] as const;

const STAIR: Point = { x: 850, y: 420 };
const LIFT: Point = { x: 850, y: 500 };

const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science and Engineering" },
  { code: "ECE", name: "Electronics and Communication Engineering" },
  { code: "MECH", name: "Mechanical Engineering" },
  { code: "CIVIL", name: "Civil Engineering" },
  { code: "EEE", name: "Electrical and Electronics Engineering" },
] as const;

const FACULTY = [
  { name: "Anita Joseph", email: "anita.joseph@sjcet.local", designation: "Professor", departmentCode: "CSE" },
  { name: "Rahul Menon", email: "rahul.menon@sjcet.local", designation: "Assistant Professor", departmentCode: "CSE" },
  { name: "Deepa Nair", email: "deepa.nair@sjcet.local", designation: "Professor", departmentCode: "ECE" },
  { name: "Sijo Thomas", email: "sijo.thomas@sjcet.local", designation: "Assistant Professor", departmentCode: "ECE" },
  { name: "Vinod Kumar", email: "vinod.kumar@sjcet.local", designation: "Professor", departmentCode: "MECH" },
  { name: "Reji Mathew", email: "reji.mathew@sjcet.local", designation: "Assistant Professor", departmentCode: "MECH" },
  { name: "Smitha George", email: "smitha.george@sjcet.local", designation: "Professor", departmentCode: "CIVIL" },
  { name: "Anoop Das", email: "anoop.das@sjcet.local", designation: "Assistant Professor", departmentCode: "CIVIL" },
  { name: "Latha Rani", email: "latha.rani@sjcet.local", designation: "Professor", departmentCode: "EEE" },
  { name: "Jibin Paul", email: "jibin.paul@sjcet.local", designation: "Assistant Professor", departmentCode: "EEE" },
] as const;

// Calibration is deliberately divergent: 0.011 m/px (CSB) vs 0.035 m/px (LIB)
// is a ratio above 3, so any code that treats a pixel as a metre is wrong by a
// visible factor. No floor may ever use 1.0.
const BUILDINGS: BuildingSpec[] = [
  {
    code: "MAIN",
    name: "Main Block",
    campus: "SJCET Palai",
    floors: [
      {
        level: 0,
        metersPerPixel: 0.02,
        rooms: [
          { number: "101", departmentCode: "ECE" },
          { number: "102", departmentCode: "ECE" },
          { number: "103", departmentCode: "ECE" },
        ],
      },
      {
        level: 1,
        metersPerPixel: 0.018,
        rooms: [
          { number: "201", departmentCode: "MECH" },
          { number: "202", departmentCode: "MECH" },
          { number: "203", departmentCode: "MECH" },
        ],
      },
      {
        level: 2,
        metersPerPixel: 0.02,
        rooms: [
          { number: "301", departmentCode: "CIVIL" },
          { number: "302", departmentCode: "CIVIL" },
          { number: "303", departmentCode: "CIVIL" },
        ],
      },
      {
        level: 3,
        metersPerPixel: 0.021,
        rooms: [
          { number: "401", departmentCode: "EEE" },
          { number: "402", departmentCode: "EEE" },
        ],
      },
    ],
  },
  {
    code: "CSB",
    name: "Computer Science Block",
    campus: "SJCET Palai",
    floors: [
      {
        level: 0,
        metersPerPixel: 0.011,
        rooms: [
          { number: "101", departmentCode: "CSE" },
          { number: "102", departmentCode: "CSE" },
        ],
      },
      {
        level: 1,
        metersPerPixel: 0.012,
        rooms: [
          { number: "201", departmentCode: "CSE" },
          { number: "202", departmentCode: "CSE" },
          { number: "203", departmentCode: "CSE" },
        ],
      },
      {
        level: 2,
        metersPerPixel: 0.011,
        rooms: [
          { number: "301", departmentCode: "CSE" },
          { number: "302", departmentCode: "CSE" },
        ],
      },
    ],
  },
  {
    code: "LIB",
    name: "Library Block",
    campus: "SJCET Palai",
    floors: [
      {
        level: 0,
        metersPerPixel: 0.035,
        rooms: [{ number: "101", departmentCode: null }],
      },
      {
        level: 1,
        metersPerPixel: 0.03,
        rooms: [
          { number: "201", departmentCode: null },
          { number: "202", departmentCode: null },
        ],
      },
    ],
  },
];

function requireId<K>(map: Map<K, string>, key: K): string {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Seed error: "${key}" was not created before it was referenced.`);
  }
  return value;
}

async function upsertNode(
  client: SeedClient,
  floorId: string,
  code: string,
  kind: "junction" | "door" | "stair" | "lift" | "entrance",
  point: Point,
  label: string,
): Promise<string> {
  const row = await client.node.upsert({
    where: { floorId_code: { floorId, code } },
    create: { floorId, code, kind, x: point.x, y: point.y, label },
    update: { kind, x: point.x, y: point.y, label },
  });
  return row.id;
}

async function upsertEdge(
  client: SeedClient,
  fromNodeId: string,
  toNodeId: string,
  kind: "walk" | "stair" | "lift",
  costM: number,
): Promise<void> {
  await client.edge.upsert({
    where: { fromNodeId_toNodeId_kind: { fromNodeId, toNodeId, kind } },
    create: { fromNodeId, toNodeId, kind, costM },
    update: { costM },
  });
}

/** The nearest corridor junction to a door, so the spur is short and sensible. */
function nearestJunction(doorX: number): (typeof JUNCTIONS)[number] {
  let best: (typeof JUNCTIONS)[number] = JUNCTIONS[0];
  for (const junction of JUNCTIONS) {
    if (Math.abs(junction.x - doorX) < Math.abs(best.x - doorX)) best = junction;
  }
  return best;
}

export async function seedDemo(client: SeedClient): Promise<void> {
  // ── Departments ──────────────────────────────────────────────────────────
  const departmentIds = new Map<string, string>();
  for (const department of DEPARTMENTS) {
    const row = await client.department.upsert({
      where: { code: department.code },
      create: { code: department.code, name: department.name },
      update: { name: department.name },
    });
    departmentIds.set(department.code, row.id);
  }

  // ── Faculty ──────────────────────────────────────────────────────────────
  for (const member of FACULTY) {
    const departmentId = requireId(departmentIds, member.departmentCode);
    await client.faculty.upsert({
      where: { email: member.email },
      create: {
        name: member.name,
        email: member.email,
        designation: member.designation,
        departmentId,
      },
      update: { name: member.name, designation: member.designation, departmentId },
    });
  }

  // ── Campus graph ─────────────────────────────────────────────────────────
  for (const building of BUILDINGS) {
    const buildingRow = await client.building.upsert({
      where: { code: building.code },
      create: { code: building.code, name: building.name, campus: building.campus },
      update: { name: building.name, campus: building.campus },
    });

    const stairByLevel = new Map<number, string>();
    const liftByLevel = new Map<number, string>();

    for (const floor of building.floors) {
      const floorRow = await client.floor.upsert({
        where: { buildingId_level: { buildingId: buildingRow.id, level: floor.level } },
        create: {
          buildingId: buildingRow.id,
          level: floor.level,
          name: `${building.name} — Level ${floor.level}`,
          widthPx: IMAGE_WIDTH_PX,
          heightPx: IMAGE_HEIGHT_PX,
          metersPerPixel: floor.metersPerPixel,
        },
        update: {
          name: `${building.name} — Level ${floor.level}`,
          widthPx: IMAGE_WIDTH_PX,
          heightPx: IMAGE_HEIGHT_PX,
          metersPerPixel: floor.metersPerPixel,
        },
      });

      const nodeIds = new Map<string, string>();

      for (const junction of JUNCTIONS) {
        nodeIds.set(
          junction.code,
          await upsertNode(
            client,
            floorRow.id,
            `L${floor.level}-${junction.code}`,
            "junction",
            { x: junction.x, y: CORRIDOR_Y },
            `${building.code} L${floor.level} junction ${junction.code}`,
          ),
        );
      }

      const stairId = await upsertNode(
        client,
        floorRow.id,
        `L${floor.level}-STAIR`,
        "stair",
        STAIR,
        `${building.code} L${floor.level} stair`,
      );
      stairByLevel.set(floor.level, stairId);
      nodeIds.set("STAIR", stairId);

      const liftId = await upsertNode(
        client,
        floorRow.id,
        `L${floor.level}-LIFT`,
        "lift",
        LIFT,
        `${building.code} L${floor.level} lift`,
      );
      liftByLevel.set(floor.level, liftId);
      nodeIds.set("LIFT", liftId);

      // One door node per classroom, each with its own spur to the corridor.
      for (const [index, room] of floor.rooms.entries()) {
        const doorX = 140 + index * 150;
        nodeIds.set(
          `D-${room.number}`,
          await upsertNode(
            client,
            floorRow.id,
            `L${floor.level}-D-${room.number}`,
            "door",
            { x: doorX, y: DOOR_Y },
            `${building.code} L${floor.level} door to ${room.number}`,
          ),
        );
      }

      // Walk edges along the corridor, then the vertical-link approach.
      for (let index = 0; index < JUNCTIONS.length - 1; index += 1) {
        const from = JUNCTIONS[index];
        const to = JUNCTIONS[index + 1];
        if (!from || !to) continue;
        await upsertEdge(
          client,
          requireId(nodeIds, from.code),
          requireId(nodeIds, to.code),
          "walk",
          costFromPixels({ x: from.x, y: CORRIDOR_Y }, { x: to.x, y: CORRIDOR_Y }, floor.metersPerPixel),
        );
      }

      const lastJunction = JUNCTIONS[JUNCTIONS.length - 1];
      if (!lastJunction) continue;

      await upsertEdge(
        client,
        requireId(nodeIds, lastJunction.code),
        requireId(nodeIds, "STAIR"),
        "walk",
        costFromPixels(
          { x: lastJunction.x, y: CORRIDOR_Y },
          STAIR,
          floor.metersPerPixel,
        ),
      );

      await upsertEdge(
        client,
        requireId(nodeIds, lastJunction.code),
        requireId(nodeIds, "LIFT"),
        "walk",
        costFromPixels(
          { x: lastJunction.x, y: CORRIDOR_Y },
          LIFT,
          floor.metersPerPixel,
        ),
      );

      // Door spurs: a fixed human-scale cost, not a pixel-derived one.
      for (const [index, room] of floor.rooms.entries()) {
        const doorX = 140 + index * 150;
        const junction = nearestJunction(doorX);
        await upsertEdge(
          client,
          requireId(nodeIds, `D-${room.number}`),
          requireId(nodeIds, junction.code),
          "walk",
          DOOR_SPUR_COST_M,
        );
      }

      // Classrooms, each with a non-null entrance node on its own floor.
      for (const room of floor.rooms) {
        const departmentId =
          room.departmentCode === null ? null : departmentIds.get(room.departmentCode) ?? null;
        const entranceNodeId = requireId(nodeIds, `D-${room.number}`);

        await client.classroom.upsert({
          where: { floorId_roomNumber: { floorId: floorRow.id, roomNumber: room.number } },
          create: {
            floorId: floorRow.id,
            roomNumber: room.number,
            name: `Room ${room.number}`,
            departmentId,
            entranceNodeId,
            capacity: 60,
          },
          update: {
            name: `Room ${room.number}`,
            departmentId,
            entranceNodeId,
            capacity: 60,
          },
        });
      }
    }

    // Vertical links join each floor to the one above it.
    for (let index = 0; index < building.floors.length - 1; index += 1) {
      const lower = building.floors[index];
      const upper = building.floors[index + 1];
      if (!lower || !upper) continue;

      await upsertEdge(
        client,
        requireId(stairByLevel, lower.level),
        requireId(stairByLevel, upper.level),
        "stair",
        verticalCost("stair"),
      );

      await upsertEdge(
        client,
        requireId(liftByLevel, lower.level),
        requireId(liftByLevel, upper.level),
        "lift",
        verticalCost("lift"),
      );
    }
  }

  // ── Demo accounts ────────────────────────────────────────────────────────
  await client.user.upsert({
    where: { email: config.seedAdminEmail },
    create: {
      email: config.seedAdminEmail,
      name: "Campus Administrator",
      password: await hashPassword(config.seedAdminPassword),
      role: "admin",
    },
    update: {
      name: "Campus Administrator",
      password: await hashPassword(config.seedAdminPassword),
      role: "admin",
    },
  });

  await client.user.upsert({
    where: { email: config.seedUserEmail },
    create: {
      email: config.seedUserEmail,
      name: "Demo Student",
      password: await hashPassword(config.seedUserPassword),
      role: "user",
    },
    update: {
      name: "Demo Student",
      password: await hashPassword(config.seedUserPassword),
      role: "user",
    },
  });
}
