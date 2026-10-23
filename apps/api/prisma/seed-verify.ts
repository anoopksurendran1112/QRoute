// SEED-01 invariant checker.
//
// The demo campus has to be *provably* usable, not merely non-empty. Each check
// below is a defect that would silently degrade every later phase:
//
//   1. three buildings, each with at least two floors
//   2. every floor has a positive, non-placeholder calibration
//   3. calibration actually varies between floors (a single global scale would
//      make per-floor calibration cosmetic)
//   4. every classroom has an entrance node on its own floor
//   5. no node is orphaned (unreachable from the corridor network)
//   6. all five entity types exist
//   7. an admin account exists
//   8. every edge cost is positive (a 0 m edge collapses the route)
//   9. at least one room number repeats across buildings, so search ambiguity
//      is exercised rather than hypothetical
//  10. each building's graph is one connected component (no reachable-looking
//      room that no route can ever arrive at)
//
// Rows in the `FIX-` fixture building are excluded: they exist precisely to be
// invalid, and they must not contaminate the demo signal.

import "dotenv/config";
import { pathToFileURL } from "node:url";
import { disconnectPrisma, prisma } from "../src/lib/prisma.ts";
import { countEntities } from "./seed.ts";

const FIXTURE_PREFIX = "FIX-";
const MIN_CALIBRATION_RATIO = 1.5;

interface IncidentEdge {
  kind: string;
  costM: { toString(): string };
  toNodeId: string;
  fromNodeId: string;
}

function findRoot(parent: Map<string, string>, nodeId: string): string {
  let current = nodeId;

  for (;;) {
    const next = parent.get(current);
    if (next === undefined || next === current) return current;

    const grandparent = parent.get(next);
    if (grandparent === undefined) return next;

    // Path halving keeps repeated lookups cheap without a second pass.
    parent.set(current, grandparent);
    current = grandparent;
  }
}

function union(parent: Map<string, string>, a: string, b: string): void {
  const rootA = findRoot(parent, a);
  const rootB = findRoot(parent, b);
  if (rootA !== rootB) parent.set(rootA, rootB);
}

export async function verifyDemoCampus(): Promise<string[]> {
  const violations: string[] = [];

  const buildings = await prisma.building.findMany({
    where: { NOT: { code: { startsWith: FIXTURE_PREFIX } } },
    orderBy: { code: "asc" },
    include: {
      floors: {
        orderBy: { level: "asc" },
        include: {
          nodes: {
            include: {
              edgesFrom: { select: { kind: true, costM: true, toNodeId: true, fromNodeId: true } },
              edgesTo: { select: { kind: true, costM: true, toNodeId: true, fromNodeId: true } },
            },
          },
          classrooms: true,
        },
      },
    },
  });

  // 1. At least three buildings, each at least two floors deep.
  if (buildings.length < 3) {
    violations.push(`expected at least 3 demo buildings, found ${buildings.length}`);
  }

  for (const building of buildings) {
    if (building.floors.length < 2) {
      violations.push(
        `building ${building.code} has ${building.floors.length} floor(s); at least 2 are required`,
      );
    }
  }

  const calibrations: number[] = [];
  const roomToBuildings = new Map<string, Set<string>>();
  let demoClassrooms = 0;
  let demoNodes = 0;
  let demoEdges = 0;

  for (const building of buildings) {
    const allNodes = building.floors.flatMap((floor) =>
      floor.nodes.map((node) => ({ node, level: floor.level })),
    );

    // 2 + 3. Calibration is positive, never the 1.0 placeholder, and divergent.
    for (const floor of building.floors) {
      const metersPerPixel = Number(floor.metersPerPixel.toString());

      if (!(metersPerPixel > 0)) {
        violations.push(
          `floor ${building.code}/L${floor.level} has a non-positive metersPerPixel (${metersPerPixel})`,
        );
      }

      if (metersPerPixel === 1) {
        violations.push(
          `floor ${building.code}/L${floor.level} uses the placeholder scale 1.0; calibrate it`,
        );
      }

      calibrations.push(metersPerPixel);
    }

    // 4 + 9. Classrooms need a same-floor entrance, and room numbers must clash.
    for (const floor of building.floors) {
      const nodeIdsOnFloor = new Set(floor.nodes.map((node) => node.id));

      for (const classroom of floor.classrooms) {
        demoClassrooms += 1;

        const seen = roomToBuildings.get(classroom.roomNumber) ?? new Set<string>();
        seen.add(building.code);
        roomToBuildings.set(classroom.roomNumber, seen);

        if (classroom.entranceNodeId === null) {
          violations.push(
            `classroom ${building.code}/${classroom.roomNumber} has no entrance node`,
          );
        } else if (!nodeIdsOnFloor.has(classroom.entranceNodeId)) {
          violations.push(
            `classroom ${building.code}/${classroom.roomNumber} entrance node is not on floor L${floor.level}`,
          );
        }
      }
    }

    // 5 + 8. No orphan nodes, no non-positive edge costs.
    for (const { node, level } of allNodes) {
      demoNodes += 1;

      const incident: IncidentEdge[] = [...node.edgesFrom, ...node.edgesTo];

      if (incident.length === 0) {
        violations.push(`node ${node.code} (${building.code}/L${level}) has no incident edges`);
      }

      for (const edge of node.edgesFrom) {
        demoEdges += 1;

        if (!(Number(edge.costM.toString()) > 0)) {
          violations.push(
            `edge ${edge.fromNodeId} -> ${edge.toNodeId} has a non-positive costM (${edge.costM.toString()})`,
          );
        }
      }
    }

    // 10. One connected component per building, over both walk and vertical edges.
    const parent = new Map<string, string>();
    for (const { node } of allNodes) parent.set(node.id, node.id);

    for (const { node } of allNodes) {
      for (const edge of node.edgesFrom) {
        if (parent.has(edge.toNodeId)) union(parent, node.id, edge.toNodeId);
      }
    }

    if (allNodes.length > 0) {
      const roots = new Set(allNodes.map(({ node }) => findRoot(parent, node.id)));
      if (roots.size > 1) {
        violations.push(
          `building ${building.code} graph is split into ${roots.size} connected components`,
        );
      }
    }
  }

  // 3. Divergence, judged across every demo floor.
  const distinct = [...new Set(calibrations)];
  if (distinct.length < 2) {
    violations.push(
      `all demo floors share one calibration value (${distinct.join(", ")}); at least two are required`,
    );
  } else {
    const smallest = Math.min(...distinct);
    const largest = Math.max(...distinct);
    if (smallest > 0 && largest / smallest < MIN_CALIBRATION_RATIO) {
      violations.push(
        `calibration values differ by only ${(largest / smallest).toFixed(2)}x; at least ${MIN_CALIBRATION_RATIO}x is required`,
      );
    }
  }

  // 6. All five entity types are populated.
  const [departmentCount, facultyCount] = await Promise.all([
    prisma.department.count(),
    prisma.faculty.count(),
  ]);

  if (buildings.length === 0) violations.push("no demo buildings were seeded");
  if (demoNodes === 0) violations.push("no demo graph nodes were seeded");
  if (demoEdges === 0) violations.push("no demo graph edges were seeded");
  if (demoClassrooms === 0) violations.push("no demo classrooms were seeded");
  if (departmentCount === 0) violations.push("no departments were seeded");
  if (facultyCount === 0) violations.push("no faculty members were seeded");

  // 7. An administrator must exist or no one can author the graph.
  const admins = await prisma.user.count({ where: { role: "admin" } });
  if (admins === 0) violations.push("no admin user exists; the admin surfaces would be unusable");

  // 9. Repeated room numbers across buildings.
  const repeated = [...roomToBuildings.entries()].filter(([, codes]) => codes.size > 1);
  if (repeated.length === 0) {
    violations.push(
      "no room number appears in more than one building; search ambiguity is untested",
    );
  }

  return violations;
}

async function main(): Promise<void> {
  const violations = await verifyDemoCampus();

  if (violations.length > 0) {
    console.error(`[seed:verify] ${violations.length} violation(s):`);
    for (const violation of violations) console.error(`  - ${violation}`);
    await disconnectPrisma();
    process.exitCode = 1;
    return;
  }

  const counts = await countEntities();
  console.log(
    `[seed:verify] OK — ${counts.buildings} buildings, ${counts.floors} floors, ` +
      `${counts.classrooms} classrooms, ${counts.departments} departments, ` +
      `${counts.faculty} faculty, ${counts.nodes} nodes, ${counts.edges} edges, ` +
      `${counts.users} users`,
  );
  await disconnectPrisma();
}

const entry = process.argv[1];
const isEntryPoint = entry !== undefined && import.meta.url === pathToFileURL(entry).href;

if (isEntryPoint) {
  main().catch(async (error: unknown) => {
    console.error("[seed:verify] failed:", error);
    await disconnectPrisma().catch(() => undefined);
    process.exitCode = 1;
  });
}
