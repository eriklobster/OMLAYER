# P0 reliability review - 29 October 2026

Status: implemented source fixes; DRAFT review, not merge-ready. No deployment or infrastructure change.
Baseline/main: `3c285bdc402ace096bfca25c97d1744dedeabfc0` (latest fetched main matches audit).
Branch: `fix/p0-content-contact-20261029`.

## Evidence reused

Owner audit `OMLAYER-Website-Audit-2026-10-29.pdf` and `OMLAYER-Audit-Evidence-2026-10-29.zip`.
The existing audit identifies default-hidden reveals, Cloudflare email transformation, inconsistent
Chillum case accessibility and continuous orbit motion. Competitor research was not repeated.
Owner-private audit files and unpublished client screenshots are intentionally not copied into this public repository.

## Implemented

- All three HTML pages: reveal/stagger content is visible in baseline CSS. An intersection callback
  triggers the existing-style short reveal using keyframes, so script absence or observer failure
  cannot leave important content permanently hidden. No framework/runtime dependency added.
- Homepage: a no-script list exposes all seven process definitions instead of nonfunctional controls.
- All existing email anchors are wrapped in Cloudflare's documented `email_off` comments, so the
  existing public business address and mailto can remain usable without the edge decoding script.
  This is a source-level exception for the public contact address, not an edge configuration change.
  Verify the transformed HTML after an approved deployment; no claim of live verification yet.
  Reference: https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
- Chillum case: named home/navigation, skip link/main target, visible focus, reduced-motion CSS,
  and guarded IntersectionObserver initialization. Existing external project links remain intact.
- Reduced Motion disables CSS animation/transitions on all pages. Homepage JS also reads the current
  preference before advancing the orbit or applying pointer tilt, including changes during a session.
- Contact destinations and canonical URLs are unchanged. No inferred phone number or messenger account.

## Motion decision - proposed, NOT implemented

The owner requires approval before changing animation behavior and rejects prominent Play/Pause buttons.
Therefore normal-motion continuous orbit, existing hover/focus pause/resume, hero motion and timing
remain as before. No new pause control, auto-stop duration or user-triggered startup was implemented.
Reveal implementation changed only to protect readable baseline content while retaining its short entrance effect.

The current orbit's focus/hover pause is not a persistent independent pause mechanism. This accessibility
finding remains open. Reduced Motion support alone is not a full solution for users without that setting.

Recommended option for approval: keep the decorative hero, but let the process controls perform a
single brief entrance and then remain stationary; selection still works by pointer and keyboard.
Alternative: a discreet, keyboard-accessible motion toggle near the process caption with persistent pause.
Do not implement either option without the owner's choice. Do not mark moving-content pause acceptance passed.

## Contact review

| Channel | Source destination | Verification |
| --- | --- | --- |
| Email | `mailto:hello@omlayer.com` | Syntax/local source preserved; real receipt and edge transformation pending. Audit found public MX records. |
| Telegram | `https://t.me/omlayer` | URL preserved; account ownership/receipt not established by the audit. |
| WhatsApp | `https://wa.me/omlayer` | Unconfirmed; preserve rather than substitute an invented number. Owner must test actual app handoff and intended business recipient. |

No inquiry was sent. No structurally malformed destination was found that could be safely replaced
using confirmed contact information. WhatsApp's common documented phone-number syntax does not by
itself prove this existing link is broken. If it fails, obtain the business account's own share link.

## Verification

Passed locally:
- `python tests/p0-static.py`: all three pages; preserved external/contact hrefs and canonicals;
  valid local links, image assets and anchors; skip targets; inline JavaScript syntax via Node.
- `node --check tests/p0-reliability.cjs` and `git diff --check`.
- No application build command/package manifest exists: static HTML/CSS/JS site.

Blocked, not passed:
- `tests/p0-reliability.cjs` is a prepared Playwright browser suite. Launch failed because no local
  Chromium binary is available. Browser installation returned an invalid/truncated archive.
- Consequently no changed-page rendered desktop/mobile, no-JS, simulated observer failure,
  keyboard focus, live preference change or screenshot comparison pass is claimed.
- No new before/after screenshot evidence was produced. Source diff is the available change evidence.

Reproduce in an environment with Node, Python 3, Playwright and its Chromium browser:

```sh
python tests/p0-static.py
node --check tests/p0-reliability.cjs
# Playwright is a developer verification tool; not a website/runtime dependency.
NODE_PATH=/path/to/node_modules P0_EVIDENCE_DIR=/tmp/omlayer-p0 node tests/p0-reliability.cjs
```

The browser suite uses only a temporary loopback server and local pages; never sends an inquiry.
It compares no-JS readability at 390/1363px, reduced-motion/keyboard behavior, injected observer failure,
canonical/contact invariants and representative before/after screenshots against the audited commit.
Rendered evidence must be visually reviewed; assertions alone do not certify layout or accessibility.

## Manual acceptance before merge

1. Run the browser suite and inspect homepage + both case pages at desktop and 320/390/430/768/1024px.
   Check labels, focus rings, reveal timing, no horizontal clipping and unchanged project navigation.
2. Test JavaScript disabled and observer failure: all important copy/contact remains visible.
   The no-script process shows all seven definitions; email remains selectable and clickable.
3. iPhone Safari: normal and enlarged text, landscape, Reduce Motion on/off, scroll/navigation recovery.
   Toggle Reduce Motion during a session and confirm pointer/orbit motion stops where relevant.
4. Open WhatsApp and Telegram from an actual phone and desktop, confirm the intended business
   recipient; verify the email composer. Send a benign receipt test only if separately authorized.
5. Resolve/approve the motion option above, implement separately on this branch if approved, then test
   its independent pause/stationary behavior. Current pause-functionality acceptance is OPEN.
6. After a separately approved release, inspect Cloudflare-transformed HTML and test email without JS.

## Separate operational proposal - NOT applied

Audit observed HTTP 200 at `http://www.omlayer.com/`, and HTTP apex redirects to HTTP www.
Inspect actual Cloudflare/GitHub Pages TLS/redirect settings. Proposed approved change: redirect HTTP
paths to `https://www.omlayer.com/`, preserving path and query; keep HTTPS apex -> HTTPS www.
Risks: edge/origin redirect loops, TLS mode mismatch and premature HSTS locking out visitors.
Verify all four protocol/host variants plus both case routes. Consider HSTS only after stable HTTPS.
No Cloudflare, DNS, domain or production setting was accessed or modified in this PR.

## Merge recommendation and next scope

Keep DRAFT until rendered browser/device verification and the owner motion decision are resolved.
Review risks: reveal timing/fill behavior, CSS reduced-motion overrides, no-script process layout,
edge email transformation and focus placement. No price, offer, biography, OG, portfolio or P1 changes.

Next P1: selectively recover permission-cleared demo screenshots from `okc-case-study-v2` onto current
main, preserving the later Chillum page; add task captions and accurate delivered/in-development status.
Handle founder positioning/offers as a separate reviewed scope. Do not merge the old branch wholesale.
