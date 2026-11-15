-- Aumyra owns these tables only. Never migrate or delete pre-existing finance tables.
CREATE TABLE IF NOT EXISTS aumyra_processed_updates (
  update_id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  reply_text TEXT,
  reply_markup_json TEXT,
  delivered_at TEXT
);
CREATE TABLE IF NOT EXISTS aumyra_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_id INTEGER UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  currency TEXT NOT NULL CHECK(currency IN ('USD','USDT','THB')),
  category TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  voided_at TEXT
);
CREATE INDEX IF NOT EXISTS aumyra_entries_recent ON aumyra_entries(id DESC);
CREATE TABLE IF NOT EXISTS aumyra_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_id INTEGER UNIQUE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
