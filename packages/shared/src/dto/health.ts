export type HealthDBStatus = "ok" | "down";

export type HealthDTO = {
  ok: boolean;
  apiVersion: string;
  db: HealthDBStatus;
  schemaVersion: number;
};
