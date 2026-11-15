# AUMYRA — three-lane coordination and Seashell takeover
Updated 2026-11-15. Canonical issue [#22](https://github.com/eriklobster/OMLAYER/issues/22); draft [PR #20](https://github.com/eriklobster/OMLAYER/pull/20). No live production release is verified.

## Lanes and priority
1. **Development (primary execution):** `apps/aumyra/TASKS.md`, PR #20. Implement code, tests, safe deployment and release acceptance. Seashell (formerly Jock/CHR/Dell; Desktop Commander device `WIN-PPCU1QCU2GN`) is the preferred computer when actually connected and non-disruptive. GitHub-only execution works when Seashell is disconnected.
2. **ChatGPT Work:** [issue #25](https://github.com/eriklobster/OMLAYER/issues/25). Connected-account research, service/file workflows and acceptance evidence. Work owns a task only after it records a claim.
3. **Simple Chat:** [issue #26](https://github.com/eriklobster/OMLAYER/issues/26). Owner decisions, requirements, finance policy, branding, short answers and acceptance feedback. It should not concurrently change the same source or deployed service.

## Task ownership and takeover rule
- **Claim before changing anything:** Add a comment to the *relevant issue* with task ID/title, `OWNER: Work | Seashell | Simple Chat`, `STATUS: CLAIMED / IN PROGRESS`, start time in UTC, branch/PR (if relevant), exact next action and a short lease-until time. Link back to issue #22 for release blockers. Only one current active owner per task.
- **Unclaimed task:** When Seashell is reachable in an active authorized chat/agent session and able to act without screen disturbance, it may take the highest-priority unclaimed task **immediately**; no waiting for a Work chat to start. Post the claim first.
- **Heartbeat:** An active owner updates the issue when meaningful work advances, no less often than every **20 minutes** for long-running tasks. A heartbeat records completed step, blocker, branch/commit and next step, not empty "still working."
- **Stalled task:** After **45 minutes** without an update, Seashell may take over an owned task only after inspecting current GitHub commits, comments, existing live processes and deployment/migration state. Post `TAKEOVER: previous owner → Seashell; reason; last evidence; preserved branch; resume step` and change owner/status. Do not interpret missing comments as proof that a destructive action is safe.
- **Work returns:** Work sees the takeover and must not repeat/overwrite Seashell's changes. It may take a distinct task, or request the existing owner to hand back ownership in GitHub.
- **Blocked / stopped / canceled:** Publish status, source of interruption, verified progress, saved state and needed next action. `CANCELED` tasks are not automatically restarted; `BLOCKED` tasks may be reassigned if another lane can genuinely unblock them.
- **Concurrency:** Keep independent branches, avoid simultaneous writes to the same file, and compare remote state before edits. For deployment, migrations, webhook/token updates and financial imports, establish a separate non-overlapping release lock and reverify live state. No automatic retries of non-idempotent production actions.
- **End of a work batch:** Report `DONE | COMMIT/PR | TESTS (verified) | BLOCKER | NEXT ACTION | OWNER | STATUS`; update canonical #22 and the claimed queue. Distinguish source/CI success from a live iPhone acceptance.
- **Task IDs:** Use existing issues/paths rather than inventing duplicate issues. For new cross-lane items, prefix `DEV-`, `WORK-` or `CHAT-` and link origin and destination issues. Only claim a single task at a time by default.

## Claim / takeover comment example
```text
TASK: DEV-P0-live-webhook
OWNER: Seashell
STATUS: IN PROGRESS
CLAIMED_UTC: 2026-11-15T09:00Z
LEASE_UNTIL_UTC: 2026-11-15T09:45Z
BRANCH_OR_PR: feat/aumyra-assistant-mvp / #20
DONE: recovered latest branch and tests
BLOCKER: Cloudflare identity/access not yet verified
NEXT: inspect dedicated Cloudflare account without touching other Workers
```
Use an actual timestamp and evidence, not example values, in real task comments.

## Seashell visibility and capability policy
- The owner has required **zero visible UI activity** on Seashell until explicitly requested: no visible CMD/PowerShell, browser, popups, overlays, notifications or focus changes. Prefer GitHub APIs, read-only Desktop Commander file operations and confirmed invisible/background execution only. Do not try to guarantee invisibility for a command whose behavior is uncertain.
- `Online` in a device listing is **not proof** that remote commands, Cloudflare authentication, or a background agent work. Never infer an authenticated login, automatically run an installer, or reveal tokens.
- An **online device does not start an autonomous agent**. This policy is applied by active ChatGPT/Work sessions; continuous hands-free monitoring/takeover requires a separately installed, verified authorized scheduler/agent, which has **not** been deployed. Do not claim automatic execution across sessions is operational.
- Avoid destructive/irreversible changes, any change to other bots/apps, payments, secret rotation, and public logging of private data without explicit authority.

## Release truth
AUMYRA's Worker/D1/Telegram webhook and native widget rendering have **not** been verified in production. Priority remains correct Cloudflare access, safe release and real owner Telegram acceptance.
## Executable coordination (2026-11-15)
Canonical state: [aumyra-coordination-state branch](https://github.com/eriklobster/OMLAYER/blob/aumyra-coordination-state/apps/aumyra/coordination-state.json). Never merge its changing state into source branches. `scripts/coordination.mjs` changes this ONE file using the GitHub Contents API's current blob SHA. A conflict reloads state and revalidates the operation; only one claimant wins. Read GitHub server time for lease decisions. Stable event IDs survive retries after unknown network outcomes.

Requires Node 22+ and a narrowly scoped GitHub Contents-write token supplied only as process environment `GITHUB_TOKEN` or `GH_TOKEN`. No credential argument, source file or log. Existing connected GitHub tools can perform the equivalent SHA-guarded update after applying the same reducer. No daemon, arbitrary-command execution or scheduled monitoring is included.

```sh
node scripts/coordination.mjs status
node scripts/coordination.mjs apply coordination-event.json
```
Public event example (use a fresh stable event ID; preserve it on retries):
```json
{"eventId":"work-public-example-0001","action":"add","taskId":"WORK-PUBLIC-EXAMPLE","actor":"Work-session-unique","lane":"Work","summary":"Verify dedicated Aumyra HTTPS readiness"}
```
Then `claim` with a separate `branch` (`work/...`, `seashell/...`, `dev/...`). Use `heartbeat` only with new concrete evidence; `transition` records IN PROGRESS / BLOCKED / DONE / STOPPED / CANCELED. Terminal tasks cannot restart; create a new explicitly authorized task referencing the prior ID. The 20-minute progress policy remains; claims expire for takeover eligibility at 45 minutes, not automatic reassignment.

A `takeover` also requires `expectedVersion` and `inspection` with all of: `preservedBranch` (old branch), `observedCommit` (40-character SHA), `branchesReviewed`, `commitsReviewed`, `processesReviewed`, `resourcesReviewed`, `noActiveExecution` (all true), and a concise public `evidence` statement. If Seashell is unreachable, its execution cannot be presumed stopped: do not assert `noActiveExecution` for a task it might still be running. The ledger stores an explicit TAKEOVER notice and old branch.

All deployment/migration/secret/webhook tasks must be created with `resource:"aumyra-release"`. One shared lock covers these related operations. STOPPED/BLOCKED/DONE/CANCELED do not silently release it. An explicit `release` requires the same exact-version inspection after operations stop. Workflow concurrency adds another guard. Before each cloud mutation, installers/workflows run `assert-release`; expired or wrong-owner leases fail closed. An existing integration branch is allowed for a release of that reviewed code, never for parallel code editing.

For interactive Windows bootstrap, supply `AUMYRA_RELEASE_TASK` and `AUMYRA_RELEASE_OWNER` from the existing claim plus the private GitHub token in the process environment. Renew meaningfully if 20 minutes elapse. Release the resource only after examining actual outcome. Do not run the interactive bootstrap on Seashell. The manual Actions workflow acquires/releases its own run-specific task; a failed or canceled job retains its lock for human/active-agent inspection.

Public metadata only: summaries, branch/commit references and sanitized evidence. Never submit finance, notes, account identifiers or secret values. The field allowlist and token-pattern guard are secondary protections, not automatic privacy classification. Bounds: 500 tasks / 800 KB state, four CAS retries, 15-second network deadline. If capacity is reached, stop and plan a history-preserving archive; do not discard event IDs and replay old outboxes.
