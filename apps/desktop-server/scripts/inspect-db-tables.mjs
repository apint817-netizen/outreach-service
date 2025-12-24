import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "..", "..", "data", "app.db");
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x => x.name);
console.log("DB:", dbPath);
console.log("Tables:", tables);

const hasSchema = tables.includes("schema_version") || tables.includes("migrations") || tables.includes("migration_log");
console.log("Has migration table:", hasSchema);

for (const t of ["schema_version","migrations","migration_log","queue_items","runs","campaigns","contacts"]) {
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
  if (exists) {
    const cnt = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c;
    console.log(`${t}: count=${cnt}`);
  } else {
    console.log(`${t}: MISSING`);
  }
}

db.close();
