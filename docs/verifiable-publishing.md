# Verifiable publishing

The existing PGP revision signatures, publication manifests, OTS receipts and
`onur-text-v1` UTF-16 selectors remain authoritative and unchanged. New evidence
is additive. The implementation plan and original research are under
`docs/superpowers/`.

## Text identity

`src/content/log-projections.json` freezes both normal and History-prefixed
render results, their SHA-256 hashes, the exact rendered text and its SHA-256,
and the signed Markdown hash for every revision. The Log, Quote and annotation
API consume the same stored projection. The extraction excludes generated
buttons/templates, preserves every other UTF-16 code unit, and performs no
Unicode or whitespace normalization. W3C exports convert positions to Unicode
codepoints explicitly; signed local selectors stay UTF-16.

`bun run log:projections prepare` only appends missing revisions. Existing
projections are validated without regenerating their render output. Renderer
upgrades affect future projections; they cannot redefine old Quote URLs.
Changing an existing signed revision makes the build fail.

## Historical representations

`src/content/log-snapshots.json` freezes complete standalone HTML with inline
presentation, inert embedded raster media and, when used, embedded KaTeX fonts.
The snapshot hash detects accidental changes; it is not a replacement for the
PGP signature on the source Markdown. HTML contains no scripts, live annotation
records, metrics or Webmentions. External links may change; embedded image
bytes do not. Unsupported media fails preparation rather than claiming an
immutable external dependency.

`bun run log:snapshots prepare --reconstruct` captures pre-existing revisions.
Normal preparation also classifies revisions older than five minutes as
reconstructed, so backdated publication remains possible without inventing a
historical capture date.
The original `publishedAt` remains separate from actual `archivedAt`; old
revisions explicitly say **Reconstructed revision**. Captures do not prove that
this HTML existed on the original publication date. Preparation uses whole UTC
seconds because HTTP-date has second precision. Re-running preparation checks
existing snapshots and leaves their bytes and archivedAt unchanged.

Routes implement [RFC 7089](https://www.rfc-editor.org/rfc/rfc7089.html):

- `/log/{id}` remains the live composite view and advertises TimeGate/TimeMap.
- `/log/{id}/timegate` redirects with 302 to the latest captured state whose
  archivedAt is no later than Accept-Datetime. No header means the latest state
  available now. Equal timestamps select the highest revision.
- Accept-Datetime requires IMF-fixdate in UTC, including the correct weekday;
  invalid input returns 400, and dates before the first capture return 404.
- `/log/{id}/timemap` returns application/link-format with capture datetimes.
- `/log/{id}/memento/v{n}` returns the stored HTML, Memento-Datetime, original,
  timegate/timemap relations, immutable caching, ETag and restrictive CSP.
- TimeGate has `Vary: Accept-Datetime` and `Cache-Control: no-store`.
  GET and HEAD use the same selector; a Memento never negotiates its bytes.

Disabling or removing a discovery link must not rewrite a previously captured
snapshot or signed revision. Preserve snapshot/projection JSON in repository
history and backups. Build checks fail closed on missing or corrupt records.
The publication transaction already atomically activates `src/content`; its
staged gates now prepare projections and snapshots before the existing proof
gates. No remote Webmention/Sigsum operation is added to that transaction.

## Optional external layers

See [Webmention operations](webmentions.md),
[annotation portability](annotation-portability.md) and
[transparency operations](transparency.md). Receiver discovery and listing are
opt-in. Failure of any external layer leaves reading and PGP/OTS verification
available. Production activation, a real external Sigsum submission, production
key authority signing and an independently operated monitor are separate
operator actions. No independent observation is asserted by this change.

## Validation boundaries

Local protocol tests cover date boundaries, HEAD parity, frozen hashes and
Unicode/render equivalence. Playwright checks old Quote behavior and encrypted
cross-context identity recovery. Receiver store tests can use a local isolated
PostgreSQL fixture; remote Webmention Rocks and independent monitor operation
require external acceptance testing. Mocks do not establish these conditions.

To attach an independently verified Sigsum package to an existing archive:

```sh
bun run log:archive attach-transparency base.tar evidence-directory enriched.tar --fingerprint TRUSTED_ROOT_FINGERPRINT --policy-sha256 TRUSTED_POLICY_SHA256
```

This requires the official `sigsum-verify` tool. It checks the bundle's PGP
chain, exact manifest binding, PGP submitter authority and policy-pinned quorum
before adding files under `transparency/publication-vN/`. Existing evidence
bytes are retained; conflicting attachments fail. The ordinary portable bundle
verifier checks PGP/OTS/inventory; it does not invoke Sigsum or independently
validate monitor observations. Reverify the extracted transparency package
with the transparency CLI and your own trusted policy hash.
