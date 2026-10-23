import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { config } from "./config.ts";
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

  app.use("/v1/health", healthRouter);

  // Unknown /v1 route. Anything outside /v1 falls through to Express's default.
  app.use("/v1", (_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Unknown API route" },
    });
  });

  const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    req.log.error({ err }, "unhandled request error");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  };

  app.use(errorHandler);

  return app;
}
