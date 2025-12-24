import { randomUUID } from "node:crypto";

export type RunEventRow = {
  id: string;
  runId: string;
  ts: string;
  type: string;
  message: string | null;
  metaJson: string;
};

export class RunEventsRepo {
  constructor(private db: any) {}

  listByRunId(runId: string, limit = 200): RunEventRow[] {
    return (this.db.prepare(
      `SELECT * FROM run_events WHERE runId = ? ORDER BY ts DESC LIMIT ?`
    ) as any).all(runId, limit);
  }

  add(runId: string, type: string, message?: string | null, meta?: Record<string, any> | null): RunEventRow {
    const id = randomUUID();
    const ts = new Date().toISOString();
    const metaJson = JSON.stringify(meta ?? {});

    (this.db.prepare(
      `INSERT INTO run_events (id, runId, ts, type, message, metaJson)
       VALUES (?, ?, ?, ?, ?, ?)`
    ) as any).run(id, runId, ts, type, message ?? null, metaJson);

    return { id, runId, ts, type, message: message ?? null, metaJson };
  }
}
