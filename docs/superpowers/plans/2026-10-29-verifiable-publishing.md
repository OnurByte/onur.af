# Verifiable Publishing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline work. Independent receiver, portability and transparency domains may use focused parallel agents.

**Goal:** Implement the supplied six-stage publishing protocol without altering existing signed evidence.

**Architecture:** Freeze revision HTML and UTF-16 projection in append-only derived records. Serve Memento from captured standalone HTML, independently operate opt-in receiver and transparency workers, and encrypt portable annotation identities.

**Tech Stack:** Astro, TypeScript, Bun, PostgreSQL, WebCrypto, official Sigsum CLI.

**Spec:** ../specs/2026-10-29-verifiable-publishing.md

## Global Constraints

Preserve signed manifest/Markdown bytes, legacy quote URLs and onur-text-v1 UTF-16 semantics. English visitor copy. No live publication, production signing, deployment or service changes. External evidence never upgrades state without verification. Old revisions captured today are reconstructed and retain today's archivedAt.

## Review Focus

- Renderer upgrades cannot move legacy ranges: compare persisted HTML/text hashes and browser projection.
- Missing/tampered snapshots fail closed, never substitute current content.
- Repeated receiver jobs and transient fetch errors cannot delete valid mentions.
- Imported keys must match their public identity and private bytes stay encrypted in exported files.
- Wrong policy/manifest and stale monitor checkpoints cannot produce verified observation claims.

### Task 1: Frozen text identity

Files: src/portfolio/text-projection.ts, src/content/log-projections.json, scripts/log-projections.ts, LogRevision.astro, log-quote.ts, annotation API, tests/text-projection.test.ts.

Interface: revisionProjection(entry, version) returns revisionHash, projectionVersion, projectionHash, text and frozen render result. freezeProjection(entry, version) creates one record. Existing signed annotation bytes stay v1.

- [x] Write and run failing Unicode/render equivalence and tampering tests.
- [x] Implement and capture existing revision projections; use in all server render/validation paths.
- [x] Verify focused tests.

### Task 2: Temporal publication

Files: src/portfolio/memento.ts, scripts/log-snapshots.ts, src/content/log-snapshots.json, new timegate/timemap/memento routes, LogArticle.astro, publication transaction/workflow, tests/memento.test.ts.

Interface: snapshots bind captured standalone HTML SHA and revision/projection identity, publishedAt separately from archivedAt. TimeGate chooses latest archivedAt <= requested HTTP-date.

- [x] Write and run failing date/boundary/HEAD/integrity tests.
- [x] Implement immutable self-contained snapshots (freeze local/external media bytes before capture), strict TimeGate and Link TimeMap.
- [x] Wire snapshot preparation into staged publication and checks; History links only captured versions.
- [x] Verify immutable byte behavior and focused tests.

### Task 3: Inbound Webmention

Files: new inbound protocol, server store/worker/migration, endpoint, CLI, docs and tests.

- [x] Test canonical target allowlist, links, lifecycle, deduplication and bounded processing.
- [x] Implement opt-in PostgreSQL queue, validation, moderation, retries and public safe rendering.
- [x] Verify focused tests and record real PostgreSQL/remote test limitations.

### Task 4: Portable annotations

Files: management.ts, web-annotation.ts, annotation client/component and tests.

- [x] Test encrypted cross-device recovery, wrong passphrase and identity mismatch.
- [x] Implement accessible backup/recovery UI and revision-aware TimeState export.
- [x] Verify focused tests; preserve v1 signed payload format.

### Task 5: Transparency experiment and operations

Files: new transparency modules, CLI, archive integration, docs and tests.

- [x] Test statement binding, policy mismatch, invalid proof and stale observation.
- [x] Implement pinned-policy official-tool adapter, separate immutable evidence and durable monitor state.
- [x] Verify offline experiment; document external independent operator prerequisites without claiming they exist.

### Task 6: Integration and verification

- [x] Wire commands, discovery headers, safe mention UI and archive evidence.
- [x] Run focused tests, format, applicable static checks/build and full unit suite.
- [x] Review security and protocol boundaries; fix findings and leave external acceptance checks explicit.

## Completion record

Implemented on `feat/verifiable-publishing`. `bun run verify` passed: 328 tests
passed, 27 optional integration tests skipped, zero failures. Eight focused
Playwright tests passed. Two receiver store tests passed separately against
isolated real PostgreSQL. Three Go monitor/proof tests passed with the official
`sigsum-verify` executable.

Fresh review found and fixed optional receiver configuration breaking reading,
surrogate-pair endpoints, and missing historical annotation body fragments.
The complete isolated publication test additionally caught backdated publication
handling; preparation now records it as reconstructed at the actual capture
time, and repeated publication preserves snapshot bytes.

Operational boundaries: external Webmention Rocks, production Sigsum inclusion,
production PGP authority signing, independent monitor operation and deployment
were not performed. Local fixtures establish protocol behavior only.
