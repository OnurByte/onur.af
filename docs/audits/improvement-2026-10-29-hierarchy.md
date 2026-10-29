# Hierarchy and geometry review

Scope: visual hierarchy, alignment, spacing and shared control geometry; retain brand direction and English UI. Budget: two rounds maximum, three hypotheses per round, one fix at a time.

Baseline: 3abb3457a5a365f07d39cbfa0244a76707b1f423, current dirty working tree (owner's quote-link, selection, cursor and related design changes included). Initial dirty paths recorded in /tmp/onur-hierarchy-baseline-status.txt. Preserve those changes; review this working tree rather than an isolated HEAD that omits them. No commits, signing, deployment or live service changes.

Roles: separate read-only Critic; coordinator Engineer; independent Verifier after patch. Prior structure/code cleanup audits reviewed; their resolved findings are outside this run.

Investigation in progress. Browser checks use the local synthetic gateway fixture, never a wallet.

## Round 1

### HIER-01 / provider hierarchy and icon geometry / medium impact / high confidence

Claim: secondary source headings incorrectly share catalog typography; icon sizing disagrees with actual identity stack.
Observed: embeds.title 20px/500/1.35; icon 51.6px; actual title+4px+24px proof row is 55px. Required provider title is 18px/normal. Browser regression failed in both themes at 320,620,621,900,901,1280 (raw /tmp/onur-hierarchy-red.log); icon differs by ~3.4px. Relevant invariant: docs/design.md native embeds, shared proof24 target.
Engineer: confirmed. Added providerTitle separate from Connect/Technologies; 18px/400/1.4 with icon formula title25.2 + gap4 + proof24 =53.2px. Corrected stale documentation formula, preserving the owner's unrelated quote additions. Before screenshots /tmp/onur-hierarchy-before-{theme}-{width}.png; after use matching viewports/themes/reduced-motion state.
Verification pending.

### HIER-02 / provider column spacing / low impact / high confidence

Claim: 24px columns contradict documented32px gap. Browser red reports actual24px at901/1280. Engineer: confirmed; separate columnGap32 from unchanged rowGap24. No grid breakpoint or row-height change. Verification pending.

### HIER-03 / homepage Log section hierarchy / medium impact / high confidence

Claim: homepage Logs section and its entry titles are peer h2 elements with identical24px type, flattening the parent/child relationship. Source index.astro + LogCard.astro confirms it. Red browser check fails homepage h3 count while /log and /log/tag/development h2 checks pass (/tmp/onur-hierarchy-heading-red.log).
Engineer: confirmed semantic defect; visual differentiation is a deliberate in-scope hierarchy correction. Added contextual headingLevel default h2, homepage opts into h3 with shared20px subheading token; listing/tag pages retain24px h2. Same content, links, metadata, seal and card geometry. Verification pending.

Rejected: default Connect four-column overflow. Actual GitHub content198.28px fits215.5px column at default font. Retain intermediate20px Connect/Technologies catalog headings, primary24px Logs, mobile4px rail reservation, shared radii, proof hit targets, native disclosures and system themes.

## Independent verification and bounded repair

Initial independent browser suite: 61 passed, 2 failed (63 total), /tmp/onur-hierarchy-independent-browser.log. HIER02 and HIER03 passed, alongside existing responsive geometry, footer/field precision, no-JavaScript hierarchy/introduction and Spotify/activity checks. The failing metric selected an injected SCRIPT via previousElementSibling instead of the icon: the earlier ~3.4px source calculation was not a valid measured browser conclusion. Corrected the test to query [data-icon] directly, preserving the strict0.1px geometry tolerance.

Independent runtime investigation found an additional actual cause within HIER01: AccountLink wrapperAttributes.class overrides the explicit class merge during Astro rendering. The account span therefore lacks proof.identity (computed inline/23.8px instead of inline-flex/24px). Before repair, correct icon measurement53.1875px versus heading group52.484375px differed0.703125px. Extracted class from the spread before merging it with proof.identity; headingGroup uses grid so the profile row cannot introduce an anonymous inline baseline. This is the one allowed repair for HIER01. Existing wrapper attributes, proof link, account destination and accessible text stay unchanged. Rerun pending on final rebuilt snapshot.

Round2 Critic source review: all3 corrections coherent, no further confirmed product defect. Both design documents now use53.2px and specify column32/row24; unchanged shared provider box remains deliberate for Spotify. Stop after final verification: two rounds consumed.

Checks so far: initial/current build exit0; Astro/TypeScript check exit0; bun test304 pass/20 skip/0 fail (324 total), /tmp/onur-hierarchy-unit.log. Skips are existing opt-in/database cases; no real wallet settlement tested. Initial lint failed on new test non-null assertions/numeric interpolation; replaced with explicit guards/String(width), no rules or assertions weakened. Subsequent lint exit0 before the small AccountLink repair; final checks pending. Initial format check found this new audit unformatted; final formatting pending.

## Final verdict

- HIER-01: verified independently after the single repair. Six widths320/620/621/900/901/1280, both system themes, reduced motion; provider typography and icon/identity stack agree within0.1px. Shared account/proof classes retained.
- HIER-02: verified independently; desktop measured column gap32px, vertical gap24px preserved.
- HIER-03: verified independently; homepage h3/20px subordinate to Logs h2/24px; listing/tag h2 retained.
- Final independent browser rerun:9 passed, exit0, /tmp/onur-hierarchy-independent-final.log. Prior broader61 passing checks cover geometry, footer/field precision, no-JS introduction/navigation, provider rows and Spotify. Both theme/mobile/desktop screenshots inspected; no supported further defect. Native keyboard disclosure behavior is included in home-focus/home-embeds coverage.
- Final build and Astro/TypeScript check: exit0 (/tmp/onur-hierarchy-build-final.log, /tmp/onur-hierarchy-check-final.log). Unit suite304 pass/20 pre-existing opt-in/database skips/0 fail. Formatting and final strict lint exit0. No deployment, publication, signing, commit or payment operations.

Changed application files: AccountLink.astro, LogCard.astro, HomeEmbeds.astro, SpotifyEmbed.astro, index.astro, styles/embeds.ts, styles/log.ts, styles/shell.ts. Added browser hierarchy regression; corrected design/home-embed geometry documentation. Owner's pre-existing quote/selection/cursor changes preserved.

Budget consumed: two rounds, three findings, one bounded HIER-01 repair. Rejected default Connect overflow; no uncertain or unverified application patches remain. Stop: all supported findings resolved, independent re-evaluation found no additional confirmed defect. Provider network freshness and skipped database tests are outside this visual correction's evidence.
