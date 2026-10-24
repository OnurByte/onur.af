# Landing Focus Implementation Plan

> Execute inline with superpowers:executing-plans; preserve existing dirty checkout.

**Goal:** Reduce landing clutter without removing personal values or access to content.
**Architecture:** Existing Astro SSR and StyleX; compact technology presentation, native progressive disclosure for provider lists, independent Connect.
**Tech Stack:** Astro, StyleX, Playwright, Bun.
**Spec:** docs/superpowers/specs/2026-10-24-landing-focus-design.md

## Constraints

English UI; existing signed introduction and proofs unchanged. No new dependencies, publication, signing, deployment, or changes to provider semantics. Existing source modifications retained. No commit requested.

## Review focus

No-JS and keyboard access to remaining feed entries; no loss of source state messages; Connect independent of feeds; collapsed content must not break rail headings; narrow layout must retain readable type and links.

## Task 1: Compact presentation and ordering

- [x] Add browser coverage that catches buried contact access, oversized technology block and inaccessible remaining feed links. Run against baseline build to observe failure.
- [x] Move Connect out of HomeEmbeds into the primary landing after Logs. Compact technology groups; preserve all names. Extract existing provider item rendering into one component and split preview/remainder into native lists/details without duplicate content.
- [x] Update related layout docs and tests whose old geometry assumptions include hidden rows.
- [x] Run focused browser tests, check/build/unit suite and relevant accessibility/scroll tests. Inspect screenshots and before/after metrics.
- [x] Independent Luna review, address concrete issues, record actual results and remaining limits.

## Ledger

Baseline HEAD 79bd487c3fe6edc0c0fb710f1c5d7ac0d1dee61d plus existing dirty changes. Same checkout retained because HEAD worktree would exclude the work being improved. User's latest instruction authorizes the value-preserving strategy; implementation choices stated in chat. No repeated approval requested. Design and implementation plan recorded before product edits.

Ruling: visual review found the first Log looked like a third Work card because the existing Logs section had no visible heading. Add a plain Logs heading/link so the preserved writing has its own clear place. No copy rewrite or new CTA styling.

## Completion evidence

- Regression first: two new light/dark no-JavaScript cases failed on baseline because Connect was below the technology catalog. After implementation both pass, retaining private-values copy, both Work entries, representative technology names and keyboard access to every remaining provider link.
- `bun run check`: exit 0, 0 errors/warnings (73 existing hints); repeated after final Logs heading.
- `bun run build`: exit 0; repeated after final heading. No publication/signing command executed.
- `bun test`: exit 0, 258 passed, 8 skipped, 0 failed.
- `bun run lint`, `bun run deadcode:check`, scoped Prettier and `git diff --check`: exit 0.
- Focused browser run: 35 passed, one failure caused by overly broad test-selector edit including Spotify hidden history. Restored Spotify's original selector; reran home-embeds: 3 passed. After final heading, home-focus/home-embeds/scroll-rail: 23 passed. Earlier passing focused cases additionally cover introduction, Work, smooth scrolling. Full browser suite and real payments were not run.
- Independent Luna source review found no concrete issue in the new presentation and content-preservation changes.
- Final Playwright measurement and axe: 1440x900 and 390x844, light/dark, reduced motion; both provider disclosures exercised open/closed. Zero WCAG-tagged axe violations in all eight states; no horizontal overflow. Initial measurement harness needed explicit browser.newContext for axe and was corrected before results were accepted.
- Final desktop height 2899px, Connect y=1520, technology group height 396px. Final mobile height 4241px, Connect y=1917, technology group height 691px. Compared with audit observations 4118/6190px, roughly 30%/31% shorter. Random motto and provider/Spotify state vary, so these are observed comparisons rather than controlled identical-content A/B measurements. Connect now appears in the third mobile screen region rather than seventh.
- Final screenshots and raw metrics: `.local/landing-focus/390-light.png`, `390-dark.png`, `1440-light.png`, `1440-dark.png`, `measurements.json`. Coordinator visually inspected mobile light and desktop dark results.

Changed scope: home ordering, technology presentation/styles, extracted shared EmbedItem, native provider disclosure/styles, related browser tests, brand/design/embed docs and this design/plan. Existing unrelated dirty changes preserved. No commit, push, signing, publication or deployment.
