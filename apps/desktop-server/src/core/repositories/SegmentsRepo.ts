import type { Database } from "better-sqlite3";
import { randomUUID } from "crypto";

export type SegmentRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string | null;
  mode: "cold" | "warm";
  rulesJson: string;
  isArchived: number;
};

export class SegmentsRepo {
  constructor(private db: Database) {}

  list(params?: { archived?: boolean }) {
    const archived = params?.archived ? 1 : 0;
    const rows = (this.db.prepare(
      `SELECT * FROM segments WHERE isArchived = ? ORDER BY updatedAt DESC`
    ) as any).all(archived) as SegmentRow[];

    return rows.map(r => ({
      ...r,
      isArchived: !!r.isArchived,
      rules: safeJson(r.rulesJson, [])
    }));
  }

  getById(id: string) {
    const row = (this.db.prepare(
      `SELECT * FROM segments WHERE id = ?`
    ) as any).get(id) as SegmentRow | undefined;

    if (!row) return null;

    return {
      ...row,
      isArchived: !!row.isArchived,
      rules: safeJson(row.rulesJson, [])
    };
  }

  create(input: any) {
    const now = new Date().toISOString();
    const id = randomUUID();

    const mode = input?.mode === "warm" ? "warm" : "cold";
    const name = String(input?.name ?? "Новый сегмент");
    const description = input?.description != null ? String(input.description) : null;
    const rulesJson = JSON.stringify(input?.rules ?? []);

    (this.db.prepare(
      `INSERT INTO segments (id, createdAt, updatedAt, name, description, mode, rulesJson, isArchived)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ) as any).run(id, now, now, name, description, mode, rulesJson);

    return this.getById(id);
  }

  update(id: string, patch: any) {
    const current = this.getById(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const name = patch?.name != null ? String(patch.name) : current.name;
    const description = patch?.description !== undefined ? (patch.description == null ? null : String(patch.description)) : current.description;
    const mode = patch?.mode === "warm" || patch?.mode === "cold" ? patch.mode : current.mode;
    const rulesJson = patch?.rules !== undefined ? JSON.stringify(patch.rules ?? []) : JSON.stringify((current as any).rules ?? []);

    (this.db.prepare(
      `UPDATE segments
       SET updatedAt = ?, name = ?, description = ?, mode = ?, rulesJson = ?
       WHERE id = ?`
    ) as any).run(now, name, description, mode, rulesJson, id);

    return this.getById(id);
  }

  archive(id: string) {
    const now = new Date().toISOString();
    const res = (this.db.prepare(
      `UPDATE segments SET isArchived = 1, updatedAt = ? WHERE id = ?`
    ) as any).run(now, id);

    return (res?.changes ?? 0) > 0;
  }
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
