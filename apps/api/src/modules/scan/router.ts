import { Router } from "express";
import rateLimit from "express-rate-limit";
import { resolveScan } from "./service.ts";

export const scanRouter = Router();

const scanRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many scan attempts" } },
});

scanRouter.post("/resolve", scanRateLimit, async (req, res) => {
  const token = (req.body as any)?.token;
  const authHeader = req.get("authorization");
  let userId: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const jwt = await import("jsonwebtoken");
      const { config } = await import("../../config.ts");
      const payload = jwt.default.verify(authHeader.slice(7), config.jwtSecret) as any;
      userId = payload?.sub;
    } catch {
      // ignore invalid tokens for public scans
    }
  }
  const result = await resolveScan(token, {
    userId,
    ip: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
  });
  res.status(200).json(result);
});
