// The one and only PrismaClient in the process.
//
// Prisma 7 has no engine-free, adapter-free path: the client must be
// constructed with a driver adapter. @prisma/adapter-mariadb is the official
// MySQL/MariaDB adapter. Constructing a second client anywhere else would open
// a second pool and desynchronise shutdown, so import `prisma` from here.

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { dbConnection } from "../config.ts";
import { PrismaClient } from "../generated/prisma/client.ts";

const adapter = new PrismaMariaDb({
  host: dbConnection.host,
  port: dbConnection.port,
  user: dbConnection.user,
  password: dbConnection.password,
  database: dbConnection.database,
  connectionLimit: 5,
});

export const prisma = new PrismaClient({ adapter });

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
