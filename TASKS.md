# OMLAYER — TASKS

## ROAMDOTS third case · 2026-11-10
- [x] Recover existing main index and both case-study format; identify separate open reliability PR #3.
- [x] Review ROAMDOTS integration project HQ/release gates.
- [x] Add ROAMDOTS third selected-work card without changing the original two cases.
- [x] Add dedicated /work/roamdots/ case page with original logical-pixel illustration and real beta link.
- [x] Label beta, payment-OFF and physical connector prototype accurately.
- [x] Source checks: third card count, existing case routes, canonical, skip target, external link, balanced anchors and nonproduction payment copy.
- [ ] Render desktop, 390px and iPhone-width layouts and verify visual quality, focus order and no-JS route.
- [ ] Run deployed HTTP route/anchor checks for / and /work/roamdots/ and confirm beta link resolves.
- [ ] After PR approval, merge new portfolio PR and verify deployment; do not merge PR #3 implicitly.
- [ ] When PR #3 is rebased, extend its strict old-link assertions to allow the intentional new /work/roamdots/ route.

## Existing site reliability (separate scope)
- [ ] Continue PR #3 visual QA and Reduced Motion/keyboard verification before its own merge.

## Staging and weekly backup foundation · 2026-11-13
- [x] Recover current `main`, PR #8, PR #3, staging absence, and incident scope.
- [x] Create `staging` from PR #8 for an isolated latest-homepage QA candidate.
- [x] Pin immediate 2026-W46 production and staging restore branches.
- [x] Add GitHub Actions weekly source tag/Release workflow and staging smoke/deploy gate on infrastructure branch.
- [x] Merge infrastructure-only PR #12 into `main` without draft website changes; observe Actions deployment checks.
- [x] Merge PR #13 into `staging` and verify smoke CI [PASS](https://github.com/eriklobster/OMLAYER/actions/runs/43380756005).
- [ ] Configure separate staging Pages project, GitHub variable/secrets and `test.omlayer.com` binding; verify real HTTPS rendered page.
- [x] Bootstrap weekly workflow via PR #14; [2026-W46 run PASS](https://github.com/eriklobster/OMLAYER/actions/runs/43380943364), with [production](https://github.com/eriklobster/OMLAYER/releases/tag/website/production/2026-W46) and [staging](https://github.com/eriklobster/OMLAYER/releases/tag/website/staging/2026-W46) source Releases.
- [ ] Complete [staging Cloudflare Pages binding issue #15](https://github.com/eriklobster/OMLAYER/issues/15) and visually verify test.omlayer.com.
- [ ] Review PR #8 on iPhone; keep PR #3 reliability and P0 bot migration issues separate.

## P0 staging reliability integrated — 2026-11-14
- [x] Merged PR #23 to **staging only** at `5055f5392a47df4ea3d7e1620e1166d4f04ea010`, porting the useful October PR #3 fixes without overwriting November theme/portfolio.
- [x] Make all four pages readable with JavaScript disabled; preserve normal reveal enhancements.
- [x] Add seven method descriptions for no-JS clients; preserve the existing animated process for normal visitors.
- [x] Fix Chillum skip navigation, guarded IntersectionObserver, keyboard focus; repair ROAMDOTS skip link hidden-until-focus.
- [x] Preserve WhatsApp/Telegram/mailto URLs; wrap public business email in Cloudflare email_off comments to reduce JS dependency.
- [x] Chromium QA passed no-JS, theme persistence, overflow and Reduced Motion/keyboard across 320/390/768/1366; see https://github.com/eriklobster/OMLAYER/actions/runs/43550669716.
- [ ] Real iPhone Safari acceptance and WhatsApp/Telegram intended-recipient test, plus external email receipt/reply test. None yet proven.
- [ ] Verify actual Cloudflare-transformed HTML after release; browser tests only ran against local static source.
- [ ] Confirm independent motion control option or bounded-duration motion (owner decision; no prominent Play/Pause).
- [ ] Establish dedicated `test.omlayer.com` staging Pages project (issue #15). Current repo staging smoke passes but standalone deployment step remains skipped.
- [ ] Merge staged website changes into `main` only after explicit owner approval and production release gates.
- [ ] Continue P1 OKC evidence and founder/offers via separate approved staging PRs; do not invent client proof.
- [ ] Three-hour ChatGPT staging automation cannot be activated until an active-task slot is freed (five-task quota); do not silently replace other projects.
