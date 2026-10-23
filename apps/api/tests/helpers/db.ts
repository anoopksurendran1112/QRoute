// Test isolation helpers.
//
// Every fixture a test writes carries a unique prefix in its natural key, and
// cleanup deletes only rows matched by that prefix. Nothing here truncates a
// table: the seeded demo campus shares this database (threat T-01-09).

import { prisma } from "../../src/lib/prisma.ts";

export { prisma };

/** A short, URL-safe, collision-resistant token for fixture natural keys. */
export function uniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

/** Prefixes shorter than this are rejected — `startsWith("")` matches everything. */
const MIN_PREFIX_LENGTH = 3;

/**
 * Deletes rows whose natural key starts with `prefix`, in foreign-key-safe
 * order, and returns the total number of rows removed.
 *
 * Order matters: edges reference nodes, classrooms reference floors and
 * departments, and faculty reference departments with onDelete: Restrict.
 */
export async function cleanupByPrefix(prefix: string): Promise<number> {
  if (prefix.length < MIN_PREFIX_LENGTH) {
    throw new Error(
      `cleanupByPrefix rejected a ${prefix.length}-character prefix; at least ${MIN_PREFIX_LENGTH} are required to keep the delete scoped.`,
    );
  }

  let removed = 0;

  const edges = await prisma.edge.deleteMany({
    where: {
      OR: [
        { fromNode: { code: { startsWith: prefix } } },
        { toNode: { code: { startsWith: prefix } } },
      ],
    },
  });
  removed += edges.count;

  const nodes = await prisma.node.deleteMany({ where: { code: { startsWith: prefix } } });
  removed += nodes.count;

  const classrooms = await prisma.classroom.deleteMany({
    where: { roomNumber: { startsWith: prefix } },
  });
  removed += classrooms.count;

  const floors = await prisma.floor.deleteMany({ where: { name: { startsWith: prefix } } });
  removed += floors.count;

  const buildings = await prisma.building.deleteMany({ where: { code: { startsWith: prefix } } });
  removed += buildings.count;

  const faculty = await prisma.faculty.deleteMany({ where: { email: { startsWith: prefix } } });
  removed += faculty.count;

  const departments = await prisma.department.deleteMany({
    where: { code: { startsWith: prefix } },
  });
  removed += departments.count;

  return removed;
}
