// Brute-force throttle for the credential endpoints (threat T-01-11).
//
// `skipSuccessfulRequests` means only failed attempts consume the budget, so a
// user who logs in normally is never throttled while a password-spraying client
// hits 429 quickly.

import rateLimit from "express-rate-limit";
import { config } from "../config.ts";

export const authLimiter = rateLimit({
  windowMs: config.rateLimitAuthWindowMs,
  limit: config.rateLimitAuthMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many authentication attempts. Please try again later.",
      },
    });
  },
});
