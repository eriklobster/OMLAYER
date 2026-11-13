# OMLAYER hostname migration — 2026-11-13

Owner selected Cloudflare account workers.dev subdomain `omlayer` (formerly `r14tur99`). Cloudflare UI reported propagation in progress. **Do not assume cutover is complete.**

## P0 release gates
- [ ] Inventory Cloudflare Workers, Pages, routes, custom domains, DNS, D1/KV/R2, webhooks and secrets without exposing secret values.
- [ ] Verify HTTPS and app-specific health on `roamdots.omlayer.workers.dev`, `ocean-cafe-bot.omlayer.workers.dev`, `tiktok-army-bot.omlayer.workers.dev`, `elizaveta-helper-bot.omlayer.workers.dev`. Actual Worker names must be confirmed.
- [ ] Search each project for `r14tur99` in code, configuration, GitHub Actions, OAuth callbacks, Telegram webhooks, CORS, bot menus, QR codes and marketing links.
- [ ] Preserve `omlayer.com`, `omlayer.pages.dev`, `chillum.casa` and `test.chillum.casa`; inspect whether `test.omlayer.com` exists before configuring.
- [ ] Replace URLs only after target route verification; keep rollback mapping.
- [ ] Verify real Telegram webhook deliveries, authentication, ROAMDOTS Publish → reload, and data persistence.
- [ ] Confirm deployed SHA and smoke tests for each affected project.

## Responsibility
OMLAYER owns studio domain architecture and portfolio links. Each product repository owns its application integrations and deployment. Existing OMLAYER reliability PR #3 remains independent.

## Safe release order
1. Verify Cloudflare propagation and new Worker endpoints.
2. Patch integration URLs in isolated project PRs.
3. Validate staging and live flows, then update public portfolio URLs.
4. Document observed URLs, SHA, Cloudflare versions and rollback steps.

Never copy production secrets into source control or switch production payments on during this migration.

## ROAMDOTS canonical domain — owner decision (2026-11-13)
- **Primary:** `https://roamdots.omlayer.com` (website, Telegram Web App, login callbacks, QR and board sharing links).
- **Short alias:** `https://rd.omlayer.com` redirects permanently to the primary, preserving request path and query parameters. Verify redirects before publishing QR codes.
- **Technical fallback:** `https://roamdots.omlayer.workers.dev` remains active until the custom domain and integrations are proven.
- **Implementation owner:** OMLAYER/Cloudflare owns DNS and Worker custom domain binding; ROAMDOTS owns canonical URLs, bot menu, OAuth callbacks, CORS, QR and share links.
- **Cloudflare activation gate:** confirm `roamdots.omlayer.com` is attached to the existing `roamdots` Worker (no duplicate Worker or database), valid TLS, no redirect loops. Configure `rd.omlayer.com` via a safe redirect rule or dedicated route; do not blindly redirect webhook POSTs.
- **Telegram gate:** inspect `getWebhookInfo` first. Set only the correct existing webhook path on the canonical host, preserving the existing webhook secret token. Verify `/start`, menu callbacks and actual webhook delivery.
- **Auth gate:** update authorized Google OAuth redirect origins/URIs and magic-link callbacks only after domain is live. Verify sign-in, Publish and reload persistence on iPhone.
- **Rollback:** retain workers.dev URL and previous webhook URL/config until end-to-end tests pass. No secret rotation, no payment flag changes.

**State:** Domain choice recorded in GitHub; DNS binding, redirect and Telegram integration are NOT yet deployed or verified.
