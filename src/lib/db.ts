/**
 * Prisma Client Singleton
 * Prevents multiple instances in development (hot-reload)
 * Local dev: SQLite via better-sqlite3 adapter
 * Production (Render): PostgreSQL via DATABASE_URL env override
 */
import { PrismaClient } from "@prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  // If DATABASE_URL is a postgres/postgresql URL, use standard PrismaClient (no adapter)
  if (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")) {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  // Local dev: SQLite via better-sqlite3 driver adapter
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const rawPath = dbUrl.replace("file:", "");
  const dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
