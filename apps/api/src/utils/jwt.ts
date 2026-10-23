// JWT issue and verification.
//
// The verification algorithm is pinned by an allowlist and the issuer is
// checked, so a token signed with a different secret, a different algorithm or
// a different issuer is rejected (threat T-01-14).

import type { Role } from "@qroute/shared";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";

const ALGORITHM = "HS256";
const EXPIRES_IN = "7d";
const ISSUER = "qroute";

export interface TokenClaims {
  sub: string;
  role: Role;
  email: string;
}

export function signToken(user: { id: string; role: Role; email: string }): string {
  return jwt.sign({ role: user.role, email: user.email }, config.jwtSecret, {
    subject: user.id,
    expiresIn: EXPIRES_IN,
    issuer: ISSUER,
    algorithm: ALGORITHM,
  });
}

export function verifyToken(token: string): TokenClaims {
  const decoded = jwt.verify(token, config.jwtSecret, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
  });

  if (typeof decoded === "string") {
    throw new Error("Unexpected JWT payload");
  }

  const { sub, role, email } = decoded as jwt.JwtPayload & {
    role?: Role;
    email?: string;
  };

  if (typeof sub !== "string" || typeof email !== "string" || typeof role !== "string") {
    throw new Error("Malformed JWT payload");
  }

  return { sub, role, email };
}
