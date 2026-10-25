export function getFloorPlanUrl(floor: any) {
  if (!floor) return null;
  if (floor.imageUrl) return floor.imageUrl;
  if (floor.planImage) return floor.planImage;
  if (floor.imagePath) return floor.imagePath;
  return null;
}

export function getNodePosition(node: any) {
  if (!node) return { x: 0, y: 0 };
  return {
    x: node.x ?? node.positionX ?? node.posX ?? 0,
    y: node.y ?? node.positionY ?? node.posY ?? 0,
  };
}
