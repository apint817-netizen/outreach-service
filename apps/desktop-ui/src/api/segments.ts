import type { Segment, SegmentMode, SegmentRule } from "@outreach/shared";

const API_BASE = "http://127.0.0.1:3001";

export async function listSegments(opts?: { includeArchived?: boolean; signal?: AbortSignal }) {
  const includeArchived = opts?.includeArchived ?? false;
  const signal = opts?.signal;

  const url =
    API_BASE + "/segments" + (includeArchived ? "?archived=1" : "");

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`listSegments failed: ${res.status}`);
  }

  const data = (await res.json()) as { items: Segment[] };
  return data.items;
}

export async function createSegment(input: {
  name: string;
  description?: string | null;
  mode: SegmentMode;
  rules?: SegmentRule[];
}) {
  const res = await fetch(API_BASE + "/segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      description: input.description ?? null,
      mode: input.mode,
      rules: input.rules ?? [],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createSegment failed: ${res.status} ${text}`);
  }

  return (await res.json()) as Segment;
}

export async function archiveSegment(id: string) {
  const res = await fetch(API_BASE + "/segments/" + encodeURIComponent(id), {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`archiveSegment failed: ${res.status} ${text}`);
  }

  return (await res.json()) as { ok: true };
}
