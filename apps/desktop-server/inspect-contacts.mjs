import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "../../data/app.db");
const db = new Database(dbPath);

console.log("=== PRAGMA table_info(contacts) ===");
const cols = db.prepare("PRAGMA table_info(contacts)").all();
console.table(cols);

console.log("=== CREATE TABLE contacts ===");
const row = db.prepare(
  "SELECT sql FROM sqlite_master WHERE type='table' AND name='contacts'"
).get();

console.log(row?.sql);

db.close();
