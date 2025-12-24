import React from "react";
import type { HealthDTO } from "@outreach/shared";
import { fetchHealth } from "../api/health";

type ViewState =
  | { kind: "loading" }
  | { kind: "ok"; data: HealthDTO; checkedAt: number }
  | { kind: "offline"; error: string; checkedAt: number };

export function BackendStatus() {
  const [state, setState] = React.useState<ViewState>({ kind: "loading" });

  React.useEffect(() => {
    const ac = new AbortController();

    const run = async () => {
      try {
        const data = await fetchHealth(ac.signal);
        setState({ kind: "ok", data, checkedAt: Date.now() });
      } catch (e: any) {
        setState({
          kind: "offline",
          error: e?.message ?? "offline",
          checkedAt: Date.now(),
        });
      }
    };

    run();
    const t = setInterval(run, 5000);

    return () => {
      ac.abort();
      clearInterval(t);
    };
  }, []);

  const time = "checkedAt" in state ? new Date(state.checkedAt).toLocaleTimeString() : "";

  if (state.kind === "loading") {
    return (
      <div style={{ padding: 12, border: "1px solid #2a2a2a", borderRadius: 8 }}>
        Backend: checking…
      </div>
    );
  }

  if (state.kind === "offline") {
    return (
      <div style={{ padding: 12, border: "1px solid #2a2a2a", borderRadius: 8 }}>
        <div><b>Backend:</b> OFFLINE</div>
        <div style={{ opacity: 0.8 }}>last check: {time}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, border: "1px solid #2a2a2a", borderRadius: 8 }}>
      <div><b>Backend:</b> OK</div>
      <div style={{ opacity: 0.8 }}>apiVersion: {state.data.apiVersion}</div>
      <div style={{ opacity: 0.8 }}>schemaVersion: {state.data.schemaVersion}</div>
      <div style={{ opacity: 0.8 }}>last check: {time}</div>
    </div>
  );
}

