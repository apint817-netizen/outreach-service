import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

export function registerContactsRoutes(app: FastifyInstance) {
  // LIST
  app.get("/contacts", async () => {
    const db = (app as any).db;
    const rows = (db.prepare(
      `SELECT * FROM contacts ORDER BY createdAt DESC LIMIT 5000`
    ) as any).all();
    return { items: rows };
  });

  // IMPORT COMMIT
  app.post("/contacts/import/commit", async (req) => {
    const db = (app as any).db;
    const body = (req as any).body ?? {};
    const csv = String(body.csv ?? "");
    const lines = csv.split(/\r?\n/).filter((l: string) => l.trim().length > 0);

    if (lines.length < 2) return { ok: false, error: "CSV_EMPTY_OR_NO_ROWS" };

    const header = lines[0].split(",").map((s) => s.trim());
    const idxPhone = header.indexOf("phoneE164");
    const idxName = header.indexOf("displayName");
    const idxChannel = header.indexOf("channel");
    const idxStatus = header.indexOf("status");
    const idxTags = header.indexOf("tags");
    const idxNotes = header.indexOf("notes");

    if (idxPhone === -1) return { ok: false, error: "MISSING_phoneE164_HEADER" };

    const rows = lines.slice(1).map((l: string) => l.split(","));
    const now = new Date().toISOString();

    const insert = db.prepare(
      `INSERT INTO contacts (id, createdAt, updatedAt, displayName, phoneE164, channel, status, tagsJson, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const update = db.prepare(
      `UPDATE contacts
       SET updatedAt=?, displayName=?, channel=?, status=?, tagsJson=?, notes=?
       WHERE phoneE164=?`
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const tx = db.transaction(() => {
      for (const cols of rows) {
        const phoneE164 = String(cols[idxPhone] ?? "").trim();

        if (!phoneE164 || !phoneE164.startsWith("+")) {
          skipped++;
          continue;
        }

        const displayName =
          idxName === -1 ? "Unknown" : (String(cols[idxName] ?? "").trim() || "Unknown");

        const channel =
          idxChannel === -1 ? "whatsapp" : (String(cols[idxChannel] ?? "").trim() || "whatsapp");

        const status =
          idxStatus === -1 ? "active" : (String(cols[idxStatus] ?? "").trim() || "active");

        const notes =
          idxNotes === -1 ? "" : String(cols[idxNotes] ?? "").trim();

        const tagsRaw =
          idxTags === -1 ? "" : String(cols[idxTags] ?? "").trim();

        const tags = tagsRaw
          ? tagsRaw.split(tagsRaw.includes("|") ? "|" : ",").map(t => t.trim()).filter(Boolean)
          : [];

        const tagsJson = JSON.stringify(tags);

        const exists = db.prepare(`SELECT id FROM contacts WHERE phoneE164=?`).get(phoneE164);

        if (exists) {
          update.run(now, displayName, channel, status, tagsJson, notes, phoneE164);
          updated++;
        } else {
          insert.run(randomUUID(), now, now, displayName, phoneE164, channel, status, tagsJson, notes);
          inserted++;
        }
      }
    });

    tx();

    return { ok: true, inserted, updated, skipped, total: rows.length };
  });
}
