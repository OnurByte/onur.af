# Design and StyleX audit

Date: 2026-10-20
Scope: Review-only general design review with a focused audit for styling that bypasses StyleX. No application edits requested.
Budget: One round, up to three prioritized hypotheses, no implementation.
Baseline revision: `dc470dacd75de3ba838b61a53e8b9ef81a074617` (`main`, matching `origin/main`).
Starting working tree: no tracked changes; pre-existing untracked `.playwright-mcp/`, `.serena/`, and `opencode.json` were left untouched.
Target snapshot: current checkout plus read-only local observations at `http://127.0.0.1:3131/` and `/log/cryptic-watchtower-watches`.
Roles: Coordinator reviewed project guidance and source and observed local pages; delegated Critic independently scanned StyleX usage. No code Verifier phase because this is review-only.

## Findings

### DX-01 / round 1 / design-system drift / low impact / high confidence

Claim and user impact: The shared body line-height is 1.7 while the brand and design standards specify 1.6. This subtly changes the site's vertical rhythm and means implementation no longer matches its documented typography.

Observed evidence / inference / disproof experiment: `src/styles/global.css:28` sets `--leading-body: 1.7`; `src/styles/shell.ts:11` applies it to the entire document body. `docs/design.md:6` and `brand.md:73` both specify 16 px / 1.6. Inference: ordinary body text and most inherited UI therefore render at 1.7. A computed-style check across a utility page would confirm the effective browser value; no conflicting decision was found in the inspected design docs.

Affected paths or route / relevant invariant: `src/styles/global.css`, `src/styles/shell.ts`; all routes. Preserve the documented 16 px / 1.6 typography invariant unless the owner updates the design decision.

Engineer decision: confirmed.

Decision evidence / baseline reproduction: Direct source comparison establishes the mismatch; local home and Log views showed coherent typography but do not establish the numeric computed value.

Patch and regression check: None; review-only.

Verifier snapshot / commands / exit codes / observed results: Not applicable; no test or build commands run.

Verdict: not-applicable.

Critic re-evaluation / remaining uncertainty: The visible difference is modest, and a deliberate 1.7 choice is plausible. If intentional, update the design documents rather than leaving the standard ambiguous.

### SX-01 / round 1 / StyleX ownership / medium impact / high confidence

Claim and user impact: Several authored component styles still live in Astro `<style>` blocks instead of the repository's StyleX modules. These rules own visible layout, spacing, typography, and link treatment, so design changes are split across styling systems and can drift from shared conventions.

Observed evidence / inference / disproof experiment: Scoped CSS remains in `src/components/LogArticle.astro:167-210`, `LogTags.astro:19-37`, `LogSources.astro:53-86`, `LogDiff.astro:39-69`, `LogSigil.astro:7-17`, and `src/pages/log/tag/[tag].astro:83-94`. The largest bypass is `src/components/LogRevision.astro:68-240`, a 173-line global block styling the generated Markdown presentation. `docs/stylex.md:19-34` says StyleX definitions belong in `src/styles/*.ts`, applied by `stylex.attrs()`, and that component spacing, typography, and controls belong in StyleX. This contradicts that guidance at source level. `LogRevision` is partly an architectural edge case because Markdown and KaTeX generate nested HTML that cannot directly receive Astro `stylex.attrs()`; this warrants a deliberate styling boundary rather than treating every selector as accidental.

Affected paths or route / relevant invariant: Log article, Log tag, Log history, and generated Markdown styles; keep component presentation in StyleX and global CSS limited to the documented reset/tokens/accessibility/QR needs.

Engineer decision: confirmed for ordinary authored component/page blocks; uncertain for generated Markdown and vendor math markup.

Decision evidence / baseline reproduction: Source inspection found six authored style blocks plus the substantial generated-content style block. Static and live home/Log observations confirmed that the user-facing pages use a shared restrained monochrome language, but did not prove CSS parity at all breakpoints/themes.

Patch and regression check: None; review-only.

Verifier snapshot / commands / exit codes / observed results: Not applicable; no test or build commands run.

Verdict: not-applicable.

Critic re-evaluation / remaining uncertainty: Keep microformat classes (`h-entry`, `p-name`, `dt-published`, and similar), generated-content hooks, third-party KaTeX CSS, and runtime CSS custom-property updates out of the bypass count. A migration would need visual comparison at the existing mobile/desktop and light/dark states.

### UX-01 / round 1 / content repetition / low impact / medium confidence

Claim and user impact: The local home page currently renders the same X post twice, consuming one of the five visible slots and making the activity feed feel less curated.

Observed evidence / inference / disproof experiment: The live local accessibility snapshot contained the same `x.com/onurstirner/status/2112551364320780607` link and text twice. `src/portfolio/home-embed-adapters.ts:141-144` filters only empty text, takes five results, and maps them without deduplicating status IDs; `HomeEmbeds.astro` renders each supplied item. Inference: when the provider returns duplicate statuses, they are shown as separate cards. The smallest disproof is to inspect a fresh provider/cache snapshot and confirm whether the duplicate is transient input or generated elsewhere.

Affected paths or route / relevant invariant: Home Tweets section; preserve five distinct useful posts when provider data repeats an ID.

Engineer decision: confirmed for the observed snapshot; root cause uncertain between cached/upstream duplicate input and missing adapter deduplication.

Decision evidence / baseline reproduction: Duplicate URL and text were visible twice in the local browser's accessibility tree. No live provider refresh was performed.

Patch and regression check: None; review-only.

Verifier snapshot / commands / exit codes / observed results: Not applicable; no test or build commands run.

Verdict: not-applicable.

Critic re-evaluation / remaining uncertainty: The repeat may disappear when the embed snapshot refreshes. Recheck source data before changing the adapter.

## Other observations

- Answer to the StyleX question: **yes**. Most current app structure uses StyleX, but Log-related content still includes notable non-StyleX presentation, especially generated Markdown and its smaller surrounding components.
- Static source scan found no author-written `style=` attributes. `style.setProperty()` usage in clients handles measured/dynamic values such as scroll progress, element dimensions, and glass optics; it is not a second static style authoring system.
- Current local screenshots at the available 560 px viewport showed the expected black/white theme, aligned header, restrained borders, readable Log heading/sigil pairing, and a consistent page voice. No obvious fold-level spacing or overflow issue was visible in those two views. Desktop and light-theme appearance were not observed.
- `src/styles/global.css:174-185` disables text selection across the page and re-enables it only inside Log content. This appears to impede ordinary selection on PGP/donation utility pages and is stronger than needed for layout styling. The local source makes the effect clear; browser-computed behavior was not independently checked. Consider a separate accessibility review before deciding whether this is intentional.
- The `global.css` rail hover/focus selector (`:222-226`) is another small StyleX bypass; the rail already has StyleX definitions in `src/styles/scroll-rail.ts`.
- CSS reset, theme tokens, focus/reduced-motion behavior, QR defaults, scrollbar handling, microformat classes, generated-Markdown hooks, runtime measured properties, and KaTeX's vendor stylesheet are deliberate or documented exceptions and should not be migrated mechanically.

## Run summary

Consumed budget: one round; three findings.
Stop reason: requested review-only scope is complete; no implementation was authorized or required.
Changed application files: none. Added this audit record only.
Checks run: source searches and read-only local browser observations; no tests, type checks, or build were run.
Unresolved items: whether body line-height 1.7 is intentional; the intended StyleX boundary for generated Markdown; whether duplicate X statuses are transient; whether global text-selection suppression is an intentional interaction choice.
