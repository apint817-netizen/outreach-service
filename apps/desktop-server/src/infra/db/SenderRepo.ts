import type Database from "better-sqlite3";

export type SenderRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  channel: string;
  name: string;
  state: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  sessionPath: string | null;
};

export class SenderRepo {
  constructor(private db: Database.Database) {}

  list(): SenderRow[] {
    return this.db.prepare(`SELECT * FROM senders ORDER BY createdAt DESC`).all() as SenderRow[];
  }

  getById(id: string): SenderRow | null {
    const row = this.db.prepare(`SELECT * FROM senders WHERE id = ?`).get(id) as SenderRow | undefined;
    return row ?? null;
  }

  upsertDefaultSender() {
    // Create 'default' sender if missing
    this.db.prepare(`
      INSERT INTO senders(id, channel, name, state, sessionPath)
      SELECT 'default', 'whatsapp_web', 'Default WhatsApp', 'needs_login', NULL
      WHERE NOT EXISTS (SELECT 1 FROM senders WHERE id='default')
    `).run();
  }

  updateState(id: string, state: string, lastErrorCode?: string | null, lastErrorMessage?: string | null) {
    this.db.prepare(`
      UPDATE senders
      SET state = ?,
          lastErrorCode = ?,
          lastErrorMessage = ?,
          updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ?
    `).run(state, lastErrorCode ?? null, lastErrorMessage ?? null, id);
  }

  setSessionPath(id: string, sessionPath: string | null) {
    this.db.prepare(`
      UPDATE senders
      SET sessionPath = ?,
          updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ?
    `).run(sessionPath, id);
  }
}
