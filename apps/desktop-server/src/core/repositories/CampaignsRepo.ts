import type { Database } from "better-sqlite3";
import { randomUUID } from "crypto";

export type CampaignRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string | null;
  mode: "cold" | "warm";
  stepsJson: string;
  isArchived: number;
};

export class CampaignsRepo {
  constructor(private db: Database) {}

  list(params?: { archived?: boolean }) {
    const archived = params?.archived ? 1 : 0;
    const rows = (this.db.prepare(
      `SELECT * FROM campaigns WHERE isArchived = ? ORDER BY updatedAt DESC`
    ) as any).all(archived) as CampaignRow[];

    return rows.map(r => ({
      ...r,
      isArchived: !!r.isArchived,
      steps: safeJson(r.stepsJson, [])
    }));
  }

  getById(id: string) {
    const row = (this.db.prepare(
      `SELECT * FROM campaigns WHERE id = ?`
    ) as any).get(id) as CampaignRow | undefined;

    if (!row) return null;

    return {
      ...row,
      isArchived: !!row.isArchived,
      steps: safeJson(row.stepsJson, [])
    };
  }

  create(input: any) {
    const now = new Date().toISOString();
    const id = randomUUID();

    const mode = input?.mode === "warm" ? "warm" : "cold";
    const name = String(input?.name ?? "Новая кампания");
    const description = input?.description != null ? String(input.description) : null;
    const stepsJson = JSON.stringify(input?.steps ?? []);

    (this.db.prepare(
      `INSERT INTO campaigns (id, createdAt, updatedAt, name, description, mode, stepsJson, isArchived)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ) as any).run(id, now, now, name, description, mode, stepsJson);

    return this.getById(id);
  }

  update(id: string, patch: any) {
    const current = this.getById(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const name = patch?.name != null ? String(patch.name) : current.name;
    const description = patch?.description !== undefined ? (patch.description == null ? null : String(patch.description)) : current.description;
    const mode = patch?.mode === "warm" || patch?.mode === "cold" ? patch.mode : current.mode;
    const stepsJson = patch?.steps !== undefined ? JSON.stringify(patch.steps ?? []) : JSON.stringify((current as any).steps ?? []);

    (this.db.prepare(
      `UPDATE campaigns
       SET updatedAt = ?, name = ?, description = ?, mode = ?, stepsJson = ?
       WHERE id = ?`
    ) as any).run(now, name, description, mode, stepsJson, id);

    return this.getById(id);
  }

  archive(id: string) {
    const now = new Date().toISOString();
    const res = (this.db.prepare(
      `UPDATE campaigns SET isArchived = 1, updatedAt = ? WHERE id = ?`
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
