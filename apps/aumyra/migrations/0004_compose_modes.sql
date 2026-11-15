-- AUMYRA composer: one pending action per owner.
-- Pending prompts are not financial records. Never modify existing ledger data.
CREATE TABLE IF NOT EXISTS aumyra_compose_modes (
  owner_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('income','expense','note')),
  update_id INTEGER NOT NULL,
  started_at TEXT NOT NULL
);
