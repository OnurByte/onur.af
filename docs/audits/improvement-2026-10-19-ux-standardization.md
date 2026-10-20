# UX/UI standardization review — 2026-10-19

Scope: all public UI surfaces, shared design consistency, responsive layout, keyboard/accessibility, theme and reduced motion. Owner requests no fixed test/round cap. Process in rounds of at most three evidence-backed hypotheses, one product patch at a time; stop when no new actionable evidence remains, duplicates recur, or external dependencies block progress. One repair per finding.

Baseline: 5537b9b08fe197fa49be594ac35d924d01a52546, current codex/portfolio-improvement-20261019 checkout including existing dirty src/client/dialogs.ts, src/client/search.ts, tests/browser/search-index.pw.ts and untracked AGENTS.md, .agents/, prior review and pentest audit records. Preserve all existing work. Review this dirty snapshot, not clean HEAD.

Roles: coordinator root; separate read-only Critic, sequential Engineer, and read-only Verifier. Earlier audits read to avoid duplicate Find and copy-policy findings. Initial discovery underway.

## Initial evidence / coverage map

Read brand.md, docs/design.md, docs/stylex.md, docs/acceptance.md, browser fixture server and Playwright config. Existing browser contracts cover home introduction/provider cards/Connect/Spotify, navigation optics and fallback preferences, footer, utility forms, payment states, Log/subjects/publication proofs/Share/contents, RSS, Find, action feedback, SEO, accessibility and geometry. Geometry spans 320, 375, 620, 621, 768, 1280, 1440 in both themes; precision adds 360/361 and fractional breakpoints. Donation fixture is synthetic and loopback-only. Historical typography/copy prose disagreements alone do not authorize changing deliberate behavior.

Fresh aggregate gate and full browser baseline underway. Critic exploring missing interaction and resize counterexamples beyond the existing static viewport tests.

## Round 1

### UX-MODAL-01 / round 1 / modal consistency / medium / high

Claim and user impact: Share permits background scrolling while open, unlike Find; a visitor can lose the article reading position while using a modal.
Observed evidence / inference / disproof experiment: independent Critic fresh-build Chromium probe on /log/cryptic-watchtower-watches: open Share, backdrop pointer (5,800), wheel delta600, scrollY 0→600, body overflow visible. Find comparison scrollY142→142. Expected shared native modals preserve background position. Disproof: same wheel with Share open leaves background stable; native modality alone does not do so in tested Chromium.
Affected paths / invariant: src/styles/global.css body:has(#search-dialog[open]); shared dialogs controller and Share. Common modal interaction and usable mobile UI.
Existing coverage: log-share.pw.ts checks fit/focus but not background scroll. Engineer independent reproduction and failing regression pending.
Engineer decision / patch: pending.
Verifier snapshot / commands / results: pending.
Verdict: pending.
Critic re-evaluation: pending.

Initial aggregate `bun run verify`: exit 0; 221 unit tests passed, 8 skipped, 2,990 assertions; dead-code, formatting, Astro/TypeScript, signed artifact checks and build passed. Log /tmp/portfolio-ux-verify.log. No signatures regenerated. Full browser baseline still running.

Baseline full `bun run test:browser`: exit 0, 146 passed (1.3m), log /tmp/portfolio-ux-browser.log. These passes do not disprove the uncovered Share scroll case.

## Round 2 exploration

Critic inspected /pgp/x, /pgp/github, /introduction/verified at 320px with actual Chromium layout: document width 320, controls within gutters, identity textarea content fits. No additional supported hypothesis from forms/proof UI. Native Custom radio requirement is established behavior. Copy resize suspicion not raised: responsive metrics alone did not establish user impact. No patch to speculative style/document discrepancies.

### UX-MODAL-01 Engineer reproduction

Engineer independently confirmed root cause. New dialog-scroll browser regression failed all four 375/1280 × light/dark cases against baseline: expected scrollY 0, observed 600 while Share open. Internal short-dialog scrolling check already passed. Baseline screenshots preserved at /tmp/portfolio-share-scroll-before.

Minimal candidate patch: replace Find-specific body scroll lock with body:has(dialog:modal), preserving native dialog semantics and leaving nonmodal dialogs unaffected. New tests exercise Share→Find→Share switching, reduced motion in dark cases, Escape focus restoration, normal page scrolling after close, and short modal internal scrolling. Fresh patched build / focused browser checks pending. Only Engineer edits application/tests.

Engineer decision: confirmed; patch and five regression scenarios complete. Fresh `bun run build` exit 0; targeted dialog-scroll/log-share/search-index browser suites exit 0, 24 passed. Scoped Prettier and git diff --check exit 0. Logs /tmp/portfolio-share-scroll-build.log, /tmp/portfolio-share-scroll-targeted.log. Comparable mobile light screenshots preserved in /tmp/portfolio-share-scroll-before and /tmp/portfolio-share-scroll-after; coordinator also inspected images: modal unchanged, background article previously advanced under it and now remains at title/metadata.

## Round 3 / re-evaluation

Critic reviewed minimal selector change: correctly excludes non-modal dialogs. Fresh suspicion: ongoing smooth-scroll requestAnimationFrame may continue programmatic scroll after keyboard shortcut opens modal. Pointer opening cancels animation. Source alone insufficient because native focus movement may trigger existing external-scroll guard. Independent verifier assigned behavioral probe; no speculative patch.

Engineer product snapshot frozen for independent verification. Candidate hashes:

- src/styles/global.css: ea3e9e27346b46716919a1534423133f19d459dad0bb7e72a689e8556128cf8b
- tests/browser/dialog-scroll.pw.ts: 1b429870c090530f27dc866d6bb167ee769de99e2da738775230897c438647fd

### UX-MOMENTUM-02 / round 3 / keyboard modal consistency / medium / high

Claim and user impact: opening either modal via keyboard during active smooth scrolling fails to preserve the background reading position even with CSS scroll lock.
Observed evidence / inference / disproof: independent Verifier controlled-clock probe: wheel 600, tick40ms, Ctrl+Shift opens Share at y76; after1s y598. Ctrl+k Find y79→598. Both have body overflow hidden. Source tick() performs programmatic window.scrollTo and shortcuts do not cancel animation. Existing native focus movement does not cancel in this reproduction. Disproof: repeat sequence with modal open and prove y stable throughout animation settling.
Affected paths / invariant: src/client/smooth-scroll.ts, shared Find/Share predictable modal behavior. Pre-existing in Find; not caused by UX-MODAL-01 selector patch.
Engineer decision / baseline reproduction / patch: assigned; pending independent confirmation and failing regression.
Verifier evidence: /tmp/portfolio-ux-verifier-probe.mjs and /tmp/portfolio-ux-verifier-probe.log; no product mutations by Verifier.
Verdict: pending.
Critic re-evaluation: accepted independent experiment as fresh actionable evidence; no other source-backed hypothesis.

Independent Verifier completed first candidate gates before usage limit: fresh aggregate exit 0 (221 pass, 8 skip, 0 fail); full browser 151 passed. Logs /tmp/portfolio-ux-verifier-verify.log, /tmp/portfolio-ux-verifier-browser.log. Independent baseline CSS override, preserving shared source, reproduced old Share scroll0→600 and patched0→0 in all four viewport/theme combinations. UX-MODAL-01 backdrop fix independently verified.

Delegated Engineer and Verifier became unavailable due account usage limit on next turns. Root assumes sequential Engineer then Verifier roles for UX-MOMENTUM-02, explicitly **self-review**, not independent verification of the second patch. Independent Critic/Verifier already established its baseline counterexample. No owner approval is needed for authorized routine correction. Added actual browser controlled-clock regression before any second product edit; RED run underway.

UX-MOMENTUM-02 Engineer decision: confirmed by root RED regression (real built browser client, controlled time) for Share/Find × 375/1280. Four failures at position-preserved assertion; five prior modal tests pass. Log /tmp/portfolio-ux-momentum-red.log, exit 1. Minimal patch src/client/smooth-scroll.ts: tick cancels pending scroll animation whenever a native modal is active, before any programmatic scrollTo. No change to scroll profiles, anchors or native dialog content scrolling. Fresh build / GREEN pending.
