import type { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";

type Body = {
  importId: string;
  items: Array<{
    displayName: string;
    phoneE164: string;
    tags: string[];
  }>;
};

export async function contactsImportCommitRoute(req: FastifyRequest, reply: FastifyReply) {
  const db = (reply.server as any).db;
  const body = (req.body ?? {}) as Body;

  if (!body.importId) return reply.code(400).send({ message: "importId_required" });
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return reply.code(400).send({ message: "items_required" });
  }

  const now = new Date().toISOString();

  let inserted = 0;
  let skippedExisting = 0;

  const findByPhone = db.prepare("SELECT id FROM contacts WHERE phoneE164 = ? LIMIT 1");
  const insert = db.prepare(
    "INSERT INTO contacts (" +
      "id, createdAt, updatedAt, " +
      "displayName, phoneE164, channel, " +
      "status, tagsJson, notes" +
    ") VALUES (" +
      "@id, @createdAt, @updatedAt, " +
      "@displayName, @phoneE164, @channel, " +
      "@status, @tagsJson, @notes" +
    ")"
  );

  const tx = db.transaction((items: Body["items"]) => {
    for (const it of items) {
      const phone = String(it.phoneE164 || "").trim();
      if (!phone) continue;

      const exists = findByPhone.get(phone);
      if (exists) {
        skippedExisting++;
        continue;
      }

      insert.run({
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        displayName: String(it.displayName || phone),
        phoneE164: phone,
        channel: "whatsapp",
        status: "active",
        tagsJson: JSON.stringify(Array.isArray(it.tags) ? it.tags.map(String).slice(0, 20) : []),
        notes: "",
      });

      inserted++;
    }
  });

  tx(body.items);

  return reply.send({
    importId: body.importId,
    inserted,
    skippedExisting,
    total: body.items.length,
  });
}
