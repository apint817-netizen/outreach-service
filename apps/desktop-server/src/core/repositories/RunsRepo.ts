import Database from "better-sqlite3";
import type { Run, RunMode, RunStatus, RunTotals } from "@outreach/shared";

type RunRow = {
  id: string;
  createdAt: string;
  updatedAt: string;

  campaignId: string;
  senderId: string;

  mode: RunMode;
  status: RunStatus;

  pausedReason: string | null;
  stopReason: string | null;

  totalsJson: string;

  lastError: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function parseTotals(json: string | null | undefined): RunTotals {
  try {
    const x = JSON.parse(json ?? "{}");
    return {
      total: Number(x.total ?? 0),
      sent: Number(x.sent ?? 0),
      failed: Number(x.failed ?? 0),
      skipped: Number(x.skipped ?? 0),
      replied: Number(x.replied ?? 0),
    };
  } catch {
    return { total: 0, sent: 0, failed: 0, skipped: 0, replied: 0 };
  }
}

function toDomain(r: RunRow): Run {
  return {
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    campaignId: r.campaignId,
    senderId: r.senderId,
    mode: r.mode,
    status: r.status,
    pausedReason: r.pausedReason ?? null,
    stopReason: r.stopReason ?? null,
    totals: parseTotals(r.totalsJson),
    lastError: r.lastError ?? null,
  };
}

export class RunsRepo {
  constructor(private db: Database.Database) {}

  list(): Run[] {
    const rows = this.db
      .prepare<[], RunRow>(
        `
        SELECT id, createdAt, updatedAt, campaignId, senderId, mode, status, pausedReason, stopReason, totalsJson, lastError
        FROM runs
        ORDER BY updatedAt DESC
        `
      )
      .all();

    return rows.map(toDomain);
  }

  getById(id: string): Run | null {
    const row = this.db
      .prepare<[string], RunRow>(
        `
        SELECT id, createdAt, updatedAt, campaignId, senderId, mode, status, pausedReason, stopReason, totalsJson, lastError
        FROM runs
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(id);

    return row ? toDomain(row) : null;
  }

  create(input: {
    id: string;
    campaignId: string;
    senderId: string;
    mode: RunMode;
  }): Run {
    const ts = nowIso();

    const row: RunRow = {
      id: input.id,
      createdAt: ts,
      updatedAt: ts,
      campaignId: input.campaignId,
      senderId: input.senderId,
      mode: input.mode,
      status: "created",
      pausedReason: null,
      stopReason: null,
      totalsJson: JSON.stringify({ total: 0, sent: 0, failed: 0, skipped: 0, replied: 0 }),
      lastError: null,
    };

    this.db
      .prepare(
        `
        INSERT INTO runs (id, createdAt, updatedAt, campaignId, senderId, mode, status, pausedReason, stopReason, totalsJson, lastError)
        VALUES (@id, @createdAt, @updatedAt, @campaignId, @senderId, @mode, @status, @pausedReason, @stopReason, @totalsJson, @lastError)
        `
      )
      .run(row);

    return toDomain(row);
  }

  setStatus(
    id: string,
    next: {
      status: RunStatus;
      pausedReason?: string | null;
      stopReason?: string | null;
      lastError?: string | null;
    }
  ): Run | null {
    const cur = this.db
      .prepare<[string], RunRow>(
        `
        SELECT id, createdAt, updatedAt, campaignId, senderId, mode, status, pausedReason, stopReason, totalsJson, lastError
        FROM runs
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(id);

    if (!cur) return null;

    const updatedAt = nowIso();

    const pausedReason =
      next.pausedReason !== undefined ? next.pausedReason : cur.pausedReason;
    const stopReason =
      next.stopReason !== undefined ? next.stopReason : cur.stopReason;
    const lastError =
      next.lastError !== undefined ? next.lastError : cur.lastError;

    const row: RunRow = {
      ...cur,
      updatedAt,
      status: next.status,
      pausedReason: pausedReason ?? null,
      stopReason: stopReason ?? null,
      lastError: lastError ?? null,
    };

    this.db
      .prepare(
        `
        UPDATE runs
        SET updatedAt = @updatedAt,
            status = @status,
            pausedReason = @pausedReason,
            stopReason = @stopReason,
            lastError = @lastError
        WHERE id = @id
        `
      )
      .run(row);

    return toDomain(row);
  }
}
