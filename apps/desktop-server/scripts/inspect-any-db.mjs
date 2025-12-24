import Database from "better-sqlite3";

const dbPath = process.argv[2];
if (!dbPath) {
  console.error("Usage: node scripts/inspect-any-db.mjs <dbPath>");
  process.exit(1);
}

const db = new Database(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x => x.name);
console.log("DB:", dbPath);
console.log("Tables:", tables);
console.log("Has senders:", tables.includes("senders"));
db.close();
