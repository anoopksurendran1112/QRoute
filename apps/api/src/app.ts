import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { config } from "./config.ts";
import { isApiError } from "./lib/apiError.ts";
import { UPLOAD_DIR } from "./lib/upload.ts";
import { authRouter } from "./modules/auth/router.ts";
import { catalogRouter } from "./modules/catalog/router.ts";
import { graphRouter } from "./modules/graph/router.ts";
import { qrRouter } from "./modules/qr/router.ts";
import { routingRouter } from "./modules/routing/router.ts";
import { adminRouter } from "./routes/admin.ts";
import { healthRouter } from "./routes/health.ts";

/**
 * Builds the Express application.
 *
 * Exported as a factory so tests and the smoke script can listen on an
 * ephemeral port without importing the process entry point.
 *
 * Middleware order is load-bearing: security headers first, then CORS, then the
 * body parser, then logging, then routes, then the 404 and the error handler
 * last. Express 5 forwards rejected promises from async handlers on its own, so
 * there is deliberately no express-async-handler here.
 */
export function createApp(): express.Express {
  const app = express();
  const logger = pino({ level: config.logLevel });

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));

  // Floor-plan images are content-hashed and immutable, so they can be cached
  // forever. helmet's CORP default blocks cross-origin image loads, which the
  // Vite dev server (5173 -> 8080) would hit — allow same-site reads here only.
  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      next();
    },
    express.static(UPLOAD_DIR, { dotfiles: "ignore", immutable: true, maxAge: "1y" }),
  );

  app.use("/v1/health", healthRouter);
  app.use("/v1/auth", authRouter);
  app.use("/v1/admin", adminRouter);
  app.use("/v1/routes", routingRouter);
  app.use("/v1/graph", graphRouter);
  app.use("/v1/qr", qrRouter);
  app.use("/v1", catalogRouter);

  // Unknown /v1 route. Anything outside /v1 falls through to Express's default.
  app.use("/v1", (_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Unknown API route" },
    });
  });

  const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    // Services throw ApiError for expected failures (404/409/400); those are
    // not defects and must not be logged as unhandled 500s.
    if (isApiError(err)) {
      res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.details === undefined ? {} : { details: err.details }),
        },
      });
      return;
    }

    req.log.error({ err }, "unhandled request error");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  };

  app.use(errorHandler);

  return app;
}
