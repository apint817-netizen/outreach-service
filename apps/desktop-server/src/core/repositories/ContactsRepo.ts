import type Database from "better-sqlite3";

export type ContactRow = {
  id: string;
  createdAt: string;
  updatedAt: string;

  displayName: string;
  phoneE164: string;
  channel: string;

  status: string;
  tagsJson: string;
  notes: string;
};

export class ContactsRepo {
  constructor(private db: Database.Database) {}

  list(): ContactRow[] {
    return this.db
      .prepare(
        `SELECT
          id, createdAt, updatedAt,
          displayName, phoneE164, channel,
          status, tagsJson, notes
        FROM contacts
        ORDER BY updatedAt DESC`
      )
      .all() as ContactRow[];
  }
}
