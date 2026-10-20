# Portfolio improvement — 2026-10-19

Scope: evidence-based site review and confirmed routine fixes. Budget: at most two rounds, three hypotheses per round, sequential product edits; one repair per finding. No publication, signing, deployment, or live payment experiments.

Baseline: `5537b9b08fe197fa49be594ac35d924d01a52546`, initial branch `main`. Existing untracked owner files: `AGENTS.md`, `.agents/`; preserved. Target: current checkout including those instructions, isolated on `codex/portfolio-improvement-20261019`.

Roles: coordinator root; separate Critic, Engineer, Verifier agents. Only Engineer edits product files. Coordinator maintains this record. Earlier audit: `2026-10-15-visual-audit.md`; review for duplicates before raising findings.

## Round 1

Critic investigation pending.

### FIND-01 / round 1 / UX and accessibility / medium / high confidence

Claim and user impact: activating a same-page Find result scrolls behind a still-open modal; destination remains inert.
Observed evidence: Critic Chromium on `/`, Find `github`, click `/#connect-github`: URL hash changed, scrollY 2656, dialogOpen true, destination not focused. Initial reproduction used existing dist; fresh baseline build required. Inference: search result navigation should reveal its destination. Disproof: fresh-build click/Enter closes modal and focuses destination.
Affected paths: `src/client/search.ts`, `src/client/smooth-scroll.ts`; visible focus and native navigation intent. Existing search tests cover matching/offline but not navigation.
Engineer decision / patch / Verifier: pending sequential handoff.

## Round 2

### COPY-02 / round 2 / interaction contract / low / high confidence

Claim and user impact: global native copy cancellation may prevent manual copying of machine data described in brand.md.
Observed evidence / disproof: `src/client/site.ts` cancels copy outside `.h-entry`. Critic found `tests/browser/site-behavior.pw.ts` explicitly tests intentional native copy and context-menu blocking, including PGP userSelect=none. This contradicts treating the behavior as an accidental regression; brand and interaction tests disagree.
Affected paths / invariant: brand manual selection guidance versus established tested interaction design.
Engineer decision: rejected as an automatic routine fix; preserve deliberate interaction.
Decision evidence: explicit browser behavior contract. No patch or regression check required.
Verifier snapshot / commands: not applicable, no product change.
Verdict: not-applicable.
Critic re-evaluation / remaining uncertainty: owner decision needed only if changing native-copy policy; docs inconsistency retained for reporting.

### FIND-01 Engineer handoff

Engineer decision: confirmed. Fresh baseline build exit 0; new browser regression exit 1 with two failures (pointer/Enter: dialog remains visible), four normal cases passed.
Patch: search results close Find before ordinary same-tab activation bubbles to smooth scrolling. Shared closeDialog has optional `restoreFocus: false`, deleting the queued return target so close cannot steal destination focus. Modified/new-tab selection is preserved; default cancellation/Share restoration unchanged.
Regression check: `tests/browser/search-index.pw.ts` covers pointer/Enter × 375/1280 × light/dark (dark reduced motion), cross-page navigation and modified new-tab activation.
Engineer checks: patched `bun run build` exit 0; `bun run test:browser -- search-index.pw.ts smooth-scroll.pw.ts log-share.pw.ts` exit 0, 23 passed; `bun test tests/search.test.ts tests/content-index-search.test.ts` exit 0, 5 passed; `git diff --check` exit 0.
Raw sanitized logs: `/tmp/portfolio-find-{baseline,patched}-{build,browser}.log`.
Verifier handoff: independent agent assigned; product snapshot frozen, aggregate and independent baseline reproduction pending.

Round 2 Critic additionally traced Spotify refresh/disclosure and checkout normalization; no supported new counterexample. One hypothesis consumed in each round; no finding quota.

## Independent verification and closure

FIND-01 verdict: **verified**. Verifier reproduced baseline from an isolated temporary archive of HEAD product sources with the regression spec, without altering the shared checkout. Fresh baseline build exit 0; two 375px light pointer/Enter cases exit 1 at dialog-hidden assertion. Patched snapshot independently passed:

- `bun run verify`: exit 0; dead-code, formatting, Astro/TypeScript, artifact validation, build and unit tests. Units: 221 passed, 8 skipped, 0 failed (229 tests in 61 files).
- `bun run test:browser`: exit 0; 146 passed. Includes 375/1280, light/dark, pointer/Enter, reduced motion, cross-page navigation, modified new-tab activation, Share/dialog focus and smooth scrolling.
- Standalone Find Escape/focus experiment: exit 0, focus restored to `#open-search`.
- `git diff --check`: exit 0.

Verified SHA256 snapshot:

```text
f98d5b0ee56d4ef734dd0cbe9be4de5baa2b35e7f6907d7de8bedf0914ae5c3a  src/client/dialogs.ts
e02d1383cf6e089d0e4f4cbaf9125007adf23b424ea6d0d8a577ff334eda486b  src/client/search.ts
da1dad88ad402f95457c7e67df954861681af242d41525064ad9cbffcad49ef5  tests/browser/search-index.pw.ts
```

Raw logs: `/tmp/portfolio-verifier-{verify,browser,baseline-build,baseline-browser,escape}.log`. Critic re-evaluated the frozen diff: no supported bypass or regression; no further edits. Coordinator independently compared snapshot hashes.

Limitations: Chromium only. Eight opt-in unit checks skipped; database/wallet/live payment acceptance remains outside this run. Synthetic payment fixtures do not establish real settlement. No publication, signing, deployment, commit, or merge performed.

Consumed budget: two rounds; one hypothesis each (FIND-01 verified, COPY-02 rejected for routine implementation). No repairs required. Stop reason: final round found no further supported eligible defects, followed by successful independent verification. Uncertain findings: none. Unverified patches: none. Remaining owner decision: reconcile manual-copy prose with intentional native-copy blocking if that policy should change.

Changed files: `src/client/dialogs.ts`, `src/client/search.ts`, `tests/browser/search-index.pw.ts`, this run record. Initial owner files `AGENTS.md` and `.agents/` preserved untouched. Patch remains uncommitted on `codex/portfolio-improvement-20261019`.
