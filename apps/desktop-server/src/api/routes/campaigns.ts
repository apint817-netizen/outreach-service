import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

type CampaignMode = "cold" | "warm";

function safeJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function registerCampaignsRoutes(app: FastifyInstance) {
  app.get("/campaigns", async (req) => {
    const db = (app as any).db;
    const q = (req as any).query ?? {};
    const archived = String(q.archived ?? "0") === "1" ? 1 : 0;

    const rows = (db.prepare(
      `SELECT * FROM campaigns WHERE isArchived = ? ORDER BY updatedAt DESC LIMIT 200`
    ) as any).all(archived);

    const items = rows.map((r: any) => ({
      ...r,
      steps: safeJson(r.stepsJson ?? "[]", [])
    }));

    return { items };
  });

  app.get("/campaigns/:id", async (req, reply) => {
    const db = (app as any).db;
    const id = (req as any).params?.id as string;

    const row = (db.prepare(`SELECT * FROM campaigns WHERE id = ?`) as any).get(id);
    if (!row) return reply.code(404).send({ error: "CAMPAIGN_NOT_FOUND" });

    return { ...row, steps: safeJson(row.stepsJson ?? "[]", []) };
  });

  app.post("/campaigns", async (req) => {
    const db = (app as any).db;
    const body = (req as any).body ?? {};

    const id = randomUUID();
    const now = new Date().toISOString();

    const name = String(body.name ?? "").trim() || "Untitled";
    const mode: CampaignMode = body.mode === "warm" ? "warm" : "cold";
    const segmentId = body.segmentId ? String(body.segmentId) : null;

    const steps = Array.isArray(body.steps) ? body.steps : [];
    const stepsJson = JSON.stringify(steps);

    (db.prepare(
      `INSERT INTO campaigns (id, createdAt, updatedAt, name, mode, segmentId, stepsJson, isArchived)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ) as any).run(id, now, now, name, mode, segmentId, stepsJson);

    const row = (db.prepare(`SELECT * FROM campaigns WHERE id = ?`) as any).get(id);
    return { ...row, steps: safeJson(row.stepsJson ?? "[]", []) };
  });

  app.patch("/campaigns/:id", async (req, reply) => {
    const db = (app as any).db;
    const id = (req as any).params?.id as string;
    const body = (req as any).body ?? {};

    const existing = (db.prepare(`SELECT * FROM campaigns WHERE id = ?`) as any).get(id);
    if (!existing) return reply.code(404).send({ error: "CAMPAIGN_NOT_FOUND" });

    const now = new Date().toISOString();

    const name = body.name !== undefined ? (String(body.name).trim() || existing.name) : existing.name;
    const mode: CampaignMode = body.mode === "warm" ? "warm" : (body.mode === "cold" ? "cold" : existing.mode);
    const segmentId = body.segmentId !== undefined ? (body.segmentId ? String(body.segmentId) : null) : existing.segmentId;

    const steps = body.steps !== undefined ? (Array.isArray(body.steps) ? body.steps : []) : safeJson(existing.stepsJson ?? "[]", []);
    const stepsJson = JSON.stringify(steps);

    (db.prepare(
      `UPDATE campaigns SET updatedAt=?, name=?, mode=?, segmentId=?, stepsJson=? WHERE id=?`
    ) as any).run(now, name, mode, segmentId, stepsJson, id);

    const row = (db.prepare(`SELECT * FROM campaigns WHERE id = ?`) as any).get(id);
    return { ...row, steps: safeJson(row.stepsJson ?? "[]", []) };
  });

  app.delete("/campaigns/:id", async (req, reply) => {
    const db = (app as any).db;
    const id = (req as any).params?.id as string;

    const existing = (db.prepare(`SELECT * FROM campaigns WHERE id = ?`) as any).get(id);
    if (!existing) return reply.code(404).send({ error: "CAMPAIGN_NOT_FOUND" });

    const now = new Date().toISOString();
    (db.prepare(`UPDATE campaigns SET isArchived=1, updatedAt=? WHERE id=?`) as any).run(now, id);

    return { ok: true };
  });
}
