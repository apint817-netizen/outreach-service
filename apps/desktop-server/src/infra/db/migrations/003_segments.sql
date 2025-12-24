-- 003_segments.sql
-- Segments: saved filters for contacts (mode-bound: cold/warm)

CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL, -- 'cold' | 'warm'
  rulesJson TEXT NOT NULL,
  isArchived INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_segments_mode ON segments(mode);
CREATE INDEX IF NOT EXISTS idx_segments_archived ON segments(isArchived);

-- bump schemaVersion
UPDATE meta SET value='3' WHERE key='schemaVersion';
