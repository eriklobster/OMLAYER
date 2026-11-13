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
- /start /menu /help /status /banks (private targets) /expense /income /summary /history /undo /note /notes; optional AI text.
- D1 forward-only SQL migrations:
  - `migrations/0001_init.sql`: owner finance, notes, processed updates;
  - `migrations/0002_undo_journal.sql`: idempotent /undo target journal.
- Replay-safe transaction writes; Telegram reply caching; current AI fallback model `gpt-4o-mini` (or opt-in Cloudflare Workers AI `@cf/google/gemma-4-26b-a4b-it`).
- Telegram webhook script validates BotFather token's getMe.username == `aumyrabot` before updating webhooks and verifies actual getWebhookInfo afterwards.
- GitHub Actions `Aumyra MVP tests` run #38 on commit `12417330fcc48fb179a9c08380abac4095eaab94`: **success**, including Node tests and both SQL migrations. Read latest CI again because later commits supersede this checkpoint.

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
1. Open Cloudflare dashboard → D1 and confirm whether `aumyra` database exists.
2. If not, create dedicated D1. If yes, identify database safely without sharing credentials.
3. Configure Worker secrets using authenticated dashboard (do not give values to assistant).
4. Deploy and test.

## Useful command to start a fresh ChatGPT chat
> Continue AUMYRA MVP from GitHub issue eriklobster/OMLAYER#22 and PR #20. Read apps/aumyra/RESTART-HERE.md, PROJECT-HQ.md, TASKS.md and latest CI, then perform highest-priority unfinished implementation, test and commit. No other bot/domain changes, no secrets, no fabricated live status. Report DONE | COMMIT/PR | TESTS | BLOCKER | NEXT ACTION.
