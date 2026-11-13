# AUMYRA — RESTART HERE (ChatGPT rebirth handoff)

**Canonical GitHub HQ:** https://github.com/eriklobster/OMLAYER/issues/22  
**Implementation draft PR:** https://github.com/eriklobster/OMLAYER/pull/20  
**Branch:** `feat/aumyra-assistant-mvp` (NOT `main`)  
**Root source:** `apps/aumyra/`  
**Original assistant name:** HERMAYA → OMYRA → AUMYRA, Telegram handle @AumyraBot.

## First actions for any new agent/chat
1. Connect GitHub and read issue #22, PR #20, this file, `PROJECT-HQ.md`, `TASKS.md`, latest branch commit, open PR comments, and CI result. Recover state **before** writing new files or opening additional PRs.
2. Keep all Aumyra code changes on PR #20 branch or a separate named feature branch with explicit handoff to #20. **Do not** touch ROAMDOTS, Ocean Cafe, Ocean Kids Club, OMLAYER website deployment, other Telegram webhooks, or unrelated branches.
3. Continue the highest-priority unchecked task in `TASKS.md`. Implement, run Node tests + GitHub Actions, commit, update HQ/tasks, then update issue #22 with concrete progress. No repetitive setup loops.
4. Only declare production operational after verified Cloudflare HTTPS health, Telegram webhook info, and real owner /start + finance persistence and AI tests. No guesswork about hostname or secrets.

## Completed and proven
- A code-only personal Telegram assistant built for Cloudflare Workers/D1.
- Guard: exact private chat and owner's numeric Telegram user/chat ID plus Telegram webhook secret header.
- Private 4-row keyboard: Chat/Menu, Expense/Income, Summary/History, Notes/Goals; owner-only commands /start /menu /chat /help /status /banks /expense /income /summary /history /undo /note /notes /cancel /forget. Optional AI uses last six turns from D1.
- D1 forward-only SQL migrations:
  - `migrations/0001_init.sql`: owner finance, notes, processed updates;
  - `migrations/0002_undo_journal.sql`: idempotent /undo target journal;
  - `migrations/0003_ai_history.sql`: conversation turns and /forget replay journal;
  - `migrations/0004_compose_modes.sql`: one-tap expense/income/note input mode and 15-minute timeout;
  - `migrations/0005_delivery_lease.sql`: safe Telegram reply-delivery lease for concurrent retries.
- Replay-safe transaction writes; Telegram reply caching; current AI fallback model `gpt-4o-mini` (or opt-in Cloudflare Workers AI `@cf/google/gemma-4-26b-a4b-it`).
- Telegram webhook script validates BotFather token's getMe.username == `aumyrabot` **before** updating webhooks, then verifies getWebhookInfo, getMyCommands, getChatMenuButton. Mocked negative-token/unsafe-URL tests pass.
- Latest verified CI before handoff edits: GitHub Actions #121 at `4ee7c88f`: **success**, Node bot + webhook setup tests, all four SQL migrations, PowerShell parser and Wrangler dry-run. Read latest CI again because later commits supersede this checkpoint.

## Latest release-hardening checkpoint
- Atomic webhook processing claim prevents parallel Telegram deliveries from writing duplicate expenses or invoking AI twice; conditional 60-second lease supports crashed-request recovery.
- Separate Telegram reply-delivery lease blocks simultaneous duplicate sendMessage attempts. Network acknowledgement loss may still cause later retry; no guarantee of exactly-once external delivery.
- Health verifies all required D1 tables and the new delivery lease column; production setup automatically runs a non-destructive smoke test of HTTPS health, webhook identity, command menu and best-effort owner welcome.
- **CI #163 passed** at `3d16391e` after delivery-lease code fix; confirm newest CI after documentation commits before release.
- Cloudflare Worker and Telegram bot have **not** been verified live. No assumption about worker hostname, secret existence, owner Telegram ID or historical finance import.

## 2026-11-14 release reliability follow-up
- A safe postdeploy synthetic `/start` is sent directly to the dedicated Worker **only after** getMe validates @AumyraBot, HTTPS /health is ready, Telegram webhook/menu are verified and the owner can receive Telegram messages. Request carries local `TELEGRAM_WEBHOOK_SECRET`, negative test-only update ID, and no finance action. Worker must return `delivered`, confirming an actual sendMessage result. This does **not** verify a real Telegram-originated /start: owner iPhone test remains required.
- GitHub CI now uses one `pull_request` run per change, cancels superseded checks, and never automatically deploys.
- Existing dedicated D1 export safety: installer saves a full remote SQL dump locally in `%USERPROFILE%\\AUMYRA-backups` **before** any remote schema migration, fails closed on invalid/empty export, and never uploads it. New D1 creation skips backup. Preserve these private files.
- Verified tests: CI #182 success at `5bf3b5ac` including installer syntax/backup presence, simulated Telegram, D1 schema smoke and Worker build. Newer docs commits require latest CI check before release.

## What is *not* done
- No verified Aumyra production Worker URL. Do not assume `aumyra.omlayer.com` exists.
- No verified dedicated Aumyra D1 ID, Worker binding or production migrations.
- No verified `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, or `TELEGRAM_OWNER_ID` in Cloudflare account.
- No observed Telegram /start reply from owner iPhone, no real persistence, no confirmed live AI completion.
- Older HERMAYA local import archive is unavailable; no historical transactions have been brought into this Worker. Earlier private import counts should not be taken as independently verified by this repo.
- Source currently lives in public OMLAYER code repo; avoid ever adding tokens, finances, balances, private user IDs, or data exports to GitHub. Historic commits may contain previously removed personal *target* values; avoid reposting them.

## Deployment instructions (once owner enables authenticated Cloudflare controls)
- Confirm Cloudflare account and whether `aumyra` Worker/D1 **already exist**. Never create duplicates without inspection.
- D1 must be dedicated to Aumyra; insert its ID into the Wrangler config locally or via encrypted GitHub secret `AUMYRA_D1_DATABASE_ID` (manual deploy workflow).
- Run `npm install`, `npm test`, `npx wrangler d1 migrations list aumyra --remote`, `npx wrangler d1 migrations apply aumyra --remote`, `npx wrangler deploy`, from `apps/aumyra`.
- Configure existing BotFather token and unique webhook secret privately using Cloudflare dashboard/CLI; set numeric Telegram owner ID. Never paste secrets into chat, PR, issues, or commit. Set `BANK_PLAN_JSON` only in encrypted Worker secret if private savings goals are needed.
- Optional AI requires separately authorized usage/billing: Cloudflare `AI` binding OR `OPENAI_API_KEY` Worker secret. No provider means finance/notes still operate; chat text reports unconfigured AI.
- Run `node scripts/setup-webhook.mjs https://ACTUAL_WORKER_HOST/telegram/webhook` with local shell token+secret env only, not command-line literal tokens; this does not drop pending Telegram messages.
- Real acceptance: health HTTP 200; getWebhookInfo URL equals actual URL; send /start and see menu; /expense 12.50 USDT qa test → /summary → /undo; /note QA → /notes; repeat update ID creates one entry; owner-only controls; AI query with configured provider. Clean up test finance entries by voiding, not destroying ledger.
- Avoid merging deploy workflow into OMLAYER main until release owner has assessed website deployment side effects and appropriate owner approvals; the PR is draft.

## Owner intervention
Ask for **one action at a time**, primarily phone-friendly:
1. On a trusted Windows laptop with Node.js LTS, run the **one-line PowerShell command in `apps/aumyra/README.md`**. It verifies correct Cloudflare account and BotFather token, finds/creates dedicated D1, applies all migrations, deploys, prompts for Worker secrets privately, verifies /health, and registers Telegram webhook/menu. Alternatively reconnect an authorized Remote Desktop Commander laptop for assisted deployment.
2. After the installer reports success, from owner Telegram send `/start`, tap Expense then enter a synthetic amount, inspect Summary and `/undo`; use `/note` and `/notes`; test Chat after explicitly enabling AI and `/forget` to clear history.
Do not ask for Cloudflare manual D1 creation separately if the one-line bootstrap can do it.

## Useful command to start a fresh ChatGPT chat
> Continue AUMYRA MVP from GitHub issue eriklobster/OMLAYER#22 and PR #20. Read apps/aumyra/RESTART-HERE.md, PROJECT-HQ.md, TASKS.md and latest CI, then perform highest-priority unfinished implementation, test and commit. No other bot/domain changes, no secrets, no fabricated live status. Report DONE | COMMIT/PR | TESTS | BLOCKER | NEXT ACTION.
