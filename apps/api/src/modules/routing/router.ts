// Routing HTTP surface
//
// `POST /v1/routes/compute` is intentionally unauthenticated: the web and
// mobile clients need to compute a route before a student ever logs in.
// Write access to the graph itself stays behind /v1/admin.

import { routeComputeSchema } from "@qroute/shared";
import { Router } from "express";
import { ApiError } from "../../lib/apiError.ts";
import { computeRoute } from "./service.ts";

export const routingRouter = Router();

routingRouter.post("/compute", async (req, res) => {
  const parsed = routeComputeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Invalid request body",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const result = await computeRoute(parsed.data);
  res.status(200).json(result);
});
