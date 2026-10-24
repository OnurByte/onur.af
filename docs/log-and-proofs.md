# Log and identity proofs

`/log` is the chronological index, linked to the left of Find. Each entry uses a single, randomly generated three-word ID at `/log/<id>`. The ID is part of the signed bytes and never changes. `/log/<id>/verified?v=1` selects an immutable proof revision; the article exposes old versions through History. Find and RSS use the same entry URLs. Each revision's Verified link opens `/log/<id>/verified?v=<version>`, which contains its exact signed Markdown and cryptographic proof details. Log pages keep the authored content and History navigation without an inline Proof disclosure. Account names and their monochrome ticks open the corresponding PGP page.

## Publish a Log entry

Create a new entry using a Markdown file. A cryptographically random generator combines a curated esoteric adjective, noun and grammatically suitable verb; it checks existing IDs for collisions:

```sh
bun run log:new "A title" "Short summary" article.md
```

The command writes an **unsigned** entry to `src/content/log.json`. Sign it locally before committing or deploying, otherwise the build intentionally fails. For reference, each entry follows this structure:

```json
{
  "id": "veiled-compass-turns",
  "title": "Your title",
  "summary": "Your RSS summary.",
  "revisions": [
    {
      "version": 1,
      "publishedAt": "2026-10-15T12:00:00+03:00",
      "body": "Your Markdown."
    }
  ]
}
```

The example is a schema guide, not a published post. Sign locally with the private key corresponding to `public/pgp.asc`:

```sh
bun run log:publish veiled-compass-turns
```

The publish command signs every revision separately and obtains an individual OpenTimestamps calendar receipt for each one. It stores detached PGP signatures, SHA-256 digests and standard `.ots` receipts. The canonical signed Markdown includes the entry ID, title, summary, version, first publication date, revision date and body. The site serves those exact bytes at `/proofs/veiled-compass-turns-v1.md`, with its signature at `/proofs/veiled-compass-turns-v1.md.asc`. Entries with invalid IDs and unknown publication URLs return 404; there is no compatibility layer.

After signing all revisions, `log:publish` also appends a signed publication edition. Each canonical JSON manifest contains a consecutive sequence number, the SHA-256 hash of the previous exact manifest bytes, and the complete sorted list of revision IDs, versions and Markdown digests. Both the exact manifest and its detached PGP signature are retained at `/proofs/log-publication-v<sequence>.json` and `/proofs/log-publication-v<sequence>.json.asc`. The build verifies every signature, sequence, previous-manifest hash, append-only inventory and the latest inventory against the current signed revisions.

Download an edition and its signature, then verify it with the public key:

```sh
gpg --import pgp.asc
gpg --verify log-publication-v1.json.asc log-publication-v1.json
```

Keep a copy of an earlier signed edition to compare history over time. The hash chain reveals changed or removed history only when the verifier retains a prior edition; by itself it cannot prevent rollback to an older valid edition.

Keep the signed entry ID, title, summary and existing revisions immutable after signing. To correct the body, append version 2 with a later timestamp, then publish again. Previous versions remain downloadable and readable under History. Changing signed bytes fails verification and the build. Reading times are estimates (240 prose words/minute, two seconds per code line), calculated without tracking readers. Publication and revision dates are included in the exact signed and timestamped bytes. The Bitcoin proof establishes existence no later than its confirmed block time; it does not establish the exact moment the author created the file.

If the RSS feed is already signed, refresh its signature after changing Log entries:

```sh
SITE_URL=https://your-domain.example bun run rss:sign
bun run build
```

## Sign account URLs

```sh
bun run proofs:sign identity x
bun run proofs:sign identity github
```

These commands clear-sign the canonical account URLs with the local private key corresponding to `public/pgp.asc`. The signature is displayed at `/pgp/x` or `/pgp/github` and downloaded from the corresponding `.asc` URL. It authenticates the URL statement; a platform-side ownership counterpart is optional.

The `/pgp` page also displays a clear-signed ownership statement containing the exact claim and both account URLs. It is published as `/pgp/identity.asc` and checked by `proofs:verify` against the same public key. The claim is the account holder's signed declaration; it does not assert that X or GitHub independently verified the key. No account-side post or Gist is required.

## Add public account counterparts

Get the fingerprint from `/pgp`, without spaces. Publish the following marker from the account being proved:

```text
openpgp4fpr:YOUR_FULL_FINGERPRINT
```

For GitHub, put it in a public Gist belonging to `onurbyte`. For X, publish it in a post from `@onurstirner`. Then sign the statement locally:

```sh
bun run proofs:sign identity github https://gist.github.com/onurbyte/GIST_ID
bun run proofs:sign identity x https://x.com/onurstirner/status/POST_ID
```

The script checks the public marker, account owner and post/Gist URL before signing only the canonical account URL. Account proofs use the OpenPGP cleartext signature framework ([RFC 9580, section 7](https://www.rfc-editor.org/rfc/rfc9580.html#section-7)): the readable URL and its armored signature form one `.asc` file. Timestamps and counterpart URLs are metadata, not signed text. GitHub evidence comes from the public Gist API; X evidence uses the site's existing FxTwitter provider. Remote account evidence is therefore subject to those services' availability. The site verifies the signature against its public key before displaying it. The local publication check also verifies the public counterpart. X and GitHub account links always include the PGP tick as navigation to their signature page; the tick is not conditional on a stored signature or remote availability. A stored signed URL remains visible and downloadable independently of the remote service. No status prose is added to the page.

No private key is stored in the repository, web server or deployment. Signing uses the local GPG agent. Signing the ownership statement never publishes a post or Gist for you.

## Verify

```sh
bun run proofs:verify
bun run check
bun run build
bun test
```

Visitors download the Markdown, `.asc` file and `/pgp.asc`, then run:

```sh
gpg --import pgp.asc
gpg --verify veiled-compass-turns-v1.md.asc veiled-compass-turns-v1.md
sha256sum veiled-compass-turns-v1.md
```

The displayed SHA-256 value must match the command output and the revision's entry in a verified publication edition. If a `.ots` receipt exists, verify it with `ots verify veiled-compass-turns-v1.md.ots veiled-compass-turns-v1.md`; the page only presents Bitcoin confirmation after validating the receipt and its block data.

Account pages show the complete signed block with Copy and Download. Download `/pgp/x.asc` or `/pgp/github.asc`, then verify the self-contained signed URL:

```sh
gpg --import pgp.asc
gpg --verify x.asc
```

Download `/pgp/identity.asc` and verify the account ownership statement:

```sh
gpg --verify identity.asc
```

Inspect the linked public counterpart separately. Only the account URL inside the signed message is authenticated by the signature. Log revisions continue to use detached binary signatures to preserve their exact Markdown bytes.

## Local key

The active key was created on 2026-10-15 with an Ed25519 signing key and Curve25519 encryption subkey, expiring in two years. Its fingerprint is `096E249AA4606A6D54A2B3E2CD1EAC874A430A56`. The private key stays in `/home/borat/.gnupg`; GnuPG's revocation certificate is in its `openpgp-revocs.d` directory. Only `public/pgp.asc` and the account signatures belong in this repository. The previous public key was archived at `/home/borat/.local/share/onur-portfolio/keys/previous-public-2026-10-15.asc`.

## Bitcoin timestamps

`src/content/log-timestamps.json` holds one real OpenTimestamps receipt for each signed revision. The receipt binds the canonical Markdown digest and is accepted only alongside its matching verified PGP signature. The downloadable proof is `/proofs/<id>-v1.md.ots`; verify it against the corresponding `.md` using a standard OpenTimestamps client.

Calendar acceptance is pending, not Bitcoin confirmation. After the calendar anchors the commitment, upgrading the receipt adds Bitcoin block attestations. The site only shows Bitcoin block/time after successful cryptographic verification; merely inserting a block height in JSON or a receipt cannot confer that status.

```sh
bun run timestamps:upgrade
bun run timestamps:verify
bun scripts/log-timestamps-watch.ts
```

The local watcher rereads the receipts, retries calendar outages and stops once all receipts are verified. The hourly GitHub workflow upgrades existing receipts and commits only the proof JSON once this code is pushed and the workflow is enabled. Neither task needs a private key. New revisions still require local signing via `log:publish`.

The official OpenTimestamps library verifies Merkle commitments against Bitcoin block data. This site's lightweight verifier uses the library's Blockstream explorer lookup for the canonical block, rather than running a local Bitcoin node; that canonical-chain lookup is a trust assumption. Visitors can independently verify the downloaded receipt with their own Bitcoin node. No file body or private signing key is sent to timestamp calendars.

The `request` dependency patch changes legacy `uuid/v4` imports to `require('uuid').v4`, preserving the repository's modern UUID override while allowing the official OpenTimestamps client to run.

## Rich Markdown, tags and SEO

For a detailed authoring reference covering the supported Markdown syntax,
images, callouts, mathematics, citations, and revision rules, see the
[Log Markdown writing guide](log-markdown-guide.md).

Log bodies support CommonMark plus GFM tables, task lists, strikethrough,
autolinks and footnotes (`[^1]` / `[^1]: Source`). Headings receive stable,
Unicode-aware fragment links; longer entries expose a Contents navigation.
On desktop, a compact rail follows the current section and reveals the outline
on hover or keyboard focus, without moving the article. Each bar is a direct
section link, and its fill follows reading progress. Narrow screens use an inline
row of the same links. The outline includes Sources when present.
Raw HTML remains escaped, including in archived revisions.

New revisions can include `title`, `summary`, `language`, `tags`, `cover`, and `sources`.
These fields are included in the signed Markdown. Old revisions without the
fields retain their exact signed bytes. Never edit a signed revision or the
original entry-level title/summary: append a revision instead. Metadata is a
snapshot: repeat tags/language/cover in a new revision to retain them.

Create a draft with optional metadata:

```sh
bun run log:new "Understanding PGP" "How signatures establish authorship." article.md metadata.json
```

```json
{
  "language": "en",
  "tags": ["cryptography", "pgp"],
  "cover": {
    "src": "/media/verification.webp",
    "alt": "Diagram showing a public key verifying a signed message",
    "caption": "Public-key verification",
    "width": 1200,
    "height": 800
  }
}
```

Cover dimensions must match the actual displayed image dimensions (after EXIF
orientation). Store local originals under `public/media/`. The Astro integration
validates every local body/cover image at build time, reads its dimensions and
generates content-addressed WebP variants up to 1920px under `public/log-media/`.
That generated directory is ignored by Git and copied into the deployment.
The rendered HTML includes intrinsic dimensions, `srcset` and `sizes`, so the
browser chooses a suitable image without changing signed source URLs. Editing
a local image during development regenerates the variants and reloads the page.
Missing local files, escaping symlinks and incorrect cover dimensions fail the
build. SVG and GIF/animated images retain their original format and dimensions;
small raster images are never enlarged. External HTTPS images remain external
and are not fetched by the optimizer. Their covers still require explicit
width/height. Image URLs and metadata are signed; image file bytes are not part
of the Markdown signature. Body images require meaningful alt text, including reference
images. Explicitly decorative images use `![](/media/decoration.webp "decorative")`.
Only local absolute paths and HTTPS image sources are allowed. Body images use
lazy loading and asynchronous decoding; covers reserve layout space through
width/height and load eagerly on the active revision.

The controlled vocabulary lives in `src/content/log-tags.json`. Add a slug,
display title and useful topic description there before using a new tag. Used
tags appear on cards, articles, Find, and `/log/tag/<slug>` archives. Keep
`indexable: false` until an archive has useful topic coverage; set it to `true`
after editorial review to include it in the sitemap. No automatic post-count
threshold is imposed. Unknown subject routes return 404; known empty subjects remain accessible and noindex. Tag labels are
editorial navigation; the signed identity is the tag slug.

Article pages derive their language, Open Graph article metadata, BlogPosting
and BreadcrumbList JSON-LD from the latest revision. The sitemap uses actual
revision timestamps for `lastmod`. Configure the public `SITE_URL` for canonical
URLs, social metadata and structured data; Astro’s configured site URL also supplies metadata when the runtime variable is absent. Public HTML remains indexable without an origin setting. Private checkout pages, errors, unapproved tag archives and Vercel preview deployments retain noindex.
The existing generated social cards remain in use. No meta keywords are emitted.

Reference documentation:

- https://github.com/micromark/micromark-extension-gfm
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/appearance/google-images

## LaTeX and source blocks

Use `$...$` for inline math and `$$` fences for display math:

```markdown
The identity $E = mc^2$ is rendered inline.

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$
```

KaTeX renders HTML plus accessible MathML on the server. CSS/fonts are bundled
locally; no client-side math renderer or CDN is required. Code spans and fenced
code blocks remain literal. Escape currency dollar signs as `\$` when they
could be mistaken for delimiters. Supported LaTeX is KaTeX's math syntax, not a
full `.tex` document compiler. Invalid math fails content validation. External
resource/HTML commands are untrusted, macro expansion is bounded, and authored
size commands are capped. Math remains unchanged in signed/downloaded Markdown.

Use a blockquote marker to label evidence or explanations:

```markdown
> [!SOURCE]
> [Protocol specification](https://example.com/specification)

> [!NOTE]
> This claim was corrected in v2; see History.
```

`NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`, and `SOURCE` labels are supported.
Ordinary blockquotes still work. Raw HTML remains escaped in both.

## Connections and revision changes

The article footer lists up to three Related logs, ordered by shared tag count,
then original publication recency. Referenced by lists current articles that
link to this log. Repeated links count once; links in old revisions/code or on
other websites do not create backlinks. With `SITE_URL` configured, absolute
links to the same site count too. Nothing appears when there are no matches.

History includes Changes in vN disclosures. They compare the exact signed
Markdown against the preceding revision, including metadata, and display added
and removed lines with three surrounding context lines. They are derived views;
original Markdown, individual PGP signatures and timestamp receipts remain the
source of verification. No old revision or proof is rewritten.

## Optional Sources section

Add an optional `sources` list to a revision, or to `metadata.json` when using
`log:new`:

```json
{
  "sources": [
    { "title": "Protocol specification", "url": "https://example.com/spec" },
    { "title": "An earlier note", "url": "/log/veiled-compass-turns" }
  ]
}
```

Each item requires a nonempty title and a local absolute path or HTTP(S) URL.
There is no mandatory source count. Omit `sources` or use `"sources": []` to show
nothing: no heading, empty list or placeholder. With sources present, a native
Sources disclosure appears below the revision body, closed initially and
expandable with mouse or keyboard, including without JavaScript. History shows
only the sources belonging to each archived revision.

Sources are revision snapshots and included in the exact signed Markdown;
adding/removing/changing them on a published log requires a new revision.
Older revisions that omit the field retain their signed bytes. Citations to
other local logs contribute to Referenced by and current local log references
are validated before publishing. Existing inline `[!SOURCE]` blockquotes and
Markdown footnotes remain available separately.

In prose, use a one-based marker such as `The protocol defines this behavior [1].`
It links to the matching numbered source, opens the Sources disclosure
and scrolls to the entry. A return arrow beside each source jumps back to its
citation. Numbers follow the order in `sources`; markers without a matching
entry remain ordinary text. Markers inside code or existing links are ignored.

## Subjects and editorial reading paths

Cards and articles display signed `tags` as Subjects, retaining `rel="tag"` and
`p-category`. Existing `/log/tag/<slug>` URLs remain permanent. No tags are
required when drafting; the revision schema permits up to 12 unique canonical
slugs, including an empty array.

The subject dictionary also accepts `aliases`, an optional `broader` slug, and
`related` slugs. Hierarchies must be acyclic and all referenced subjects must
exist. Broader archives include records filed under narrower subjects without
adding tags to signed revisions. Find indexes aliases and populated subject
pages. Empty known subjects remain accessible for old links, with noindex;
only populated subjects explicitly marked `indexable` enter the sitemap.

`src/content/log-connections.json` contains author-selected reading paths:
`{"from":"<log-id>","to":"<log-id>","reason":"Why read this next"}`.
The file is an array; order controls presentation. IDs must exist, reasons must
be nonempty, and self links and duplicate pairs are rejected. These navigation
choices are editable independently of signed logs. They appear as Further
reading with the reason, outside the scope of revision verification. Shared
subjects alone produce no recommendations. Referenced by continues to derive
from actual links in the latest revision. Leave the array empty until there
are real reading paths to recommend.
