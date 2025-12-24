-- 006_queue.sql
-- DB-backed queue (local-first). Source of truth for job scheduling/execution.
-- Status model:
--  queued   -> available to be claimed when dueAt <= now
--  leased   -> claimed by worker until leaseUntil (crash-safe)
--  done     -> completed successfully
--  failed   -> max attempts exhausted or fatal error
--  canceled -> run stopped; item should not execute (kept for audit)

CREATE TABLE IF NOT EXISTS queue_items (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  -- ownership
  runId TEXT NOT NULL,
  campaignId TEXT NOT NULL,
  senderId TEXT NOT NULL,

  -- idempotency (one message step per contact per run)
  contactId TEXT NOT NULL,
  stepId TEXT NOT NULL,

  -- scheduling
  dueAt TEXT NOT NULL,
  status TEXT NOT NULL,                -- queued|leased|done|failed|canceled

  -- lease mechanism
  leaseOwner TEXT NULL,
  leaseUntil TEXT NULL,

  -- retries
  attempt INTEGER NOT NULL DEFAULT 0,
  maxAttempts INTEGER NOT NULL DEFAULT 5,
  lastErrorCode TEXT NULL,
  lastErrorMessage TEXT NULL,

  -- payload to execute
  payloadJson TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_items_idempotency
  ON queue_items(runId, contactId, stepId);

CREATE INDEX IF NOT EXISTS idx_queue_items_pick
  ON queue_items(status, dueAt);

CREATE INDEX IF NOT EXISTS idx_queue_items_lease
  ON queue_items(status, leaseUntil);

CREATE INDEX IF NOT EXISTS idx_queue_items_run
  ON queue_items(runId, status);

-- schema version (source of truth for /health)
INSERT INTO meta(key, value) VALUES ('schemaVersion', '6')
  ON CONFLICT(key) DO UPDATE SET value='6';
