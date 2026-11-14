-- Journaling the target before voiding prevents repeated /undo from affecting another entry.
-- D1 migration is additive and preserves every earlier finance record.
CREATE TABLE IF NOT EXISTS aumyra_undo_ops (
  update_id INTEGER PRIMARY KEY,
  entry_id INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
