import type { FastifyInstance } from "fastify";
import { QueueRepo } from "../../core/repositories/QueueRepo.js";

export function registerQueueRoutes(app: FastifyInstance) {
  app.get("/queue", async (req) => {
    const db = app.db;
    const repo = new QueueRepo(db);

    const q = (req as any).query ?? {};
    const runId = typeof q.runId === "string" ? q.runId : undefined;

    const limitRaw = q.limit;
    const limit =
      typeof limitRaw === "string" ? Number(limitRaw) :
      typeof limitRaw === "number" ? limitRaw : 50;

    const items = repo.list({ runId, limit: Number.isFinite(limit) ? limit : 50 });
    return { items };
  });

  app.get("/queue/:id", async (req, reply) => {
    const db = app.db;
    const repo = new QueueRepo(db);

    const id = (req as any).params?.id as string;
    const item = repo.getById(id);

    if (!item) return reply.code(404).send({ error: "QUEUE_ITEM_NOT_FOUND" });
    return item;
  });
}
