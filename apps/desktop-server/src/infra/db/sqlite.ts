import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export type SqliteDb = Database.Database;

export function openDb(dbFilePath: string): SqliteDb {
  const dir = path.dirname(dbFilePath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbFilePath);
  db.pragma("foreign_keys = ON");
  return db;
}
