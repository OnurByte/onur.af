# Repository Dead Structure and Strictness Design

## Goal

Remove repository structures that have no active purpose and add CI checks that catch newly introduced dead code and dependencies, while preserving published content, historical records, and intentional standalone documentation.

## Current State

- `tsconfig.json` extends Astro's `strictest` config. The resolved config enables unused-local and unused-parameter checks, unreachable-code errors, unchecked-index checks, exact optional properties, implicit returns, and switch fallthrough checks.
- `bun run check` runs Astro diagnostics and TypeScript over source, tests, scripts, and configuration.
- CI runs formatting, type checks, build-time proof checks, unit tests, browser checks, and external documentation-link checks.
- There is no repository-wide unused-file, unused-export, or unused-dependency gate.
- The working tree already contains user changes in `package.json`, `bun.lock`, the embed cache implementation and documentation, plus a new research document. These changes are outside this design and must be preserved.

## Scope

Audit all tracked areas: application and client code, scripts, tests, configuration, package dependencies, public assets, documentation, research notes, and content/data records.

Remove an item only when its lack of active purpose is supported by repository evidence. A published log entry, proof, timestamp, RSS record, social preview fallback, or other historical item remains live when a route, feed, search index, signature, public URL, or documented external consumer uses it. A document may be an intentional standalone record; missing inbound links alone do not prove it is dead. If an item is intentional but a static analyzer cannot infer its use, record a narrow, named explanation at the corresponding checker boundary.

Do not modify or absorb the pre-existing working-tree changes while carrying out this work.

## Design

### Dead-code and dependency analysis

Add Knip as a pinned development dependency and configure its Astro support. Define entry points for framework routes/components, package scripts, server and wallet entry points, Astro/Vite/Playwright configuration, and browser tests. Define project patterns across application, client, scripts, tests, styles, and configuration so the analysis can find unused files and exports as well as unused and undeclared package dependencies.

Run Knip without broad ignore rules or a permanent baseline. Resolve reports by correcting entry-point discovery, removing verified dead structure, or adding a precise explanation for an intentionally externally consumed entry. Do not suppress a whole directory to make the report pass.

### Assets, docs, and content

Review every tracked public asset against runtime URL construction, component registries, page metadata, source manifests, tests, and documented compatibility fallbacks. Remove an asset only after checking dynamic URL consumers and retained external URLs; keep social-preview fallbacks and brand provenance records while they serve those purposes.

Review documentation and research files for broken local references, duplicate or superseded guidance, and whether they remain useful as standalone records. Keep current documentation-link checking in CI and repair or remove only verified obsolete material. Review JSON and other content through its public routes, feed generation, search, signatures, and proof relationships; preserve cryptographically or historically meaningful records.

### Strictness and CI

Keep Astro `strictest` as the TypeScript baseline; do not duplicate options it already supplies. Add a dedicated `deadcode:check` package script that runs the configured analysis and invoke it in the main CI check job. Keep the gate independent from formatting and type-check output so its failures identify structural issues clearly. Ensure all normal repository entry points are represented so the gate does not mistake framework-loaded or command-invoked code for dead files.

### Validation

Use the analyzer's complete report to drive the cleanup, then run the dedicated analyzer, formatting check, Astro/TypeScript check, production build and CI-equivalent static validation. Do not run test suites as part of this task unless the user separately requests test execution. Inspect the final diff to confirm the user's pre-existing changes remain intact and no historical content or proof was removed without evidence.

## Acceptance Criteria

1. The repository-wide audit covers code, config, dependencies, assets, documentation, and content/data records.
2. Verified dead files, exports, dependencies, or assets are removed; published and intentional records remain.
3. Knip is configured for the actual Astro, script, and browser-test entry points without broad suppressions.
4. The standard CI check job fails when the configured dead-code/dependency analysis reports an unhandled issue.
5. Existing TypeScript `strictest` checks remain active without redundant flags.
6. Static validation completes successfully, or any unresolved environment limitation is reported with evidence.
7. Pre-existing user changes are preserved.

## Non-goals

- Rewriting or reorganizing live features solely for style.
- Deleting public content because it is old or has no import statement.
- Guaranteeing detection of all runtime-generated URLs or external references; uncertain cases require explicit review.
- Changing the user's existing unfinished embed-cache work.
