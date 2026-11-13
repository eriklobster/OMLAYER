# AUMYRA — PROJECT-HQ
Status checked 2026-11-14. Owner-only Telegram AI and Finance assistant `@AumyraBot`.
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
- SQLite/D1 migrations: `0001_init.sql`, `0002_undo_journal.sql`, `0003_ai_history.sql`, `0004_compose_modes.sql`, `0005_delivery_lease.sql`.
- Telegram setup script checks bot username via getMe **before** setWebhook, then validates getWebhookInfo.
- AI: current verified model defaults `gpt-4o-mini` via OpenAI if configured; Cloudflare AI optional `@cf/google/gemma-4-26b-a4b-it`.
- GET /health requires actual D1 schema migrated, not just bound credentials.
- Newest independently confirmed CI: GitHub Actions #121, SHA `4ee7c88f`, success; newer CI after handoff edits must be verified.

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

## 2026-11-14 AUMYRA 2 continuation: guided input and deployment reliability
- **One-tap composer:** On Telegram, tap Expense or Income; next message is e.g. `12.50 USDT food coffee` (no slash). `/note` opens a one-message note input. Bad entries keep the prompt open; `/cancel` safely exits. Mode expires after 15 minutes and switching to Menu/Chat cancels it. `0004_compose_modes.sql` persists only pending mode metadata, no extra personal ledger values.
- **Telegram verification:** `scripts/setup-webhook.mjs` exports a mockable `configureWebhook`. Confirms token username exactly @AumyraBot before changing webhook. After setup it verifies real `getWebhookInfo`, `getMyCommands` and `getChatMenuButton`. Tests reject incorrect BotFather token, unsafe URL and malformed webhook secret without mutating Telegram; pending message queue preserved.
- **Cloudflare bootstrap hardening:** First-run PowerShell installer uses a valid all-zero temporary D1 UUID during account/database discovery to avoid malformed Wrangler config, then replaces with the actual dedicated Aumyra DB ID before applying migrations. No changes to ROAMDOTS or OMLAYER Pages.
- **CI:** #121 at `4ee7c88f` green, including Worker tests, Telegram setup API mocks, all four SQL migrations, Windows bootstrap parser and Wrangler dry-run. Updated README/TASKS after; newest branch CI should be queried for final status.
- **Production gate unchanged:** Cannot claim bot is live without authenticated Cloudflare control, verified `/health` 200, correct BotFather webhook, owner /start and an end-to-end finance+notes+AI test. Both authorized Windows machines were offline at last inspection. No secrets or historical ledger data on this public PR.
- **Only required owner action:** Run the existing one-line Windows PowerShell bootstrap from `apps/aumyra/README.md` on a trusted laptop with Node LTS and Cloudflare login, or reconnect an authorized RDC laptop so this chat can assist. Supply token in masked local prompt only. Let script discover/create D1; no earlier manual D1 action required.

## 2026-11-14 next release-hardening slice
- **Deploy smoke:** `scripts/postdeploy-smoke.mjs` validates actual HTTPS /health ready, exact @AumyraBot getMe, webhook URL, commands and chat menu after setup, attempts one safe owner-only welcome, and reports delivery separately from Worker readiness. The one-line PowerShell bootstrap runs it automatically. No auto-send from this ChatGPT session.
- **Race fix:** D1 `aumyra_processed_updates` claim now uses INSERT changes to pick one compute winner. Stale unfinished requests are conditionally reclaimed after 60 seconds; reply caching prevents duplicate writes or simultaneous inference. Existing delivery remains best-effort if Telegram sends but DB delivery confirmation fails (Telegram has no idempotency key for sendMessage).
- **Readiness:** all seven required D1 tables checked; SQL smoke exercises atomic claim, composer ordering and soft-void; fake D1 and negative health tests cover missing primary table.
- **Text media:** owner sending voice/photo gets clear text-only instructions; no unapproved media AI processing.
- **Release boundary remains:** neither Cloudflare Worker nor Telegram /start has been observed live. Both RDC machines offline at last check. Only owner can authorize proper Cloudflare account + BotFather token via trusted local installer. Do not deploy other bots or merge draft PR to main as substitute.

## Final reply-delivery reliability step
- Added `0005_delivery_lease.sql`, a non-destructive `delivery_claimed_at` column in `aumyra_processed_updates`. Each sendMessage attempt must atomically obtain a 60-second delivery lease.
- Concurrent retries of a cached answer no longer send Telegram replies simultaneously. Definite Telegram 4xx/5xx rejection releases the lease for retry; ambiguous network failure holds the lease until expiry to avoid rapid duplicates. Telegram still has no exactly-once send guarantee if a response is lost after being accepted.
- GET /health validates the new lease column before declaring ready. Node concurrency and network-failure tests and SQLite migration smoke added. CI #163 green at `3d16391e` before documentation commits.
- Only owner-authorized Cloudflare deployment and real Telegram /start remain outstanding. No live bot activity claimed.

## Release blockers / status honesty
- **Not live verified.** No authenticated Cloudflare account binding in this session. No verified deployed Aumyra Worker or D1.
- Missing verified deployment values: dedicated D1 ID, existing Telegram token, webhook secret, numeric owner Telegram ID, actual Worker HTTPS host, optional AI access.
- Telegram bot currently must be described as **release candidate**, not operating, until real /start and /expense persistence have been tested.
- The repo is public and earlier branch commits may expose removed *savings target examples*, though no actual bank ledgers or secrets were committed. Do not replay these numbers into public docs. Migrate to private repository when available.
- Cloudflare Worker GitHub manual deployment workflow exists **only in draft branch**. It must be reviewed/approved before merge and invocation. Do not merge unrelated staging or homepage changes.

## Live release acceptance
1. Confirm actual Cloudflare worker + dedicated D1 exist, no conflict with other products.
2. Apply all five additive migrations (0001–0005) and configure Worker secrets securely.
3. Deploy, GET /health = 200 with `ready:true`, verify HTTPS, correct path and no redirection errors.
4. Set and inspect Telegram webhook using the verified existing @AumyraBot token, keep pending messages.
5. From owner's Telegram: /start menu, /expense test -> /summary -> /undo, /note -> /notes; unauthorized account must get no private response.
6. Duplicate webhook update must not double-save /expense or double-void /undo.
7. Optional AI chat works after owner approves usage and provider configured. No untested statements of success.

## Handoff protocol
Every agent commits changes and updates `TASKS.md`, this HQ, and issue #22 with verified results and remaining blocker. Keep one actionable owner phone step at a time; report DONE | COMMIT/PR | TESTS | BLOCKER | NEXT ACTION.
