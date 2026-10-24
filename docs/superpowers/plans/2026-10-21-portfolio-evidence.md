# Portfolio evidence implementation plan

> Execution: native in the current session using executing-plans; one independent final review. Owner approved applying the supplied report and said to proceed with the Work design. No repeated permission handoffs for reversible local implementation.

**Goal:** Apply the portfolio report in order, delivering reliable checks, usable native interactions and honest, source-backed project evidence.
**Architecture:** Extend existing Astro/StyleX routes and validated registries; retain normalized provider adapters and current signed publication stores. Derive public engineering evidence from the exact source snapshot; never imply proof of live payments.
**Spec:** `docs/superpowers/specs/2026-10-21-portfolio-evidence-design.md`.

## Global constraints

English visitor UI, first-person content, monochrome system themes, shared StyleX/edge treatment. Preserve all prior legacy-cleanup changes. No publication/signing/deployment, production writes or default tracking. Keep secrets and payment records out of artifacts. Keep existing checks strict; prune resolved suppressions only. Work studies are two real subsystems in this repository, clearly identified as such.

## Review focus

- Clean checkout without `.astro`: lint and coverage generate their own required types.
- Provider cold restart/outage/corrupt cache: only validated previous data can be stale, Work stays available.
- Dirty build evidence: visible dirty state and source digest, no fabricated passed check or attestation.
- Reduced motion/no JS/Firefox/WebKit: graph, dialogs and native text remain usable.
- Signed history: new content and routes cannot rewrite signed bytes or require private signing keys.

### Task 1: Fix clean-checkout CI

Files: package.json; audit ledger.
Interface: existing lint and type-coverage scripts prepare Astro types before their checks.

- [x] Reproduce original 24 failures in a temporary current snapshot without `.astro`.
- [x] Run Astro sync and establish lint passes without changing suppressions.
- [x] Add `astro sync &&` to lint and coverage scripts.
- [x] Repeat both commands from a clean generated-type snapshot; record external GitHub run still pending push.

### Task 2: Restore native content interactions

Files: src/styles/global.css, src/client/site.ts, tests/browser/site-behavior.pw.ts.
Interface: text selection, copy and contextmenu use native defaults; existing Copy button API unchanged.

- [x] Change browser assertions to selectable content and uncancelled native events; observe baseline failure.
- [x] Remove global selection and event blockers, retain drag-local selection restrictions.
- [x] Run site-behavior and action-feedback tests against fresh build.

### Task 3: Work registry and routes

Files: src/content/work.json, src/portfolio/work.ts, src/styles/work.ts, src/components/WorkList.astro, src/pages/work/index.astro, src/pages/work/[id].astro; home, search, SEO/previews/schema integration; focused tests.
Interface: validated `workEntries`, `workUrl(entry)` and stable local IDs `signed-publication`/`monero-contributions`. Each record supplies problem, approach, decisions, limitations, source/test paths and existing Log IDs. No new Log publication.

- [x] Test invalid IDs/paths/unknown Log links and two real works with source/test references.
- [x] Implement registry and reusable card/detail layout, canonical metadata/search/sitemap integration.
- [x] Browser-test source links, unavailable-provider independence, mobile/themes/keyboard.

### Task 4: Provider persistence and health

Files: src/portfolio/embed-cache.ts, src/content/home-embeds.ts, provider adapters, home/Spotify status templates; cache/source/browser tests.
Interface: existing `EmbedCache.read/write(id)` covers isolated X/GitHub/Spotify durable keys; existing `updatedAt` is last successful provider observation and `stale` is explicit.

- [x] Fixture tests for separate durable keys and cold restart with provider failure/corrupt cache.
- [x] Generalize Blob keys without losing existing Spotify key; use durable cache for all Vercel sources.
- [x] Keep last-success internal and expose concise stale status (owner follow-up); run provider and source-rendering tests.

### Task 5: Cross-browser and style ownership

Files: dedicated Playwright smoke config/tests, .github/workflows/quality.yml, applicable Log styles/docs.
Interface: independent `test:smoke` command runs Chromium/Firefox/WebKit against the built local fixture; full Chromium suite unchanged.

- [x] Smoke tests native navigation, modal, selection, scroll and readable glass across engines.
- [x] Add bounded CI installation/run; ensure Knip/lint/TS see the new config.
- [x] Audit Log scoped CSS; migrate presentation rules only, document necessary generated Markdown/KaTeX selectors.

### Task 6: Evidence manifest and architecture

Files: src/portfolio/build-evidence.ts, scripts/build-evidence.ts, integration/build hooks, work detail component/styles; tests and CI artifacts.
Interface: deterministic graph JSON plus optional build receipts with full revision, dirty flag/source digest, actual check commands/status/time, and public source/test links. Never expose env/absolute local paths.

- [x] Test malformed/path-traversing/false success receipts, dirty snapshots and deterministic graph filtering.
- [x] Generate graph using dependency-cruiser and validated work roots. Keep accessible module list/details as baseline.
- [x] Record only commands really executed; no receipt means unavailable. Link public CI runs/attestation only when supplied and verified.
- [x] Integrate source-at-revision links and truthful evidence limitations into Work pages.

### Task 7: Documentation, dependencies and typing debt

Files: README.md, docs/development.md (if needed), audit/SBOM script/workflow, touched type suppressions.
Interface: reproducible setup/verification and retained machine-readable SBOM/dependency audit artifacts.

- [x] Add architecture, local development, adapters/deployment and security boundaries.
- [x] Add scheduled dependency audit + CycloneDX/SPDX-compatible dependency inventory with exact locked versions and hashes where available; fail actual audit findings clearly.
- [x] Replace unsafe types in touched modules with guards/schemas, then prune old suppressions without increasing counts.

### Task 8: Performance and raster audit

Files: local performance measurement script/docs, portrait format output, opt-in browser vitals integration and fixture tests.
Interface: repeatable local cold/warm timings and bounded request counts; no production cost claims. Opt-in same-origin vitals receiver contract remains disabled by default.

- [x] Measure provider timeout isolation and page TTFB samples before choosing cache policy.
- [x] Provide optional LCP/INP/TTFB measurements with no identifiers/query paths and no default delivery; document deployment metrics/cost dependencies.
- [x] Compare responsive AVIF portrait against current WebP; preserve compatibility/provenance files and readable appearance.

### Task 9: Final verification and review

- [x] Run focused unit/browser checks, `bun run verify`, and three-engine smoke where installed.
- [x] Independent read-only reviewer checks final diff and exact verification snapshot; fix confirmed important regressions once, reverify affected checks.
- [x] Record completed, externally pending and blocked items; leave changes reviewable without automatic commit/push/deploy.
