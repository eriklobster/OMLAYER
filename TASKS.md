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
- [ ] Merge infrastructure-only PR into `main` without merging draft website changes; observe Actions passing.
- [ ] Bring infrastructure workflow onto `staging` and confirm stage smoke CI.
- [ ] Configure separate staging Pages project, GitHub variable/secrets and `test.omlayer.com` binding; verify real HTTPS rendered page.
- [ ] Exercise `workflow_dispatch` to generate 2 immutable tagged source Releases and verify ZIP/tar.gz.
- [ ] Review PR #8 on iPhone; keep PR #3 reliability and P0 bot migration issues separate.
