// Password hashing and the public-user projection.
//
// bcryptjs, never the native `bcrypt` package: the native build needs node-gyp
// plus MSVC Build Tools on Windows and breaks whenever a prebuilt binary is
// missing for the installed Node version.

import type { Role } from "@qroute/shared";
import bcrypt from "bcryptjs";
import { config } from "../config.ts";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * The only shape a User may be serialised as. Every response goes through this
 * so no route can accidentally emit `password` (threat T-01-13).
 */
export function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
}): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
