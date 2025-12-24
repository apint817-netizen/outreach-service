import { useMemo, useState } from "react";
import { commitImport, previewImport, type ImportCommitResponse, type ImportPreviewResponse } from "../api/contactsImport";

type Props = {
  onImported?: () => void;
};

export function ImportContacts(props: Props) {
  const [csvText, setCsvText] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(null);
  const [loading, setLoading] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const errorByRow = useMemo(() => {
    const map = new Map<number, string>();
    if (!preview?.errors) return map;
    for (const e of preview.errors) {
      if (!map.has(e.row)) map.set(e.row, e.message);
    }
    return map;
  }, [preview]);

  async function handlePreview() {
    setError(null);
    setCommitResult(null);
    setLoading("preview");
    try {
      const res = await previewImport(csvText);
      setPreview(res);
    } catch (e: any) {
      setPreview(null);
      setError(e?.message || "Ошибка предпросмотра импорта");
    } finally {
      setLoading(null);
    }
  }

  async function handleCommit() {
    if (!preview?.importId) return;
    if (preview.errorCount > 0) {
      setError("Нельзя импортировать: исправьте ошибки в CSV и повторите предпросмотр.");
      return;
    }

    setError(null);
    setLoading("commit");
    try {
      const res = await commitImport(preview.importId);
      setCommitResult(res);
      setPreview(null);
      props.onImported?.();
    } catch (e: any) {
      setError(e?.message || "Ошибка импорта контактов");
    } finally {
      setLoading(null);
    }
  }

  const isPreviewing = loading === "preview";
  const isCommitting = loading === "commit";

  return (
    <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Импорт контактов</div>
      <div style={{ opacity: 0.8, marginBottom: 10 }}>Вставьте CSV (имя, телефон)</div>

      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder={"phone,name,tags\n+79990001122,Иван,\"vip\"\n89995556677,Петр,\"barber,rostov\""}
        rows={8}
        style={{
          width: "100%",
          resize: "vertical",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #2a2a2a",
          background: "transparent",
          color: "inherit",
          outline: "none",
          marginBottom: 12,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
          fontSize: 13,
        }}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button
          onClick={handlePreview}
          disabled={isPreviewing || isCommitting}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2a2a", cursor: "pointer" }}
        >
          {isPreviewing ? "Предпросмотр..." : "Предпросмотр"}
        </button>

        <button
          onClick={handleCommit}
          disabled={!preview?.importId || isPreviewing || isCommitting || (preview?.errorCount ?? 0) > 0}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2a2a", cursor: "pointer" }}
        >
          {isCommitting ? "Импорт..." : "Импортировать"}
        </button>
      </div>

      {error ? (
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #5a1f1f", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Ошибка</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{error}</div>
        </div>
      ) : null}

      {commitResult ? (
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #2a2a2a", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Импорт завершён</div>
          <div>Добавлено: {commitResult.inserted}</div>
          <div>Пропущено (уже существовали): {commitResult.skippedExisting}</div>
        </div>
      ) : null}

      {preview ? (
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
            <div>
              Готово к импорту: <b>{preview.okCount}</b>
            </div>
            <div>
              Ошибок: <b>{preview.errorCount}</b>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2a2a" }}>
                  <th style={{ padding: "8px 6px" }}>Строка</th>
                  <th style={{ padding: "8px 6px" }}>Имя</th>
                  <th style={{ padding: "8px 6px" }}>Телефон</th>
                  <th style={{ padding: "8px 6px" }}>Теги</th>
                  <th style={{ padding: "8px 6px" }}>Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((it, idx) => {
                  const err = errorByRow.get(it.row) || "";
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #1f1f1f" }}>
                      <td style={{ padding: "8px 6px", opacity: 0.9 }}>{it.row}</td>
                      <td style={{ padding: "8px 6px" }}>{it.displayName}</td>
                      <td
                        style={{
                          padding: "8px 6px",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
                        }}
                      >
                        {it.phoneE164}
                      </td>
                      <td style={{ padding: "8px 6px", opacity: 0.9 }}>{(it.tags || []).join(", ")}</td>
                      <td style={{ padding: "8px 6px", opacity: 0.9 }}>{err}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {preview.errors?.length ? (
            <div style={{ marginTop: 10, opacity: 0.9 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Ошибки (детали)</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {preview.errors.map((e, i) => (
                  <li key={i}>
                    Строка {e.row}: {e.message} ({String(e.code ?? "error")})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

