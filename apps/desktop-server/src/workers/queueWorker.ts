import { randomUUID } from "node:crypto";
import { QueueRepo } from "../core/repositories/QueueRepo.js";

export type QueueWorkerOptions = {
  db: any;
  pollMs?: number;
  leaseSec?: number;
  batchSize?: number;
  logger?: { info: (...a: any[]) => void; error: (...a: any[]) => void };
};

export class QueueWorker {
  private workerId = `worker_${randomUUID()}`;
  private stopped = false;
  private timer: NodeJS.Timeout | null = null;

  private pollMs: number;
  private leaseSec: number;
  private batchSize: number;

  private repo: QueueRepo;
  private log: { info: (...a: any[]) => void; error: (...a: any[]) => void };

  constructor(opts: QueueWorkerOptions) {
    this.pollMs = opts.pollMs ?? 800;
    this.leaseSec = opts.leaseSec ?? 30;
    this.batchSize = opts.batchSize ?? 10;

    this.repo = new QueueRepo(opts.db);
    this.log = opts.logger ?? console;
  }

  start() {
    if (this.timer) return;
    this.stopped = false;

    this.log.info(`[QueueWorker] start id=${this.workerId} pollMs=${this.pollMs} leaseSec=${this.leaseSec} batch=${this.batchSize}`);

    const tick = async () => {
      if (this.stopped) return;

      try {
        const items = this.repo.claimDue(this.workerId, this.leaseSec, this.batchSize);

        if (items.length > 0) {
          this.log.info(`[QueueWorker] claimed ${items.length}`);
        }

        for (const it of items) {
          // STUB execution: always success
          try {
            // small jitter to make logs readable
            // (no randomness: keep deterministic-ish)
            this.repo.markDone(it.id);
          } catch (e: any) {
            // retry with backoff
            const nextDueAt = Date.now() + 5_000;
            this.repo.markFailedOrRetry(it.id, "stub_error", String(e?.message ?? e), nextDueAt);
          }
        }
      } catch (e: any) {
        this.log.error(`[QueueWorker] tick error`, e);
      } finally {
        if (!this.stopped) this.timer = setTimeout(tick, this.pollMs);
      }
    };

    this.timer = setTimeout(tick, 50);
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.log.info(`[QueueWorker] stop id=${this.workerId}`);
  }
}
