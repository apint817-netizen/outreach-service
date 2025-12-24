import type { ErrorCode } from "@outreach/shared/domain/enums";

const API_BASE = "http://127.0.0.1:3001";

// Реальный preview response от backend:
// {"totalRows":2,"okCount":2,"errorCount":0,"items":[{"row":2,"displayName":"...","phoneE164":"...","tags":[...]}],"errors":[],"importId":"..."}
export type ImportPreviewError = {
  row: number;
  code?: ErrorCode | string;
  message: string;
};

export type ImportPreviewItem = {
  row: number;
  displayName: string;
  phoneE164: string;
  tags: string[];
};

export type ImportPreviewResponse = {
  totalRows: number;
  okCount: number;
  errorCount: number;
  items: ImportPreviewItem[];
  errors: ImportPreviewError[];
  importId: string;
};

export type ImportCommitResponse = {
  importId: string;
  inserted: number;
  skippedExisting: number;
  total?: number;
};

type ApiErrorShape = {
  error?: {
    code?: ErrorCode | string;
    message?: string;
    details?: unknown;
  };
};

async function readJsonOrText(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

function fail(message: string): never {
  throw new Error(message);
}

export async function previewImport(csvText: string): Promise<ImportPreviewResponse> {
  if (!csvText || !csvText.trim()) {
    fail("Пустой CSV. Вставьте данные и повторите.");
  }

  const res = await fetch(API_BASE + "/contacts/import/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ csvText }),
  });

  const data = await readJsonOrText(res);

  if (!res.ok) {
    const apiErr = data as Partial<ApiErrorShape>;
    const msg =
      apiErr?.error?.message ||
      (typeof data === "string" ? data : "Ошибка предпросмотра импорта");
    fail(msg);
  }

  if (
    !data ||
    typeof data.importId !== "string" ||
    !Array.isArray(data.items) ||
    !Array.isArray(data.errors) ||
    typeof data.okCount !== "number" ||
    typeof data.errorCount !== "number"
  ) {
    fail("Некорректный ответ сервера предпросмотра импорта.");
  }

  return data as ImportPreviewResponse;
}

export async function commitImport(importId: string): Promise<ImportCommitResponse> {
  if (!importId) fail("Нет importId. Сначала сделайте предпросмотр.");

  const res = await fetch(API_BASE + "/contacts/import/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ importId }),
  });

  const data = await readJsonOrText(res);

  if (!res.ok) {
    const apiErr = data as Partial<ApiErrorShape>;
    const msg =
      apiErr?.error?.message ||
      (typeof data === "string" ? data : "Ошибка импорта контактов");
    fail(msg);
  }

  if (!data || typeof data.importId !== "string") {
    fail("Некорректный ответ сервера импорта.");
  }

  return data as ImportCommitResponse;
}
