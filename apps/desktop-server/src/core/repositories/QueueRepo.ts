import type { Database } from "better-sqlite3";

export type QueueItemRow = {
  id: string;

  runId: string;
  campaignId?: string | null;
  senderId?: string | null;

  contactId?: string | null;
  stepId?: string | null;

  status: string;
  attempt: number;
  maxAttempts: number;
  dueAt: number | null;

  leaseOwner: string | null;
  leaseUntil: number | null;

  payloadJson?: string | null;

  lastErrorCode: string | null;
  lastErrorMessage: string | null;

  createdAt?: number | null;
  updatedAt?: number | null;
};

export type EnqueueInput = {
  id: string;
  runId: string;
  campaignId: string;
  senderId: string;
  contactId: string;
  stepId: string;
  dueAt: number | null;
  payloadJson: string;
  maxAttempts?: number;
};

export class QueueRepo {
  constructor(private db: Database) {}

  /**
   * Insert new queue item with defaults:
   * status=queued, attempt=0, maxAttempts=5 (unless provided)
   */
  enqueue(input: EnqueueInput) {
    const now = Date.now();
    const maxAttempts = input.maxAttempts ?? 5;

    this.db
      .prepare(
        `
        INSERT INTO queue_items (
          id, createdAt, updatedAt,
          runId, campaignId, senderId,
          contactId, stepId,
          dueAt,
          status,
          leaseOwner, leaseUntil,
          attempt, maxAttempts,
          lastErrorCode, lastErrorMessage,
          payloadJson
        )
        VALUES (
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?,
          'queued',
          NULL, NULL,
          0, ?,
          NULL, NULL,
          ?
        )
      `
      )
      .run(
        input.id,
        now,
        now,
        input.runId,
        input.campaignId,
        input.senderId,
        input.contactId,
        input.stepId,
        input.dueAt,
        maxAttempts,
        input.payloadJson
      );
  }

  // ---- existing API support ----

  list(params?: { runId?: string; limit?: number }): QueueItemRow[] {
    const limit = params?.limit ?? 50;

    if (params?.runId) {
      return this.db
        .prepare(
          `
          SELECT *
          FROM queue_items
          WHERE runId = ?
          ORDER BY dueAt ASC
          LIMIT ?
        `
        )
        .all(params.runId, limit) as QueueItemRow[];
    }

    return this.db
      .prepare(
        `
        SELECT *
        FROM queue_items
        ORDER BY dueAt ASC
        LIMIT ?
      `
      )
      .all(limit) as QueueItemRow[];
  }

  getById(id: string): QueueItemRow | null {
    const row = this.db
      .prepare(`SELECT * FROM queue_items WHERE id = ?`)
      .get(id) as QueueItemRow | undefined;

    return row ?? null;
  }

  // ---- worker support (Milestone 8.4) ----

  /**
   * Atomically:
   * 1) select due queued items (and not leased or expired lease)
   * 2) mark them leased to the current worker
   */
  claimDue(leaseOwner: string, leaseSec: number, limit: number): QueueItemRow[] {
    const now = Date.now();
    const leaseUntil = now + leaseSec * 1000;

    const tx = this.db.transaction(() => {
      const items = this.db
        .prepare(
          `
          SELECT *
          FROM queue_items
          WHERE status = 'queued'
            AND (dueAt IS NULL OR dueAt <= ?)
            AND (leaseUntil IS NULL OR leaseUntil < ?)
          ORDER BY dueAt ASC
          LIMIT ?
        `
        )
        .all(now, now, limit) as QueueItemRow[];

      if (items.length === 0) return [];

      const ids = items.map(i => i.id);

      this.db
        .prepare(
          `
          UPDATE queue_items
          SET
            status = 'leased',
            leaseOwner = ?,
            leaseUntil = ?,
            updatedAt = ?
          WHERE id IN (${ids.map(() => "?").join(",")})
        `
        )
        .run(leaseOwner, leaseUntil, Date.now(), ...ids);

      // return leased view
      return items.map(i => ({
        ...i,
        status: "leased",
        leaseOwner,
        leaseUntil
      }));
    });

    return tx();
  }

  markDone(id: string) {
    this.db
      .prepare(
        `
        UPDATE queue_items
        SET
          status = 'done',
          leaseOwner = NULL,
          leaseUntil = NULL,
          updatedAt = ?
        WHERE id = ?
      `
      )
      .run(Date.now(), id);
  }

  markFailedOrRetry(
    id: string,
    errorCode: string,
    errorMessage: string,
    nextDueAt: number | null
  ) {
    const row = this.db
      .prepare(`SELECT attempt, maxAttempts FROM queue_items WHERE id = ?`)
      .get(id) as { attempt: number; maxAttempts: number } | undefined;

    // if item disappeared — no-op (defensive)
    if (!row) return;

    const nextAttempt = row.attempt + 1;
    const isFinal = nextAttempt >= row.maxAttempts;

    this.db
      .prepare(
        `
        UPDATE queue_items
        SET
          status = ?,
          attempt = ?,
          lastErrorCode = ?,
          lastErrorMessage = ?,
          dueAt = ?,
          leaseOwner = NULL,
          leaseUntil = NULL,
          updatedAt = ?
        WHERE id = ?
      `
      )
      .run(
        isFinal ? "failed" : "queued",
        nextAttempt,
        errorCode,
        errorMessage,
        isFinal ? null : nextDueAt,
        Date.now(),
        id
      );
  }
}
