-- 004_campaigns.sql
-- Adds campaigns table (MVP)
-- schemaVersion -> 4

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,

  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('cold','warm')),

  segmentId TEXT NULL,

  stepsJson TEXT NOT NULL DEFAULT '[]',

  isArchived INTEGER NOT NULL DEFAULT 0 CHECK (isArchived IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_updatedAt ON campaigns(updatedAt);
CREATE INDEX IF NOT EXISTS idx_campaigns_mode ON campaigns(mode);
CREATE INDEX IF NOT EXISTS idx_campaigns_archived ON campaigns(isArchived);

-- bump schema version
UPDATE meta SET value='4' WHERE key='schemaVersion';
