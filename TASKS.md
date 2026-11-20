# OMLAYER — TASKS

## Cloud-only contact link fix · 2026-11-21

- The production source had `href="https://wa.me/omlayer"` on the WhatsApp contact card. Official WhatsApp Click-to-Chat requires a phone number in international digits, not a vanity username, so this was not a valid contact action.
- On isolated branch `fix/contact-whatsapp-link-20261121`, remove only that broken card; keep existing working email `hello@omlayer.com` and `https://t.me/omlayer`. Resize desktop contact grid from three to two columns; existing mobile single-column rule is unchanged.
- Extend the dependency-free `scripts/validate-static-site.py` to reject any future malformed `wa.me` contact link. Did **not** invent or reveal a WhatsApp number.
- **TESTS:** source link/count and patch invariants checked, Python CLI/static-site suite and real browser rendering **not yet executed**; CI/Cloudflare staging/production status not confirmed. No direct `main`, DNS, app, AUMYRA, ROAMDOTS or paid resource changes.
- **NEXT:** run `python scripts/validate-static-site.py` on exact branch, review desktop/iPhone contact grid and existing staging UX PR #31 before release.


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
