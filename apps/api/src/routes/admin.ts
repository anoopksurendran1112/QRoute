import { Router } from "express";
import { requireAuth } from "../middleware/auth.ts";
import { requireRole } from "../middleware/requireRole.ts";

export const adminRouter = Router();

// Cheap session probe for the admin panel and the role-gate tests. It exists so
// the authorisation path can be proven before the catalog routes land.
adminRouter.get("/ping", requireAuth, requireRole("admin"), (req, res) => {
  res.status(200).json({ status: "ok", user: req.user });
});
