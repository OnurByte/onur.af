# Portable Log Proofs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver independently verifiable portable Log proofs without rewriting historical evidence.
**Architecture:** Versioned canonical statements with signed media inventories; signature-byte OTS receipts; reader-pinned key history; local bundles; staged publication. Existing v1 artifacts remain readable and immutable.
**Tech Stack:** Astro, TypeScript, Bun, OpenPGP.js, OpenTimestamps, GnuPG.
**Spec:** docs/superpowers/specs/2026-10-18-portable-log-proofs-design.md

## Global Constraints

- Owner alone authorizes publications; development does not invoke the real secret key.
- Preserve existing signed artifacts and unrelated workspace changes.
- Workers use gpt-6-luna as requested. Work in the existing feature checkout because uncommitted integration work is a required input.
- English UI, existing styles, no new external services.

## Review Focus

- Untrusted bundle keys must never become trust roots automatically.
- Media traversal/symlinks and duplicate entries must fail.
- An OTS receipt binding is not Bitcoin confirmation.
- Failed staging or activation must not leave mixed publication stores.
- Legacy revisions with absent metadata must retain their signed bytes.

### Task 1: Routes and reader-facing discovery

**Files:** log.ts, proof page, SEO/previews consumers and tests; new identity/proof discovery routes.
**Interfaces:** Preserve logProofUrl(entry, version?), use stable IDs, redirects preserve query. New proof files are linked from the page when available; do not claim site verification establishes reader trust.

- [x] Add regression tests for new URL and known log verified links.
- [x] Move page and update metadata/links/tests; retain redirect.
- [x] Add machine-readable identity and history diff using existing diff dependency.
- [x] Run focused tests and check changed page.

### Task 2: Key history

**Files:** new key-history module/store/CLI/tests, existing signature verifiers and their callers.
**Interfaces:** Legacy string public-key arguments remain valid. Introduce KeyTrust input with pinned root and validated transition chain; verifyBytes returns verified primary fingerprint. Preserve strict binary signature checks. No trust inferred merely from listing a key.

- [x] Write failing tests with generated throwaway keys for legitimate and forged transitions, absent history and subject authorization.
- [x] Implement canonical monotonic dual-signed transitions and validated historical certificate lookup; integrate revision/publication/RSS/identity checks.
- [x] Provide local transition preparation/verification commands and documentation.
- [x] Run focused tests and typecheck.

### Task 3: Proof statements, media and portable verification

**Files:** new log-proof module, content store, media vault, bundle module, proof CLI, download routes/tests.
**Interfaces:** canonicalLogProof(statement), createLogProofStatement(entry, version, signature, fingerprint, publicationSequence, publicDirectory), verifyLogProof(artifact, files, trust). Detached statement signature is the OTS preimage. Bundles contain exact UTF-8/byte files and require --fingerprint from reader. Integrate getLogProofs with verified-proofs.ts and /proofs downloads.

- [x] Write tamper/path/subject/receipt tests, observe failure.
- [x] Implement strict canonical schema and immutable content-addressed original media, preserve legacy artifacts.
- [x] Implement local export/verify CLI and downloadable all-revision bundle, optional independent OTS verification.
- [x] Add publication preparation and verification gates; document pending/legacy coverage.

### Task 4: Staged publication transaction

**Files:** new publication transaction module/tests; publish-log.ts, publish-workflow.ts.
**Interfaces:** runPublicationTransaction(root, prepare) runs commands with staging cwd, locks concurrent writers, validates complete staged outputs before recoverable activation. All staged scripts resolve relative paths in their staged repository. Preserve GPG access only for explicit local publish command.

- [x] Write failure, lock, crash/recovery and activation tests, observe failures.
- [x] Implement staging, snapshot conflict detection and journal/recovery; integrate publisher without changing historical evidence.
- [x] Add new proof generation gates once Task 3 command exists.

### Task 5: Review and verification

- [x] Review each worker deliverable and fix findings.
- [x] Run formatter on changed files, typecheck, all unit tests, mandatory build gates and relevant Playwright flows.
- [x] Run independent Luna review and resolve security/correctness findings.
- [x] Record actual outcomes and owner signing command; do not claim absent signatures were produced.

## Execution rulings

User said “bitir” after the concrete in-chat plan, authorizing execution. Proceed without another planning approval. Existing feature checkout contains extensive required uncommitted work; no unrelated changes will be committed, reset or copied away. Production signing is intentionally left to an explicit owner-run local command, consistent with the owner approval requirement.

## Verified completion

- `bun run verify`: passed, including dead-code and formatting checks, Astro/TypeScript checking, all mandatory proof/build gates, standalone verifier generation and Astro server build. Unit suite: 200 passed, 8 environment-dependent integration tests skipped, 0 failed.
- Targeted Playwright: 11 passed across Log pages, signed publication fixture, checkpoint downloads and identity markup.
- `tests/publish-pipeline.test.ts`: temporary isolated GPG home and generated fixture key, mocked pending calendar responses, actual staged publisher twice, format 2 proof bindings and immutable originals, complete archive and standalone Node verification. Re-running preserves the existing revision signature and publication edition.
- Independent Luna review found no remaining concrete trust or journal-recovery defect after fixes. Existing LogDiff supplies history comparison; there is no new diff protocol requirement.
- Existing production content has no fabricated v2 statements (`log-proofs.json` remains empty). New real signatures require the explicit owner-run local publication command documented in `docs/portable-log-proofs.md`; development used only throwaway test keys. No push, merge or deployment was performed.
