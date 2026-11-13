# AUMYRA — TASKS / release board
Updated 2026-11-14. Restart: [permanent issue #22](https://github.com/eriklobster/OMLAYER/issues/22) → [draft PR #20](https://github.com/eriklobster/OMLAYER/pull/20) → `RESTART-HERE.md` → `PROJECT-HQ.md`.

## P0 — safe Telegram release, no other app changes
- [x] Recover previous AUMYRA/HERMAYA history, name, and confirmed external source limitations.
- [x] Create persistent GitHub HQ issue #22 and new-chat recovery file.
- [x] Implement Worker webhook with owner and webhook-secret verification.
- [x] Add working /start, /menu, /help, /status, /income, /expense, /summary, /history, /undo, /note, /notes, /banks, AI fallback.
- [x] Add five forward-only D1 migrations: finance/notes, /undo journal, AI conversation reset, guided-input composer, and Telegram delivery lease.
- [x] Require migrated D1 schema in HTTP /health readiness.
- [x] Implement Telegram getMe identity check before modifying webhook, then verify getWebhookInfo.
- [x] Validate Node tests and SQL migrations in GitHub Actions. CI #121 success on SHA `4ee7c88f` with behavior tests, schema smoke and Wrangler dry-run. Recheck latest after handoff changes.
- [x] Keep personal finance values/credentials out of the current code; targets are private `BANK_PLAN_JSON`.
- [x] Add Windows PowerShell one-command bootstrap (`scripts/bootstrap.ps1`) to discover/create dedicated D1, migrate, deploy, set secret prompts privately, verify health, then register webhook. Document one-liner in README. Static parser CI added; verify latest run before claiming pass.
- [x] Add accessible iPhone Telegram reply keyboard with functional Chat, Menu, Expense, Income, Summary, History, Notes, Goals controls. Register /chat; verify owner-only button handlers and Telegram retry idempotency.
- [x] Add optional AI chat short-term context (last six turns), duplicate-replay cache, /forget with stable reset journal and additive migration `0003_ai_history.sql`. Require migrated tables in health. CI #92 passed at `f9b7b2b0` before latest documentation changes.
- [x] Add one-tap guided Expense/Income and /note input modes, 15-minute expiry, safe /cancel, replay ordering and migration `0004_compose_modes.sql`; validate with CI.
- [x] Refactor Telegram webhook setup to verify getMe identity before changing bot, assert getWebhookInfo, getMyCommands and getChatMenuButton after configuration; add tests rejecting wrong tokens and malformed URL.
- [x] Patch temporary D1 UUID in first-run PowerShell installer so Wrangler can discover/create a new database without malformed config.
- [x] Add importable non-destructive post-deploy smoke (`scripts/postdeploy-smoke.mjs`) validating Worker /health, exact @AumyraBot webhook/menu/commands and a best-effort owner welcome without altering finance.
- [x] Eliminate concurrent webhook read/insert race with atomic D1 update claim, conditional 60-second stale lease recovery, and retry tests; extend real SQLite CI smoke for lease, composer ordering and soft-void.
- [x] Require all seven D1 tables for health readiness and test missing-table refusal; show explicit text-only media fallback for unsupported voice/photo.
- [x] Add conditional reply-delivery lease (0005) and tests for simultaneous cached-answer retries, explicit Telegram failures and ambiguous network outcomes. Exact-once delivery across unknown network failures is not guaranteed.
- [ ] **LIVE RELEASE:** Verify actual owner /start reply + D1 persistence + user-facing AI response after bot provisioning. Passing CI alone is not a live bot.
- [ ] **P0 OWNER ACCESS:** Run the single Windows PowerShell bootstrap from README on correct authenticated Cloudflare account (or bring an authorized RDC laptop online). Script automatically finds or creates dedicated `aumyra` D1; no token may be sent to GitHub or chat.
- [ ] Identify dedicated D1 ID and configure Worker binding securely; inspect 0001–0005 before remote migration.
- [ ] Configure existing @AumyraBot Telegram BotFather token, webhook secret, numeric owner ID in Worker **private secrets** (not chat or repo).
- [ ] Deploy dedicated Worker, verify HTTPS GET /health = 200 `ready:true`, and save verified Worker URL in this HQ (public host is safe, tokens are not).
- [ ] Run verified Telegram setup script with existing bot token, check Telegram getWebhookInfo URL, delivery errors and pending updates.
- [ ] **LIVE ACCEPTANCE:** From owner device: /start → /expense synthetic → /summary → /undo → /note → /notes; test duplicate updates and non-owner denial; reconcile test ledger.
- [ ] Choose optional AI inference provider and budget; configure only with owner approval and verify a real text answer.
- [ ] Mark released only once HTTP, Telegram and database user flows all pass.

## P1 — privacy and recovery
- [ ] Move bot source into a dedicated **private** GitHub repository when owner supplies it; keep PR #20 as source until then.
- [ ] Recover original HERMAYA historical private archive, back up destination, dry-run any import, compare counts, avoid duplicates; no synthetic historical data.
- [ ] Check public Git history exposure of earlier removed example savings targets; owner to decide on history cleanup rather than force push.
- [ ] Improve deployment automation only when Cloudflare permissions and production release boundaries are verified.

## Agent rules
Work on `feat/aumyra-assistant-mvp` (PR #20) or a scoped branch with explicit handoff. No unapproved bot token changes, DNS changes, deletes, resets, or unrelated merges. At end of every sprint, update issue #22 and HQ with actual commit, passing CI, blocker, and next single owner action.
