CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,

  displayName TEXT NOT NULL,
  phoneE164 TEXT NOT NULL,
  channel TEXT NOT NULL,        -- "whatsapp" (MVP), позже "telegram" и т.д.

  status TEXT NOT NULL,         -- "active" | "blocked" | "invalid" | "opted_out"
  tagsJson TEXT NOT NULL,       -- JSON array: ["tag1","tag2"]
  notes TEXT NOT NULL           -- free text
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phoneE164);
