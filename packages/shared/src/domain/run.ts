export type RunStatus =
  | "created"
  | "queued"
  | "running"
  | "paused"
  | "stopped"
  | "completed"
  | "failed";

export type RunMode = "cold" | "warm";

export type RunTotals = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  replied: number;
};

export type Run = {
  id: string;
  createdAt: string;
  updatedAt: string;

  campaignId: string;
  senderId: string; // MVP: "default"

  mode: RunMode;
  status: RunStatus;

  pausedReason: string | null;
  stopReason: string | null;

  totals: RunTotals;

  lastError: string | null;
};
