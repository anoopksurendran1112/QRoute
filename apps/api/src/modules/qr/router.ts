import { Router } from "express";
import QRCode from "qrcode";
import { requireAuth } from "../../middleware/auth.ts";
import { requireRole } from "../../middleware/requireRole.ts";
import { prisma } from "../../lib/prisma.ts";
import { ApiError } from "../../lib/apiError.ts";
import { generateQRToken } from "./service.ts";

export const qrRouter = Router();

qrRouter.get("/nodes/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const node = await prisma.node.findUnique({
    where: { id: req.params.id as string },
    include: { floor: { include: { building: true } } },
  });
  if (!node) {
    throw new ApiError(404, "NOT_FOUND", "Node not found");
  }

  const token = generateQRToken(node.id);
  const qrDataUrl = await QRCode.toDataURL(token, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  res.status(200).json({
    node: {
      id: node.id,
      code: node.code,
      label: node.label,
      floor: node.floor,
    },
    token,
    qrDataUrl,
  });
});

qrRouter.post("/bulk", requireAuth, requireRole("admin"), async (req, res) => {
  const { nodeIds } = req.body as { nodeIds: string[] };
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "nodeIds required");
  }

  const nodes = await prisma.node.findMany({
    where: { id: { in: nodeIds } },
    include: { floor: { include: { building: true } } },
  });

  const results = await Promise.all(
    nodes.map(async (node) => {
      const token = generateQRToken(node.id);
      const qrDataUrl = await QRCode.toDataURL(token, { width: 256, margin: 1 });
      return {
        node: {
          id: node.id,
          code: node.code,
          label: node.label,
          floor: node.floor,
        },
        token,
        qrDataUrl,
      };
    }),
  );

  res.status(200).json({ qrCodes: results });
});
