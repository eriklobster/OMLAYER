-- Persist the Telegram send method so a webhook retry cannot switch
-- a native widget message into an ordinary text message.
ALTER TABLE aumyra_processed_updates
  ADD COLUMN reply_kind TEXT NOT NULL DEFAULT 'text'
  CHECK (reply_kind IN ('text','widget'));
