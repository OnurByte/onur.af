# Unified Scroll Rail Implementation Plan

**Goal:** Complete the owner-supplied Unified Scroll Rail spec, then integrate all application changes into main.
**Architecture:** Keep native document scrolling and the existing smooth-scroll engine. Mount one progressive-enhancement rail in Layout; discover explicitly marked sections and current article headings. Reuse navbar glass material and its animation scheduler with a bounded optical map for tall surfaces.
**Spec:** Owner attachment `pasted-text-1.txt` supplied 2026-10-20.

## Constraints

English visitor text, no numeric heading prefixes, shared StyleX and edge material, no extra continuous animation loop, no live payment/publication/deployment changes. Preserve existing Find/Share edits.

## Review focus

- No JavaScript: retain native scrollbar and scrolling.
- Modal open: background rail cannot move or cover the modal.
- Dynamic content, fonts and viewport changes: refresh cached positions outside scroll handlers.
- Hover, focus and Escape: panel remains reachable and dismissible.
- Long pages and short pages: real scroll geometry and no empty contents control.

## Tasks

1. Add browser regression coverage for global rail, document scroll mechanics, semantic sections, keyboard navigation, modal lock and no-JS fallback; run it to establish missing behavior.
2. Extract shared glass surface styles/runtime; bound map pixel cost and remove single-seed motion cache churn. Implement global rail controller with cached geometry, native anchor/history/focus semantics, keyboard and pointer scrolling. Mark meaningful sections and remove LogContents.
3. Update obsolete rail tests and design contract. Run focused browser tests across available engines and preference/viewport matrix, then repository checks/build/unit/browser suites. Review all diffs, commit application changes, fast-forward main, and report any unavailable verification.

## Owner revisions during implementation

- Restore compact external serrated ticks, active width and per-section fill; remove full-height editor-style track and hamburger.
- Use Logs in home navigation, fix actual glass transparency with a separate edge ring.
- Share custom internal scrollbars across Find, Share and contents; style remaining native fallback scrollers consistently.

## Completion evidence

- Shared rail and nested scrollbar implementation completed, including the owner's compact teeth, active width/fill and external gutter revisions.
- Independent review findings resolved: stable navigation focus during live updates, transparent border separation, pointer release outside the rail and visible dark-theme progress.
- `bun run verify`: passed (dead-code, formatting, Astro/TypeScript, production build and 231 unit tests; 8 environment-gated skips).
- `bun run test:browser`: 181 passed in Chromium.
- Focused Scroll Rail suite in Firefox: 18 passed, including the no-JavaScript scrolling path, short viewport, contrast fallback, dynamic headings, section progress, modal lock and custom Find scrollbar.
- `TEST_CHECKOUT=1 bun test tests/checkout.test.ts`: 1 passed with a local fake gateway.
- WebKit 27.2 was downloaded, but launch is blocked by unavailable host libraries (`libicu74`, `libxml2`, `libflite1`); no WebKit behavior claim is made.
- No live payment, publication, content signing or deployment was used for validation.
