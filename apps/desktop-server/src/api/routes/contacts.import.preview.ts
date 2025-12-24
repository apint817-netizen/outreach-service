import type { FastifyReply, FastifyRequest } from "fastify";
import { parse } from "csv-parse/sync";
import crypto from "node:crypto";

type Body = { csvText: string };

type PreviewItem = {
  row: number;
  displayName: string;
  phoneE164: string;
  tags: string[];
};

type PreviewError = {
  row: number;
  code: "MISSING_PHONE" | "INVALID_PHONE" | "DUPLICATE_IN_FILE";
  message: string;
};

export async function contactsImportPreviewRoute(req: FastifyRequest, reply: FastifyReply) {
  const body = (req.body ?? {}) as Body;
  const csvText = (body.csvText ?? "").trim();

  if (!csvText) return reply.code(400).send({ message: "csvText_required" });

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const items: PreviewItem[] = [];
  const errors: PreviewError[] = [];

  const seen = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2; // header = row 1
    const r = records[i];

    const rawPhone = pick(r, ["phone", "Phone", "PHONE", "tel", "Телефон", "телефон"]);
    const rawName = pick(r, ["name", "Name", "NAME", "fullName", "ФИО", "имя", "Имя"]);
    const rawTags = pick(r, ["tags", "Tags", "TAGS", "tag", "Теги", "теги"]);

    if (!rawPhone) {
      errors.push({ row: rowNum, code: "MISSING_PHONE", message: "phone is required" });
      continue;
    }

    const phoneE164 = normalizePhoneToE164(rawPhone);
    if (!phoneE164) {
      errors.push({ row: rowNum, code: "INVALID_PHONE", message: "cannot normalize phone" });
      continue;
    }

    if (seen.has(phoneE164)) {
      errors.push({ row: rowNum, code: "DUPLICATE_IN_FILE", message: "duplicate phone in csv" });
      continue;
    }
    seen.add(phoneE164);

    const displayName = (rawName || "").trim() || phoneE164;
    const tags = splitTags(rawTags);

    items.push({ row: rowNum, displayName, phoneE164, tags });
  }

  return reply.send({
    totalRows: records.length,
    okCount: items.length,
    errorCount: errors.length,
    items,
    errors,
    importId: crypto.randomUUID(),
  });
}

function pick(r: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function splitTags(v: string): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

// MVP-нормализация: RU/UA-like номера. Без внешних либ.
function normalizePhoneToE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");

  // если начинается с + и дальше 10-15 цифр
  if (digits.startsWith("+")) {
    const d = "+" + digits.slice(1).replace(/\D/g, "");
    if (d.length >= 11 && d.length <= 16) return d;
    return null;
  }

  const only = digits.replace(/\D/g, "");
  if (only.length < 10 || only.length > 15) return null;

  // RU: 8XXXXXXXXXX -> +7XXXXXXXXXX
  if (only.length === 11 && only.startsWith("8")) return "+7" + only.slice(1);

  // если 10 цифр — считаем РФ и добавляем +7
  if (only.length === 10) return "+7" + only;

  // fallback: просто плюс
  return "+" + only;
}
