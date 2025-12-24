import { useEffect, useMemo, useState } from "react";
import type { Campaign, CampaignMode, CampaignStep, Segment } from "@outreach/shared";
import { archiveCampaign, createCampaign, listCampaigns, patchCampaign } from "../api/campaigns";
import { listSegments } from "../api/segments";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function newStep(order: number): CampaignStep {
  return { id: "step-" + order, order, text: "" };
}

export function CampaignsPanel() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [includeArchived, setIncludeArchived] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [mode, setMode] = useState<CampaignMode>("cold");
  const [segmentId, setSegmentId] = useState<string>(""); // empty = null

  // simple editor
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [camps, segs] = await Promise.all([
        listCampaigns({ includeArchived }),
        listSegments({ includeArchived: false }),
      ]);
      setItems(camps);
      setSegments(segs);
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
      const created = await createCampaign({
        name: name.trim(),
        mode,
        segmentId: segmentId ? segmentId : null,
        steps: [{ id: "s1", order: 1, text: "Сообщение 1" }],
      });
      setName("");
      setSegmentId("");
      await refresh();
      setSelectedId(created.id);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onArchive(id: string) {
    const ok = confirm("Архивировать кампанию?");
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await archiveCampaign(id);
      if (selectedId === id) setSelectedId("");
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  function setSelectedStepsLocal(next: CampaignStep[]) {
    if (!selected) return;
    setItems((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, steps: next } : c))
    );
  }

  async function saveSelectedSteps(next: CampaignStep[]) {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await patchCampaign(selected.id, { steps: next });
      setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveSelectedMeta(patch: Partial<{ name: string; mode: CampaignMode; segmentId: string | null }>) {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await patchCampaign(selected.id, patch);
      setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const segOptions = useMemo(() => {
    const base = [{ id: "", name: "— без сегмента —" }];
    return base.concat(segments.map((s) => ({ id: s.id, name: `${s.name} (${s.mode})` })));
  }, [segments]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Кампании</div>
          <div style={{ opacity: 0.7 }}>MVP builder: список, создание, редактирование шагов, архив.</div>
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

      {error && <div style={{ color: "#ff6b6b" }}>Ошибка: {error}</div>}

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Создать кампанию</div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 220px 280px" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Название *</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Холодный outreach — Краснодар"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Режим</div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as CampaignMode)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
            >
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Сегмент (опц.)</div>
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
            >
              {segOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
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
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
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
                {items.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <tr key={c.id} style={{ background: active ? "#f5f5f5" : "transparent" }}>
                      <td style={{ padding: 10, borderBottom: "1px solid #1f1f1f" }}>
                        <button
                          onClick={() => setSelectedId(c.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "inherit",
                            cursor: "pointer",
                            fontWeight: active ? 700 : 500,
                            textAlign: "left",
                            padding: 0,
                          }}
                        >
                          {c.name}
                        </button>
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #1f1f1f" }}>{c.mode}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #1f1f1f" }}>{formatDate(c.updatedAt)}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #1f1f1f" }}>
                        <button
                          onClick={() => onArchive(c.id)}
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
                  );
                })}

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

        <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Редактор</div>

          {!selected && <div style={{ opacity: 0.7 }}>Выбери кампанию слева.</div>}

          {selected && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Название</div>
                <input
                  value={selected.name}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((c) =>
                        c.id === selected.id ? { ...c, name: e.target.value } : c
                      )
                    )
                  }
                  onBlur={() => saveSelectedMeta({ name: selected.name.trim() })}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
                />
              </div>

              <div style={{ display: "grid", gap: 6, gridTemplateColumns: "220px 1fr", alignItems: "end" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Режим</div>
                  <select
                    value={selected.mode}
                    onChange={(e) => {
                      const v = e.target.value as CampaignMode;
                      setItems((prev) => prev.map((c) => (c.id === selected.id ? { ...c, mode: v } : c)));
                    }}
                    onBlur={() => saveSelectedMeta({ mode: selected.mode })}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
                  >
                    <option value="cold">Cold</option>
                    <option value="warm">Warm</option>
                  </select>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Сегмент</div>
                  <select
                    value={selected.segmentId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItems((prev) =>
                        prev.map((c) =>
                          c.id === selected.id ? { ...c, segmentId: v ? v : null } : c
                        )
                      );
                    }}
                    onBlur={() => saveSelectedMeta({ segmentId: selected.segmentId ?? null })}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
                  >
                    {segOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>Шаги</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => {
                        const nextOrder = (selected.steps?.length ?? 0) + 1;
                        const next = [...selected.steps, newStep(nextOrder)];
                        setSelectedStepsLocal(next);
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      + шаг
                    </button>

                    <button
                      onClick={() => saveSelectedSteps(selected.steps)}
                      disabled={loading}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#f5f5f5",
                        color: "inherit",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Сохранить шаги
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {selected.steps.map((s, idx) => (
                    <div key={s.id} style={{ border: "1px solid #1f1f1f", borderRadius: 12, padding: 10 }}>
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "80px 1fr 140px 110px" }}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Order</div>
                          <input
                            type="number"
                            value={s.order}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              const next = [...selected.steps];
                              next[idx] = { ...next[idx], order: v };
                              setSelectedStepsLocal(next);
                            }}
                            style={{ padding: 8, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Text</div>
                          <input
                            value={s.text}
                            onChange={(e) => {
                              const next = [...selected.steps];
                              next[idx] = { ...next[idx], text: e.target.value };
                              setSelectedStepsLocal(next);
                            }}
                            placeholder="Текст сообщения (можно {{name}})"
                            style={{ padding: 8, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Delay sec</div>
                          <input
                            type="number"
                            value={s.delayAfterSec ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = [...selected.steps];
                              next[idx] = { ...next[idx], delayAfterSec: raw === "" ? undefined : Number(raw) };
                              setSelectedStepsLocal(next);
                            }}
                            placeholder="0"
                            style={{ padding: 8, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "inherit" }}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 6, alignItems: "end" }}>
                          <button
                            onClick={() => {
                              const next = selected.steps.filter((_, i) => i !== idx);
                              setSelectedStepsLocal(next.length ? next : [newStep(1)]);
                            }}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #2a2a2a",
                              background: "transparent",
                              color: "inherit",
                              cursor: "pointer",
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                  Важно: порядок шагов и минимум 1 шаг проверяются на сервере.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

