# Legacy structure review

## Scope and baseline

Owner request: analyze the general project and remove or revive dead/legacy structures.
Budget: two rounds, up to three hypotheses per round, sequential product edits.
Baseline: `79bd487c3fe6edc0c0fb710f1c5d7ac0d1dee61d`; clean working tree on `main`.
Target: same checkout on `codex/legacy-structure-cleanup`, including changes recorded below.
Roles: separate read-only Critic; coordinator as Engineer; separate read-only Verifier after patches.
Read: AGENTS.md, brand.md, package.json, docs/design.md, docs/stylex.md, docs/donations.md, previous dead-structure plan/spec and strictness audit.
No publication, signing, live payment, deployment or live service changes are authorized by this investigation.

## Initial evidence

- `bun run deadcode:check`: exit 0. No unused files, exports or dependencies reported by the configured graph.
- Previous dead-structure work already introduced Knip and removed straightforward unused structures. Missing static imports alone do not establish that public assets or historical records are dead.
- Historical proof formats have current code/tests and integrity purpose; age alone does not justify removal. `/donate` aliases were initially retained, then explicitly removed under the owner’s follow-up instruction.

## Findings

Six confirmed findings were implemented across two rounds; final evidence is recorded below.

### LEGACY-01 / round 1 / architecture / medium impact / high confidence

Claim: an active credential-reading server module remains in the browser directory and forces legacy exceptions into the architecture boundary.
Observed: `src/client/gateway.ts` imports `node:net`; only the two contribution routes import it. `.dependency-cruiser.cjs` excludes it from browser entrypoints and names it in the server target regex. No standalone path contract found.
Disproof: locate an actual browser consumer or external filename contract. None found in repository references.
Engineer decision: confirmed as structural debt, not an observed credential leak.
Patch: move the unchanged module to `src/server/donation-gateway.ts`, update both route imports, remove both legacy path exceptions. No forwarding shim retained.
Regression: `bun run architecture:check` exit 0 (157 modules, 280 dependencies); focused donation/checkout contract tests exit 0 (14 passed).
Verifier snapshot/results: final working tree and its production build; architecture gate passed and isolated negative import probe failed with the expected server/Node violations. Built checkout passed.
Verdict: verified.

### SEARCH-02 / round 1 / documentation / low impact / high confidence

Claim: operator documentation describes removed lazy search fetching and retry behavior.
Observed: `docs/integrated-publication.md` contradicted `src/client/search.ts`, `Search.astro` and `tests/browser/search-index.pw.ts`.
Disproof: locate a fetch or dynamic MiniSearch import in the Find client. Neither exists.
Engineer decision: confirmed.
Patch: describe the DOM-derived synchronous index and native disabled-input fallback; preserve the JSON endpoint used by derived-content verification and consumers.
Verifier snapshot/results: final source comparison confirmed the documented DOM-derived index and native fallback.
Verdict: verified.

### SEARCH-03 / round 1 / obsolete scaffolding / low impact / high confidence

Claim: Pagefind cleanup never reached ignored-output patterns and mobile browser assertions.
Observed: no Pagefind dependency/import/build step; its URL interception therefore cannot test current index behavior. The standalone search-index browser suite covers the real endpoint on desktop.
Disproof: locate a current Pagefind producer/consumer. Only stale config/test references and historical notes found.
Engineer decision: confirmed.
Patch: remove Pagefind output ignores; mobile tests now intercept `/search-index.json`, preserving responsive/synchronous assertions while detecting a current endpoint regression.
Verifier snapshot/results: 320/375px synchronous-search browser cases passed.
Verdict: verified.

## Round 2: explicit removal of compatibility routes

Owner follow-up explicitly requests deleting `/donate` and discarding legacy support. The Critic identified two further pure forwarding surfaces. Historical signed bytes remain data, rather than disposable route scaffolding.

### ROUTE-04 / round 2 / compatibility / owner-requested removal / high confidence

Claim: `/donate`, `/donate/create` and `/donate/[id]` exist solely to retain the superseded contribution paths.
Engineer decision: confirmed; delete all three files, migrate active checkout/copy tests to `/contribute`.
Baseline reproduction: new removal test failed against the previous build (expected 404, received 308).
Regression: assert GET aliases and POST alias return 404 without Location, while the current contribution flow still succeeds.
Verifier results: verified by the final independent route, contribution and Log browser checks.

### INTRO-05 / round 2 / compatibility / owner-requested removal / high confidence

Claim: both `/introduction` route files only forward old statement/proof URLs to the introduction Log.
Engineer decision: confirmed; remove `verified.astro` and `[file].ts`, plus the deleted file's exact ESLint suppression entry.
Baseline reproduction: all three new removal cases failed against the previous build (received 308).
Regression: each old URL must return 404 without Location; canonical Log/proof routes remain covered.
Verifier results: verified by the final independent route, contribution and Log browser checks.

### PROOF-06 / round 2 / compatibility / owner-requested removal / high confidence

Claim: `/pgp/log/[id]` exists only as a 301 redirect to canonical Log proof routes.
Engineer decision: confirmed; delete route, replace redirect test with removal coverage, update live documentation and an invalid-ID fixture to canonical paths.
Baseline reproduction: query-bearing old URL failed the new check (expected 404, received 301).
Regression: removed route returns 404; existing canonical revision navigation remains covered in the publication browser fixture.
Verifier results: verified by the final independent route, contribution and Log browser checks.

## Check history

- Round 1 aggregate `bun run verify`: exit 0; 245 unit tests passed, 8 opt-in tests skipped.
- First round-2 aggregate stopped at type coverage (98.06% < 98.08%). New API-response locals inherited loose fixture inference. Explicit Playwright APIResponse annotations preserve the existing coverage threshold; no threshold or rule weakened.
- Interim coverage after route removal: 98.07%; additional existing API-response locals in the touched Log test received the same accurate type annotation.
- New 404 removal checks were run before deleting the extra routes: four separate cases failed with the expected 301/308 redirects, establishing the baseline behavior.
- Parsing identity-discovery JSON with a small schema in the touched browser test removed existing unsafe access findings. Stale suppressions were pruned with the documented ESLint command, rather than adding suppressions. Final measured type coverage: 98.10% (threshold unchanged at 98.08%).
- Final architecture graph: 154 modules, 274 dependencies; no violations.

## Inventory decisions

- Retained signed revisions, key transitions, timestamp receipts, RSS compatibility parsing and proof coverage distinctions: they verify actual published evidence, not unused UI scaffolding. No stored signature was regenerated.
- Retained timestamp watcher: current documentation and hourly CI invoke it.
- Retained public search JSON endpoint: publication/derived-content and identity checks still consume it; Find itself does not fetch it.
- Retained public provenance assets and historical research/audit records where absence of imports did not establish a safe deletion.
- No dependency removal was supported by Knip's complete configured report.

## Final aggregate and Critic re-evaluation

`bun run verify` exited 0 after the final product/test changes: Knip, formatting, ESLint, type coverage, architecture, Astro/TypeScript checks, proof/artifact checks and production build passed. Unit suite: **245 passed, 8 skipped, 0 failed**. The skips are opt-in integration tests; this run does not establish real settlement or wallet recovery.

The independent Critic re-read the final diff, confirmed byte-identical gateway relocation, forwarding-only route deletions, canonical test/documentation paths and retained signed data. No further supported regression or bypass was found. `git diff --check` passed.

Independent Verifier checked the final source/build without editing product files:

- `TEST_CHECKOUT=1 bun test tests/checkout.test.ts`: exit 0, 1 passed, 192 assertions. Synthetic gateway, no wallet/database required.
- Focused Playwright contribution, Log, copy-feedback, search-index and search-resilience suites: exit 0, 33 passed.
- Playwright accessibility cases filtered by `mobile viewport and filters synchronously`: exit 0, 2 passed (320/375px).
- `bun run architecture:check`: exit 0, 154 modules, 274 dependencies.
- Isolated temporary browser-import probe using a copy of the final architecture policy: exit 2 as expected, both `browser-no-server` and transitive `browser-no-node` rejected the import.
- Gateway source compared byte-for-byte with the baseline: unchanged implementation.

All six findings: **verified**. No rejected or uncertain patched findings remain. No product edits followed this verification.

## Stop and remaining limits

Consumed budget: two rounds, three findings each. Stop reason: requested cleanup implemented, independently verified, final Critic found no further supported issue within this run.
Changes remain reviewable on `codex/legacy-structure-cleanup`; no commit, deployment or publication was performed. Removed aliases intentionally return 404, including externally retained old links. Canonical routes remain functional.
Eight aggregate opt-in integration tests were skipped. Real payment settlement, live wallet scanning, service restarts and production deployment were not exercised. Historical signed-evidence parsing remains because actual published records still require it; this cleanup removes obsolete forwarding routes rather than rewriting cryptographic history.
