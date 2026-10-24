# Portfolio report implementation ledger

Plan: `docs/superpowers/plans/2026-10-21-portfolio-evidence.md`.
Baseline HEAD: `79bd487c3fe6edc0c0fb710f1c5d7ac0d1dee61d`; branch `codex/legacy-structure-cleanup` with the previous verified cleanup uncommitted. Preserve it throughout.
Owner scope: apply the complete attached report in order. Work design reviewed; owner instructed proceeding. Execute locally without further routine confirmations. No signing, publishing or live payment experiments.

Pre-flight: Work registry supplies the source roots for architecture and evidence generation; provider snapshot schemas already contain updatedAt/stale. Evidence must not import provider network code into static Work rendering.
Ruling: use two case studies of actual repository subsystems, explicitly described as parts of this portfolio, rather than inventing independent products.
Ruling: maintain the current shared branch/checkout; creating a worktree from HEAD would exclude the prior uncommitted cleanup and review the wrong source snapshot.

## Task 1

GitHub run 39601006500 / job 119225182676 failed typed lint with 24 errors; later check/build/tests skipped. Read-only Actions logs match the report.
A temporary tracked-current snapshot with dependencies linked and `.astro` absent reproduced exactly 24 lint errors. `astro sync` then lint both exited 0 without suppression changes.
Implemented sync preparation inside the lint and type-coverage package commands; direct local and CI callers now use the same order. Final clean-snapshot repeat pending.

Remaining tasks: 2–9 pending; no claim of completed main CI or production measurements.

## Implementation and owner steering

Tasks 1–8 implemented locally. Owner explicitly removed last-success update rows from the design; X/GitHub/Spotify retain timestamps internally but render no such line. Owner confirmed Work should stay while sharing the existing Log card/article standard. `EntryCard.astro` now owns both Log and Work cards; Work article headers use the same sigil/layout and `log-content.css` body typography. No case-study publication date or signature badge was invented.

- Work: two validated same-repository case studies, real source/test paths, canonical routes, previews/search/sitemap, source/limitations and bounded module disclosure. No signed Log record was changed or published.
- Providers: independent private Blob keys, existing Spotify pathname retained; schema-validated snapshots survive cold starts and fail stale without claiming old playback is current. Provider Engineer ran 27 focused tests and focused lint.
- Native content: global selection/copy/contextmenu blockers removed; code-copy controls additionally use actual DOM guards instead of three non-null assertions and an unsafe clone assertion.
- Styles: Log layout/tags/sources/diffs/subjects use shared StyleX. Generated body selectors moved unchanged to shared `log-content.css`; sigil's structural generated-SVG selector remains deliberate.
- Documentation: README and development/operational boundaries expanded, including fresh-checkout preparation, fixtures, deployment and evidence limits.
- Dependencies: exact-lock CycloneDX inventory and scheduled audit artifacts. Audit findings/tool failures propagate after artifact retention. No blind wallet or OTS dependency upgrades and no ignored advisory IDs.
- Performance: default-disabled, first-party web-vitals LCP/INP/TTFB observations, coarse public page groups only, DNT honored, no full URL/query/IDs/payment pages. Enabled HTTP probe: 5 cases passed (valid, foreign Origin, extra fields, private category, oversized body).
- Raster: responsive AVIF with WebP fallback preserves portrait content/provenance. At equal quality 80, 96px: 3604→3363 bytes; 240px: 15920→12695; 480px: 56910→47069. Existing PNG favicon/social assets retained.

## Independent review and repair

Read-only whole-branch reviewer found two important issues: missing policy/patch/public inputs in receipt hashing, and an audit step that did not propagate its failure. Both repaired and independently rechecked. New `source-snapshot.test.ts` was red before implementation, green after: changes to six formerly omitted inputs invalidate the digest; generated evidence remains excluded. `source-snapshot.ts` hashes runtime/check inputs, configuration, patches, CI policy and public inputs; documentation-only edits and generated outputs are explicitly excluded. Final audit failure step runs after upload. Reviewer found no further important issue in those repairs.

## Validation history and honest limits

Earlier aggregate: 255 passed, 8 skipped, 0 failed; source changes during an owner-directed update correctly caused receipt refusal rather than attaching a success to different source. Final aggregate/layout run pending below.

Full Chromium run before final layout: 184 passed, 7 failed. Five failures were stale assumptions that searching Monero returns only Contribute; the new real Work study correctly adds a second result. Updated tests assert both destinations and retain exact target checks. The Log publication test required the old exact `user-select: text`; it now permits native `auto`, with its real selection/copy checks retained. One geometry renderer crashed and requires a focused repeat; no assertion was weakened for it.

Initial built checkout found Work's visible intro missing the shared page-description marker; added the actual canonical description instead of weakening the test. Retest pending below.

Three-engine smoke before final layout: Chromium/Firefox 4 passed. WebKit initially could not launch on this Arch host due missing Ubuntu runtime libraries; verifier extracted official Ubuntu packages under `/tmp/portfolio-webkit-runtime`, resolved every ldd dependency and ran unchanged tests against a separate loopback fixture: 2 passed. No system packages, browser-cache files or repository source changed for this workaround. CI installs engine dependencies on Ubuntu.

Local SSR measurement: 20 sequential loopback requests, first TTFB 505.6ms / full response 987.3ms; subsequent 19 observations p95 TTFB 11.2ms / full response 12.0ms. This is a process/cache-dependent local observation, not a controlled fresh-process cold-start result, real-visitor percentile or cost claim. Raw `.local/home-performance.json`; repeat with `bun run measure:home` against a running local production fixture. Keep current home `no-store` until deployment evidence justifies a different freshness contract.

Read-only Vercel lookup found the linked portfolio project. Observability schemas were available, but scoped metric queries returned HTTP 400; no production latency/cost/traffic distribution was obtained. No project configuration, paid feature or telemetry was enabled remotely.

`bun audit --json` reported 17 advisories across 13 transitive packages, including a critical form-data advisory. `bun audit fix --dry-run` fixed zero: some updates are outside dependency ranges; several have no published fix. Existing request patches remain, but the audit does not recognize a patch as an advisory clearance. This work exposes and gates that debt; it does not claim it is resolved. Reports are in `.local/dependency-audit.json` and `.local/sbom.cdx.json`. Real dependency fixes require targeted compatibility work, especially the wallet/OTS chain.

Main CI and deployment remain externally pending: local changes have not been committed/pushed/deployed. No live Monero scanning/settlement/reorg was exercised. Eight opt-in integration tests are skipped by the aggregate; the isolated built checkout is separately enabled. No new Logs were signed or published.

## Final owner-aligned layout checks

Work remains, as explicitly confirmed by the owner, but uses the Log card/article standard. A new parity check caught the old duplicate-class attribute pattern inherited by the extracted card: browser parsing kept the atomic class attribute and dropped semantic `h-entry`. Shared cards now merge all semantic/atomic classes with `class:list`; title/link/summary use the same safe merge. The checkout test checks the semantic class token without requiring it to be the only CSS class.

Visual inspection of the desktop screenshot caught a portrait wrapper regression from `Image`→`Picture`: layout attributes on the nested img no longer placed the picture across both introduction rows. The new desktop text/heading-gap regression failed at 252px (limit <120px). Applying the existing layout attributes to Picture's wrapper restores the original grid placement, while its img retains dimensions/object-fit. Test geometry uses real null guards instead of non-null assertions.

Full Chromium after owner layout: 191 passed, 2 new parity tests failed on the missing semantic class; both addressed as above. Earlier search/native-selection failures no longer occurred. Geometry crash did not recur; all geometry cases passed. Built checkout reached 134 assertions then found its old sitemap-count expectation omitted the two Work detail routes; expected count now includes the actual canonical Work paths.

Verification continued until the source stopped changing; an interim new geometry assertion increased a counted non-null rule and was rejected by lint. Added explicit geometry availability guards and pruned only genuinely resolved suppressions; no allowance increased. Final check/build/browser/checkout results follow after the final source snapshot.

Final aggregate on the accepted source snapshot: `bun run evidence:verify` exited 0, covering the unchanged-threshold Knip/format/lint/type/architecture/check/build/unit gate. **255 passed, 8 skipped, 0 failed**; type coverage **98.20%** with a **98.08%** threshold. The matching public manifest records the actual successful aggregate and source digest. Independent review also accepted the semantic-class merge, Picture wrapper ownership and Work sitemap test update.

Counted lint debt fell from the starting 1,304 findings to **1,273** through real deletions and DOM/geometry guards. This is an incremental reduction, not zero debt; no suppression rule/count was increased to pass.

## Final verification handoff

Accepted final source/build:

- `bun run evidence:verify`: exit 0, 255 unit tests passed, 8 opt-in tests skipped; formatting, dead code, lint, 98.20% type coverage, architecture, type check and verified production build all passed.
- `bun run test:browser`: exit 0, **193 passed**. Includes Work/Log appearance parity at 375/1280px, no-JavaScript Work content, final portrait layout, copy/contextmenu restoration, search, dialogs, publication fixtures, mobile/themes and all geometry cases.
- `bun run test:smoke -- --project=chromium --project=firefox`: exit 0, **4 passed**.
- Final WebKit verifier rerun using the documented temporary compatible libraries and separate local fixture: exit 0, **2 passed**. Existing source tests/assertions unchanged.
- `TEST_CHECKOUT=1 bun test tests/checkout.test.ts`: exit 0, **1 passed, 197 assertions**. Synthetic gateway only.
- Optional enabled vital-receiver HTTP probe: 5 passed; default-disabled route/browser behavior covered in Work suite.
- Independent source review accepted the important repairs and final shared-layout changes. Screenshot inspection confirmed the introduction returned to its original two-column geometry.
- `git diff --check`: passed. Final documentation-only edits are outside the declared source digest and were separately formatted.

All locally implementable plan tasks are complete. Remaining external limits are the recorded main-CI/deployment execution, 17 dependency advisories requiring targeted compatibility work, and real-traffic/cost/live-wallet measurements. No commit, push, deployment, publication, signing or live payment was performed.

## Follow-up: Work publication and Sources parity

Owner reported that visual parity alone was incomplete: Work lacked the actual Verified system and had a bespoke Sources block. Corrected the data ownership, not just its appearance. Work now selects standard Log records; no independent article-body, signature or source-rendering format remains. The new case-study drafts use the existing randomized three-word Log ID generator and Log schema, Markdown renderer and numbered Sources. Cards use LogCard and details use LogArticle/LogRevision/LogSources directly. The architecture/check-receipt disclosure is an optional shared article attachment, not an alternative authorship proof or Sources list.

Prepared drafts remain outside signed publication stores and are honestly labeled Draft. `work:publish` prepares them in the existing publication transaction and delegates the actual signing/publication gates to `publish-log --staged`; it never rewrites an existing published revision. Once published, Work cards link to the canonical Log and its shared Verified proof page/archive, with the true signature gate. Draft templates do not override published source.

Unit regression tests demonstrate real PGP verification using a generated local fixture key, rejecting changed body and Sources bytes. No owner key, live publication store or production service was used. Existing signed content/signatures/manifests remain unchanged. Actual new-content signing remains a separate owner approval step after the concrete draft and code are verified.
