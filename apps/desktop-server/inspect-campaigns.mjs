import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "../../data/app.db");
const db = new Database(dbPath);

console.log("=== PRAGMA table_info(campaigns) ===");
console.table(db.prepare("PRAGMA table_info(campaigns)").all());

console.log("=== CREATE TABLE campaigns ===");
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='campaigns'").get();
console.log(row?.sql);

db.close();
