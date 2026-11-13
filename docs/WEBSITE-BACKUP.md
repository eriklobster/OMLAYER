# OMLAYER website backup procedure
- Source of truth: GitHub `eriklobster/OMLAYER`, not Cloudflare Workers.
- Workflow: `.github/workflows/weekly-site-backup.yml`. Weekly on Sunday 03:17 UTC **after** owner-approved merge to main; manual dispatch supported.
- Snapshots: website source from `main` and the active staging branch, currently `design/omlayer-cta-contact-20261113`.
- Evidence: tagged commits (`backup/omlayer-main-YYYY-Www` and `backup/omlayer-staging-YYYY-Www`), download artifact (90 days), SHA-256 checksum and manifest.
- Test a restore by downloading the artifact, verifying `sha256sum -c omlayer-weekly-source.sha256`, extracting and comparing archived files with the stored SHAs.
- Branch preview deployment and production release are separate; backup jobs must not change Pages, Worker deployments, DNS, D1, KV, R2, webhooks or customer data.
- **Limitations**: GitHub artifacts/tags are not independent offsite redundancy, and this is only a public website-source backup. Add an independent store (R2 external account or another provider) when approved and configure separate rotation/access controls.
- If the staging branch is renamed, update `STAGING_BRANCH` in the workflow before enabling production schedule.
