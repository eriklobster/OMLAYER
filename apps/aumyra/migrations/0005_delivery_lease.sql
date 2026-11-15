-- One active Telegram send attempt per update; no alteration of finance records.
-- The lease is released after a rejected send, or reclaimed after a timeout.
ALTER TABLE aumyra_processed_updates ADD COLUMN delivery_claimed_at TEXT;
