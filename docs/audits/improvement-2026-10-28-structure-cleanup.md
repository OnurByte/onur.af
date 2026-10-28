# Structure cleanup

Scope: source-driven dead/legacy structure cleanup and standardization of repeated logic. Budget: at most two rounds, three hypotheses per round, one product edit at a time. Baseline: `a36fefb` on main; working branch `codex/structure-cleanup`. Existing owner changes: `src/components/LogTags.astro` and `tests/browser/log-subjects.pw.ts` change the category prefix to ⟐; preserve them.

Roles: read-only Critic, coordinator Engineer, independent Verifier after edits. Existing audit `improvement-2026-10-28-code-cleanup.md` reviewed to avoid repeating completed removals. Initial Knip check passed, so no claim of compiler-detected unused exports. Active historical signature formats and immutable content are out of scope. No signing, publication, dependency policy changes, deployment or push.

## Round 1

### STRUCT-01 / repeated request infrastructure / high confidence

Observed: annotation, witness, vitals and contribution POST routes each implement bounded stream consumption with separate chunk accounting/cancellation. Contribution releases the reader lock; the other three implementations do not. Limits, UTF-8 decoding and error responses differ intentionally.

Engineer decision: confirmed duplication. Extract only byte consumption, overflow detection and reader cleanup. Keep validation, limits, decoding and response policy at each route, including the contribution form's streamed-overflow 400 versus declared-size 413. Disproof: compare existing route policies and run chunk-boundary/overflow/cancellation/error tests and affected route coverage. Verification pending.

### STRUCT-02 / dead style member / high confidence

Critic found `verifiedStyles.compactPeriod` had no consumers. Both importers use static property access; live controls use `period` and `selected`. Engineer confirmed with repository-wide references and removed only the unused member. No new test for an unused declaration; existing verified-layout browser checks and build cover regressions.

### STRUCT-03 / repeated owned-note parser / readability

The same localStorage/JSON/schema expression was copied three times in `src/client/annotations.ts`. The previous audit deferred this minor proposal; the owner's new standardization request brings it into scope. Engineer extracted one local `readOwn()` function. Initial synchronization still starts from an empty list; invalid event data still retains the last valid list; invalid submission metadata still reaches its existing outer catch. No new storage wrapper or compatibility layer. Existing annotation edit/withdraw/draft browser paths cover the callers.

Rejected: active timestamp watcher, crypto legacy formats and intentionally different JSON response policies are not dead structures. Knip found no unused modules/exports. No bulk deletion based on filenames or age. XML escaping consolidation remains a lower-priority optional refactor, not an unresolved defect.

## Independent verification and round 2

Verifier independently ran the focused suite (24 passed, 12 database-dependent skips) and 18 baseline/current response comparisons for vitals/contribution: missing body, valid data, exact limit, overflow, failed cancellation, forged declared size, malformed UTF-8, read error and rejected origin. Status, body and headers matched; no gateway calls. Separate cancellation-rejection experiment retained the original error and released the lock. Source verdicts STRUCT-01/02/03: verified; browser/database verification still pending at this handoff. Raw logs: `/tmp/onur-cleanup-independent-tests.log`, `/tmp/onur-cleanup-independent-route-comparison.log`.

Critic re-evaluation found no supported regression. Round 2 confirmed one stale document: `docs/superpowers/plans/2026-10-27-witness-annotations.md` is an unchecked 37-line task list whose modules/tests/operations docs now exist. No incoming reference was found in AGENTS, README, docs, skills or workflows. Engineer removed that implementation checklist. The separate 615-line specification contains unique current requirements and remains. No further supported deletion recommended.

Validation notes: initial aggregate stopped at strict lint in the new test (void-expression callback and awaited Bun matcher types). Fixed test syntax without changing assertions. Pruned one obsolete ESLint suppression for the removed contribution reader; no rules weakened or suppressions added. Final aggregate pending.

## Final validation and stop

The new stream fixture also initially used Node's `duplex` RequestInit option, absent from this project's DOM type definition. Removed it because Bun's Request consumes streams without that option; all four assertions still pass. Product files remained unchanged after independent review.

- `bun run verify`: exit 0; Knip, formatting, strict lint, type coverage 98.58%, architecture (211 modules / 403 dependencies), Astro/TypeScript, signed-content verification, production build and 295 passing tests / 20 skips / 0 failures. Log: `/tmp/onur-cleanup-verify-4.log`.
- Independent review: no actionable findings; 18 baseline/current response comparisons and shared-reader cancellation-failure check passed. STRUCT-01/02/03 verified.
- Fresh temporary PostgreSQL cluster, database and migrations: focused reader/annotation/witness/vitals suites passed 36 tests, 0 skips, 0 failures. The cluster was stopped and removed afterward. Log: `/tmp/onur-cleanup-db-focused.log`.
- Same isolated annotation database, empty inherited rate secret (test server supplies its own random fixture secret): rounded-selection, verified-layout and Log-subject browser suites passed 20 tests. Both themes, mobile/desktop stats layout, editing/withdrawal/drafts and the owner's ⟐ change covered. Log: `/tmp/onur-cleanup-browser.log`.
- `TEST_CHECKOUT=1 bun test tests/checkout.test.ts`: 1 passed / 225 assertions against built SSR and a synthetic donation gateway. This does not prove a real payment. Log: `/tmp/onur-cleanup-checkout.log`.
- `git diff --check`: passed. No diff under `src/content` or `public`, and no change to signature/proof format implementations. Existing category-prefix edits preserved.

Round 2 plan removal verified by source/reference review; retained its separate current specification. No broken incoming link found. Consumed budget: two rounds (three source findings, one stale document); stop because the supported findings are resolved and independently re-evaluated. No uncertain application patches remain. Existing opt-in aggregate skips remain explicit, while the affected annotation/witness database paths were separately exercised on local PostgreSQL. No commit, push, deployment, signing or live service changes.
