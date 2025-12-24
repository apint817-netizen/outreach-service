import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const db = app.db as any;

    // DB connectivity
    let dbOk = true;
    try {
      db.prepare("SELECT 1").get();
    } catch {
      dbOk = false;
    }

    // schema version from meta (source of truth)
    let schemaVersion = 0;
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      const row = db.prepare(`SELECT value FROM meta WHERE key='schemaVersion'`).get();
      schemaVersion = row?.value ? Number(row.value) : 0;
      if (!Number.isFinite(schemaVersion)) schemaVersion = 0;
    } catch {
      schemaVersion = 0;
    }

    return { ok: true, db: { ok: dbOk, schemaVersion } };
  });
}
