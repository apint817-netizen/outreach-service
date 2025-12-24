import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { SenderRepo } from "../../infra/db/SenderRepo";

export async function registerSenderRoutes(app: FastifyInstance) {
  const repo = new SenderRepo(app.db as any);

  app.get("/senders", async () => {
    return { items: repo.list() };
  });

  app.get<{ Params: { id: string } }>("/senders/:id", async (req, reply) => {
    const row = repo.getById(req.params.id);
    if (!row) return reply.code(404).send({ error: "SENDER_NOT_FOUND" });
    return row;
  });

  app.post<{ Body: { id?: string; name: string; channel: string } }>("/senders", async (req, reply) => {
    const id = req.body.id ?? randomUUID();
    const now = new Date().toISOString();

    try {
      (app.db as any).prepare(`
        INSERT INTO senders(id, createdAt, updatedAt, channel, name, state, lastErrorCode, lastErrorMessage, sessionPath)
        VALUES(?, ?, ?, ?, ?, 'needs_login', NULL, NULL, NULL)
      `).run(id, now, now, req.body.channel, req.body.name);
    } catch {
      return reply.code(409).send({ error: "SENDER_ALREADY_EXISTS" });
    }

    return repo.getById(id);
  });

  app.post<{
    Params: { id: string };
    Body: { state: string; lastErrorCode?: string | null; lastErrorMessage?: string | null };
  }>("/senders/:id/state", async (req, reply) => {
    const row = repo.getById(req.params.id);
    if (!row) return reply.code(404).send({ error: "SENDER_NOT_FOUND" });

    repo.updateState(req.params.id, req.body.state, req.body.lastErrorCode ?? null, req.body.lastErrorMessage ?? null);
    return repo.getById(req.params.id);
  });
}
