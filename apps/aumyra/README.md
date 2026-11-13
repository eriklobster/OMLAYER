# AUMYRA Telegram personal assistant

Isolated release candidate for @AumyraBot: https://t.me/AumyraBot. The old HERMAYA build reportedly imported 4,715 records locally; those files are not available in connected GitHub, so **this new Worker does not contain the historical ledger**.

## Features
Owner-only Telegram webhook; /start, /help, /status; /income, /expense, /summary, /history, /undo; /note, /notes; /banks; optional AI conversation. USD, USDT and THB remain separate. Soft-voids preserve audit records, and repeated Telegram update IDs cannot duplicate entries.

## Release gates
1. In Cloudflare, inspect Workers and D1. Reuse the **existing Aumyra** resource if present; never touch ROAMDOTS or another project's database. Otherwise create a D1 named aumyra using `npx wrangler d1 create aumyra`.
2. Edit `wrangler.toml` locally: replace `REPLACE_WITH_AUMYRA_D1_ID` with the *dedicated* database ID; never publish sensitive customer data here.
3. Run `npm install` and `npm test` from `apps/aumyra`.
4. Run `npx wrangler d1 migrations list aumyra --remote`, inspect and apply only to dedicated Aumyra D1 with `npx wrangler d1 migrations apply aumyra --remote`. A backup is captured by Cloudflare.
5. Set these Worker **secrets** privately: `TELEGRAM_BOT_TOKEN` (reuse existing @AumyraBot BotFather token), `TELEGRAM_WEBHOOK_SECRET` (random 1–256 [A-Za-z0-9_-]), `TELEGRAM_OWNER_ID` (numeric Telegram ID). Use `npx wrangler secret put SECRET_NAME` or Cloudflare dashboard. Do not paste secrets in GitHub or chat.
6. Deploy with `npx wrangler deploy`. Use the actual returned Worker URL, not a guessed domain. Confirm HTTPS GET `/health` returns status 200 and `ready:true`.
7. Set token and webhook secret as local shell environment variables, then run `node scripts/setup-webhook.mjs https://ACTUAL-WORKER-HOST/telegram/webhook`. This configures Telegram webhook, commands and menu without dropping pending messages.
8. From owner Telegram chat, test `/start`, `/expense 6.37 USDT food lunch` → `/summary` → `/undo`, `/note buy coffee` → `/notes`, AI text, and a non-owner request. Verify duplicate delivery does not duplicate a finance entry.
9. Recover the original 4,715-entry HERMAYA package later and reconcile with a backup and dry run; do not fabricate or blindly replay old data.

## Optional AI — explicit usage authorization
Without an AI provider, financial commands and notes work; free text explains that AI is not configured. Enable one provider intentionally (inference can be billable):
- Cloudflare AI: add `[ai]` then `binding = "AI"` on the next line of `wrangler.toml` and redeploy. The Worker uses @cf/google/gemma-4-26b-a4b-it.
- OpenAI: add Worker secret `OPENAI_API_KEY`. The default is `gpt-6-luna` and can be overridden with `OPENAI_MODEL`. This secret is never shown in bot responses.

## GitHub workflow
After approval and merge, the manually triggered `Aumyra manual Cloudflare deploy` workflow can migrate and deploy the dedicated Worker using encrypted GitHub secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `AUMYRA_D1_DATABASE_ID`. Telegram secrets still must be set separately on the Worker. This workflow never changes the OMLAYER website.

## Boundaries
This repository is public, so move the assistant to a dedicated private repository when practical. Only code and schema belong here. CI success is not proof of live Telegram operation.
