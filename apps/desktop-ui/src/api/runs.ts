const BASE_URL = "http://127.0.0.1:3001";

export type RunDto = {
  id: string;
  campaignId: string;
  mode: "cold" | "warm";
  status: "created" | "queued" | "running" | "paused" | "stopped";
  pausedReason?: string | null;
  stopReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RunEventDto = {
  id: string;
  runId: string;
  type: string;
  message?: string | null;
  createdAt: string;
};

type AnyObj = Record<string, any>;

async function httpGetJson(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`);
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 300)}`);
  }
}

async function httpPostJson(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    // некоторые endpoints могут вернуть пустой body — это допустимо
    return null;
  }
}

function normalizeArray<T>(x: any): T[] {
  if (Array.isArray(x)) return x as T[];
  if (x && typeof x === "object") {
    const obj = x as AnyObj;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.runs)) return obj.runs as T[];
    if (Array.isArray(obj.events)) return obj.events as T[];
  }
  return [];
}

export async function getRunsRaw(): Promise<any> {
  return httpGetJson("/runs");
}

export async function getRuns(): Promise<RunDto[]> {
  const raw = await getRunsRaw();
  return normalizeArray<RunDto>(raw);
}

export async function getRunEventsRaw(runId: string): Promise<any> {
  return httpGetJson(`/runs/${runId}/events`);
}

export async function getRunEvents(runId: string): Promise<RunEventDto[]> {
  const raw = await getRunEventsRaw(runId);
  return normalizeArray<RunEventDto>(raw);
}

export async function startRun(runId: string): Promise<any> {
  return httpPostJson(`/runs/${runId}/start`);
}

export async function pauseRun(runId: string): Promise<any> {
  return httpPostJson(`/runs/${runId}/pause`);
}

export async function resumeRun(runId: string): Promise<any> {
  return httpPostJson(`/runs/${runId}/resume`);
}

export async function stopRun(runId: string): Promise<any> {
  return httpPostJson(`/runs/${runId}/stop`);
}
