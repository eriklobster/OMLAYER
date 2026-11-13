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

## Site backups and release boundary — 2026-11-13
- Owner decision: website changes remain staging/PR-only until approval in the OMLAYER conversation. No automatic merge to main.
- Owner decision: maintain weekly source backups of main and staging independent of Workers deployment. Proposed workflow and recovery notes are in `docs/WEBSITE-BACKUP.md`.
- The weekly schedule is **not active until the workflow is approved and merged to main**; staging may execute manually only with review.
- UX staging branch: `design/omlayer-cta-contact-20261113`; preview through Cloudflare Pages. Light/dark theme switch applies to homepage and three case-study pages on staging.
- Domain migrations for ROAMDOTS, other Workers and shared APIs are separate; never alter them as part of OMLAYER website backup.
