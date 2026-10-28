# Opening performance implementation

Scope: implement the six findings from the owner's read-only audit; preserve the pending layered-icon work and all signed content. User explicitly requested completion. Work on codex/opening-performance in the existing checkout so its dirty icon work stays included. No publishing, signing, deployment or live service changes.

Baseline: local production build, mobile 390×844 / DPR2, 4× CPU, 150ms latency and 200000 bytes/s download. Warm FCP/LCP 932–988ms, load 2205–2218ms, CSS 43102 bytes external, JavaScript 44946 bytes, 46 SVG requests / 64821 bytes. Fresh process first HTML 733ms / completion2044ms; warm requests10–12ms. These are local measurements, not field data. Baseline isolated Bun verifier import587ms, first verification71ms; do not equate that directly to Node request time.

Plan and implementation rulings:

1. Inline the current bounded shared CSS with Astro's native build.inlineStylesheets; verify a 48KiB inline budget. This avoids an additional SSR critical-CSS parser/dependency and preserves streamed HTML. CSS growth beyond the budget requires a new split rather than increasing it silently.
2. Optimize public SVG assets with SVGO while retaining viewBox/IDs and visually comparing rendered pixels; lazy-load technology masks near visibility, retain no-JavaScript fallback and preload the brand mark.
3. Render bounded saved-source fallbacks, then fetch X/GitHub through independent native server islands and Spotify through its existing REST refresh. A slow provider must not delay DOM completion or another provider. Keep failures readable. Reinitialize Spotify safely when its island replaces its fallback.
4. Load the full search enhancement only on intent. Preserve immediate offline substring search/native navigation if its deferred engine cannot load. Test delayed/failed enhancement and focus contracts.
5. Generate glass maps in a Vite module Worker with typed messages and async bitmap serialization; reject stale results, pause preferences/lifecycle correctly, and skip generation entirely in non-Chromium. Keep a readable CSS fallback on worker failure.
6. Split verified signature/publication reads from timestamp/proof readers and move public account metadata out of crypto modules. Keep signature verification and publication fail-closed guards intact.
7. Run focused regressions, aggregate verification and representative browser suites; independently review final diff; repeat the same mobile measurements. No automatic commit/push.

Progress: six changes implemented. First browser regression run: opening budget/isolation, search, navigation glass and embed geometry passed; Spotify refresh test caught replacement resetting its disclosure. Ruling: Spotify uses its existing REST refresh immediately while retaining a stable player DOM, rather than a redundant server island. X/GitHub retain independent islands.

Independent source review found hidden Spotify saved history without JS and a pending Worker response lost across bfcache. Added a native noscript history disclosure and invalidate/rebuild geometry on restoration, with focused browser regressions.

SVG experiment: optimized 61 SVGs, 159168→157157 bytes before newlines. All 61 before/after 128px rasters differ by at most 0.0672% of RGBA channels; no substantial geometry change. Main icon win is deferred requests, not this small source-size reduction.

Focused crypto/source/fallback/refresh tests: 24 passed. Static check initially caught migrated Spotify import and timeout typing; corrected. Lint also exposed former inline-script assertions; the extracted controller now uses explicit required DOM invariants and a lightweight consumed-field response decoder instead of adding suppressions or shipping the server schema bundle.

## Final verification and observations

- `bun run verify`: exit 0, 284 passed / 20 opt-in integration skips / 0 failures. Formatting, Knip, lint, 98.57% type coverage, architecture (210 modules / 397 dependencies), zero Astro/TypeScript errors/warnings, cryptographic/publication checks and production build passed. Log: `/tmp/onur-opening-verify-final.log`.
- Focused Playwright: 39 passed, exit 0. Opening isolation and CSS/mask budget, offline/delayed/failed search, Worker failure/non-Chromium/pending-bfcache behavior, glass geometry/preferences, Spotify refresh/disclosure, home embed layout and custom cursor. Log: `/tmp/onur-opening-browser-final.log`.
- JS-disabled production browser with a local saved-history fixture: Spotify native disclosure, technology mask fallback and native Find passed. No wallet/database or live service configuration used.
- No signed content or proof artifacts changed. Existing layered-icon work retained.
- Native whole-change reviewer found two issues; coordinator fixed both and verified their regressions. No claim that skipped database/wallet tests prove live operation.

Same local mobile profile, three fresh browser contexts after server warm-up:

| Metric                    | Before          | After              |
| ------------------------- | --------------- | ------------------ |
| FCP                       | 932–988 ms      | 260–268 ms         |
| LCP                       | 932–988 ms      | 284–304 ms         |
| load event                | 2205–2218 ms    | 1176–1450 ms       |
| external CSS requests     | 1               | 0                  |
| initial SVG requests      | 46              | 15                 |
| initial SVG bytes         | 64821           | 11981              |
| initial external JS bytes | 44946           | 34456              |
| observed long tasks       | 67–122 ms tasks | none in these runs |

One fresh Node process: first HTML 733→356 ms, full initial document2044→358 ms; subsequent responses12–14ms. This is one process sample per snapshot, not a p95 or field claim. Separate Bun signature-reader module import587→255ms; verification71→49ms, warm read below0.02ms. These isolate a different runtime and are not added to the Node results.

Tradeoff: full shared inline CSS increases decoded document size from about75.6KB to114–126KB (compressed HTML about25–27KB in the after browser run), while removing the separate43.1KB render-blocking stylesheet. Snapshot availability changes activity fallback document size; it does not delay the first paint. The48KiB CSS gate keeps this choice bounded. Three local samples cannot establish production field INP or p95 performance.

Raw after observation: `/tmp/onur-opening-after.json`; measurement log `/tmp/onur-opening-measure.log`. The public onur.af DNS name did not resolve from this environment during audit; no live latency improvement claimed. Rolling/multi-version deployments using server islands should use a stable Astro encryption key as described in Astro's server-island documentation; no deployment secrets were created or read here.

Stop: all six requested performance areas implemented, independently source-reviewed and locally verified. No commit, push, deployment, signing or live service changes in this task.
