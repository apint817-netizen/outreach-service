import type { FastifyInstance } from "fastify";
import { SegmentsRepo } from "../../core/repositories/SegmentsRepo.js";

export function registerSegmentsRoutes(app: FastifyInstance) {
  app.get("/segments", async (req) => {
    const db = app.db;
    const repo = new SegmentsRepo(db);

    const q = (req as any).query ?? {};
    const archived =
      q.archived === "1" || q.archived === 1 || q.archived === true || q.archived === "true";

    const items = repo.list({ archived });
    return { items };
  });

  app.get("/segments/:id", async (req, reply) => {
    const db = app.db;
    const repo = new SegmentsRepo(db);

    const id = (req as any).params?.id as string;
    const item = repo.getById(id);
    if (!item) return reply.code(404).send({ error: "SEGMENT_NOT_FOUND" });
    return item;
  });

  app.post("/segments", async (req) => {
    const db = app.db;
    const repo = new SegmentsRepo(db);
    return repo.create((req as any).body ?? {});
  });

  app.patch("/segments/:id", async (req, reply) => {
    const db = app.db;
    const repo = new SegmentsRepo(db);
    const id = (req as any).params?.id as string;
    const updated = repo.update(id, (req as any).body ?? {});
    if (!updated) return reply.code(404).send({ error: "SEGMENT_NOT_FOUND" });
    return updated;
  });

  app.delete("/segments/:id", async (req, reply) => {
    const db = app.db;
    const repo = new SegmentsRepo(db);
    const id = (req as any).params?.id as string;
    const ok = repo.archive(id);
    if (!ok) return reply.code(404).send({ error: "SEGMENT_NOT_FOUND" });
    return { ok: true };
  });
}
