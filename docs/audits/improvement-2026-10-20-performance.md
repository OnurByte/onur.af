# Performance optimization run

Scope: implement source-confirmed optimizations from the owner's supplied analysis, preserving visual identity, custom scrolling, live activity, offline Find, signed bytes and publication safety. No deployment, signing, funds or live settings changes. Budget: two rounds, at most three hypotheses per round, one implementation at a time.

Baseline: `dc470dacd75de3ba838b61a53e8b9ef81a074617`, branch `codex/performance-optimization`. Existing untracked `.playwright-mcp/`, `.serena/`, `opencode.json`, and `docs/audits/improvement-2026-10-20-stylex.md` belong to the owner and are excluded from changes. Tracked baseline is clean.

Roles: coordinator/Engineer implements sequentially; separate Critic inspects source; separate Verifier will inspect final changes and rerun checks.

## Design and verification approach

Reuse immutable deployment results while retaining per-request local publication safety checks. Preserve the existing five-second Spotify freshness and offline search contracts. Reject speculative interaction changes without comparable measurements. Select static routes only where query, host and publication behavior remain correct. For each accepted behavior change establish a failing regression, implement the smallest fix, then run focused and applicable aggregate checks. Build and browser results do not establish production billing savings.

## Round 1

Investigation in progress. Candidate areas: repeated proof verification, request-time social rendering, immutable route rendering.

## Contract findings

- Spotify has a regression explicitly requiring idle-to-playing refresh after five seconds. Slowing polling is a product change and is not applied merely as an optimization.
- Find browser tests require offline search and no separate index request. Preserve embedded data; deferring index construction remains eligible.
- Social images accept three `?m=` variants and reject malformed/duplicate indices. Prerendering the existing URL directly would lose those semantics.
- Local middleware and proof reads enforce publication lock/recovery state. Memoization must not bypass those checks.

## Checks

Pending.
