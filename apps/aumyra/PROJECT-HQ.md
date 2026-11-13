# AUMYRA — project HQ
Updated 2026-11-13. Private personal assistant for Telegram @AumyraBot.
Previously named HERMAYA (internal) and OMYRA. Aumyra is the public owner name.

## Owner decisions
- Owner-only MVP, private Telegram chat; bot never discloses personal data to other IDs.
- Cloudflare Worker with dedicated D1 named aumyra, independently deployed; no changes to ROAMDOTS, Ocean Cafe, or OMLAYER production website.
- Finance transactions accept USD, USDT and THB separately; no invented FX conversion or balances.
- Finance bank plan: Living 50%, donations 10%, immediate purchases 10%; scooter 10% target ฿8,000, laptop 10% target ฿10,000, tower 10% target ฿5,000. These are targets, not evidence of actual balances.
- Preserve previously tested 4,715-entry HERMAYA import archive; it is NOT present in this new GitHub repo and must not be silently replaced, reconstructed, or claimed live.
- No bot token, auth token, personal finance file or secret committed to source control.

## Release status
- GitHub draft PR #20 on isolated feature branch: code prepared for Telegram/Workers; Node behavior + SQLite schema GitHub CI successful (run 43382552628).
- Dedicated aumyra repository not accessible; temporarily isolated under apps/aumyra in OMLAYER. Do not deploy OMLAYER website from this branch.
- Cloudflare D1 ID, Worker secrets, domain and Telegram webhook not yet verified.
- Chat AI requires explicit owner-supplied OPENAI_API_KEY; no AI usage is billed by default.
- Real @AumyraBot /start, /expense, /summary, /note, and AI replies remain release gates.

## Handoff
The next release owner must verify existing Cloudflare resources before creating duplicates; configure dedicated D1 and secrets, run migration, deploy Worker, setWebhook with path /telegram/webhook, and test a real owner Telegram chat. Do not claim operational status solely from code or CI.
