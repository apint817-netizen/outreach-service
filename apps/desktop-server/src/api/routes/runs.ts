import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

type RunMode = "cold" | "warm";

function insertEvent(db: any, runId: string, type: string, message?: string | null, meta?: any) {
  const id = randomUUID();
  const ts = new Date().toISOString();
  const metaJson = JSON.stringify(meta ?? {});
  (db.prepare(
    `INSERT INTO run_events (id, runId, ts, type, message, metaJson)
     VALUES (?, ?, ?, ?, ?, ?)`
  ) as any).run(id, runId, ts, type, message ?? null, metaJson);
}

export function registerRunsRoutes(app: FastifyInstance, deps?: any) {
  const db = () => (app as any).db;

  app.get("/runs", async () => {
    const rows = (db().prepare(`SELECT * FROM runs ORDER BY updatedAt DESC LIMIT 200`) as any).all();
    return { items: rows };
  });

  app.get("/runs/:id", async (req, reply) => {
    const id = (req as any).params?.id as string;
    const row = (db().prepare(`SELECT * FROM runs WHERE id = ?`) as any).get(id);
    if (!row) return reply.code(404).send({ error: "RUN_NOT_FOUND" });
    return row;
  });

  app.get("/runs/:id/events", async (req, reply) => {
    const id = (req as any).params?.id as string;
    const run = (db().prepare(`SELECT id FROM runs WHERE id = ?`) as any).get(id);
    if (!run) return reply.code(404).send({ error: "RUN_NOT_FOUND" });

    const rows = (db().prepare(
      `SELECT * FROM run_events WHERE runId = ? ORDER BY ts DESC LIMIT 500`
    ) as any).all(id);

    return { items: rows };
  });

  app.post("/runs", async (req) => {
    const body = (req as any).body ?? {};

    const id = randomUUID();
    const now = new Date().toISOString();

    const campaignId = String(body.campaignId ?? "");
    const senderId = String(body.senderId ?? "default");
    const mode: RunMode = body.mode === "warm" ? "warm" : "cold";

    const totalsJson = JSON.stringify({ total: 0, sent: 0, failed: 0, skipped: 0, replied: 0 });

    (db().prepare(
      `INSERT INTO runs (id, createdAt, updatedAt, campaignId, senderId, mode, status, pausedReason, stopReason, totalsJson, lastError)
       VALUES (?, ?, ?, ?, ?, ?, 'created', NULL, NULL, ?, NULL)`
    ) as any).run(id, now, now, campaignId, senderId, mode, totalsJson);

    insertEvent(db(), id, "run_created", null, { campaignId, senderId, mode });

    return (db().prepare(`SELECT * FROM runs WHERE id = ?`) as any).get(id);
  });

  app.post("/runs/:id/start", async (req, reply) => {
    const id = (req as any).params?.id as string;
    const run = (db().prepare(`SELECT * FROM runs WHERE id = ?`) as any).get(id);
    if (!run) return reply.code(404).send({ error: "RUN_NOT_FOUND" });

    if (run.status !== "created" && run.status !== "paused") {
      return reply.code(409).send({ error: "RUN_INVALID_STATE", status: run.status });
    }

    const now = new Date().toISOString();
    (db().prepare(`UPDATE runs SET status='running', updatedAt=?, pausedReason=NULL, lastError=NULL WHERE id=?`) as any).run(now, id);
    insertEvent(db(), id, "run_started", null, {});

    // --- planner (robust) ---
    try {
      const planner = deps?.queuePlanner;
      if (!planner) throw new Error("QUEUE_PLANNER_NOT_WIRED");

      const fn =
        (planner as any).planForRun ??
        (planner as any).plan ??
        (planner as any).planRun ??
        (planner as any).planForRunId;

      if (typeof fn !== "function") {
        throw new Error("QUEUE_PLANNER_METHOD_NOT_FOUND");
      }

      const res = await fn.call(planner, id);
      insertEvent(db(), id, "queue_planned", null, res ?? {});
    } catch (e: any) {
      const msg = String(e?.message ?? "planning_error");
      (db().prepare(
        `UPDATE runs SET status='paused', updatedAt=?, pausedReason='planning_error', lastError=? WHERE id=?`
      ) as any).run(new Date().toISOString(), msg, id);

      insertEvent(db(), id, "queue_plan_failed", msg, {});
    }

    return (db().prepare(`SELECT * FROM runs WHERE id = ?`) as any).get(id);
  });
}
