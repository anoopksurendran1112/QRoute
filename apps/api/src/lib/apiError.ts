// A typed HTTP error a service may throw.
//
// Express 5 forwards rejected promises to the error middleware, so a service can
// simply throw ApiError and the app's error handler turns it into the standard
// `{ error: { code, message } }` envelope. Without this, every router would need
// its own try/catch.

import type { ApiErrorCode } from "@qroute/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
