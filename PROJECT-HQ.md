# OMLAYER — PROJECT-HQ

## Authority and source
- Studio site: https://www.omlayer.com/
- Source: `eriklobster/OMLAYER` (static HTML/CSS/JS; GitHub `main`).
- Owner is the final decision maker for production rollout, design changes, client permission and public claims.
- This file summarizes the portfolio publication work only; it does not supersede the existing audit or approvals.

## Current portfolio delivery (2026-11-10)
- Dedicated ROAMDOTS case: `work/roamdots/index.html`.
- Third project card: `index.html` after Ocean Kids Club and Chillum Casa.
- Product beta link: https://roamdots.r14tur99.workers.dev/ (public URL supplied by owner; live uptime must be checked after rollout).
- Marketing status: **Public beta · In development**. Do not present payment rails, paid billing, real-device LED support or end-to-end delivery as released.
- The ROAMDOTS source is private; do not link or expose its code, private boards, personal account records or credentials.
- Do not publish private estimates, negotiated client rates or internal hours on the public site.

## Site release boundary
- Preserve existing design, case studies, contact destinations, process motion and URL structure.
- Existing draft [PR #3](https://github.com/eriklobster/OMLAYER/pull/3) is a separate accessibility/reliability review. Do not merge that branch incidentally.
- A new third case must retain direct working links, static no-JS readability, canonical metadata and mobile layout. Validate both `/` and `/work/roamdots/` after deployment.
- Avoid changing Cloudflare settings, DNS or unrelated production services as part of portfolio content work.

## ROAMDOTS source-of-truth boundaries
- Source: private `eriklobster/roamdots`, integration branch `integration/pixel-war-v6`, `PROJECT-HQ.md`, `TASKS.md` and Issue #10.
- Host, board, drawing and Telegram functionality have been implemented in stages.
- Financial features remain OFF pending safety/release acceptance.
- Physical BLE sign connector remains prototype/test-gated, not a verified production installation.
- Portfolio wording must be updated when actual release evidence changes.

## Staging and recovery (13 November 2026)
- Production source stays on `main`; `staging` is based on draft homepage PR #8 for browser/iPhone review, not an approved production release.
- `test.omlayer.com` must be backed by a **separate** Cloudflare Pages project; this has not yet been verified. The optional deployment job is gated on the `OMLAYER_STAGING_PAGES_PROJECT` repository variable and existing encrypted Cloudflare credentials.
- Weekly production and staging GitHub source Releases are defined in `.github/workflows/weekly-website-snapshots.yml`, after merging this infrastructure change into default `main` and observing a successful run.
- Current-week source restore branches: `archive/website-production-2026-W46`, `archive/website-staging-2026-W46`.
- Full staging, release and restoration contract: `docs/STAGING-AND-BACKUPS.md`. Production HTML and DNS must remain unchanged in this infrastructure PR.

## Verified staging and source backup state (13 November 2026)
- Merged infrastructure PRs [#12](https://github.com/eriklobster/OMLAYER/pull/12), [#13](https://github.com/eriklobster/OMLAYER/pull/13), and bootstrap [#14](https://github.com/eriklobster/OMLAYER/pull/14). Production website HTML remains unchanged, with the newer CTAs on `staging` only.
- Staging static QA: [GitHub Actions SUCCESS](https://github.com/eriklobster/OMLAYER/actions/runs/43380756005). The actual staging deployment job was SKIPPED because its dedicated Cloudflare Pages project variable is not set.
- Weekly GitHub backup: [2026-W46 Actions SUCCESS](https://github.com/eriklobster/OMLAYER/actions/runs/43380943364). GitHub source Releases tagged `website/production/2026-W46` and `website/staging/2026-W46` are present; scheduled Monday runs remain enabled on default `main`.
- Live `https://test.omlayer.com` is not verified. Tracking [issue #15](https://github.com/eriklobster/OMLAYER/issues/15) for owner-side staging Pages project, credentials and hostname binding.
- Next worker: verify public HTTPS stage and mobile visual QA after GitHub staging deployment becomes active. Never publish draft PR #8 or PR #3 to production without owner review. Separate P0 Telegram/webhook incident remains higher priority.
