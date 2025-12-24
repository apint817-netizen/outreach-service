import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "..", "..", "data", "app.db");
const db = new Database(dbPath);

function tableInfo(name) {
  const rows = db.prepare(`PRAGMA table_info(${name})`).all();
  return rows.map(r => ({
    cid: r.cid,
    name: r.name,
    type: r.type,
    notnull: r.notnull,
    dflt_value: r.dflt_value,
    pk: r.pk
  }));
}

function indexes(name) {
  const rows = db.prepare(`PRAGMA index_list(${name})`).all();
  return rows.map(r => ({
    name: r.name,
    unique: r.unique,
    origin: r.origin,
    partial: r.partial
  }));
}

function sampleCols(name) {
  const row = db.prepare(`SELECT * FROM ${name} LIMIT 1`).get();
  if (!row) return null;
  return Object.keys(row);
}

console.log("DB:", dbPath);

console.log("\n== queue_items: table_info ==");
console.log(JSON.stringify(tableInfo("queue_items"), null, 2));

console.log("\n== queue_items: index_list ==");
console.log(JSON.stringify(indexes("queue_items"), null, 2));

console.log("\n== queue_items: sample columns ==");
console.log(JSON.stringify(sampleCols("queue_items"), null, 2));

const tbls = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('queue_items_old')").all();
if (tbls.length) {
  console.log("\n== queue_items_old: table_info ==");
  console.log(JSON.stringify(tableInfo("queue_items_old"), null, 2));

  console.log("\n== queue_items_old: sample columns ==");
  console.log(JSON.stringify(sampleCols("queue_items_old"), null, 2));
}

db.close();
