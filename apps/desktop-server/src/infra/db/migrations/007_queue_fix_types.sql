-- 007_queue_fix_types.sql
-- IMPORTANT:
-- This migration file MUST NOT include BEGIN/COMMIT because migrate.ts wraps each file in a transaction.
-- Converts queue_items time columns from TEXT (ISO) to INTEGER (epoch ms).
-- Drops/recreates indexes safely to avoid name collisions after rename.

PRAGMA foreign_keys=OFF;

-- Drop existing indexes (they can survive table rename)
DROP INDEX IF EXISTS idx_queue_items_run;
DROP INDEX IF EXISTS idx_queue_items_lease;
DROP INDEX IF EXISTS idx_queue_items_pick;
DROP INDEX IF EXISTS idx_queue_items_idempotency;

-- Rename old table
ALTER TABLE queue_items RENAME TO queue_items_old;

-- Recreate with INTEGER ms fields
CREATE TABLE queue_items (
  id TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  runId TEXT NOT NULL,
  campaignId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  contactId TEXT NOT NULL,
  stepId TEXT NOT NULL,
  dueAt INTEGER NOT NULL,
  status TEXT NOT NULL,
  leaseOwner TEXT,
  leaseUntil INTEGER,
  attempt INTEGER NOT NULL DEFAULT 0,
  maxAttempts INTEGER NOT NULL DEFAULT 5,
  lastErrorCode TEXT,
  lastErrorMessage TEXT,
  payloadJson TEXT NOT NULL
);

-- Copy data with conversion:
-- numeric strings/ints -> integer
-- ISO strings -> strftime('%s', ...) * 1000
-- fallback: now (ms)
INSERT INTO queue_items (
  id,
  createdAt,
  updatedAt,
  runId,
  campaignId,
  senderId,
  contactId,
  stepId,
  dueAt,
  status,
  leaseOwner,
  leaseUntil,
  attempt,
  maxAttempts,
  lastErrorCode,
  lastErrorMessage,
  payloadJson
)
SELECT
  id,

  CASE
    WHEN createdAt IS NULL THEN CAST(strftime('%s','now') AS INTEGER) * 1000
    WHEN typeof(createdAt) IN ('integer','real') THEN CAST(createdAt AS INTEGER)
    WHEN createdAt GLOB '[0-9]*' THEN CAST(createdAt AS INTEGER)
    WHEN createdAt LIKE '____-__-__T__:%' OR createdAt LIKE '____-__-__ __:%' THEN CAST(strftime('%s', createdAt) AS INTEGER) * 1000
    ELSE CAST(strftime('%s','now') AS INTEGER) * 1000
  END AS createdAt,

  CASE
    WHEN updatedAt IS NULL THEN CAST(strftime('%s','now') AS INTEGER) * 1000
    WHEN typeof(updatedAt) IN ('integer','real') THEN CAST(updatedAt AS INTEGER)
    WHEN updatedAt GLOB '[0-9]*' THEN CAST(updatedAt AS INTEGER)
    WHEN updatedAt LIKE '____-__-__T__:%' OR updatedAt LIKE '____-__-__ __:%' THEN CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
    ELSE CAST(strftime('%s','now') AS INTEGER) * 1000
  END AS updatedAt,

  runId,
  campaignId,
  senderId,
  contactId,
  stepId,

  CASE
    WHEN dueAt IS NULL THEN CAST(strftime('%s','now') AS INTEGER) * 1000
    WHEN typeof(dueAt) IN ('integer','real') THEN CAST(dueAt AS INTEGER)
    WHEN dueAt GLOB '[0-9]*' THEN CAST(dueAt AS INTEGER)
    WHEN dueAt LIKE '____-__-__T__:%' OR dueAt LIKE '____-__-__ __:%' THEN CAST(strftime('%s', dueAt) AS INTEGER) * 1000
    ELSE CAST(strftime('%s','now') AS INTEGER) * 1000
  END AS dueAt,

  status,
  leaseOwner,

  CASE
    WHEN leaseUntil IS NULL THEN NULL
    WHEN typeof(leaseUntil) IN ('integer','real') THEN CAST(leaseUntil AS INTEGER)
    WHEN leaseUntil GLOB '[0-9]*' THEN CAST(leaseUntil AS INTEGER)
    WHEN leaseUntil LIKE '____-__-__T__:%' OR leaseUntil LIKE '____-__-__ __:%' THEN CAST(strftime('%s', leaseUntil) AS INTEGER) * 1000
    ELSE NULL
  END AS leaseUntil,

  COALESCE(attempt, 0) AS attempt,
  COALESCE(maxAttempts, 5) AS maxAttempts,
  lastErrorCode,
  lastErrorMessage,
  payloadJson
FROM queue_items_old;

DROP TABLE queue_items_old;

-- Recreate indexes (keep same names as currently in your DB)
CREATE INDEX idx_queue_items_run ON queue_items(runId);
CREATE INDEX idx_queue_items_lease ON queue_items(leaseUntil);
CREATE INDEX idx_queue_items_pick ON queue_items(status, dueAt);

-- Idempotency: prevent duplicates for the same run+contact+step
CREATE UNIQUE INDEX idx_queue_items_idempotency ON queue_items(runId, contactId, stepId);

PRAGMA foreign_keys=ON;
