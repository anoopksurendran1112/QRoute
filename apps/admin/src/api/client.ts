// A single typed fetch wrapper. Every API call must go through this module so
// the bearer token, error normalisation and the 401 session-clear hook cannot
// diverge across components.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized: (() => void) | null = null;

/**
 * AuthProvider registers this so a 401 from any call can invalidate the session
 * in one place, without polluting individual pages with logout logic.
 */
export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function getAuthToken(): string | null {
  try {
    return localStorage.getItem("qroute.token");
  } catch {
    return null;
  }
}

interface ApiEnvelope<T> {
  data?: T;
  user?: T;
  building?: T;
  buildings?: T;
  floor?: T;
  floors?: T;
  classroom?: T;
  classrooms?: T;
  department?: T;
  departments?: T;
  faculty?: T;
  token?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json");
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJsonResponse(response)) {
    return undefined as T;
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }

  const parsed = JSON.parse(text) as ApiEnvelope<T> | T;
  return parsed as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && options.body !== null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? (path.startsWith(API_BASE_URL) ? path.slice(API_BASE_URL.length) || "/" : path) : `/${path}`}`.replace(/\/v1\/v1\//, "/v1/");
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    const envelope = isJsonResponse(response)
      ? ((await response.clone().json().catch(() => undefined)) as ApiEnvelope<unknown> | undefined)
      : undefined;

    const code = envelope?.error?.code ?? `HTTP_${response.status}`;
    const message =
      envelope?.error?.message ?? response.statusText ?? "Request failed";

    throw new ApiError(response.status, code, message);
  }

  return parseResponse<T>(response);
}
