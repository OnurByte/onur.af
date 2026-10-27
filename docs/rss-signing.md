# RSS entries and direct PGP signatures

The same validated entries drive `/rss` (HTML) and both RSS URLs: `/rss.xml` and `/rss` requested as XML. The existing subscribe/copy URL remains `/rss`. A signature covers the exact UTF-8 XML bytes, including channel metadata, entry titles, URLs, GUIDs, summaries and dates. There is no Markdown wrapper or Sigmark dependency.

## Publish entries

RSS entries are derived from published Logs in `src/content/log.json`. There is no separate manual feed registry. Use the [Log writing guide](log-markdown-guide.md) and [publication workflow](integrated-publication.md) to create and publish writing; drafts and unlisted revisions are not added to the feed.

The shared parser validates entries, rejects duplicate IDs and sorts newest first with stable ID ordering for equal timestamps. HTML and XML use the same entries. Titles and summaries are escaped as text. Updating published Log content changes the exact XML and requires refreshing its signature through the publication workflow.

## Sign the XML locally

GnuPG must be installed and the signing key corresponding to `public/pgp.asc` must be available to the local GPG agent. Hardware-backed signing can remain in GnuPG. No private key, passphrase, exported secret-key file or signing credential belongs in the repo, build output, CI secrets or web server.

Set `SITE_URL` to the actual canonical public origin, then run:

```sh
bun run rss:sign
bun run rss:verify
bun run build
```

Bun loads the local `.env`; an explicit `SITE_URL` environment variable also works. There is no default signing origin. The sign command creates the current XML in a private temporary directory, invokes GnuPG with `--armor --no-textmode --detach-sign --local-user <published-key-fingerprint>`, verifies the result with the published public key, and atomically updates `src/content/rss-signature.json`. It cleans up temporary XML/signature files. The artifact contains only a public signature, canonical origin, format version and SHA-256 digest. Commit that artifact alongside the entry/metadata changes it signs, then publish the build.

The published key chooses the signer. An unrelated default GPG key cannot silently replace the site's identity. The PGP page derives its fingerprint from the same published key, so rotation cannot leave a hardcoded old fingerprint on the page.

## Verification and publication states

`bun run build` first runs `rss:verify`. Unsigned (`null`) configuration is allowed and clearly labeled as unsigned. If an artifact is present, offline/build verification uses `SITE_URL`, or the artifact’s signed origin when that environment variable is absent (useful in CI). An explicitly configured origin must match. Verification fails on changed XML, changed origin, wrong public key, invalid/revoked/expired signing certificates or malformed signatures. Deployment still requires the matching `SITE_URL` or Astro site configuration; a local preview using a different origin correctly refuses a production signature. After changing entries, RSS metadata, XML serialization, the canonical origin or public key, re-sign before building. Keep GPG on the local signing machine; verification uses OpenPGP.js on the server and during builds, without requiring GPG in hosted environments.

The web server regenerates deterministic XML from the bundled content and verifies its exact bytes against the artifact using `public/pgp.asc`. Only a single binary-data signature is accepted; text-mode signatures that normalize line endings are rejected. The digest is only a fast consistency check; cryptographic verification is mandatory. Successful verification advertises `/rss.xml.asc` in the XML response's `Link` header and shows a Signature download on `/rss`. There is no JavaScript crypto or crypto-library download in the browser.

With no artifact, RSS and the HTML entry list remain available, `/rss` says the feed is unsigned, and `/rss.xml.asc` returns 404. A stale or invalid artifact causes XML/signature publication to return 503 rather than serving a misleading signature. The HTML list remains readable and explains that feed publication is paused. Without a configured public origin, local development hosts work but arbitrary request hosts cannot generate a feed.

Feed/signature responses use `no-cache, no-transform`; deploy the content and its single artifact together. Do not make CDN rewrites, XML prettification or other transformations after signing. Separate requests spanning a deployment can still retrieve different revisions; download both again if verification fails. RSS readers consume ordinary XML; they should not be assumed to verify detached signatures automatically.

## Reader verification

Download `/rss.xml`, `/rss.xml.asc` and `/pgp.asc` from the same published revision:

```sh
gpg --import pgp.asc
gpg --verify rss.xml.asc rss.xml
```

Confirm the key fingerprint through a trusted channel. A valid signature establishes integrity and control of the signing key, not the truth of a post or that this is the newest feed. A valid old feed/signature pair can still verify.

## Checks

- `bun test tests/rss-entries.test.ts tests/rss-signatures.test.ts tests/rss-publication.test.ts tests/rss-signing.test.ts`
- `bun run format:check`, `bun run check`, `bun run build`, `bun test`
- `bun run test:browser` covers the HTML list, PGP navigation, unsigned signature behavior and byte-identical XML aliases alongside existing layout/accessibility checks.

The GPG test creates and removes an isolated temporary keyring; it never signs with or modifies the user's keyring. Crypto tests check changed bytes, forged matching hashes, wrong signers and stale publication states. Tests requiring GPG are skipped if the executable is absent. The site's real private key is required to create its actual production signature; fixture-key evidence is not a production signature.

References: [GnuPG detached signing](https://www.gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html), [OpenPGP.js](https://github.com/openpgpjs/openpgpjs), [RSS specification](https://www.rssboard.org/rss-specification).
