// `npm run db:seed` / `npm run db:seed:fixtures`.
//
// Idempotent by construction: both seed sets are built entirely from upserts on
// natural keys, so running this twice leaves the row counts identical (SEED-01).
//
// The module is importable (`runSeed` is what tests call). The CLI only runs
// when this exact file is the entry point, so importing it never seeds.

import "dotenv/config";
import { pathToFileURL } from "node:url";
import { disconnectPrisma, prisma } from "../src/lib/prisma.ts";
import { seedDemo } from "./seed-data/demo.ts";
import { seedFixtures } from "./seed-data/fixtures.ts";

export type SeedSet = "demo" | "fixtures";

export interface SeedCounts {
  buildings: number;
  floors: number;
  classrooms: number;
  departments: number;
  faculty: number;
  nodes: number;
  edges: number;
  users: number;
}

export async function countEntities(): Promise<SeedCounts> {
  const [buildings, floors, classrooms, departments, faculty, nodes, edges, users] =
    await Promise.all([
      prisma.building.count(),
      prisma.floor.count(),
      prisma.classroom.count(),
      prisma.department.count(),
      prisma.faculty.count(),
      prisma.node.count(),
      prisma.edge.count(),
      prisma.user.count(),
    ]);

  return { buildings, floors, classrooms, departments, faculty, nodes, edges, users };
}

export async function runSeed(set: SeedSet = "demo"): Promise<SeedCounts> {
  // One transaction, two reasons: a failed seed leaves the database untouched
  // instead of half-populated, and ~200 statements pay fsync once at COMMIT
  // rather than once per autocommit. The second point is what keeps this under
  // the test timeout on Docker Desktop's volume.
  await prisma.$transaction(
    async (tx) => {
      if (set === "fixtures") {
        await seedFixtures(tx);
      } else {
        await seedDemo(tx);
      }
    },
    { maxWait: 20_000, timeout: 120_000 },
  );

  return countEntities();
}

function parseSetArg(argv: readonly string[]): SeedSet {
  const raw = argv.find((arg) => arg.startsWith("--set="))?.slice("--set=".length) ?? "demo";

  if (raw === "demo" || raw === "fixtures") return raw;

  throw new Error(`Unknown seed set "${raw}". Use --set=demo or --set=fixtures.`);
}

async function main(): Promise<void> {
  const set = parseSetArg(process.argv.slice(2));
  const counts = await runSeed(set);
  console.log(`[seed:${set}] ${JSON.stringify(counts)}`);
  await disconnectPrisma();
}

const entry = process.argv[1];
const isEntryPoint = entry !== undefined && import.meta.url === pathToFileURL(entry).href;

if (isEntryPoint) {
  main().catch(async (error: unknown) => {
    console.error("[seed] failed:", error);
    await disconnectPrisma().catch(() => undefined);
    process.exitCode = 1;
  });
}
