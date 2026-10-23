// The single environment boundary for the API.
//
// Nothing else in the codebase may read `process.env` directly. Parsing happens
// once, at module load, and a broken environment throws before any port is
// opened — the API must never boot with a fallback secret (threat T-01-04).

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((value) => value.startsWith("mysql://"), "DATABASE_URL must start with mysql://"),

  // No default, ever. A defaulted signing secret is a forgeable token for
  // anyone who reads this file.
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters; generate one with `openssl rand -base64 48`"),

  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  SEED_ADMIN_EMAIL: z.email().default("admin@sjcet.local"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Admin@12345!"),
  SEED_USER_EMAIL: z.email().default("student@sjcet.local"),
  SEED_USER_PASSWORD: z.string().min(8).default("Student@12345!"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const keys = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "(root)"))];
  // Names the keys, never their values.
  throw new Error(
    `Invalid environment configuration. Problem keys: ${[...keys].sort().join(", ")}. ` +
      "JWT_SECRET must be generated (>= 32 characters) and must never be defaulted. " +
      "See apps/api/.env.example for the full contract.",
  );
}

const env = parsed.data;

export const config = Object.freeze({
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  port: env.PORT,
  corsOrigin: env.CORS_ORIGIN,
  bcryptRounds: env.BCRYPT_ROUNDS,
  rateLimitAuthMax: env.RATE_LIMIT_AUTH_MAX,
  rateLimitAuthWindowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  logLevel: env.LOG_LEVEL,
  seedAdminEmail: env.SEED_ADMIN_EMAIL,
  seedAdminPassword: env.SEED_ADMIN_PASSWORD,
  seedUserEmail: env.SEED_USER_EMAIL,
  seedUserPassword: env.SEED_USER_PASSWORD,
});

// @prisma/adapter-mariadb takes discrete fields, not a connection string, so
// the URL is decomposed exactly once here.
const databaseUrl = new URL(config.databaseUrl);

export const dbConnection = Object.freeze({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || "3306"),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: decodeURIComponent(databaseUrl.pathname.replace(/^\//, "")),
});

export type Config = typeof config;
