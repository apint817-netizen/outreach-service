import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = path.resolve(process.cwd(), "..", "..", "data", "app.db");
const migPath = path.resolve(process.cwd(), "src", "infra", "db", "migrations", "007_queue_fix_types.sql");
const sql = fs.readFileSync(migPath, "utf8");

const db = new Database(dbPath);

console.log("DB:", dbPath);
console.log("Applying:", migPath);

// wrap in transaction here (since 007 has no BEGIN/COMMIT)
db.exec("BEGIN");
try {
  db.exec(sql);
  db.exec("COMMIT");
  console.log("OK: migration 007 applied");
} catch (e) {
  db.exec("ROLLBACK");
  console.error("FAILED:", e);
  process.exitCode = 1;
} finally {
  db.close();
}
