import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH;
if (!dbPath) throw new Error("DB_PATH missing");

const db = new Database(dbPath);
const row = db.prepare("SELECT id, channel, name, state, sessionPath, updatedAt FROM senders WHERE id='default'").get();
console.log("DB:", dbPath);
console.log("Sender(default):", row);
db.close();
