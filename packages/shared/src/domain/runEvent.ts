export type RunEventType =
  | "run_created"
  | "run_started"
  | "run_paused"
  | "run_resumed"
  | "run_stopped"
  | "queue_planned"
  | "queue_plan_failed";

export type RunEvent = {
  id: string;
  runId: string;
  createdAt: string;
  type: RunEventType;
  message?: string | null;
  meta?: Record<string, unknown> | null;
};
