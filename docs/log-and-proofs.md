# Log and identity proofs

`/log` is the chronological index, linked to the left of Find. Each entry uses a single, randomly generated three-word ID at `/log/<id>`. The ID is part of the signed bytes and never changes. `?v=1` selects an immutable revision. Find and RSS use the same entry URLs. Each revision's Verified link opens `/pgp/log/<id>?v=<version>`, which contains its exact signed Markdown and cryptographic proof details. Log pages keep the authored content and History navigation without an inline Proof disclosure. Account names and their monochrome ticks open the corresponding PGP page.

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
