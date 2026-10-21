# TypeScript Strictness 2.0 implementation plan

Goal: enforce typed static analysis, runtime payment contracts, architecture and security checks without changing signed content or live services.

Execute inline in the current checkout, preserving existing owner changes.

- [x] Measure strict typed lint and type coverage. Enable strictTypeChecked and stylisticTypeChecked for TS and Astro recommended rules. Review critical promise and unsafe boundary findings; preserve an explicit counted migration baseline for remaining legacy findings so new findings fail CI.
- [x] Add schema-based donation request and ready-response validation. Test malformed and mismatched input before integrating at gateway and contribution route. Remove homepage metadata non-null assertion.
- [x] Add deterministic property tests for XMR precision and limits, proof canonicalization and path safety, public URL rejection. Use local data only.
- [x] Inspect the dependency graph and enforce browser/server, domain purity and cycle rules. Include a negative check demonstrating violations fail.
- [x] Add strict type-coverage regression threshold and CodeQL security-extended workflow; wire local checks and CI together.
- [x] Run focused tests, lint, architecture, coverage, dead code, format, type check, build and unit suite. Record unavailable external checks and baseline findings explicitly.

Review focus: unknown JSON primitives and arrays; noncanonical amounts; wrong network addresses; proof byte mutations; transitive browser imports of server credentials.

Outcome and migration limitations: [audit](../../audits/typescript-strictness-2026-10-21.md).
