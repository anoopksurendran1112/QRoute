// Client-side JWT decoding for UI convenience ONLY.
//
// This must never be used for authorisation. The API enforces role checks on
// every protected endpoint; decoding the payload here only decides which screen
// to render (redirect vs access-denied vs dashboard).

export interface DecodedTokenPayload {
  sub: string;
  role: "user" | "admin";
  email: string;
  exp?: number;
  iat?: number;
  iss?: string;
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeToken(token: string): DecodedTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1]!)) as unknown;
    if (typeof payload !== "object" || payload === null) return null;

    const record = payload as Record<string, unknown>;
    if (typeof record.sub !== "string") return null;
    if (record.role !== "user" && record.role !== "admin") return null;
    if (typeof record.email !== "string") return null;

    const exp =
      typeof record.exp === "number" && Number.isFinite(record.exp)
        ? record.exp
        : undefined;

    const iat =
      typeof record.iat === "number" && Number.isFinite(record.iat)
        ? record.iat
        : undefined;

    return {
      sub: record.sub,
      role: record.role,
      email: record.email,
      exp,
      iat,
      iss: typeof record.iss === "string" ? record.iss : undefined,
    };
  } catch {
    return null;
  }
}

export function isExpired(payload: DecodedTokenPayload, nowSeconds = Date.now() / 1000): boolean {
  if (payload.exp === undefined) return false;
  return payload.exp <= nowSeconds;
}
