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
