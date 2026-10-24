import "dotenv/config";
import { disconnectPrisma, prisma } from "../src/lib/prisma.ts";

async function main() {
  console.log("Cleaning test data...");
  
  // Delete test faculty first (has FK to department)
  const testFaculty = await prisma.faculty.findMany({
    where: { OR: [{ email: { startsWith: "test.faculty" } }, { name: { startsWith: "Test Faculty" } }] }
  });
  for (const f of testFaculty) {
    await prisma.faculty.delete({ where: { id: f.id } });
    console.log(`Deleted faculty: ${f.name}`);
  }
  
  // Delete test departments (code TST)
  const testDepts = await prisma.department.findMany({ where: { code: "TST" } });
  for (const d of testDepts) {
    await prisma.department.delete({ where: { id: d.id } });
    console.log(`Deleted department: ${d.code}`);
  }
  
  // Delete test classrooms
  const testClassrooms = await prisma.classroom.findMany({
    where: { roomNumber: { startsWith: "T" } }
  });
  for (const c of testClassrooms) {
    await prisma.classroom.delete({ where: { id: c.id } });
    console.log(`Deleted classroom: ${c.roomNumber}`);
  }
  
  // Delete test floors (level >= 10 on test buildings)
  const testBuildings = await prisma.building.findMany({ where: { code: { startsWith: "TST" } } });
  for (const b of testBuildings) {
    const floors = await prisma.floor.findMany({ where: { buildingId: b.id } });
    for (const f of floors) {
      await prisma.floor.delete({ where: { id: f.id } });
      console.log(`Deleted floor L${f.level} from ${b.code}`);
    }
    await prisma.building.delete({ where: { id: b.id } });
    console.log(`Deleted building: ${b.code}`);
  }
  
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
