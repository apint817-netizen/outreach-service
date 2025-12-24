-- 008_senders.sql
-- Minimal Sender state storage for WhatsApp Web (Playwright will be added in Milestone 9.2+)

CREATE TABLE IF NOT EXISTS senders (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  channel TEXT NOT NULL,              -- 'whatsapp_web'
  name TEXT NOT NULL,                 -- human label
  state TEXT NOT NULL,                -- 'idle'|'needs_login'|'connected'|'captcha'|'disconnected'|'blocked'
  lastErrorCode TEXT,
  lastErrorMessage TEXT,

  sessionPath TEXT                    -- local path for browser profile/session (filled later)
);

CREATE INDEX IF NOT EXISTS idx_senders_channel ON senders(channel);
CREATE INDEX IF NOT EXISTS idx_senders_state ON senders(state);
