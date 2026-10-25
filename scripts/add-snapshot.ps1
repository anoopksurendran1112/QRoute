$path = "D:\DemoProjects\deepak\apps\api\src\modules\graph\router.ts"
Add-Content -Path $path -Value @"

graphRouter.get("/snapshot", requireAuth, async (_req, res) => {
  const [buildings, floors, nodes, edges] = await Promise.all([
    prisma.building.findMany({ orderBy: { code: "asc" } }),
    prisma.floor.findMany({ include: { building: true }, orderBy: [{ buildingId: "asc" }, { level: "asc" }] }),
    prisma.node.findMany({ orderBy: [{ floorId: "asc" }, { code: "asc" }] }),
    prisma.edge.findMany({ orderBy: [{ fromNodeId: "asc" }] }),
  ]);

  const generatedAt = new Date().toISOString();

  res.status(200).json({
    graphRevision: generatedAt,
    generatedAt,
    buildings,
    floors,
    nodes,
    edges,
  });
});
"@
Write-Host "done"
