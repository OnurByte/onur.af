# SEO audit and fixes — 2026-10-20

Final local result after owner-authorized fixes: all four Lighthouse categories are **100** on the homepage in mobile and desktop simulations; all **nine** sitemap HTML pages score **100 SEO**. Final implementation and verification details follow the historical review below. These are local lab results; production has not been deployed.

Initial review scope: review only of technical SEO, crawlability, indexing policy, metadata, internal links, structured data, content, mobile rendering, image markup, and performance. No application edits, publication, signing, deployment, tracking, wallet requests, or live-service changes.

Budget: two review rounds, at most three hypotheses per round; five supported findings total. Product-engineering phase is assessment only. Coordinator inspected current sources and ran HTTP/browser/Lighthouse experiments; separate source critic and verifier used. Conclusions distinguish observed behavior from ranking inference.

Snapshot: HEAD `5537b9b08fe197fa49be594ac35d924d01a52546`, plus existing uncommitted changes. Prior SEO changes are included locally but absent live. Existing owner changes in client dialogs/search/smooth-scroll, global CSS, browser search tests, AGENTS.md, .agents/, and prior audit records were preserved. SEO working changes: public-pages.json, Layout.astro, index.astro, pgp/[proof].astro, previews.ts, seo.ts, browser log/SEO tests, previews unit tests. No clean-HEAD-only claim.

Targets: live https://portfolio-seven-plum-73.vercel.app and existing local build served at http://127.0.0.1:14326 with canonical origin set to the live URL. Local build was produced in preceding implementation turn and matches the current SEO sources. Chromium mobile 390×844 with JavaScript disabled for HTML/mobile observations; Lighthouse default mobile simulation with JS enabled.

## Measurements

| Category                | Live home | Local updated home |
| ----------------------- | --------: | -----------------: |
| Performance             |        99 |                 95 |
| Accessibility           |       100 |                100 |
| Best practices          |       100 |                100 |
| SEO                     |        92 |                100 |
| Lab LCP                 |     1.1 s |              2.9 s |
| Lab CLS                 |     0.003 |              0.003 |
| Lab total blocking time |      0 ms |              20 ms |

One run per target. These are lab snapshots, not CrUX/Search Console field results, not INP measurements, not ranking scores, and not a controlled before/after performance comparison. Origin/network/cache conditions differ. Lighthouse document-latency insight also observed a 1,410 ms response during its live audit pass; the separate main-navigation server-response audit reported 120 ms. Do not collapse these different requests into a single timing claim.

Live home SEO failure: missing meta description. Locally the updated title/description are present and the SEO category has no failing automated audits. Lighthouse 100 accessibility does not establish full WCAG conformance; its unweighted label/name mismatch audit flagged Find versus Search pages and date/proof labels.

## Round 1

### SEO-01 / technical canonicalization / medium / high confidence

Claim: trailing-slash variants of valid pages render the content with contradictory indexability rather than consolidating the URL.
Observed: `/log` returns 200, `index, follow`, self canonical. `/log/` returns 200, `noindex, nofollow`, no canonical. Same for `/pgp/`. Reproduced live and local, including JS disabled. Source: `seo.ts` public route checks use exact pathname; Astro config does not enforce a slash policy/redirect.
Impact: requests to alternate URL shapes do not consolidate signals through redirects; visitors/crawlers receive inconsistent page policy. No evidence that the slashless canonical pages are currently excluded from Google.
Disproof: alternate route returns permanent redirect to preferred route, or coherent canonical/index policy.
Assessment: confirmed. Recommendation: permanent slash normalization excluding root and preserving query strings; tests for public routes and 404/private behavior. No patch this turn.
Verdict: observed; independent verifier pending below.

### SEO-02 / internal links / low–medium / high confidence

Claim: article card links omit actual anchor text.
Observed: `src/components/LogCard.astro:29` renders an empty anchor with href and aria-labelledby; visible h2 is a sibling. Confirmed in raw HTML of home and Log. The link is crawlable, and has an accessible name; claiming Google cannot discover it would be false.
Impact inference: weaker explicit anchor context than the Google-recommended visible text inside the anchor. Ranking effect was not measured.
Disproof: rendered anchor contains descriptive text or an equivalent documented crawler fallback.
Assessment: confirmed markup opportunity. Recommendation: put title text in the real link while preserving the card hit area, nested independent controls, and styling. No patch.

### SEO-03 / server response performance / medium risk / high source confidence

Claim: external-source refresh can delay the entire home document.
Observed: `src/pages/index.astro:19-20` uses no-store and awaits `loadEmbeds` with a 15,000 ms deadline before rendering. Sources use cache, but stale refresh is awaited; X/GitHub/Spotify can perform external requests. Local browser initial TTFB ~1,522 ms; live measurements varied, and Lighthouse performance was strong in its sampled main navigation.
Impact inference: a slow/cold/stale provider can delay TTFB and LCP. This is a source-established risk, not a claim every visit takes 15 seconds or current field CWV fails.
Disproof: delayed external-source fixture leaves initial HTML response independent of the provider delay.
Assessment: confirmed blocking dependency; worst-case live impact uncertain. Recommendation: serve a validated cached snapshot immediately and refresh separately, or reduce/block only a small bounded source budget while preserving server-rendered primary content. Do not simply remove cache controls without reviewing freshness and privacy.

## Round 2

### SEO-04 / sharing metadata / low / high confidence

Claim: X/GitHub proof pages declare a large-image Twitter card but provide no social image.
Observed live: `/pgp/x` and `/pgp/github` have neither og:image nor twitter:image. `publicPreview` has no entries for these paths; Layout only creates image URLs when a preview exists. This predates the preceding changes: `git show HEAD:src/content/public-pages.json` has the same five route entries. Critic's initial regression classification is rejected.
Impact: optional improvement for sharing these identity URLs; not established organic ranking damage.
Disproof: image metadata and a valid fetched image exist for each proof URL.
Assessment: confirmed pre-existing gap. Optional account-specific previews or intentional non-image card type. No patch.

### SEO-05 / owner copy requirement / low SEO impact / high confidence

Claim: unwanted “notes” descriptions remain on subject pages.
Observed: `src/content/log-tags.json` retains Notes/notes in cryptography, privacy, identity, development and AI definitions. `/log/tag/development` renders “Implementation notes and lessons from building software.” as visible and meta description, live and local.
Impact: incomplete owner copy requirement from preceding turn. Existing tags are deliberately noindex, so do not present this as a major ranking problem.
Disproof: all affected editorial descriptions use approved content language.
Assessment: confirmed. Recommendation: replace generic labels with factual subject descriptions; do not alter signed article content merely to remove incidental ordinary words. No patch in analysis-only turn.

## Confirmed strengths and rejected checklist claims

- All nine live sitemap HTML URLs return HTTP 200; title and one H1 exist. Eight have descriptions; home omission fixed locally.
- Canonical origins are configured live and in the local audit server. Tracking query parameters resolve to clean canonical URLs.
- robots.txt allows crawling and lists the sitemap. XML sitemap is well formed and contains only current public/listed routes.
- Unknown URL returns real HTTP 404 with noindex. Legacy `/donate` permanently redirects to `/contribute`.
- Article body, navigation and identity content are available without JavaScript. Checked mobile routes have no horizontal overflow at 390 px.
- Images on checked HTML have alt attributes. Decorative images intentionally use empty alt; that is not automatically an SEO defect. Article image pipeline supports intrinsic dimensions and responsive variants.
- Article has BlogPosting, author, publication/update dates, language, and BreadcrumbList JSON-LD. Home has WebSite/Person; local sameAs now identifies X/GitHub. JSON parses; Google Rich Results Test was not run, so no rich-result eligibility guarantee.
- Sparse subject archives deliberately use noindex, follow and are excluded from sitemap. Historical proof revision queries canonicalize to the main proof URL; no need to index every revision.
- No missing pagination problem at one listed article. No requirement for hreflang without alternate-language equivalents. No need for meta keywords or arbitrary description padding to 160 characters.
- Random visible home motto is a brand choice. Local SEO title is now stable; visible H1 can remain a separate editorial decision.
- No requirement to place schema on every utility page. Article cover/image is an optional editorial enhancement; don't invent imagery or claims to fill a checklist.

## Content and off-site assessment

Only one listed article currently exists. This limits topic coverage; it is not evidence of a technical penalty. Homepage title “Onur — Personal website” is stable but broad. A more specific role/topic should be chosen only from real identity and actual content. The existing article headline is abstract; matching headline and summary to the actual argument and reader intent is an editorial opportunity, not a directive to rewrite signed material.

GitHub repository listings on home link outward; they are not locally indexable project case studies. Creating truthful local project pages can add discoverable content if the owner wants to publish substantive implementation details/results. Do not create empty SEO landing pages.

No access to Search Console, CrUX field data, Bing Webmaster Tools, server crawl logs, or backlink reports. Therefore indexed URL count, canonical chosen by Google, search queries, CTR, impressions, manual actions, real-user INP/CWV, referring domains and keyword competition remain unverified. Public `site:` counts would not substitute for these measurements. A custom domain can improve identity consistency but is not a prerequisite for indexing, and no domain purchase is required by this audit.

## Checks and limitations

Read-only HTTP crawl covered nine sitemap HTML URLs and 27 distinct internal paths discovered from them. Additional linked resources returned 200; initial attempt to decode binary .ots/.tar as UTF-8 failed and was repeated with binary-safe reads (not broken links). Same-page fragment checks on sitemap pages found no missing IDs. Cross-page fragments and external backlink targets were not exhaustively validated.

Browser compared home, Log, article, development subject, /pgp/, /log/ on live and local, JS disabled. Lighthouse ran live and local homepage, one mobile run each. No application changes, so check/build suite was not rerun this turn; previous implementation's build/type/16 unit/11 browser checks are separate evidence.

Sources:

- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/appearance/page-experience
- https://developers.google.com/search/docs/appearance/core-web-vitals
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/appearance/snippet

Artifacts: sibling SEO report JSON files contain Lighthouse results and sanitized browser/link observations. No secrets included.

Stop: two review rounds complete; five supported findings recorded, no implementation authorized by this analysis request. Remaining unknowns need field data or dedicated controlled experiments. Independent verifier result appended below.

## Independent verifier closure

Separate verifier independently fetched local slash variants and confirmed SEO-01. Verifier inspected source and official Google link guidance for SEO-02: crawlability/accessibility failure rejected, literal anchor-text opportunity verified. SEO-04 confirmed as pre-existing via HEAD comparison; regression claim rejected. Verifier independently inspected both Lighthouse artifacts and confirmed scores, mobile simulation and the live/local distinction; no runtime errors/warnings reported. SEO-03 worst-case latency remains unmeasured, despite confirmed blocking source dependency. SEO-05 confirmed by coordinator source/browser evidence rather than independent agent reproduction. No fixes were made or represented as verified fixes.

## Owner-authorized fixes and final verification

The owner subsequently requested implementation of all findings and Lighthouse 100 targets. Changes remain local and uncommitted; no deployment, live publication, signature regeneration or payment operation occurred.

Resolved:

- SEO-01: known public HTML trailing-slash URLs permanently redirect (308) to the preferred URL, preserving queries. Unknown/private routes retain existing behavior. Regression failed with 200 on baseline and passes after the fix.
- SEO-02: article card titles now live inside actual links. A stretched pseudo-element retains the large hit area; badges and subject links stay independent. Baseline regression found no title link; patched browser checks pass.
- SEO-03: HomeActivity async child streams after document head and primary content. Controlled delayed-provider experiment delivered primary content in 16 ms while complete activity HTML took about seven seconds. Complete response can still await provider timeout; the primary content no longer does.
- SEO-04: X and GitHub proof previews now have individual keys, descriptions and working PNG image endpoints. Explicit per-page descriptions take precedence so fallback verification text is not overwritten by preview metadata.
- SEO-05: generic Notes/notes descriptions removed from subject definitions, retaining truthful subject descriptions and intentional noindex policy.

Additional performance and accessibility work:

- StyleX compiler minifies production output. Shared CSS under 40 KiB is inlined; larger stylesheets stay external. This removes the homepage render-blocking stylesheet request.
- Standalone Node compresses HTML when gzip is accepted, preserving existing response/indexing headers and flushing streamed chunks. Vercel retains its platform compression. Signed/non-HTML artifacts are untouched. Independent review caught an initial source-error propagation problem; a failing producer test reproduced it and pipeline error/cancellation propagation fixed it. Four focused compression tests pass, including exact decompression, excluded encodings, first-chunk streaming and producer failure.
- Native navbar remains immediately usable; decorative glass generation starts after first presentation in an idle callback with a bounded timeout. Tests with paused clocks now explicitly advance through deferred startup, retaining all geometry, animation and preference assertions.
- Existing portrait WebP bytes were extracted without pixel changes from the SVG wrapper and imported into Astro's responsive image pipeline. Its original source bytes were independently verified identical. Small screens receive an appropriately sized WebP instead of the 87 KiB SVG wrapper; visual identity and intrinsic dimensions are retained.
- Find button uses its visible native text for its accessible name. Verified badges and introduction date links include their visible labels in the accessible name. Added an explicit axe label-content-name-mismatch regression; final check passes.
- Modal focus returns without scrolling, preserving ongoing page position. Existing scroll regression reproduced the jump and passes with preventScroll.
- Old tests that expected missing home descriptions/no title links were updated to assert the corrected product behavior. Search result checks target the intended URL instead of ambiguous substring matches in descriptions.

Final Lighthouse 12.6.1, built production server at localhost, default mobile and desktop simulations, no audit bypasses or reduced score thresholds:

| Homepage category | Mobile | Desktop |
| ----------------- | -----: | ------: |
| Performance       |    100 |     100 |
| Accessibility     |    100 |     100 |
| Best practices    |    100 |     100 |
| SEO               |    100 |     100 |

Mobile LCP: 1.4 s; FCP: 0.9 s; TBT: 0 ms; CLS: 0.003. Desktop LCP: 0.3 s; FCP: 0.2 s; TBT: 0 ms. Final measurements were run serially after build/tests to avoid benchmark contention. These are page-specific automated lab scores, not real-user CWV or a guarantee of search rank. Other sitemap pages were measured for SEO only, not claimed to have four-category 100 scores.

| Sitemap HTML route                         | Final SEO score |
| ------------------------------------------ | --------------: |
| `/`                                        |             100 |
| `/contribute`                              |             100 |
| `/rss`                                     |             100 |
| `/pgp`                                     |             100 |
| `/log`                                     |             100 |
| `/pgp/x`                                   |             100 |
| `/pgp/github`                              |             100 |
| `/log/cryptic-watchtower-watches`          |             100 |
| `/log/cryptic-watchtower-watches/verified` |             100 |

Final verification:

- Production build: exit 0; publication/key/RSS/proof/timestamp validation checks also passed.
- Astro/TypeScript check after temporary fixture cleanup: exit 0, zero errors/warnings (71 informational hints).
- Full unit suite: 227 passed, 8 skipped, 0 failed across 62 files. Skips are opt-in PostgreSQL/wallet/checkout integration checks; no real payments were tested.
- Full browser suite: 159 passed, 0 failed. Covers mobile/desktop, system themes, JavaScript-disabled introduction, responsive portrait, accessibility, navigation, independent proof downloads, synthetic checkout states, search, modal behavior and scroll.
- Dead-code check: exit 0 after temporary fixture cleanup. Intermediate unused-file findings were generated test copies, all removed.
- Formatting of every changed tracked file plus new source/tests: exit 0. Diff whitespace check: exit 0.
- The owner's pre-existing server on port 14323 was left intact. Test copies used port 14325 with corresponding same-origin fixture references; no test assertions or audit thresholds were disabled. Temporary files were removed.
- Separate reviewer independently confirmed redirect/query behavior, metadata, PNG endpoints, gzip decompression, exact portrait source preservation and the mobile 100 artifact. Reviewer also found the unscored label issues now covered by the new passing accessibility regression.

Remaining scope limitations: Search Console/indexed status/backlinks/field INP remain unavailable and were not invented. Production deployment is still required before live URLs reflect these fixes. Home upstream activity can finish after the primary HTML stream; cached/live-source behavior remains as documented.

Machine-readable final scores: `seo-2026-10-20-fixed-scores.json`. Historical before-fix reports remain for comparison.
