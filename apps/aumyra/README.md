# AUMYRA Telegram personal assistant

Isolated release candidate for @AumyraBot: https://t.me/AumyraBot. The older HERMAYA build used a private historical finance archive, which is not available here. This release does not claim that history is loaded.

## Durable GitHub recovery
New chats should first read [GitHub issue #22](https://github.com/eriklobster/OMLAYER/issues/22), [draft PR #20](https://github.com/eriklobster/OMLAYER/pull/20), [RESTART-HERE.md](RESTART-HERE.md), [PROJECT-HQ.md](PROJECT-HQ.md), and [TASKS.md](TASKS.md). No new chat needs to rediscover the project from zero.

## Features
Owner-only Telegram webhook; concise 4-row iPhone **Chat | Menu | App / Expense | Income / Today | Summary | History / Notes | Goals** keyboard; /start, /menu, /chat, /help, /status; /income, /expense, /today, /summary, /history, /undo; /note, /notes; /banks. Tap **Expense** or **Income**, then send just `12.50 USDT food coffee` (no slash). Invalid amounts remain editable; `/cancel` exits. `/note` without text opens a one-message note composer. All prompts expire after 15 minutes. Optional AI uses a dedicated D1 conversation table: the **last six exchanges** provide context and /forget clears AI conversation only (not finance or notes). USD, USDT and THB remain separate. Soft-voids preserve audit records, and repeated Telegram update IDs cannot duplicate entries or AI chat turns.

## Telegram Bot API 10.4 native message App (November 9, 2026)
AUMYRA now supports **native Telegram Widgets**, not browser-based Mini Apps. Tap **App** in the existing Telegram reply keyboard or send `/app`: the bot calls `sendWidget` in your private chat. The message displays a self-contained, theme-adaptive 2-column control panel: **Today / Summary / History / Notes / Goals / Status / New expense / New income / Chat / Help**.

- Buttons issue `TelegramWidget.request(data)` directly in Telegram. The Worker answers owner-verified `widget_query` updates using `answerWidgetQuery`. Today/Summary/History/Notes/Goals/Status are **read-only** views of the existing private D1 database. Expense/Income and Chat show instructions to use the existing chat keyboard (no text input is available inside native widgets).
- `src/widget.mjs` has no network calls, external assets, payments, tokens or wallet access. CI enforces the 32 KB raw / 4 KB zlib compressed limit and a fixed allowlist of read-only actions. The optional app does not expose finance data to other users; only a verified owner and owner-private chat can query. Wallet signature or transaction event types are rejected even if they carry a valid dashboard action name.
- Telegram currently enables this on production **private bot chats only**; group/forward/inline widgets are test-server only. Older clients can use the existing `/menu`, Chat and finance buttons. A native widget is not proof that the bot is deployed or that an iPhone client supports it.
- Additive migration `0006_widget_reply_kind.sql` persists `reply_kind` so Telegram update retries send the correct media type; previous ledger rows, notes and AI conversations are preserved. `/health` rejects an unmigrated Worker. The post-deploy smoke optionally sends signed synthetic `/app` after `/start` to test `sendWidget` and reports `widgetProbe` separately from core readiness.
- **Payments and wallet actions are not enabled.** The existing owner-only finance ledger is accounting, not a payment checkout.

Official docs: https://core.telegram.org/bots/widgets and https://core.telegram.org/bots/api#sendwidget

## Guarded interactive Windows bootstrap
Requires Node.js 22+ and Windows PowerShell 5.1+. Use the reviewed source checkout and `scripts/bootstrap.ps1`; read [COORDINATION.md](COORDINATION.md) and claim the exclusive `aumyra-release` resource first. Supply `AUMYRA_RELEASE_TASK`, `AUMYRA_RELEASE_OWNER` and a scoped GitHub token through the private process environment. The installer now fails closed without that lease.

**This installer opens browser/login prompts and is NOT permitted on Seashell under the strict screen rule.** `-NonInteractive` and `AUMYRA_BACKGROUND=1` explicitly refuse execution. A hidden PowerShell flag does not make interactive child processes safe. Use the cloud session/manual workflow after private authorization instead.

Existing dedicated D1 is exported privately before migration and the SQL is restored into local SQLite to validate it. No live database has been backed up by this session. Local backups must remain private and be durably preserved off a temporary compute device before depending on them. Six reviewed migrations remain unchanged. Secrets are entered only in local masked prompts; optional billable AI is skipped unless explicitly approved.

## Live deployment smoke and reliability
The guarded installer runs `scripts/postdeploy-smoke.mjs` after registering the webhook. It checks HTTPS `/health`, the exact @AumyraBot identity, Telegram webhook target, command menu and chat menu, then attempts an owner-only Telegram welcome message. If that welcome is accepted, it also sends one authenticated **synthetic `/start`** through the deployed Worker, requiring an actual Telegram API-accepted reply and sending the owner the real Chat/Menu keyboard. This does not add transactions or notes. It does **not** prove that Telegram itself delivered an incoming webhook; owner `/start` on iPhone remains the last acceptance gate. If Telegram has not yet permitted the bot to message you, the script reports `ownerNotification:not_delivered`; open the bot and send `/start`. A welcome message by itself is **not** proof that incoming `/start` and database writes work.

Webhook retries use an atomic D1 claim and conditional lease recovery to prevent simultaneous inference or duplicate expense records. A separate delivery lease reduces simultaneous duplicate Telegram replies. Telegram sendMessage cannot guarantee exactly-once delivery if a network failure occurs after a message is delivered; live retries must still be observed. Health returns ready only when every required D1 table exists. Photos and voice currently receive a clear text-only notice rather than being silently treated as chat.

## Release gates
1. In Cloudflare, inspect Workers and D1. Reuse the **existing Aumyra** resource if present; never touch ROAMDOTS or another project's database. Otherwise create a D1 named aumyra using `npx wrangler d1 create aumyra`.
2. Edit `wrangler.toml` locally: replace `REPLACE_WITH_AUMYRA_D1_ID` with the *dedicated* database ID; never publish sensitive customer data here.
3. Run `npm install` and `npm test` from `apps/aumyra`.
4. Run `npx wrangler d1 migrations list aumyra --remote`, inspect all six migrations: `0001_init.sql`, `0002_undo_journal.sql`, `0003_ai_history.sql`, `0004_compose_modes.sql`, `0005_delivery_lease.sql`, and `0006_widget_reply_kind.sql`, then apply only to dedicated Aumyra D1 with `npx wrangler d1 migrations apply aumyra --remote`. If migrating an existing database, confirm its D1 Time Travel recovery coverage beforehand; do not assume applying a migration is reversible by default.
5. Set these Worker **secrets** privately: `TELEGRAM_BOT_TOKEN` (reuse existing @AumyraBot BotFather token), `TELEGRAM_WEBHOOK_SECRET` (random 1–256 [A-Za-z0-9_-]), `TELEGRAM_OWNER_ID` (numeric Telegram ID). Use `npx wrangler secret put SECRET_NAME` or Cloudflare dashboard. Do not paste secrets in GitHub or chat.
6. Optionally set `BANK_PLAN_JSON` as a Worker secret containing a JSON object of private savings targets; do not publish personal figures in source. Deploy with `npx wrangler deploy`. Use the actual returned Worker URL, not a guessed domain. Confirm HTTPS GET `/health` returns status 200 and `ready:true` **only after all six migrations and Worker secrets are configured**.
7. Set token and webhook secret as local shell environment variables, then run `node scripts/setup-webhook.mjs https://ACTUAL-WORKER-HOST/telegram/webhook`. This configures Telegram webhook, commands and menu without dropping pending messages.
8. From owner Telegram chat, test `/start`, tap Expense → send `12.50 USDT food lunch` → `/summary` → `/undo`, `/note` → send `buy coffee` → `/notes`, AI text, `/forget`, and a non-owner request. Verify duplicate delivery does not duplicate a finance entry.
9. Reconcile the original private archive only after recovering the source package and validating a database backup; never invent missing transactions.

## Optional AI — explicit usage authorization
Without an AI provider, financial commands and notes work; free text explains that AI is not configured. Enable one provider intentionally (inference can be billable):
- Cloudflare AI: add `[ai]` then `binding = "AI"` on the next line of `wrangler.toml` and redeploy. The Worker uses @cf/google/gemma-4-26b-a4b-it.
- OpenAI: add Worker secret `OPENAI_API_KEY`. The verified default is `gpt-4o-mini` and can be overridden with `OPENAI_MODEL`. This secret is never shown in bot responses.

## GitHub workflow
The manual `Aumyra manual Cloudflare deploy` workflow is source-only until made available through GitHub's default-branch workflow rules. Do not merge OMLAYER main just to expose it; retain PR #20's release/website gates.

Environment `aumyra-production` requires private secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `AUMYRA_D1_DATABASE_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_OWNER_ID`, and `AUMYRA_BACKUP_KEY` (random 32-byte key encoded as base64, also retained in the owner's private password manager). Set environment variable `AUMYRA_WORKER_URL` to the actual dedicated URL. No keys in issues, source or chat. Use the existing webhook secret; do not silently rotate it. AI keys/bindings are not added by this workflow.

It verifies exact bot/database/account identity, acquires the shared GitHub release lock, exports the existing database, restores it into isolated SQLite, encrypts it with AES-256-GCM and verifies byte-for-byte recovery. Only the encrypted file is uploaded as a 30-day Actions artifact. Upload must succeed before migration. Retain a downloaded encrypted backup and its key privately for longer retention. Plaintext runner export is removed on exit. Empty/foreign/corrupt schemas fail closed for explicit inspection.

After migration/deploy, it writes the three existing Telegram secrets privately, requires actual HTTPS/schema readiness, configures the webhook and runs the smoke with `--require-delivery`. This gate requires an actual Telegram-accepted owner message and signed synthetic `/start`; health alone, or a probe that never ran, cannot pass. Native widget and real owner-originated iPhone tests remain separate. Worker readiness, Telegram API acceptance and real owner iPhone interaction are different gates. A failed/canceled job retains the resource lock until inspected recovery; no blind retry. This workflow has not been dispatched or verified against a real Cloudflare account.

Decrypt an artifact locally with `node scripts/private-backup.mjs decrypt INPUT.encrypted PRIVATE_OUTPUT.sql`, with the backup key supplied only through the private environment. This verifies authentication and SQLite restore without printing ledger data. Never upload the recovered SQL to the public repository.

## Optional local notes/tasks interface (not installed on Seashell)
`node --max-old-space-size=192 scripts/local-server.mjs` starts a small server using Node 22+. It opens no browser or UI by itself; the Windows launch mechanism still requires independent silent-execution verification. There is no startup service or task executor. Current device status and installation remain unverified/offline; do not infer availability from this source.

Set a random private `AUMYRA_LOCAL_TOKEN` (at least 32 characters) in the process environment. Default origin is `http://127.0.0.1:8788`, accessible only on that computer. A phone-accessible origin requires explicit `AUMYRA_LOCAL_ORIGIN=https://<actual-LAN-address>:<port>` plus `AUMYRA_TLS_CERT` and `AUMYRA_TLS_KEY` paths to a certificate/key already trusted by the owner's iPhone. Plaintext LAN exposure is refused. Do not expose the port publicly or change firewall/certificate trust settings without owner approval. TLS provisioning and real iPhone LAN acceptance are NOT complete.

Local SQLite defaults to `local-data/aumyra.sqlite`; `AUMYRA_LOCAL_DB` may point to an owner-private durable path. Notes and full task text stay local. A separate unchecked-by-default publishing option queues ONLY the user-entered public engineering summary into the public GitHub Work lane. No automatic reuse of private note/task text. Stable event IDs and the atomic GitHub ledger prevent duplicates after a lost network acknowledgement. A 60-second sync interval retries with backoff up to 15 minutes; only one event is processed at a time. Set a scoped `GITHUB_TOKEN`/`GH_TOKEN` privately to enable this online bridge. No credentials are stored by the app or sent to the browser.

Owner login creates an hour-long HttpOnly/SameSite session. Host, Origin and CSRF checks protect changes; LAN cookies are Secure. Limits: 16 connections/sessions, 10 login attempts per minute per address, 16KB requests, 1,000 notes/tasks/outbox events, 50 visible records per list. The process uses a 192MB JS heap when launched as above. The browser is never sent the SQLite file. No external assets, AI calls, financial payments or task-code execution.

Stop with Ctrl+C/SIGTERM; the sync timer stops and pending event IDs remain durable. Actual Linux entrypoint start/stop and persistence were tested. Windows unattended launch, restart-at-boot, TLS/iPhone rendering and off-device private backup are NOT verified. Seashell is temporary compute: preserve private SQLite separately in owner-controlled backup storage, never public GitHub. Telegram still requires internet; this is a separate local interface.

## Boundaries
This repository is public, so move the assistant to a dedicated private repository when practical. Only code and schema belong here. CI success is not proof of live Telegram operation.
