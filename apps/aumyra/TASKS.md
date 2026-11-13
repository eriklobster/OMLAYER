# AUMYRA — TASKS / release board
Updated 2026-11-13. Restart: [permanent issue #22](https://github.com/eriklobster/OMLAYER/issues/22) → [draft PR #20](https://github.com/eriklobster/OMLAYER/pull/20) → `RESTART-HERE.md` → `PROJECT-HQ.md`.

## P0 — safe Telegram release, no other app changes
- [x] Recover previous AUMYRA/HERMAYA history, name, and confirmed external source limitations.
- [x] Create persistent GitHub HQ issue #22 and new-chat recovery file.
- [x] Implement Worker webhook with owner and webhook-secret verification.
- [x] Add working /start, /menu, /help, /status, /income, /expense, /summary, /history, /undo, /note, /notes, /banks, AI fallback.
- [x] Add two forward-only D1 migrations with processed update idempotency and /undo journal.
- [x] Require migrated D1 schema in HTTP /health readiness.
- [x] Implement Telegram getMe identity check before modifying webhook, then verify getWebhookInfo.
- [x] Validate Node tests and SQL migrations in GitHub Actions. CI #44 success at SHA `e7568a555a5a0ce77d03bbccbe6cc09db8a1c0b0`. Recheck CI after later commits.
- [x] Keep personal finance values/credentials out of the current code; targets are private `BANK_PLAN_JSON`.
- [x] Add Windows PowerShell one-command bootstrap (`scripts/bootstrap.ps1`) to discover/create dedicated D1, migrate, deploy, set secret prompts privately, verify health, then register webhook. Document one-liner in README. Static parser CI added; verify latest run before claiming pass.
- [x] Add accessible iPhone Telegram reply keyboard with functional Chat, Menu, Expense, Income, Summary, History, Notes, Goals controls. Register /chat; verify owner-only button handlers and Telegram retry idempotency.
- [x] Add optional AI chat short-term context (last six turns), duplicate-replay cache, /forget with stable reset journal and additive migration `0003_ai_history.sql`. Require migrated tables in health. CI #92 passed at `f9b7b2b0` before latest documentation changes.
- [ ] **P0 OWNER ACCESS:** Confirm correct authenticated Cloudflare account and whether D1 database `aumyra` exists. Avoid creating duplicates.
- [ ] Identify dedicated D1 ID and configure Worker binding securely; inspect 0001 + 0002 before remote migration.
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
