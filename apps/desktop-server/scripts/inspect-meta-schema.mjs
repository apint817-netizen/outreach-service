import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "..", "..", "data", "app.db");
const db = new Database(dbPath);

db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
const row = db.prepare(`SELECT key, value FROM meta WHERE key='schemaVersion'`).get();

console.log("DB:", dbPath);
console.log("meta.schemaVersion row:", row);

db.close();
