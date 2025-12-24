import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildApiServer } from "./api/server";
import { openDb } from "./infra/db/sqlite";
import { migrate } from "./infra/db/migrate";

function resolveMigrationsDir(): string {
  // migrations live at: src/infra/db/migrations
  // We resolve absolute path robustly for tsx/esm.
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "infra", "db", "migrations");
}

async function main() {
  const dbPath = process.env.DB_PATH;
  if (!dbPath) {
    throw new Error("[FATAL] DB_PATH is not set. Provide explicit path to SQLite database.");
  }

  console.log("[BOOT] Using DB_PATH:", dbPath);

  const db = openDb(dbPath);

  const migrationsDir = resolveMigrationsDir();
  console.log("[BOOT] Migrations dir:", migrationsDir);

  migrate(db, migrationsDir);

  const app = buildApiServer({ db });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "127.0.0.1" });

  console.log(`[BOOT] API server started on http://127.0.0.1:${port}`);

  const shutdown = async () => {
    try {
      console.log("[BOOT] Shutting down...");
      await app.close();
      db.close();
    } catch (e) {
      console.error("[BOOT] Shutdown error", e);
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[FATAL] Application crashed during startup");
  console.error(err);
  process.exit(1);
});
