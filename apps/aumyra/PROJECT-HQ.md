# AUMYRA — project HQ
Updated 2026-11-13. Private personal assistant for Telegram @AumyraBot.
Previously named HERMAYA (internal) and OMYRA. Aumyra is the public owner name.

## Owner decisions
- Owner-only MVP, private Telegram chat; bot never discloses personal data to other IDs.
- Cloudflare Worker with dedicated D1 named aumyra, independently deployed; no changes to ROAMDOTS, Ocean Cafe, or OMLAYER production website.
- Finance transactions accept USD, USDT and THB separately; no invented FX conversion or balances.
- Savings targets are private owner configuration stored in the BANK_PLAN_JSON Worker secret; no values in public code.
- Preserve the previously tested private finance archive; it is not accessible from connected GitHub and must not be reconstructed or overwritten.
- No bot token, auth token, personal finance file or secret committed to source control.

## Release status
- GitHub draft PR #20 on isolated feature branch: code prepared for Telegram/Workers; Node behavior + SQLite schema GitHub CI successful (run 43382552628).
- Dedicated aumyra repository not accessible; temporarily isolated under apps/aumyra in OMLAYER. Do not deploy OMLAYER website from this branch.
- Cloudflare D1 ID, Worker secrets, domain and Telegram webhook not yet verified.
- AI chat is opt-in through an owner-configured Cloudflare AI binding or OPENAI_API_KEY; no AI inference is enabled by default.
- Real @AumyraBot /start, /expense, /summary, /note, and AI replies remain release gates.

## Handoff
The next release owner must verify existing Cloudflare resources before creating duplicates; configure dedicated D1 and secrets, run migration, deploy Worker, setWebhook with path /telegram/webhook, and test a real owner Telegram chat. Do not claim operational status solely from code or CI.
