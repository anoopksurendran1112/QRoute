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
  // MySQL 8 defaults new users to caching_sha2_password. Over a non-TLS socket
  // the driver must fetch the server's RSA key on first authentication or the
  // handshake fails with "RSA public key is not available client side". The
  // container is local and dev-only, so retrieval is acceptable here.
  allowPublicKeyRetrieval: true,
});

export const prisma = new PrismaClient({ adapter });

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
