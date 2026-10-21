# TypeScript Strictness 2.0

## Delivered

- ESLint 10 with `strictTypeChecked`, `stylisticTypeChecked`, project service, unsafe assertion checks and exhaustive switches for TypeScript in source, scripts, tests, integrations and root configs. Astro recommended rules and `no-set-html-directive` cover templates.
- `bun run lint`, `bun run type-coverage:check` and `bun run architecture:check` run in local `verify` and CI before type checking/building.
- Node minimum is now 26.4.0, matching the existing `.node-version` and satisfying the installed lint toolchain. Bun's existing declared version is unchanged; local execution used Bun 1.4.3 and Node 26.12.0.
- Unknown JSON at gateway ingress is parsed with the shared `donationRequestSchema`. Creation/recovery responses and the contribution route share `readyDonationSchema`, which binds the expected ID, exact canonical amount and configured network address prefix. Additional store fields survive validation. This is format validation, not a Monero checksum or wallet ownership check; it does not assert a ready state.
- Fixed async DOM event handler misuse and awaited test-server shutdown. Replaced unsafe object spreading of `HeadersInit` with `Headers`. Removed the homepage metadata non-null assertion with an explicit startup invariant.
- Five deterministic fast-check properties exercise exact piconero round trips, amount bounds/precision, proof canonical serialization/whitespace rejection, path attacks, and private/credentialed URL rejection (200 runs each, seed 20261021). Existing signature/content-substitution tests remain in the suite.
- A separate CodeQL workflow uses pinned CodeQL v4 actions with `javascript-typescript`, `build-mode: none` and `security-extended`, on main pushes, PRs and weekly runs. The workflow has not run on GitHub from this local session.

## Migration baseline, not zero lint debt

Initial measurement found 1,321 lint findings. After focused corrections, **1,304 existing findings across 157 files** are recorded in `eslint-suppressions.json`. Rules remain enabled as errors. No floating/misused Promise or misused-spread findings remain in that baseline. New contract/property-test files have no suppressions.

This is ESLint's counted baseline: increases for a file/rule fail; finding replacement at the same count is not detectable. Existing unsafe assignments/assertions and library/test typing findings are still technical debt, not proven safe. Do not regenerate the baseline to make CI pass. Fix findings incrementally, then use `bunx eslint src tests scripts integrations astro.config.ts playwright.config.ts --prune-suppressions` and format the suppression file. To inspect unsuppressed findings without modifying the tracked baseline, supply `--suppressions-location` pointing to a nonexistent temporary JSON path.

The six existing `set:html` findings are explicitly grandfathered for these producers: escaped Markdown plus log images (`LogRevision`), deterministic generated sigil (`LogSigil`), constant site-signature HTML comment (`Layout`), two JSON serializations escaping `<` (`Layout`), and the generated payment QR (`contribute/[id]`). These findings remain review surfaces; the baseline is not a general HTML sanitization guarantee.

Initial strict type coverage was 41,064 / 41,880 (98.05%). The implementation raised measured coverage to 98.08%; CI now enforces **98.08%**. This measures TypeScript's included files, not generated browser code or Astro markup, and is not a runtime correctness metric.

## Architecture policy and limits

Dependency-cruiser checks cycles, transitive browser access to server/payment/agent modules and Node/Bun builtins, and I/O dependencies from selected pure domain modules. `src/client/gateway.ts` is deliberately server-only despite its legacy folder name. The current graph contains 157 modules and 280 dependencies, including type imports.

The graph covers TypeScript modules. It does not extract Astro inline scripts or inspect code inside third-party packages. Astro template linting is separate and does not imply typed linting of every inline script. An attempted virtual-script restriction did not catch a negative probe with this parser/plugin combination, so it was not retained or claimed as protection.

Negative probes confirmed that a new unhandled Promise fails ESLint and a browser import of the legacy gateway module fails both server-boundary and transitive Node-access rules. Both temporary probes were removed.

## Validation

- Focused contract, property, money/agent, payment-security, public-request, proof and SEO tests: 32 passed.
- Browser tests for copying, sharing and contribution creation: 13 passed using synthetic payment fixtures.
- Type check and production build passed. No content was signed, published or deployed.
- Local `verify` passed with 245 unit tests passed and 8 opt-in integration tests skipped.
- An isolated local PostgreSQL run enabled database and built-checkout tests. Its first run exposed a stale checkout expectation: the owner's pre-existing `same-origin` Referrer-Policy change conflicted with the old `no-referrer` assertion. The test now follows the existing implementation and browser regression; production policy was preserved. The focused checkout rerun passed.
- Final isolated PostgreSQL + built-checkout suite: **252 passed, 1 skipped, 0 failed**. The remaining opt-in test requires a real stopped stagenet view-only wallet and was not run. PostgreSQL was stopped after testing.
- Local agent/browser observation directories are excluded from formatting; their existing generated files were not reformatted.
- A read-only independent review found no important regressions in the scoped changes.

No real payment or wallet restore was performed. CodeQL alerts and GitHub branch protection require a subsequent GitHub run/configuration; adding a workflow does not claim those remote checks have passed.

## References

- [typescript-eslint project service](https://typescript-eslint.io/blog/project-service/)
- [CodeQL JavaScript/TypeScript query suites](https://docs.github.com/en/code-security/reference/code-scanning/codeql/codeql-queries/javascript-typescript-built-in-queries)
- [ESLint bulk suppressions](https://eslint.org/docs/latest/use/suppressions)
