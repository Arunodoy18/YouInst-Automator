import "dotenv/config";
import path from "path";
import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";

if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
  // Local dev: SQLite via better-sqlite3
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const rawPath = dbUrl.replace("file:", "");
  const dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);

  module.exports = defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations" },
    datasource: { url: dbUrl },
    adapter: () => new PrismaBetterSqlite3({ url: dbPath }),
  });
} else {
  // Production: PostgreSQL (Render)
  module.exports = defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations" },
    datasource: { url: dbUrl },
  });
}
