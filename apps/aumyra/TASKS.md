# AUMYRA — TASKS / release board
Updated 2026-11-14. Restart: [permanent issue #22](https://github.com/eriklobster/OMLAYER/issues/22) → [draft PR #20](https://github.com/eriklobster/OMLAYER/pull/20) → `RESTART-HERE.md` → `PROJECT-HQ.md`.

## P0 — safe Telegram release, no other app changes
- [x] Recover previous AUMYRA/HERMAYA history, name, and confirmed external source limitations.
- [x] Create persistent GitHub HQ issue #22 and new-chat recovery file.
- [x] Implement Worker webhook with owner and webhook-secret verification.
- [x] Add working /start, /menu, /help, /status, /income, /expense, /summary, /history, /undo, /note, /notes, /banks, AI fallback.
- [x] Add six forward-only D1 migrations: finance/notes, /undo journal, AI conversation reset, guided-input composer, Telegram delivery lease and native widget reply kind.
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
- [x] On authenticated deployment, exercise synthetic owner-only `/start` against the actual Worker with local webhook secret, assert Telegram-accepted reply and real keyboard; test failure and non-owner chat boundaries. This is not a substitute for owner iPhone `/start`.
- [x] Optimize Aumyra CI to one pull_request run per commit, cancel obsolete in-flight checks; manual workflow_dispatch retained; no auto deploy.
- [ ] **LIVE RELEASE:** Verify actual owner /start reply + D1 persistence + user-facing AI response after bot provisioning. Passing CI alone is not a live bot.
- [x] Export existing Aumyra D1 SQL locally before any remote migration; fail closed if backup missing or empty. Do not copy private data to public GitHub; skip only for newly created empty D1. Wrangler command documented in official Cloudflare D1 reference.
- [x] Integrate Bot API 10.4 native Telegram message widget: /app and App button, theme-adaptive 2-column dashboard, owner-private widget_query answer handler, readonly Summary/History/Notes/Goals, clear instructions for Chat/Expense/Income.
- [x] Add `0006_widget_reply_kind.sql` for replay-safe sendWidget vs sendMessage delivery. Keep private finance and notes untouched.
- [x] Register `/app` and `widget_query` in webhook allowed_updates, test BotFather integration, widget HTML raw+zlib limits, disabled wallet/payment paths, unauthorized query rejection, no ledger mutations, and native sendWidget retry dedupe.
- [x] Extend signed production smoke with synthetic `/app`, reporting `widgetProbe` separately from core Telegram readiness. CI #196 success at `fbbe4433` before handoff changes.
- [x] Security harden Bot API 10.4 widget queries: reject signed/TON transaction types and wallet-card query events, require original private message context, strict 64-byte command allowance, preserve read-only finance access.
- [x] Auto-load Thailand-local Today view once when an AUMYRA private widget appears (no polling); correct UTF-8 boundary truncation for Thai/emoji; expose Today and Status in 10-button native dashboard.
- [x] Implement /today as a Thailand UTC+07:00 daily ledger report grouped by currency and entry type; exclude voided transactions, archived history and invented spendable bank balances. Add Today Telegram keyboard button, BotFather command and real SQLite timezone rollover smoke test.
- [x] Recovered exact PR #20 head `541f57c6`: CI #213 SUCCESS; original 51 tests passed locally before changes. New scoped branch tests are listed below.
- [ ] **LIVE WIDGET ACCEPTANCE:** from the real owner Telegram app tap App, verify widget renders, Summary loads, keyboard fallback works, owner-only access holds; do not assume rollout to all clients or use wallet/payments.
- [ ] **P0 OWNER ACCESS:** Run the single Windows PowerShell bootstrap from README on correct authenticated Cloudflare account (or bring an authorized RDC laptop online). Script automatically finds or creates dedicated `aumyra` D1; no token may be sent to GitHub or chat.
- [ ] Identify dedicated D1 ID and configure Worker binding securely; inspect 0001–0006 before remote migration.
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

## Three coordinated queues — 2026-11-15
**Canonical coordination:** [AUMYRA HQ #22](https://github.com/eriklobster/OMLAYER/issues/22). This file = **Development / implementation** lane. [ChatGPT Work queue #25](https://github.com/eriklobster/OMLAYER/issues/25) = connected services, multi-step work and acceptance support. [Simple Chat queue #26](https://github.com/eriklobster/OMLAYER/issues/26) = decisions, copy, planning and observations. Never duplicate ownership; hand off with a link.

### P0 — Development lane: highest priority first
- [ ] Verify newest head CI, current branch SHA, deploy workflow gating, and six D1 migration compatibility; report verified details, not prior historical CI as current.
- [ ] Safely determine authorized Cloudflare account and whether dedicated Aumyra Worker/D1 already exist; inspect before any creation. A device being online does not establish Cloudflare login.
- [x] Audited Windows installer: interactive browser/prompts, NOT safe on Seashell. Added explicit background refusal and mandatory release lease. No remote execution attempted.
- [ ] On explicit authenticated Cloudflare access, create/reuse only dedicated Aumyra resources, export old D1 before migration, verify migration 0001–0006, deploy Worker, /health, webhook identity, signed /start and /app smoke.
- [ ] Verify **real owner Telegram** /start→Expense→Today→Summary→Undo and Note→Notes, native App rendering, non-owner access rejection, duplicate suppression, AI only after approved provider/budget; record device test in HQ.
- [ ] Complete production release gate only after real HTTPS, D1, Telegram, and iPhone acceptance. Do not silently merge PR #20 or alter unrelated apps.

### P1 — Development feature backlog (planned, not shipped)
- [ ] Implement secure private configurable bank allocations (living, dedicated rent sink, donations, immediate, project savings) with effective dates and noninvented balances.
- [ ] Add per-bank goals, transfers and budget-vs-actual/overrun views; keep currencies separate and distinguish cashback from new earned income.
- [ ] Add transaction correction, category filters, recurring expenses, CSV export and optional import with preview/deduplication/rollback.
- [ ] Add configurable purchase cooling-off and multi-seller comparison reminders; no automatic spending.
- [ ] Add private project/tasks dashboard with one owner, status, priority, next action, linked PR/tests, blocker and percentage denominator.
- [ ] Implement safe read-only integrations with GitHub and approved Google Drive content; do not scrape private data or store tokens in repository.
- [ ] Add opt-in reminders/digests only with a verified scheduler, stop/cancel tracking and explicit destination.
- [ ] Design privacy-preserving assistant memory and chat history controls (review, correction, export, deletion) before persistent expansion.
- [ ] Provide resilient Telegram keyboard/widget fallbacks and accessible mobile-first layout; test real iPhone compatibility before marking.
- [ ] Evaluate opt-in photo/receipt parsing and voice transcription, with cost/accuracy/privacy limits and explicit owner approval before activation.
- [ ] Add private diagnostics, alarms, retry/replay audit and backup/restore rehearsal for real deployment.
- [ ] Plan authentication-scoped action connectors for approved tasks; require explicit confirmation for external communication or irreversible changes.

### P2 — not authorized / not release blockers
- [ ] Consider Telegram native widget payments, Stars, sharing, referrals or wallet functions **only** after security review and explicit owner decision; all OFF by default.
- [ ] Consider richer companion persona, multimodal AI and calendar routines only after core private bot is live and measured.

### Cross-chat status protocol
For each task, track `OWNER | STATUS (TODO / IN PROGRESS / BLOCKED / DONE / STOPPED / CANCELED) | EVIDENCE (commit, test, link) | NEXT ACTION`. Only one lane owns a task. Failed/interrupted calls are not DONE; record blocker and retry/resume point. Update HQ #22 and the relevant queue after a substantive batch; don't replace another lane's status. Three chats cannot directly message one another; GitHub is the shared asynchronous log. Seashell device alias is canonical, but connectivity/active execution must be verified separately. Work only in this session when invoked; online status is not an always-running job.

## Active Work implementation batch — 2026-11-15
Owner: `Work-20261115-autonomous`. Branch: `work/aumyra-coordination-20261115` (handoff into #20).
- [x] Implement atomic GitHub claims, three lanes, meaningful heartbeats, 45-minute inspected takeover, immutable stop/cancel, idempotent public events and shared production lock.
- [x] Fix cached `/app` media type on lost-insert race; test against actual SQLite rather than only SQL mocks.
- [x] Add restore-verified encrypted pre-migration backup and fail-closed release identity/locking; keep six SQL migrations unchanged.
- [ ] Persist and verify real GitHub coordinator state and CLI handoff; record commit/CI in #22.
- [ ] Finish authenticated Cloudflare production release, real Telegram replies, D1 persistence and iPhone widget acceptance. BLOCKED: private sign-in not completed.
- [ ] Install unattended runner only after silent execution, stop and recovery are verified. NOT RUNNING; ready single-shot coordinator is not an agent daemon.
- [ ] Optional LAN notes/tasks/outbox: implement separately after release preparation; no production dependency.
