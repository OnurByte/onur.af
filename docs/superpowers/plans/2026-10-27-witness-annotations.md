# Witness & Annotation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the complete Witness v1 and independent anchored annotations specification.

**Architecture:** Astro SSR exposes aggregate statistics and capability-protected receipts. An isolated PostgreSQL store accepts visits transactionally; a separately operated worker seals durable events. Annotation keys and storage remain independent of witness identity.

**Tech Stack:** Astro, StyleX, PostgreSQL, FingerprintJS, SHA-256, Ed25519, OpenTimestamps.

**Spec:** docs/superpowers/specs/2026-10-27-witness-annotations.md

## Global Constraints

- English visitor copy; UTC reporting; measurement disabled by default.
- Preserve signed Markdown, signatures, receipts and publication manifests byte-for-byte.
- No live deployment, publication, signing or payment experiments.
- Never expose fingerprint/HMAC/referrer in public event evidence.

## Review Focus

- Concurrent acceptance and transaction rollback must never inflate counts.
- Retry capabilities must not disclose earlier visitors' receipts.
- Interrupted sealing must recover the same batch without duplicate events.
- Pending OTS evidence must never imply Bitcoin verification.
- Ambiguous text selectors and stale revisions must never attach to incorrect text.

## Tasks

- [ ] Protocol: freeze canonical event bytes and domain-separated Merkle rules in src/portfolio/witness; test tampering, ordering, odd trees, malformed paths and Log-specific HMAC in tests/witness.
- [ ] Store: isolated PostgreSQL migrations and transaction acceptance in src/server/witness; test 100 concurrent visits, alias migration, retries, UTC periods and rollback against local PostgreSQL.
- [ ] UI: WitnessStats.astro and metadata link; SSR disabled/unavailable/empty states, period links and accessible real-data charts; test revision independence and ScrollRail in browser.
- [ ] Client/API: bundled FingerprintJS, explicit opt-in, visible canonical documents only; bounded schema validation, rate limits, cache semantics and receipt capabilities.
- [ ] Attestation: immutable batches, separate signing keys, OTS adapters, recovery and independent audit/export commands; use local evidence fixtures only.
- [ ] Operations: retention, consent, secret rotation, correction/suppression, backup/restore and verification documentation and checks.
- [ ] Annotations: revision/hash-bound normalized selectors, browser Ed25519 ownership/export, signed edit/withdraw, automatic publication/reporting and accessible selection UI; independent tables and tests.
- [ ] Verification: focused tests then bun run verify, bun run build, bun test and browser tests; compare protected artifact hashes and record all blocked checks.
