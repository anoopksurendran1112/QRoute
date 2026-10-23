import type { Role } from "@qroute/shared";
import type { RequestHandler } from "express";

/**
 * Role guard factory.
 *
 * This assumes `requireAuth` already ran — it is never the only guard on a
 * route. Register `requireAuth` first, then `requireRole`.
 */
export function requireRole(role: Role): RequestHandler {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      });
      return;
    }

    next();
  };
}
