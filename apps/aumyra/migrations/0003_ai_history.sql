-- Aumyra owner's short AI conversation context. Independent of finance and notes.
-- The update_id uniqueness prevents duplicate history turns on Telegram replay.
CREATE TABLE IF NOT EXISTS aumyra_ai_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_id INTEGER NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  reply TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS aumyra_ai_turns_recent ON aumyra_ai_turns(id DESC);

-- Stable cut-off ensures replaying /forget never erases conversations created later.
CREATE TABLE IF NOT EXISTS aumyra_chat_resets (
  update_id INTEGER PRIMARY KEY,
  last_turn_id INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
