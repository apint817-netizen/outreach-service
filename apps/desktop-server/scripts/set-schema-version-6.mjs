import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "..", "..", "data", "app.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

db.prepare(`
  INSERT INTO meta(key, value) VALUES('schemaVersion', '6')
  ON CONFLICT(key) DO UPDATE SET value=excluded.value
`).run();

const row = db.prepare(`SELECT value FROM meta WHERE key='schemaVersion'`).get();
console.log("DB:", dbPath);
console.log("meta.schemaVersion =", row?.value);

db.close();
