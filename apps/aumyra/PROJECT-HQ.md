# AUMYRA — PROJECT-HQ
Status checked 2026-11-13. Owner-only Telegram AI and Finance assistant `@AumyraBot`.
Previously named HERMAYA / OMYRA; canonical released name is AUMYRA.

## Recovery entrypoints
- Permanent release/owner handoff: https://github.com/eriklobster/OMLAYER/issues/22
- Current draft implementation PR: https://github.com/eriklobster/OMLAYER/pull/20
- Integration branch: `feat/aumyra-assistant-mvp`; **not** merged to `main`.
- Read `RESTART-HERE.md`, `TASKS.md`, `README.md`, and latest PR CI before modifying code.
- New-chat bootstrap: "Continue AUMYRA from GitHub issue #22 and PR #20. Follow apps/aumyra/RESTART-HERE.md and TASKS.md; recover commits and CI before code changes."

## Owner decisions (must preserve)
- Aumyra is a single-user **private** Telegram assistant. Only verified owner user/chat ID may access finance, notes or AI.
- Deploy in a dedicated Cloudflare Worker + **dedicated** D1 `aumyra`; no ROAMDOTS, Ocean Cafe, Ocean Kids Club, OMLAYER website production mutations.
- USD, USDT, THB are tracked separately. Do not invent exchange rates, bank balances, transactions, historical imports or user data.
- Private savings targets are configured only with Worker secret `BANK_PLAN_JSON`, never embedded in public code/PR/issue.
- Finance entries are append-only plus soft-void; `/undo` must journal target update ID before changing any entry.
- Optional AI provider must be separately authorized and budgeted; without one, core finance and notes still work.
- Never rotate a Telegram token, redirect another bot's webhook, or drop Telegram pending updates during setup.
- Preserve original HERMAYA private import/archive if recovered. It is **not** in connected GitHub; do not treat historical counts as confirmed or migrate blindly.

## Latest implementation state
- Source and tests isolated under `apps/aumyra/`; workflows under `.github/workflows/aumyra-*.yml`.
- Worker: /health, /telegram/webhook, owner/secret validation, /start /menu /help /status /banks /income /expense /summary /history /undo /note /notes, AI questions.
- SQLite/D1 migrations: `0001_init.sql`, `0002_undo_journal.sql`.
- Telegram setup script checks bot username via getMe **before** setWebhook, then validates getWebhookInfo.
- AI: current verified model defaults `gpt-4o-mini` via OpenAI if configured; Cloudflare AI optional `@cf/google/gemma-4-26b-a4b-it`.
- GET /health requires actual D1 schema migrated, not just bound credentials.
- Last independently confirmed CI: run 43418093513 at SHA `12417330fcc48fb179a9c08380abac4095eaab94` succeeded; newer CI after health changes must be verified.

## Windows one-command release preparation (2026-11-13)
- Added `scripts/bootstrap.ps1` (review source before running) and the single PowerShell launcher in `README.md`.
- Installer performs Node behavior tests, Cloudflare account confirmation, verifies getMe as @AumyraBot **before** remote mutation, finds/creates only dedicated D1 `aumyra`, prompts before reusing existing DB, forward-migrates it, deploys `aumyra` Worker, writes secrets from masked private terminal input, requires live HTTP readiness, then configures Telegram webhook + commands without dropping pending updates.
- It optionally enables Cloudflare Workers AI **only with explicit billing acknowledgement**; no AI enabled by default.
- Source commit chain starts `c450692`, CI syntax validation added `8f5573a`, README launcher `429679f`. CI/live launch need separate proof. **No bot deployed from ChatGPT**.
- Required on owner Windows computer: Node.js LTS+npm, PowerShell, Cloudflare login, existing @AumyraBot BotFather token, own numeric Telegram ID. Keep token and screenshots of secrets private. Both connected RDC machines were offline at last inspection.
- Owner should run exactly the command shown in `README.md` rather than manually repeating 10 settings steps. Report only sanitized errors. Production release still blocked until actual /start and finance/notes E2E tests.

## 2026-11-14 AUMYRA 2: Telegram menu and persistent chat
- **Menu first:** Owner-private 4-row Telegram reply keyboard `Chat | Menu`, `Expense | Income`, `Summary | History`, `Notes | Goals`. Pressing any exact label routes to the right command or data view; pressing Chat shows readiness, then ordinary text enters AI. Existing Telegram bot menu commands include `/chat` and `/forget` after owner runs webhook setup.
- **Chat context:** New additive `0003_ai_history.sql`, table `aumyra_ai_turns` (up to six recent completed turns supplied to AI), stable replay deduplication by update ID, journaled `/forget` with `aumyra_chat_resets`. Reset never touches income, expenses, notes or future chat turns. D1 `/health` now checks both new tables.
- **Verified code tests:** Node behavior suite includes keyboard, unauthorized selection, duplicate webhook, chat context, /forget replay. GitHub CI #92 **success** at `f9b7b2b0`, including SQL 0003 migration smoke and Wrangler dry-run. Newer docs/task commits follow; recheck latest CI before release.
- **Runtime not launched:** Neither Windows RDC machine online in this session. No Cloudflare app authorization, D1 UUID, configured Worker secrets, public Aumyra Worker URL or live Telegram webhook verified. The existing PowerShell one-command install in README is still the shortest owner-only release route.
- **No other apps** changed. Continue from PR #20 only. When owner completes first authenticated Cloudflare deployment, verify `/health`, `/start` Chat/Menu, /expense→/summary→/undo, /note→/notes, AI with chosen provider, `/forget`, owner-only denial.

## Release blockers / status honesty
- **Not live verified.** No authenticated Cloudflare account binding in this session. No verified deployed Aumyra Worker or D1.
- Missing verified deployment values: dedicated D1 ID, existing Telegram token, webhook secret, numeric owner Telegram ID, actual Worker HTTPS host, optional AI access.
- Telegram bot currently must be described as **release candidate**, not operating, until real /start and /expense persistence have been tested.
- The repo is public and earlier branch commits may expose removed *savings target examples*, though no actual bank ledgers or secrets were committed. Do not replay these numbers into public docs. Migrate to private repository when available.
- Cloudflare Worker GitHub manual deployment workflow exists **only in draft branch**. It must be reviewed/approved before merge and invocation. Do not merge unrelated staging or homepage changes.

## Live release acceptance
1. Confirm actual Cloudflare worker + dedicated D1 exist, no conflict with other products.
2. Apply 0001 + 0002 migrations and configure Worker secrets securely.
3. Deploy, GET /health = 200 with `ready:true`, verify HTTPS, correct path and no redirection errors.
4. Set and inspect Telegram webhook using the verified existing @AumyraBot token, keep pending messages.
5. From owner's Telegram: /start menu, /expense test -> /summary -> /undo, /note -> /notes; unauthorized account must get no private response.
6. Duplicate webhook update must not double-save /expense or double-void /undo.
7. Optional AI chat works after owner approves usage and provider configured. No untested statements of success.

## Handoff protocol
Every agent commits changes and updates `TASKS.md`, this HQ, and issue #22 with verified results and remaining blocker. Keep one actionable owner phone step at a time; report DONE | COMMIT/PR | TESTS | BLOCKER | NEXT ACTION.
