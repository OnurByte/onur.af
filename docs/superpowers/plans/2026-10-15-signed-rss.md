# Signed RSS implementation plan

Goal: sign the exact RSS XML with a detached OpenPGP signature and list its real entries on `/rss`.

Architecture: one strictly validated entry list drives XML and HTML. GnuPG signs locally; OpenPGP.js verifies against the site's published key without private keys or GnuPG on the web server. A single atomic signature artifact binds the canonical origin and exact feed digest. Missing signatures are explicitly unsigned; stale or invalid artifacts fail the publication check.

Constraints: preserve Astro, strict TypeScript, StyleX, system themes, content negotiation and existing feed URLs. No invented posts. No private keys in source or server configuration. Existing unrelated changes remain untouched.

- [x] Add failing tests for validated/sorted feed entries and escaped XML.
- [x] Implement shared entry model and JSON content collection; render the same entries in XML and HTML.
- [x] Add failing cryptographic tests for detached XML verification, tampering, wrong key, stale digest and changed origin.
- [x] Implement the signature artifact and verification boundary, then local GPG signing / verification commands.
- [x] Wire `/rss.xml.asc`, feed signature discovery and RSS/PGP cross-links; preserve honest unsigned states.
- [x] Verify formatting, strict checks, build, unit tests, browser states and an isolated real GPG round-trip without touching the user's keys.

Review focus: mismatch between runtime origin and signed origin; duplicate GUIDs; XML escaping; signature from the wrong key; stale signatures after content/metadata changes; missing signing key; empty feed; atomic publication of feed and signature.
