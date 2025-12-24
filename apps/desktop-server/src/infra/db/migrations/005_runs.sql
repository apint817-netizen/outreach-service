-- 005_runs.sql
-- Adds runs + run_events tables (MVP)
-- schemaVersion -> 5

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,

  campaignId TEXT NOT NULL,
  senderId TEXT NOT NULL,           -- MVP: "default"

  mode TEXT NOT NULL CHECK (mode IN ('cold','warm')),

  status TEXT NOT NULL CHECK (status IN ('created','queued','running','paused','stopped','completed','failed')),

  pausedReason TEXT NULL,           -- e.g. user_pause | app_restart | risk_stop | error
  stopReason TEXT NULL,             -- e.g. user_stop | completed | fatal_error

  totalsJson TEXT NOT NULL DEFAULT '{"total":0,"sent":0,"failed":0,"skipped":0,"replied":0}',

  lastError TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_updatedAt ON runs(updatedAt);
CREATE INDEX IF NOT EXISTS idx_runs_campaignId ON runs(campaignId);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

CREATE TABLE IF NOT EXISTS run_events (
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL,
  ts TEXT NOT NULL,

  type TEXT NOT NULL,               -- e.g. run_created|run_queued|run_started|run_paused|run_resumed|run_stopped|run_completed|run_failed
  message TEXT NULL,
  metaJson TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_run_events_runId_ts ON run_events(runId, ts);

-- bump schema version
UPDATE meta SET value='5' WHERE key='schemaVersion';
