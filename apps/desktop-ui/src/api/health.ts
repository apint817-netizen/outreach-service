import type { HealthDTO } from "@outreach/shared";

const API_BASE = "http://127.0.0.1:3001";

export async function fetchHealth(signal?: AbortSignal): Promise<HealthDTO> {
  const res = await fetch(API_BASE + "/health", { signal });
  if (!res.ok) throw new Error("health_http_" + res.status);
  return (await res.json()) as HealthDTO;
}
