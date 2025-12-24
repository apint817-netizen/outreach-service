import { useEffect, useState } from "react";
import {
  getRuns,
  getRunsRaw,
  getRunEvents,
  getRunEventsRaw,
  pauseRun,
  resumeRun,
  RunDto,
  RunEventDto,
  startRun,
  stopRun,
} from "../api/runs";

function fmtDateTime(x: any): string {
  if (x === null || x === undefined) return "—";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleString();
}

function fmtTime(x: any): string {
  if (x === null || x === undefined) return "—";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleTimeString();
}

export function RunsPanel() {
  const [runs, setRuns] = useState<RunDto[]>([]);
  const [runsRaw, setRunsRaw] = useState<any>(null);

  const [selectedRun, setSelectedRun] = useState<RunDto | null>(null);
  const [events, setEvents] = useState<RunEventDto[]>([]);
  const [eventsRaw, setEventsRaw] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    try {
      setError(null);
      setLoading(true);
      const raw = await getRunsRaw();
      setRunsRaw(raw);
      const data = await getRuns();
      setRuns(data);

      if (selectedRun) {
        const next = data.find((r) => r.id === selectedRun.id) || null;
        setSelectedRun(next);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(runId: string) {
    const raw = await getRunEventsRaw(runId);
    setEventsRaw(raw);
    const ev = await getRunEvents(runId);
    setEvents(ev);
  }

  async function selectRun(run: RunDto) {
    try {
      setSelectedRun(run);
      setError(null);
      setLoading(true);
      await loadEvents(run.id);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: () => Promise<any>) {
    try {
      setError(null);
      setLoading(true);
      await action();
      await loadRuns();
      if (selectedRun) {
        await loadEvents(selectedRun.id);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const canStart = selectedRun?.status === "created";
  const canPause = selectedRun?.status === "running";
  const canResume = selectedRun?.status === "paused";
  const canStop =
    selectedRun?.status === "created" ||
    selectedRun?.status === "queued" ||
    selectedRun?.status === "running" ||
    selectedRun?.status === "paused";

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Запуски (Runs)</h2>
        <button onClick={loadRuns} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f00" }}>
          <b>Ошибка:</b> {error}
        </div>
      )}

      {loading && <div style={{ marginTop: 12 }}>Загрузка…</div>}

      <div style={{ marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">Campaign</th>
              <th align="left">Mode</th>
              <th align="left">Status</th>
              <th align="left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 8, opacity: 0.7 }}>
                  Нет запусков.
                </td>
              </tr>
            )}

            {runs.map((r) => (
              <tr
                key={r.id}
                style={{
                  cursor: "pointer",
                  borderTop: "1px solid #ddd",
                  background:
                    selectedRun?.id === r.id ? "rgba(0,0,0,0.04)" : "transparent",
                }}
                onClick={() => selectRun(r)}
              >
                <td style={{ padding: 8 }}>{r.id.slice(0, 8)}</td>
                <td style={{ padding: 8 }}>{r.campaignId.slice(0, 8)}</td>
                <td style={{ padding: 8 }}>{r.mode}</td>
                <td style={{ padding: 8 }}>
                  {r.status}
                  {r.pausedReason ? ` (${r.pausedReason})` : ""}
                  {r.stopReason ? ` (${r.stopReason})` : ""}
                </td>
                <td style={{ padding: 8 }}>{fmtDateTime(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary>Raw response: GET /runs</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(runsRaw, null, 2)}
        </pre>
      </details>

      {selectedRun && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0 }}>
              Run {selectedRun.id.slice(0, 8)} — {selectedRun.status}
            </h3>

            <button
              disabled={!canStart || loading}
              onClick={() => runAction(() => startRun(selectedRun.id))}
            >
              Start
            </button>

            <button
              disabled={!canPause || loading}
              onClick={() => runAction(() => pauseRun(selectedRun.id))}
            >
              Pause
            </button>

            <button
              disabled={!canResume || loading}
              onClick={() => runAction(() => resumeRun(selectedRun.id))}
            >
              Resume
            </button>

            <button
              disabled={!canStop || loading}
              onClick={() => runAction(() => stopRun(selectedRun.id))}
            >
              Stop
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.8 }}>
            campaignId: {selectedRun.campaignId} · mode: {selectedRun.mode} ·
            updated: {fmtDateTime(selectedRun.updatedAt)}
          </div>

          <div style={{ marginTop: 12 }}>
            <ul>
              {events.map((e) => (
                <li key={e.id}>
                  [{fmtTime(e.createdAt)}] {e.type}
                  {e.message ? ` — ${e.message}` : ""}
                </li>
              ))}
            </ul>

            <details style={{ marginTop: 12 }}>
              <summary>Raw response: GET /runs/:id/events</summary>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(eventsRaw, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
