# Portfolio evidence and reliability design

## Intent and scope

The owner requested applying the complete supplied portfolio analysis in order, after the legacy cleanup. Improve reliable delivery first, then show real engineering work with inspectable evidence. Preserve English UI, first-person voice, monochrome system themes, existing StyleX/edge components, progressive enhancement and privacy. Previous uncommitted cleanup remains intact. No new legacy routes.

This is a set of ordered deliverables, not permission to manufacture achievements, publish signed Logs, change production services or collect visitor telemetry automatically.

## 1. CI and native interactions

A clean snapshot must generate Astro's types before typed lint/type coverage. Reproduce the missing-type failure without `.astro` and prove sync resolves it; integrate preparation into local commands so CI and local runs agree. Never increase suppressions or lower type coverage to hide it.

Restore normal selection, native copy and context menus for ordinary content, PGP text and payment addresses. Restrict selection only on drag controls that require it. Keep Copy buttons and accessible success/failure feedback. Replace the old intentional copy-blocking browser contract with positive native-interaction tests.

## 2. Work and proof-backed case studies

Add a server-rendered Work section on home and canonical `/work` and `/work/[id]` pages. Use a validated local content registry with stable IDs, title, first-person summary, problem, implementation, decisions, limitations, source paths, relevant tests and existing Log links. Start with two explicitly identified works from this repository: the signed Log publication system and the Monero contribution ledger. They are case studies of real systems in this portfolio, not fabricated independent products or live-payment claims.

Owner follow-up: Work stays, but its cards and article presentation must match Log exactly. Log and Work share EntryCard, logStyles, sigils and article body CSS. Each detail page shows problem, approach, evidence and limitations. Do not invent publication dates or verification badges for case studies. Reuse shared cards/type/spacing; include Work in public metadata, search, sitemap and scroll navigation. Content renders before live social activity and remains usable with every provider unavailable. No provider request is necessary to render Work.

Proof-backed means source/test/revision references are inspectable. PGP proves exact publication bytes and signer continuity, not application safety or payment settlement. Do not create new signatures or edit signed content. Existing Logs may be linked, never silently rewritten or newly published.

## 3. Source durability and health

Preserve normalized-data adapters and schema validation. Generalize private Blob persistence to separate X/GitHub/Spotify keys while retaining safe migration for the existing Spotify key. Local snapshots remain atomic files. A failed provider returns the last schema-validated snapshot with truthful stale status and last-success time; missing/corrupt/future-dated snapshots produce unavailable state. Bound refresh work and coalesce concurrent requests. No raw upstream HTML in browser output.

Render a concise stale/unavailable status within existing provider sections, accessible without hover. Owner follow-up: remove the last-success update row entirely; timestamps remain internal cache metadata. Distinguish provider validation from cryptographic verification. Test cold restart, timeout, invalid payload, read/write failure and source isolation using local fixtures.

## 4. Browser and style coverage

Keep the full Chromium suite. Add a focused Firefox/WebKit smoke configuration and CI job for native navigation, Find/Share, selection, scroll and readable glass fallback. Browser-dependent clipboard permissions and screenshots stay in appropriate browser suites. Unsupported displacement uses the existing translucent/opaque fallback; reduced motion and keyboard remain functional.

Audit Log styles for ownership. Move component layout/type/control rules into shared StyleX modules; keep documented generated Markdown/KaTeX selectors where structural descendant styling requires them. Preserve exact rendered content and existing visual contract.

## 5. Build receipts and architecture explorer

Add a build-time script producing a public, validated evidence manifest from actual source graph and explicitly executed checks. Source revision is a full Git SHA plus a clear dirty flag when applicable. Receipts contain commands, exit status and actual timestamps; missing/failed/not-run checks cannot appear as passed. CI produces downloadable receipt/SBOM artifacts and records matching commit references. A locally generated receipt is a local observation; only real GitHub attestations can be labeled attested.

Derive a small architecture graph from the existing dependency-cruiser graph, filtered to each Work's declared source roots. Render an accessible module/link list as the no-JavaScript baseline and a compact inspectable graph enhancement if it adds clarity. Module selections link to source at the recorded revision and relevant tests/Logs. No private paths, env, credentials or payment records enter public artifacts. Graph generation is deterministic for the same snapshot; cap nodes to keep the view readable and indicate omitted nodes.

## 6. Documentation, dependency and TypeScript debt

Expand README with setup commands, runtime requirements, module architecture, verification, fixture limitations, deployment targets and links to security/payment/publication boundaries. Document cache/storage environments and operational gates without exposing secrets.

Add scheduled read-only dependency audit and machine-readable SBOM output with retained CI artifacts. Keep pinned wallet revision/patches until compatibility is demonstrated; no blind upgrades. Reduce existing suppression debt in modules touched by the above tasks using actual type guards/schema validation. Prune resolved suppressions; do not regenerate a larger baseline. Report remaining debt honestly.

## 7. Performance and assets

Measure comparable local cold/warm home responses, provider request counts and browser rendering independently of Lighthouse. Keep the existing streaming separation, choose cache headers only after observing canonical content and live-state effects, and document p95 methodology/sample count. Avoid declaring lower production cost from local timings.

Provide opt-in, privacy-preserving field-performance integration and documented access to hosting metrics. Default sends nothing; no tracking service or live telemetry is enrolled without owner choice. Real LCP/INP/TTFB distributions and Vercel costs require deployed traffic/account data and remain explicitly unmeasured until available.

Audit actual raster use. Prefer responsive AVIF for the portrait where supported and beneficial, with suitable fallback; retain PNG favicon/social compatibility and original provenance assets where required. Compare output size and appearance before changing formats. Do not regenerate the portrait creatively.

## Acceptance and verification

Each deliverable gets focused regression checks, then applicable check/build and unit gates. Test Work on mobile/desktop and both themes, keyboard and no-JavaScript fallback. Exercise provider outages with synthetic snapshots, never real payments. Run the focused three-engine smoke suite. Verify generated receipts/graph links against the source snapshot; prohibit fabricated success labels and secret material.

External completion limits: local CI repair is not a green main run until committed/pushed and GitHub executes it; report that boundary. Publishing new signed Logs, deployment, live wallet experiments and enabling telemetry are separate operations. If access/data is missing, finish the local implementation and leave the external requirement explicitly pending.
