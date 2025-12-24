import type { Campaign, CampaignMode, CampaignStep } from "@outreach/shared";

const API_BASE = "http://127.0.0.1:3001";

export async function listCampaigns(opts?: { includeArchived?: boolean; signal?: AbortSignal }) {
  const includeArchived = opts?.includeArchived ?? false;
  const signal = opts?.signal;

  const url =
    API_BASE + "/campaigns" + (includeArchived ? "?archived=1" : "");

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`listCampaigns failed: ${res.status}`);

  const data = (await res.json()) as { items: Campaign[] };
  return data.items;
}

export async function createCampaign(input: {
  name: string;
  mode: CampaignMode;
  segmentId: string | null;
  steps: CampaignStep[];
}) {
  const res = await fetch(API_BASE + "/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createCampaign failed: ${res.status} ${text}`);
  }

  return (await res.json()) as Campaign;
}

export async function patchCampaign(id: string, patch: Partial<{
  name: string;
  mode: CampaignMode;
  segmentId: string | null;
  steps: CampaignStep[];
}>) {
  const res = await fetch(API_BASE + "/campaigns/" + encodeURIComponent(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`patchCampaign failed: ${res.status} ${text}`);
  }

  return (await res.json()) as Campaign;
}

export async function archiveCampaign(id: string) {
  const res = await fetch(API_BASE + "/campaigns/" + encodeURIComponent(id), {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`archiveCampaign failed: ${res.status} ${text}`);
  }

  return (await res.json()) as { ok: true };
}
