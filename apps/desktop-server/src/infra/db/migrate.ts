import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

function ensureMetaTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function getSchemaVersion(db: Database.Database): number {
  ensureMetaTable(db);
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'schemaVersion'`).get() as { value?: string } | undefined;
  if (!row?.value) return 0;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : 0;
}

function setSchemaVersion(db: Database.Database, v: number) {
  ensureMetaTable(db);
  db.prepare(`
    INSERT INTO meta(key, value) VALUES('schemaVersion', ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(String(v));
}

function parseVersionFromFilename(filename: string): number | null {
  // expects 001_name.sql, 006_queue.sql, etc.
  const m = filename.match(/^(\d{3})_.*\.sql$/);
  if (!m) return null;
  return Number(m[1]);
}

export function migrate(db: Database.Database, migrationsDirAbs: string) {
  ensureMetaTable(db);

  const current = getSchemaVersion(db);

  const files = fs
    .readdirSync(migrationsDirAbs)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => ({ f, v: parseVersionFromFilename(f) }))
    .filter((x): x is { f: string; v: number } => typeof x.v === "number" && Number.isFinite(x.v))
    .sort((a, b) => a.v - b.v);

  let applied = current;

  for (const { f, v } of files) {
    if (v <= current) continue;

    const sqlPath = path.join(migrationsDirAbs, f);
    const sql = fs.readFileSync(sqlPath, "utf8");

    db.exec("BEGIN");
    try {
      db.exec(sql);
      setSchemaVersion(db, v);
      db.exec("COMMIT");
      applied = v;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }

  return { current, applied };
}
