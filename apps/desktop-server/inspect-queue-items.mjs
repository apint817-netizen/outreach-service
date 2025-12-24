import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "../../data/app.db");
const db = new Database(dbPath);

console.log("=== PRAGMA table_info(queue_items) ===");
console.table(db.prepare("PRAGMA table_info(queue_items)").all());

console.log("=== CREATE TABLE queue_items ===");
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='queue_items'").get();
console.log(row?.sql);

db.close();
