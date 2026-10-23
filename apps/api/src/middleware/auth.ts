import type { RequestHandler } from "express";
import { verifyToken } from "../utils/jwt.ts";

const UNAUTHORIZED_BODY = {
  error: { code: "UNAUTHORIZED", message: "Authentication required" },
} as const;

/**
 * Verifies the Bearer token and attaches the caller to `req.user`.
 *
 * The response never distinguishes a missing header from an expired or
 * badly-signed token — that distinction belongs in the server log only.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json(UNAUTHORIZED_BODY);
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const claims = verifyToken(token);
    req.user = { id: claims.sub, email: claims.email, role: claims.role };
    next();
  } catch (error) {
    req.log.warn({ err: error }, "token verification failed");
    res.status(401).json(UNAUTHORIZED_BODY);
  }
};
