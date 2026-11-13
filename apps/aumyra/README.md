# AUMYRA Telegram personal assistant

Isolated release candidate for @AumyraBot: https://t.me/AumyraBot. The older HERMAYA build used a private historical finance archive, which is not available here. This release does not claim that history is loaded.

## Durable GitHub recovery
New chats should first read [GitHub issue #22](https://github.com/eriklobster/OMLAYER/issues/22), [draft PR #20](https://github.com/eriklobster/OMLAYER/pull/20), [RESTART-HERE.md](RESTART-HERE.md), [PROJECT-HQ.md](PROJECT-HQ.md), and [TASKS.md](TASKS.md). No new chat needs to rediscover the project from zero.

## Features
Owner-only Telegram webhook; concise 4-row iPhone **Chat | Menu / Expense | Income / Summary | History / Notes | Goals** keyboard; /start, /menu, /chat, /help, /status; /income, /expense, /summary, /history, /undo; /note, /notes; /banks. Tap **Expense** or **Income**, then send just `12.50 USDT food coffee` (no slash). Invalid amounts remain editable; `/cancel` exits. `/note` without text opens a one-message note composer. All prompts expire after 15 minutes. Optional AI uses a dedicated D1 conversation table: the **last six exchanges** provide context and /forget clears AI conversation only (not finance or notes). USD, USDT and THB remain separate. Soft-voids preserve audit records, and repeated Telegram update IDs cannot duplicate entries or AI chat turns.

## One-command Windows PowerShell bootstrap (first release)
Requires **Windows PowerShell 5.1+** and **Node.js LTS + npm** installed. The command downloads this exact GitHub PR branch into a *new temporary directory*, then runs the auditable [bootstrap installer](scripts/bootstrap.ps1). It does not require Git, Python, SSH, or Cloudflare API tokens pasted into chat. **Only run the command on a trusted Windows machine with permission to access your Cloudflare account.**

Open Windows **PowerShell** (not the browser JavaScript console), paste this as **one line**, and follow its prompts:

```powershell
$w=Join-Path $env:TEMP ('aumyra-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory $w | Out-Null;Invoke-WebRequest 'https://github.com/eriklobster/OMLAYER/archive/refs/heads/feat/aumyra-assistant-mvp.zip' -OutFile "$w\src.zip";Expand-Archive "$w\src.zip" -DestinationPath "$w\repo";$a=(Get-ChildItem "$w\repo" -Directory | ForEach-Object {Join-Path $_.FullName 'apps\aumyra'} | Where-Object {Test-Path $_} | Select-Object -First 1);if(-not $a){throw 'Source folder not found'};Set-Location $a;powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

Prompts/settings: confirm correct Cloudflare account after Wrangler login; paste the **existing @AumyraBot BotFather API token** into a masked local prompt; supply your own numeric Telegram ID (obtain from @userinfobot), confirm if reusing an existing Aumyra database; optionally enable **billable** Cloudflare Workers AI with explicit YES. The installer securely sends secrets to the **dedicated** Aumyra Worker, patches local Wrangler config only, migrates dedicated D1, deploys, requires HTTP /health ready, registers webhook only after getMe identity verification, and confirms Telegram commands and menu via the API. It does not touch OMLAYER Pages, ROAMDOTS, or other bots. It does not download the old HERMAYA finance archive.

**After installer success:** From your owner Telegram account, send `/start` to [@AumyraBot](https://t.me/AumyraBot), then `/note hello` and `/notes`. Tap **Expense**, then send `12.50 USDT food coffee`; check Summary and `/undo` the test entry. Tap **Chat** to send ordinary questions (only works after opting into AI), **Menu** to restore controls, and use `/forget` to clear AI history. Report any error output **with token values hidden**; never send or screenshot the token/secret.

## Live deployment smoke and reliability
The one-line installer now runs `scripts/postdeploy-smoke.mjs` after registering the webhook. It checks HTTPS `/health`, the exact @AumyraBot identity, Telegram webhook target, command menu and chat menu, then attempts an owner-only Telegram welcome message. If that welcome is accepted, it also sends one authenticated **synthetic `/start`** through the deployed Worker, requiring an actual Telegram API-accepted reply and sending the owner the real Chat/Menu keyboard. This does not add transactions or notes. It does **not** prove that Telegram itself delivered an incoming webhook; owner `/start` on iPhone remains the last acceptance gate. If Telegram has not yet permitted the bot to message you, the script reports `ownerNotification:not_delivered`; open the bot and send `/start`. A welcome message by itself is **not** proof that incoming `/start` and database writes work.

Webhook retries use an atomic D1 claim and conditional lease recovery to prevent simultaneous inference or duplicate expense records. A separate delivery lease reduces simultaneous duplicate Telegram replies. Telegram sendMessage cannot guarantee exactly-once delivery if a network failure occurs after a message is delivered; live retries must still be observed. Health returns ready only when every required D1 table exists. Photos and voice currently receive a clear text-only notice rather than being silently treated as chat.

## Release gates
1. In Cloudflare, inspect Workers and D1. Reuse the **existing Aumyra** resource if present; never touch ROAMDOTS or another project's database. Otherwise create a D1 named aumyra using `npx wrangler d1 create aumyra`.
2. Edit `wrangler.toml` locally: replace `REPLACE_WITH_AUMYRA_D1_ID` with the *dedicated* database ID; never publish sensitive customer data here.
3. Run `npm install` and `npm test` from `apps/aumyra`.
4. Run `npx wrangler d1 migrations list aumyra --remote`, inspect all five migrations: `0001_init.sql`, `0002_undo_journal.sql`, `0003_ai_history.sql`, `0004_compose_modes.sql`, and `0005_delivery_lease.sql`, then apply only to dedicated Aumyra D1 with `npx wrangler d1 migrations apply aumyra --remote`. If migrating an existing database, confirm its D1 Time Travel recovery coverage beforehand; do not assume applying a migration is reversible by default.
5. Set these Worker **secrets** privately: `TELEGRAM_BOT_TOKEN` (reuse existing @AumyraBot BotFather token), `TELEGRAM_WEBHOOK_SECRET` (random 1–256 [A-Za-z0-9_-]), `TELEGRAM_OWNER_ID` (numeric Telegram ID). Use `npx wrangler secret put SECRET_NAME` or Cloudflare dashboard. Do not paste secrets in GitHub or chat.
6. Optionally set `BANK_PLAN_JSON` as a Worker secret containing a JSON object of private savings targets; do not publish personal figures in source. Deploy with `npx wrangler deploy`. Use the actual returned Worker URL, not a guessed domain. Confirm HTTPS GET `/health` returns status 200 and `ready:true` **only after all five migrations and Worker secrets are configured**.
7. Set token and webhook secret as local shell environment variables, then run `node scripts/setup-webhook.mjs https://ACTUAL-WORKER-HOST/telegram/webhook`. This configures Telegram webhook, commands and menu without dropping pending messages.
8. From owner Telegram chat, test `/start`, tap Expense → send `12.50 USDT food lunch` → `/summary` → `/undo`, `/note` → send `buy coffee` → `/notes`, AI text, `/forget`, and a non-owner request. Verify duplicate delivery does not duplicate a finance entry.
9. Reconcile the original private archive only after recovering the source package and validating a database backup; never invent missing transactions.

## Optional AI — explicit usage authorization
Without an AI provider, financial commands and notes work; free text explains that AI is not configured. Enable one provider intentionally (inference can be billable):
- Cloudflare AI: add `[ai]` then `binding = "AI"` on the next line of `wrangler.toml` and redeploy. The Worker uses @cf/google/gemma-4-26b-a4b-it.
- OpenAI: add Worker secret `OPENAI_API_KEY`. The verified default is `gpt-4o-mini` and can be overridden with `OPENAI_MODEL`. This secret is never shown in bot responses.

## GitHub workflow
After approval and merge to the default branch (where GitHub exposes manual workflows), the manually triggered `Aumyra manual Cloudflare deploy` workflow can migrate and deploy the dedicated Worker using encrypted GitHub secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `AUMYRA_D1_DATABASE_ID`. Telegram secrets still must be set separately on the Worker. This workflow only targets the dedicated Aumyra Worker/D1 but merging the branch may trigger unrelated OMLAYER site CI; review that release boundary first. It does not by itself register a Telegram webhook.

## Boundaries
This repository is public, so move the assistant to a dedicated private repository when practical. Only code and schema belong here. CI success is not proof of live Telegram operation.
