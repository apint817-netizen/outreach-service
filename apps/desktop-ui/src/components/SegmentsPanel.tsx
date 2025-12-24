import { useEffect, useMemo, useState } from "react";
import type { Segment, SegmentMode } from "@outreach/shared";
import { archiveSegment, createSegment, listSegments } from "../api/segments";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function SegmentsPanel() {
  const [items, setItems] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [includeArchived, setIncludeArchived] = useState(false);

  const [name, setName] = useState("");
  const [mode, setMode] = useState<SegmentMode>("cold");
  const [description, setDescription] = useState("");

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await listSegments({ includeArchived });
      setItems(list);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  async function onCreate() {
    if (!canCreate) return;
    setLoading(true);
    setError(null);
    try {
      await createSegment({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        mode,
        rules: [],
      });
      setName("");
      setDescription("");
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onArchive(id: string) {
    const ok = confirm("Архивировать сегмент? Он пропадёт из списка (если архив не включён).");
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      await archiveSegment(id);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Сегменты</div>
          <div style={{ opacity: 0.7 }}>Сохранённые фильтры контактов. Пока правила = пусто (MVP).</div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, userSelect: "none" }}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Показать архивные
        </label>
      </div>

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Создать сегмент</div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 220px" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Название *</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Холодные / Тег: Краснодар"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Режим</div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SegmentMode)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
            >
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Описание (опционально)</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткое пояснение, что это за сегмент"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={onCreate}
              disabled={!canCreate || loading}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2a2a2a",
                background: canCreate && !loading ? "#f5f5f5" : "transparent",
                color: "inherit",
                cursor: canCreate && !loading ? "pointer" : "not-allowed",
                fontWeight: 700,
              }}
            >
              Создать
            </button>

            <button
              onClick={refresh}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2a2a2a",
                background: "transparent",
                color: "inherit",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Обновить
            </button>

            {loading && <span style={{ opacity: 0.7 }}>Загрузка…</span>}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, color: "#ff6b6b" }}>
            Ошибка: {error}
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Список</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th style={{ padding: 10, borderBottom: "1px solid #2a2a2a" }}>Название</th>
                <th style={{ padding: 10, borderBottom: "1px solid #2a2a2a" }}>Mode</th>
                <th style={{ padding: 10, borderBottom: "1px solid #2a2a2a" }}>Updated</th>
                <th style={{ padding: 10, borderBottom: "1px solid #2a2a2a" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #1f1f1f" }}>{s.name}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #1f1f1f" }}>{s.mode}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #1f1f1f" }}>{formatDate(s.updatedAt)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #1f1f1f" }}>
                    <button
                      onClick={() => onArchive(s.id)}
                      disabled={loading}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "transparent",
                        color: "inherit",
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      Архивировать
                    </button>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 10, opacity: 0.7 }}>
                    Пусто
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

