# Source cleanup review

Scope: remove proven dead code, stale structures and unnecessary complexity while preserving behavior and existing owner work. Budget: at most two rounds, three hypotheses each, sequential edits.

Baseline HEAD: `2443a5905fdb86febd2e71b58c9354a7a0440923`. Target: current dirty working tree, including ongoing witness, annotation, selection, cursor, layout and static-content changes. Original status captured in `/tmp/onur-cleanup-baseline-status.txt`; no reset, stash, commit or deployment. Remain in this checkout because a HEAD worktree would exclude the actual target under review.

Roles: independent read-only Critic; coordinator Engineer; independent read-only Verifier after edits.

Initial check: `bun run deadcode:check` exits 1. An untracked React campaign-preview test imports absent campaign/i18n modules and unlisted React packages. Investigate before changing it; no dependencies will be added merely to support unrelated code.

## Round 1 findings

### CLEAN-01 / stale test / high confidence

Observed: campaign preview test is the only consumer of absent campaign/i18n modules and React. `bun test tests/campaign-preview.test.tsx`: exit 1, missing react/jsx-dev-runtime; initial Knip also exits 1.
Engineer decision: confirmed unrelated orphan. Removed from test discovery after preserving byte-identical original at `/tmp/onur-cleanup-preserved/campaign-preview.test.tsx` (SHA-256 `aee71695da766b018590117de7e6450c0ba9525568e6b42a28055dcb41a09e62`). No React dependencies added and no current feature coverage removed.

### CLEAN-02 / write-only client state / high confidence

Observed: annotation client's `published` Set is never read or escaped, only allocated, cleared, added to and deleted from.
Engineer decision: confirmed. Removed declaration and all writes; preserved active publication event and listener, owned-note synchronization and markers. Pre-edit annotation client preserved at `/tmp/onur-cleanup-preserved/annotations.ts` for isolated comparison.
Focused checks: `bun test tests/annotations`: exit 0, 8 pass / 1 database-dependent skip. No behavioral change intended; existing integration/browser paths are the appropriate regression checks.

### CLEAN-03 / domain coupling / high confidence

Observed: annotation API imports generic JSON response and rate-limit helpers from witness. Both helpers already serve both domains; SQL table allowlist explicitly includes annotation_request_limits.
Engineer decision: confirmed structural debt. Moved unchanged JSON response implementation to existing `src/server/http.ts` as `jsonResponse`; moved rate-limit module to `src/server/request-limits.ts`; updated all consumers and test imports. Witness-specific visit/date parsing stays in witness. HMAC namespace (`witness-rate-v1`), table names, SQL, caching and headers intentionally unchanged. No forwarding shims.
Focused checks: `bun test tests/annotations tests/witness`: exit 0, 19 pass / 12 database-dependent skips. No live service/DB used.

Initial aggregate reached lint/type coverage; subsequent structural edits invalidate earlier aggregate as final evidence. Final aggregate and independent review pending.

## Independent verification and re-evaluation

Verifier independently ran focused annotation/witness tests (19 pass, 12 DB-dependent skips), Knip and diff whitespace checks, all exit 0. Isolated Bun assertions also verified JSON body/status/cache/nosniff, original payment jsonNoStore behavior, hourly HMAC namespace, both rate-limit table choices, boundary and table rejection. These query mocks do not prove PostgreSQL atomicity.

Verified helper snapshot SHA-256:

- annotation client: `a200f5d6b2e1bced7cdb7ad60556b103502bcd3de5aa99702f79b8f84027e549`
- server/http.ts: `1fee65eb33834eacc69dc68e7a389ac951c27f2948c77420bfebfcfb9c2342ed`
- server/request-limits.ts: `eee8eb145f28233715518b9d84eb5546edee9ee5e687d077de96ba9cc814ea8b`
- server/witness/http.ts: `3e15fa29f02ee8eae18e679bfb7309750b0742fdea85d0a5fe35c5d363c77ec3`

Verdicts CLEAN-01/02/03: verified at source/helper level. Independent Critic re-evaluation found no regression or additional supported dead-code deletion. It noted an optional duplicate initial owned-note parsing block; retained as a minor readability proposal outside this patch rather than broadening already verified edits.

Interim aggregate passed (exit 0): 280 unit tests passed, 20 opt-in tests skipped; type coverage 98.54%, no architecture violations, zero Astro errors/warnings, build passed. Because edits occurred during that run, a fresh stable-snapshot aggregate is being run before final completion.

## Final results and stop

Stable-snapshot `bun run verify`: exit 0. Dead-code, formatting, lint, 98.54% type coverage, architecture, Astro/TypeScript, proof/artifact checks, production build and unit tests passed. Unit results: **280 passed, 20 skipped, 0 failed**, 5669 assertions across 92 files. Log: `/tmp/onur-cleanup-final-verify.log`.

Focused browser regression: `bun run test:browser -- tests/browser/rounded-selection.pw.ts --grep 'multiline selection|annotation controls stay'`: exit 0, **3 passed**. Checks cover mobile multiline selection/opening the annotation composer in light/dark themes and initially hidden annotation controls. Log: `/tmp/onur-cleanup-browser.log`. No database-dependent publication browser path or real PostgreSQL atomicity claim is made.

Changed by this run: `src/client/annotations.ts`; `src/server/http.ts`; relocation `src/server/witness/limits.ts` to `src/server/request-limits.ts`; `src/server/witness/http.ts`; all ten annotation/witness API route files (imports/helper name only); `tests/witness/limits.test.ts` import; removal of unrelated untracked campaign test with external backup; this record. Existing owner changes preserved.

Consumed budget: one implementation round (three confirmed findings) plus independent re-evaluation. Stop: all confirmed scope changes verified; no further supported dead-code deletion. Optional duplicate parser consolidation remains a readability proposal, not an unresolved defect. Historical signed formats retained deliberately. Twenty optional integration cases skipped, including database cases; no live payments, publication, signing, deployments, commits or service changes performed.

## Follow-up: obsolete Markdown and code scaffolding

Owner clarified that “legacy” means dead old Markdown/code structures, not active cryptographic formats. An exploratory RSS-v1 rejection test was removed without any production crypto edits. Active signatures, publication chains and proof formats remain unchanged.

Round 2 (three groups):

- Confirmed obsolete empty manual RSS registry: removed `src/content/rss-entries.json`, raw import/merge, unused Astro RSS collection and browser fixture file write. Real feed already derives entirely from published Logs. Retained active parser/schema. Compared exact RSS XML before/after with Node strict equality: byte-identical. Focused RSS/feeds/log-only tests: exit 0, 10 passed.
- Confirmed stale publication instructions: replaced manual feed entry instructions and “no writing has been published” claim in `docs/rss-signing.md` with current Log-derived publication flow.
- Removed 42 completed historical files: tracked old superpowers plans/specs, old audit Markdown/JSON outputs, decision-stage research under docs/research, plus obsolete GitHub/home-embed/Connect proposal documents. These contain superseded Work routes, completed task instructions and outdated product snapshots. Git history retains them. Current untracked witness/annotation plans, active authoring/operations/design docs and referenced optical research retained. Remaining Markdown relative links were checked; no missing target found. No references to removed RSS registry remain.

Independent review and stable-snapshot aggregate pending for this follow-up. Previous verification applies only to round 1.

Follow-up independent Verifier: exact RSS XML comparison passed (660 bytes); six RSS/feeds/log-only suites passed, 20 tests / 0 failures. Crypto source and artifacts unchanged. Markdown document links valid. Verifier found additional old references in ignored `work/log-completion` scratch ledgers. Confirmed entire ignored `work/` tree consisted of old debug/rail experiment scripts, test outputs and completed ledgers with no incoming repository references; moved intact to `/tmp/onur-cleanup-preserved/legacy-work` outside the project. Coordinator confirmed removed paths are absent. No product edits followed independent review.

Follow-up final aggregate: `bun run verify` exit 0 (log `/tmp/onur-legacy-final-verify.log`): dead code, formatting, lint, 98.54% type coverage, architecture (201 modules / 380 dependencies), Astro/TypeScript, proof/artifact verification, production build, **280 unit tests passed / 20 skipped / 0 failed**. `git diff --check` passed. Documentation-only audit update follows this aggregate and is separately formatted. No additional browser run: RSS bytes unchanged; no UI markup/interaction edited. Database/wallet integration skips remain explicit.

Final scope consumed: two rounds, three groups each. Stopped after removing confirmed stale structures and completing independent review; current operational docs and ongoing owner work remain. No cryptographic compatibility removal, content signing, deployment or commit.
