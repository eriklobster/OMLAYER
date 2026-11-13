# OMLAYER website — staging, releases and weekly restore points

## Branch authority (13 November 2026)

- `main`: existing production website source. **Do not merge draft design/reliability PRs into main without owner-approved visual and mobile QA.**
- `staging`: continuously updated QA website branch; initial snapshot is the newer homepage from draft PR #8 (no production deployment).
- `infra/*`: infrastructure-only changes and workflows.
- `feature/*`, `design/*`, `fix/*`: isolated changes. Open PRs into `staging` for review; promote selected, tested changes to `main` in separate owner-approved PRs. Do not blindly merge all staging changes into production.
- `archive/website-production-2026-W46` and `archive/website-staging-2026-W46`: immediate source recovery branches created on 13 November 2026 before automated releases.

## Staging preview — isolated from production

1. Use a **dedicated Cloudflare Pages project**, such as `omlayer-staging`, not the production project `omlayer`.
2. In GitHub repository Settings → Secrets and variables → Actions, set repository variable `OMLAYER_STAGING_PAGES_PROJECT` to the verified dedicated project name.
3. Add existing authorized Cloudflare `CLOUDFLARE_ACCOUNT_ID` and scoped `CLOUDFLARE_API_TOKEN` as encrypted Actions secrets. Do not place secret values in commits, issues or PRs.
4. Map `test.omlayer.com` only to that **separate staging Pages project** in Cloudflare, after verifying the project and its configured production domain. Do not move production's DNS/domain.
5. On each push to `staging`, `staging-site.yml` runs link/route smoke tests, prepares a public-only static directory, and deploys it to the dedicated Pages project. PRs into staging only run tests. When the project variable is not set, deployment is **skipped**, not assumed successful.
6. Inspect the actual deployed build, desktop and iPhone Safari layout, working links, keyboard accessibility, reduced motion and no-JavaScript content at `https://test.omlayer.com` before any promotion.

If a separate Cloudflare Pages project already has Git integration with `staging`, choose one deployment mechanism; do not enable duplicate uploads. GitHub branch creation alone does not prove a public preview exists. The repo connector cannot confirm Cloudflare credentials, domain bindings, or live browser screenshots.

## Weekly GitHub backups

The workflow `.github/workflows/weekly-website-snapshots.yml` executes **Mondays at 03:17 UTC** and supports manual `Run workflow`. It pins both `main` and `staging` using unique tags:

- `website/production/YYYY-Www`
- `website/staging/YYYY-Www`

It publishes one GitHub Release for each tag. Releases provide downloadable source-code ZIP/tar.gz bundles that include committed HTML/CSS/JS/media. Existing weekly tags are never force-moved; rerunning the same week only repairs a missing Release. Stored GitHub Releases and tags persist until manually deleted. Backup workflow must be present on default branch `main` and Actions must permit contents write. GitHub cron may be delayed; inspect Actions history periodically.

**Restore:** open Releases, locate the week and track, identify the pinned SHA, branch from that tag for recovery, validate on `staging`, then promote via PR after QA. Never restore by force-pushing `main`. These archives do **not** back up Cloudflare settings, D1/KV/R2 databases, domain/DNS, Telegram secrets or provider account settings; those require separate protected backups.

## Next release gate

- [ ] CI smoke passes on main and staging.
- [ ] Dedicated Pages staging project and `test.omlayer.com` actually respond with the staging build.
- [ ] Confirm staging homepage reflects PR #8, including restrained CTAs/contact.
- [ ] Resolve old ROAMDOTS beta links **only after confirming a valid production destination**.
- [ ] Visual/iPhone review of PR #8; keep PR #3 isolated until its own testing and motion decision.
- [ ] Confirm Monday snapshot tags and Releases through a successful manual or scheduled Actions run.
- [ ] Maintain current live production until owner approves the visual release.
