# Repository Dead Structure and Strictness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove verified dead repository structure and add a CI gate that prevents unused code and dependencies from accumulating.

**Architecture:** Keep Astro's existing `strictest` TypeScript baseline, add Knip for the missing file/export/dependency graph checks, and explicitly model framework, script, and browser-test entry points. Audit assets, documentation, and content against runtime routes and external/publication semantics before removing anything.

**Tech Stack:** Astro 7, TypeScript 5.9, Bun 1.4, Knip 6.41.0, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-16-repository-dead-structure-design.md`

## Global Constraints

- Preserve all working-tree changes present before this task, including changes to `package.json`, `bun.lock`, `docs/home-embeds.md`, `src/content/home-embeds.ts`, `src/portfolio/embed-cache.ts`, and `docs/research/2026-10-16-niche-portfolio-projects.md`.
- Keep `tsconfig.json` extending `astro/tsconfigs/strictest`; do not repeat options it already enables.
- Treat Astro pages, components, command-invoked scripts, config files, and browser tests as intentional entry points.
- Remove files, exports, dependencies, assets, docs, or data only with evidence that they have no active runtime, publication, historical, or standalone purpose.
- Do not run unit or browser test suites unless the user separately asks for test execution.
- Do not add broad Knip ignore rules or a permanent issue baseline.

## Review Focus

- **Astro route exports appear unused:** rely on the Astro plugin's route entries; confirm endpoint exports remain entry points.
- **Manual scripts appear orphaned:** trace package scripts, CI workflow commands, and documented operator commands before removing any script.
- **Dynamic public asset URLs are missed:** inspect icon registries, layout metadata, generated social cards, OEmbed URLs, tests, and legacy fallback docs before deleting an asset.
- **Historical records appear unreferenced:** follow log, signature, timestamp, RSS, search, and proof relationships before changing content data.
- **Intentional documentation looks orphaned:** validate local links and whether research/audit documents serve as standalone records before deletion.

---

### Task 1: Add repository-wide static dead-structure analysis

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`
- Create: `knip.jsonc`

**Interfaces:**

- Produces: `bun run deadcode:check` runs Knip 6.41.0 with no issue types silently excluded.
- Knip's Astro plugin supplies Astro config and route entries; root configuration adds the separately invoked script, application server, and browser-test entries while keeping all source, config, and tests in the project set.

- [ ] **Step 1: Add Knip 6.41.0 as a pinned dev dependency and preserve existing manifest changes.** Use Bun to update the current `package.json` and `bun.lock`; do not reset either file.
- [ ] **Step 2: Create `knip.jsonc`.** Include the Knip v6 JSONC schema and `includeEntryExports: true`. Add entries for `src/gateway.ts`, `src/xmr/agent-host.ts`, `scripts/log-new.ts`, `scripts/log-timestamps-watch.ts`, `scripts/log-timestamps.ts`, `scripts/probe-wallet.ts`, `scripts/proofs.ts`, `scripts/publish-log.ts`, `scripts/rss-sign.ts`, and `tests/browser/**/*.pw.ts`. Include `src/**/*.{astro,ts,js}`, `scripts/**/*.ts`, and `tests/**/*.{ts,js,mjs}` as project files. Leave the Astro plugin's default config and page entries intact. Add narrow, commented exceptions for the host-provided GPG binaries and the browser test's runtime-generated `proof-fixtures.mjs` import.
- [ ] **Step 3: Add `deadcode:check` to `package.json`.** Set the script to `knip --include nsExports,nsTypes` so the standard findings plus namespace exports/types are reported; verify the manifest and lockfile retain the existing Vercel Blob dependency changes.
- [ ] **Step 4: Run the analyzer once and save its full report for Task 2.** Run `bun run deadcode:check`; classify each reported file/export/dependency as verified dead, a missed entry point, or intentional external use.

### Task 2: Remove verified dead structures across the repository

**Files:**

- Modify or delete: only the exact source, script, config, dependency, asset, documentation, or content files supported by the Task 1 report and repository reference audit.
- Modify: `knip.jsonc` only for narrow, explained entry-point corrections or analyzer-supported dynamic fixtures.

**Interfaces:**

- Consumes: Task 1's `bun run deadcode:check` report.
- Produces: a clean analyzer report and a reviewed repository inventory with intentional standalone/archive items retained.

- [ ] **Step 1: Resolve Knip findings.** Remove verified unused source files, exports, and dependencies; correct entry discovery where framework or documented commands consume a file. Add no directory-wide ignores.
- [ ] **Step 2: Audit public assets.** Check all `public/` files against runtime URL construction, icon registries, metadata, generated preview code, documented fallback URLs, and tests; remove only unreferenced assets with no active external/publication purpose.
- [ ] **Step 3: Audit docs and research notes.** Check local references, duplicated/superseded instructions, and standalone archival purpose. Repair broken local references or remove only clearly obsolete documents.
- [ ] **Step 4: Audit content/data records.** Follow each candidate through route generation, search, feeds, signatures, timestamps, proofs, and public URLs; preserve records participating in those flows.
- [ ] **Step 5: Re-run `bun run deadcode:check` after each cleanup group.** Continue until the report is clean without broad suppressions.

### Task 3: Enforce the dead-structure gate in CI and validate the result

**Files:**

- Modify: `.github/workflows/ci.yml`
- Review: `tsconfig.json` (change only if inspection finds an existing strict option was overridden; otherwise leave it unchanged)

**Interfaces:**

- Consumes: Task 1's `bun run deadcode:check` and Task 2's clean report.
- Produces: main CI check job fails on an unhandled Knip finding; existing type strictness remains in effect.

- [ ] **Step 1: Add `bun run deadcode:check` to `.github/workflows/ci.yml`** immediately after dependency installation and before build/test work.
- [ ] **Step 2: Verify the resolved TypeScript config.** Run `bun run tsc --showConfig` and confirm `noUnusedLocals`, `noUnusedParameters`, `allowUnreachableCode`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, and `noFallthroughCasesInSwitch` are enabled through Astro `strictest`; do not add duplicates.
- [ ] **Step 3: Run static validation.** Run `bun run deadcode:check`, `bun run format:check`, `bun run check`, and `bun run build`. Do not run `bun test` or browser tests.
- [ ] **Step 4: Inspect the final diff and status.** Confirm the user's pre-existing working-tree changes are preserved and all deletions have evidence in the audit.
