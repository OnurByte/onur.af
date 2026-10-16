# Log Completion Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task in the current checkout. Preserve existing user changes.

**Goal:** Finish the requested signed-log content system and add inline/display LaTeX.

**Architecture:** Keep exact signed Markdown as the source. Derive math HTML, optimized public image variants, related/backlink navigation and revision diffs without changing signed bytes. Use the existing Astro/StyleX visual language.

**Tech Stack:** Astro, micromark, KaTeX, Sharp, diff, Bun, Playwright.

**Spec:** User-provided attachment and follow-up “bitir latex desteğide ekle”; existing requirements in docs/log-and-proofs.md.

## Global Constraints

- Preserve current signed entries, proofs, timestamps and publication editions.
- Preserve uncommitted user changes and the existing monochrome design.
- Keep raw HTML escaped and unsafe math commands disabled.
- Serve fonts and generated images locally; no browser math CDN.
- Keep image alt validation and editorial tag indexing.

## Review Focus

- Math inside code must stay literal; malformed math must fail publication and dangerous commands cannot create active URLs.
- Image optimization must reject missing assets, traversal/symlink escapes and false cover dimensions, preserve animated/vector originals, and work in production builds and development.
- Related/backlink results must exclude self/external lookalikes and use only current revisions.
- Diffs must show actual signed metadata/body changes, escape markup and omit distant unchanged content.
- Mobile math, images and diff views must not overflow the viewport; existing proof downloads must still verify.

### Task 1: Math and reference blocks

Files: src/portfolio/log-markdown.ts, src/components/LogRevision.astro, tests/log-content.test.ts.

- [x] Add failing tests for inline/block math, code literals, invalid/unsafe TeX and reference callouts.
- [x] Add micromark math/KaTeX with bounded expansion and local CSS/fonts; process callouts with the existing HTML tree.
- [x] Run content tests and type checking.

### Task 2: Image pipeline

Files: src/portfolio/log-images.ts, integrations/log-images.ts, astro.config.ts, src/components/LogRevision.astro, tests/log-images.test.ts.

- [x] Add failing tests using real temporary raster/vector/animated inputs, invalid paths, missing files and cover dimensions.
- [x] Generate content-addressed WebP widths and a virtual build manifest; apply dimensions/srcset in body and cover HTML. Regenerate on relevant development edits.
- [x] Verify actual output metadata and rendering.

### Task 3: Connections and diffs

Files: src/portfolio/log-connections.ts, src/portfolio/log-diff.ts, src/components/LogArticle.astro, src/components/LogDiff.astro, tests/log-connections.test.ts, tests/log-diff.test.ts.

- [x] Add failing tests for tag ranking, backlinks, current-revision filtering, external lookalikes and real contextual signed diffs.
- [x] Render related/referenced navigation and change disclosures in History.
- [x] Run targeted tests.

### Task 4: Complete integration and verification

Files: tests/browser/log-publication.pw.ts, src/pages/pgp/[proof].astro, docs/log-and-proofs.md.

- [x] Extend the signed browser fixture with math, optimized images, linked entries and changes; verify mobile layout, accessibility, local assets and proof downloads.
- [x] Reproduce and fix the account badge regression without weakening its test.
- [x] Update authoring instructions, run bun run verify and relevant/full browser tests, inspect rendered output and audit every requirement.

## Completion evidence

- `bun run verify`: format, Astro/TypeScript checks, all proof/feed/timestamp/publication verifiers, production build, and 147 passing Bun tests; 8 environment-dependent tests skipped.
- Full `bun run test:browser` with Chromium: 104 passing tests.
- The signed integration fixture covers math/MathML, real optimized asset responses, source callouts, tag navigation, related/backlinks, revision changes, mobile accessibility, clipboard, exact proof downloads, independent GPG verification, and development image refresh.
- Fresh read-only review found two issues; failing regressions reproduced each, and both fixes pass: archived tag-link changes and generated output leaf symlinks.
- Existing published log/proof/timestamp/publication files have no diff. No reset, commit, push or deployment was performed.
