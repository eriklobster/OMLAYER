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

## Owner release decision and P0 staging checkpoint — 2026-11-14
- **Production frozen:** User requires all visual and reliability changes on `staging` until explicit confirmation in the OMLAYER chat. Do not automatically merge to `main`.
- Shared dark/light theme, blue/cyan/mint logo, contact CTA cleanup, 96px search PNG and sitemap update were integrated with PR #8 to `staging` only.
- P0 no-JS reliability, accessible portfolio skip links, Cloudflare email markup and test coverage integrated via [PR #23](https://github.com/eriklobster/OMLAYER/pull/23) at `5055f5392a47df4ea3d7e1620e1166d4f04ea010` to **staging only**. Original stale PR #3 left unchanged as evidence, not a merge candidate.
- Evidence: Playwright Chromium QA on revised P0 [SUCCESS](https://github.com/eriklobster/OMLAYER/actions/runs/43550669716), smoke [SUCCESS](https://github.com/eriklobster/OMLAYER/actions/runs/43550669786). iPhone Safari, email receipt and messenger recipient tests remain owner-side.
- Existing main-based weekly website snapshot workflow is already active (PRs #12/#14/#16). Duplicate backup PR #19 closed without merge. Recovery does not include Cloudflare databases/DNS/secrets.
- Dedicated staging `test.omlayer.com` not deployed: GH preview job skipped because `OMLAYER_STAGING_PAGES_PROJECT` is unset; see issue #15. Cloudflare Pages PR previews are separate from the named staging project.
- OMLAYER website backlog: [issue #21](https://github.com/eriklobster/OMLAYER/issues/21). Next: real iPhone acceptance, Cloudflare staging binding, verified business inbox, and scope-limited OKC evidence.
- Scheduled three-hour autonomous OMLAYER task creation blocked by 5 active automation slots. Do not replace unrelated ROAMDOTS, RDC or Tower tasks without owner choice.
