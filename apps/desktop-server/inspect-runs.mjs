import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "../../data/app.db");
const db = new Database(dbPath);

console.log("=== PRAGMA table_info(runs) ===");
console.table(db.prepare("PRAGMA table_info(runs)").all());

console.log("=== CREATE TABLE runs ===");
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='runs'").get();
console.log(row?.sql);

db.close();
