import type { FastifyReply, FastifyRequest } from "fastify";
import type { Contact } from "@outreach/shared";

type Row = {
  id: string;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  phoneE164: string;
  channel: string;
  status: string;
  tagsJson: string;
  notes: string;
};

export async function contactsListRoute(_req: FastifyRequest, reply: FastifyReply) {
  const db = (reply.server as any).db;

  const rows = db
    .prepare(
      "SELECT id, createdAt, updatedAt, displayName, phoneE164, channel, status, tagsJson, notes FROM contacts ORDER BY createdAt DESC"
    )
    .all() as Row[];

  const items: Contact[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    displayName: r.displayName,
    phoneE164: r.phoneE164,
    channel: "whatsapp",
    status: r.status as any,
    tags: safeParseTags(r.tagsJson),
    notes: r.notes,
  }));

  return reply.send({ items });
}

function safeParseTags(tagsJson: string): string[] {
  try {
    const v = JSON.parse(tagsJson);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
