import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.ts";
import { ApiError } from "../../lib/apiError.ts";
import { verifyQRToken } from "../qr/service.ts";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function resolveScan(
  token: string,
  ctx?: { userId?: string; ip?: string; userAgent?: string },
) {
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "VALIDATION_ERROR", "token is required");
  }

  const verification = verifyQRToken(token);
  if (!verification.valid || !verification.nodeId) {
    try {
      await prisma.scanEvent.create({
        data: {
          tokenHash: hashToken(token),
          nodeId: (await prisma.node.findFirst())?.id ?? "",
          userId: ctx?.userId,
          ip: ctx?.ip,
          userAgent: ctx?.userAgent,
          success: false,
          reason: "INVALID_TOKEN",
        },
      });
    } catch {
      // ignore logging failures for invalid tokens
    }
    throw new ApiError(401, "INVALID_QR", "Invalid or tampered QR code");
  }

  const nodeId = verification.nodeId;

  const node = await prisma.node.findUnique({
    where: { id: nodeId },
    include: {
      floor: { include: { building: true } },
    },
  });

  if (!node) {
    await prisma.scanEvent.create({
      data: {
        tokenHash: hashToken(token),
        nodeId,
        userId: ctx?.userId,
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
        success: false,
        reason: "NODE_NOT_FOUND",
      },
    });
    throw new ApiError(404, "NOT_FOUND", "QR points to a node that no longer exists");
  }

  await prisma.scanEvent.create({
    data: {
      tokenHash: hashToken(token),
      nodeId: node.id,
      userId: ctx?.userId,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
      success: true,
    },
  });

  return {
    node: {
      id: node.id,
      code: node.code,
      kind: node.kind,
      label: node.label,
      x: node.x,
      y: node.y,
      floorId: node.floorId,
    },
    floor: node.floor,
    building: node.floor.building,
    location: {
      building: node.floor.building.name,
      floor: node.floor.name ?? `Level ${node.floor.level}`,
      node: node.code,
    },
  };
}
