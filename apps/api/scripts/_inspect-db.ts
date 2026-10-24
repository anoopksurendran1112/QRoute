// TEMPORARY inspection script — deleted after Phase 1 verification.
import "dotenv/config";
import { disconnectPrisma, prisma } from "../src/lib/prisma.ts";

async function main() {
  const buildings = await prisma.building.findMany({
    orderBy: { code: "asc" },
    include: {
      floors: {
        orderBy: { level: "asc" },
        include: { _count: { select: { classrooms: true, nodes: true } } },
      },
    },
  });

  console.log("=== BUILDINGS ===");
  for (const b of buildings) {
    console.log(`\n[${b.code}] ${b.name} | campus=${b.campus ?? "NULL"} | id=${b.id}`);
    console.log(`  floors=${b.floors.length}`);
    for (const f of b.floors) {
      console.log(
        `    L${f.level} mpp=${f.metersPerPixel} img=${f.imagePath ?? "NULL"} ` +
          `${f.widthPx ?? "?"}x${f.heightPx ?? "?"} classrooms=${f._count.classrooms} nodes=${f._count.nodes}`,
      );
    }
  }

  console.log("\n=== COUNTS ===");
  const counts = {
    buildings: await prisma.building.count(),
    floors: await prisma.floor.count(),
    classrooms: await prisma.classroom.count(),
    departments: await prisma.department.count(),
    faculty: await prisma.faculty.count(),
    nodes: await prisma.node.count(),
    edges: await prisma.edge.count(),
    users: await prisma.user.count(),
  };
  console.log(counts);

  console.log("\n=== CLASSROOM -> entranceNode BINDING ===");
  const rooms = await prisma.classroom.findMany({
    orderBy: [{ floor: { buildingId: "asc" } }, { roomNumber: "asc" }],
    include: {
      floor: { include: { building: true } },
      department: true,
      entranceNode: true,
    },
  });
  const bound = rooms.filter((r) => r.entranceNodeId !== null);
  console.log(`total=${rooms.length} bound=${bound.length} unbound=${rooms.length - bound.length}`);
  for (const r of rooms.slice(0, 25)) {
    console.log(
      `  ${r.floor.building.code}/L${r.floor.level} room=${r.roomNumber} ` +
        `dept=${r.department?.code ?? "NULL"} entrance=${r.entranceNode ? `${r.entranceNode.code}(${r.entranceNode.kind})` : "UNBOUND"}`,
    );
  }

  console.log("\n=== NODES BY KIND ===");
  const nodes = await prisma.node.findMany({ include: { floor: { include: { building: true } } } });
  const byKind: Record<string, number> = {};
  for (const n of nodes) byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
  console.log(byKind);
  console.log("sample nodes:");
  for (const n of nodes.slice(0, 8)) {
    console.log(
      `  ${n.floor.building.code}/L${n.floor.level} ${n.code} kind=${n.kind} (${n.x},${n.y}) label=${n.label ?? "-"}`,
    );
  }

  console.log("\n=== NODE -> CLASSROOM back-relation ===");
  const nodesWithRooms = await prisma.node.findMany({
    where: { classrooms: { some: {} } },
    include: { classrooms: true },
  });
  console.log(`nodes acting as a classroom entrance = ${nodesWithRooms.length}`);
  for (const n of nodesWithRooms.slice(0, 10)) {
    console.log(`  ${n.code}: ${n.classrooms.map((c) => c.roomNumber).join(", ")}`);
  }

  console.log("\n=== EDGES SAMPLE ===");
  const edges = await prisma.edge.findMany({
    take: 10,
    include: { fromNode: true, toNode: true },
  });
  console.log(`total=${edges.length === 10 ? "10+" : edges.length}`);
  for (const e of edges) {
    console.log(
      `  ${e.fromNode.code} -> ${e.toNode.code} kind=${e.kind} cost=${e.costM}m ` +
        `bidir=${e.bidirectional} accessible=${e.accessible}`,
    );
  }

  console.log("\n=== EDGE SANITY ===");
  const allEdges = await prisma.edge.findMany({
    include: { fromNode: true, toNode: true },
  });
  const zeroCost = allEdges.filter((e) => Number(e.costM) <= 0).length;
  const crossFloor = allEdges.filter((e) => e.kind !== "walk").length;
  const nullEnds = allEdges.filter((e) => !e.fromNode || !e.toNode).length;
  const sameFloorStair = allEdges.filter(
    (e) => e.kind !== "walk" && e.fromNode.floorId === e.toNode.floorId,
  ).length;
  console.log(`totalEdges=${allEdges.length} zeroOrNegativeCost=${zeroCost} nonWalkEdges=${crossFloor}`);
  console.log(`edgesWithMissingEndpoint=${nullEnds} nonWalkEdgesOnSameFloor=${sameFloorStair}`);

  console.log("\n=== EDGES PER BUILDING (demo vs fixture) ===");
  const byBuilding: Record<string, { nodes: number; edges: number }> = {};
  for (const e of allEdges) {
    const key = e.fromNode.floorId;
    byBuilding[key] ??= { nodes: 0, edges: 0 };
    byBuilding[key].edges += 1;
  }
  const floorToBuilding = new Map<string, string>();
  const allFloors = await prisma.floor.findMany({ include: { building: true } });
  for (const f of allFloors) floorToBuilding.set(f.id, f.building.code);
  const perCode: Record<string, number> = {};
  for (const [floorId, v] of Object.entries(byBuilding)) {
    const code = floorToBuilding.get(floorId) ?? "?";
    perCode[code] = (perCode[code] ?? 0) + v.edges;
  }
  console.log("edges originating per building:", perCode);

  const nodesPerCode: Record<string, number> = {};
  for (const n of nodes) {
    nodesPerCode[n.floor.building.code] = (nodesPerCode[n.floor.building.code] ?? 0) + 1;
  }
  console.log("nodes per building:", nodesPerCode);

  console.log("\n=== FLOOR CALIBRATION DIVERGENCE ===");
  const floors = await prisma.floor.findMany({ include: { building: true } });
  const distinct = [...new Set(floors.map((f) => f.metersPerPixel.toString()))];
  console.log(`distinct metersPerPixel values = ${distinct.join(", ")}`);

  console.log("\n=== ORPHAN CHECK ===");
  const nodesWithEdgeCount = await prisma.node.findMany({
    include: { _count: { select: { edgesFrom: true, edgesTo: true } } },
  });
  const isolated = nodesWithEdgeCount.filter((n) => n._count.edgesFrom + n._count.edgesTo === 0);
  console.log(`isolated nodes (no edges at all) = ${isolated.length}`);
  for (const n of isolated.slice(0, 10)) console.log(`  ${n.code} kind=${n.kind}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
