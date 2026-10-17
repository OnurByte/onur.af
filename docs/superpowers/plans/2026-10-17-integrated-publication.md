# Integrated publication implementation plan

**Goal:** Implement the three stages in the attached portfolio proposal, retaining the minimal interface and immutable signed revisions.

**Architecture:** Canonical Log revisions remain immutable. A rebuildable content index provides metadata, tags, internal/external links and GitHub references. Mutable distribution receipts and archive mappings stay outside signed content. Local publishing must finish signature, timestamp, manifest and RSS gates before optional post-deployment distribution.

**Execution:** Native execution in the current clean checkout, as requested by the user (“yap bitir”). No further design approval pauses.

## Stage 1 — shared content index

- [x] Test URL resolution, exact GitHub hosts, commit pin preservation, latest-revision isolation, backlinks and repository lookup.
- [x] Add `src/portfolio/content-index.ts`; consume it from search and Log connections.
- [x] Add a separately fetched search endpoint and MiniSearch client; retain keyboard access, existing result styling and retry on network failure.
- [x] Connect repository cards and Log pages with derived references.
- [x] Run unit, type, build and browser checks.

## Stage 2 — local publication

- [x] Make `log:publish` verify/sign RSS after signing Log revisions and appending the manifest.
- [x] Add testable orchestration with mandatory local gates and explicit post-deployment delivery.
- [x] Validate derived index, sigil and OG routes against published revisions.
- [x] Add manifest timestamp/checkpoint export and independent comparison without rewriting signed artifacts.

## Stage 3 — open web

- [x] Add `rel=me`, author h-card and canonical h-entry identity consistently.
- [x] Implement outbound Webmention discovery/delivery with bounded fetches, public-address validation on every redirect, retryable receipts, and live source revision verification.
- [x] Support optional Bridgy targets without enabling accounts or sending unsolicited messages.
- [x] Expose downloadable checkpoint verification inputs and document independent retention.
- [x] Extend source checks and add separate source archive mappings without editing signed Markdown.

## Final audit

- [x] Verify all required stages against tests and runtime results. Record external account/service configuration dependencies explicitly; never claim an external proof exists without evidence.
- [x] Full verification and review of changes; preserve optional/deferred items from the proposal (JSON Feed, inbound Webmention, full Tessera/ArchiveBox services).

## Completion evidence

- Final unit suite: 171 passed, 8 environment-dependent tests skipped, 0 failed.
- Final browser suite: 115 passed, including lazy search/retry, author identity, downloaded checkpoint/PGP/OTS binding and current Log social images.
- Final type check: 0 errors, 0 warnings (40 informational hints).
- Build, formatting and whitespace checks passed. Derived search/sigil/social-image generation and all publication receipt bindings passed.
- Original signed Log content, Log signatures, publication manifests and RSS signature artifacts have no diff.
- Independent code review found redirect-resolution, archive-lookup and receipt-persistence issues; each was reproduced, fixed and retested. Final review found no actionable issue.
- A real pending OTS receipt for manifest edition 1 was acquired and verified offline. Global HTTPS fetching was exercised against example.com through the pinned transport.
- Distribution preview was exercised without sending messages. Third-party account enrollment, reciprocal social proof posts, external witness operation, inbound Webmention, JSON Feed and bulk ArchiveBox hosting remain opt-in or deferred as stated in the proposal. Checkpoint export/comparison and selected archive mappings are operational; no independent third-party witness or archive capture is fabricated.
