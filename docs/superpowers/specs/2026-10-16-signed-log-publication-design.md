# Signed Log Publication and Identity Design

## Goal

Make each Log revision readable on its Log page and independently inspectable on its Verified page, while publishing an append-only, signed history of the complete Log revision set. State clearly that the listed X and GitHub accounts belong to Onur, and authenticate that statement with the existing PGP key without requiring posts, Gists, or other platform-side evidence.

## Current State

- `revisionMarkdown()` creates canonical Markdown containing the Log ID, title, summary, version, publication date, update date, and body. This exact string is detached-signed and SHA-256 hashed.
- Each revision has a detached PGP signature in `src/content/log-signatures.json`; OpenTimestamps receipts are maintained separately in `src/content/log-timestamps.json`.
- `/proofs/<id>-v<version>.md` serves the canonical signed bytes. The Verified route at `/pgp/log/<id>?v=<version>` currently shows signature, digest, timestamp status, and downloads but not the Markdown source or independent verification instructions.
- `LogRevision.astro` repeats Markdown/signature/timestamp links and the digest inside a collapsible Proof section for the latest revision and each History item.
- `identity-proofs.json` contains individually clear-signed canonical X and GitHub profile URLs. Counterpart URLs are optional, and the current records do not require them. The signed text does not currently make the combined account-ownership claim.
- Build-time checks validate each current revision signature and timestamp, but no signed record connects publication snapshots or detects omissions when compared with a previously retained snapshot.

## Scope

1. Remove inline Proof sections from Log revisions while preserving the rendered Markdown, code-copy controls, revision History, and Verified navigation.
2. Make the Verified page the complete per-revision proof view. It must present the exact canonical Markdown (with a lossless download), its detached PGP signature, SHA-256, OpenTimestamps status and receipt when available, plus commands for independent verification.
3. Add a cumulative publication manifest. Each edition records every Log revision published by that point, sorted deterministically and identified by Log ID, version, and SHA-256 of the exact canonical Markdown. Each edition includes its sequence and the SHA-256 of the previous edition's exact bytes. The canonical manifest bytes receive a detached PGP signature. Previous editions and signatures remain available.
4. Verify the entire manifest chain at build time. Each edition must preserve the preceding edition's entries unchanged. The latest edition must match the complete current set of Log revisions and their verified signatures. A removed, rewritten, omitted, duplicated, or reordered history entry must fail verification (ordering is canonical, not author-controlled).
5. Add one canonical, clear-signed identity statement that says the listed X and GitHub accounts are Onur's and includes both canonical profile URLs. Display that statement on `/pgp`. Keep the existing per-account URL signatures and `/pgp/x` and `/pgp/github` pages. Do not require or fetch account-side counterpart evidence for the ownership statement.
6. Update `docs/log-and-proofs.md` to document publishing, the manifest chain's limits, the signed identity statement, and independent verification.

Do not change the signed Markdown format or existing revision bytes. Do not add dependencies, blockchain contracts, DID resolution, an external transparency service, witnesses, alternate hosting, or downloadable archive bundles.

## Design

### Log and Verified pages

`LogRevision.astro` remains responsible for rendering a revision's authored Markdown and code-copy controls only. It no longer renders proof links, hashes, or timestamps. The latest entry keeps its Verified badge. Each revision in History receives a direct Verified link to that revision's `/pgp/log/<id>?v=<version>` page; historical revisions do not repeat proof data inline.

The Verified route continues to select the latest revision by default and an immutable version with `?v=`. It displays the canonical `revisionMarkdown()` bytes as escaped source text and links to the exact `.md` and detached `.md.asc` resources. A copy action may copy the displayed Markdown, but the download remains the authoritative byte-preserving artifact. It displays the SHA-256 of those bytes, signer fingerprint, PGP verification state, and the timestamp status. Pending or unavailable OpenTimestamps data must never be described as Bitcoin-confirmed. When a receipt is available, link to the same revision's `.ots` file and report Bitcoin height/time only after existing cryptographic verification succeeds.

Provide independent commands using the downloaded files:

```sh
gpg --import pgp.asc
gpg --verify <entry>.md.asc <entry>.md
sha256sum <entry>.md
ots verify <entry>.md.ots
```

The OpenTimestamps command is shown only when a receipt exists. The page also links to the current publication edition and its signature so readers can compare the revision against the signed publication snapshot.

### Signed publication editions

Store immutable canonical manifest bytes and detached signatures as numbered edition artifacts under a dedicated public proofs path. The first edition is a baseline covering every currently signed revision. A subsequent edition is created only when a new revision is published. It includes every prior revision entry plus newly published revisions; it cannot remove or rewrite an earlier entry.

Each manifest contains a format version, consecutive sequence number, previous-manifest SHA-256 (absent only for the first edition), and an ordered array of `{ id, version, sha256 }` entries. Serialization is canonical UTF-8 JSON with a fixed property order, stable entry ordering, and a final newline. The detached OpenPGP signature authenticates those exact bytes. The previous-manifest field hashes the exact previous manifest bytes, not its signature. The current edition is derived from the verified edition sequence rather than an unsigned latest pointer.

The local publication command creates and signs a new edition after per-revision signing and timestamp receipt creation. Re-running publication with no change to the revision set is idempotent and does not create another edition. Build-time verification uses the public key only; it validates the sequence, previous hash, detached signatures, append-only entry preservation, and equality between the latest edition and the current Log revisions. Public routes serve each edition's exact bytes and detached signature. Verified pages link to the latest edition and the relevant entry digest.

A hash chain demonstrates changes only when a verifier retains an earlier signed edition. Replacing the entire chain with an older valid edition can otherwise appear consistent. This design does not claim fork consistency, external witnessing, or rollback protection without an independently retained checkpoint.

### Signed account-ownership statement

Add a single fixed-format clear-signed statement with the sentence “I confirm that the X and GitHub accounts listed here are mine.” followed by the exact canonical profile URLs already defined in `identityAccounts`. Store the message, signature, and publication metadata as a content artifact. Verify its cleartext signature with the same public key during the normal proof verification path. `/pgp` renders the statement and the two links; the existing `/pgp/x` and `/pgp/github` proofs continue to authenticate their individual canonical URLs. Counterpart `proofUrl` values remain optional and are not necessary to publish or verify the statement.

### Publishing and failure behavior

The local signing key remains outside the repository and deployment environment. The initial baseline edition and ownership statement are signed locally with the key corresponding to `public/pgp.asc`. Publication fails closed if a revision lacks a valid signature, a timestamp record is malformed, the manifest chain has a gap or mutation, the manifest omits or changes a revision, or the ownership statement does not verify. No unsigned fallback is shown as verified.

If intentional Log deletion is ever needed, it requires a separately designed signed tombstone policy; silently deleting a previously published revision is not supported by this protocol.

## Acceptance Criteria

1. Latest and historical Log revision views contain no inline Proof panel, signature, digest, or timestamp; each revision remains reachable from its own Verified page.
2. A Verified page exposes its full canonical Markdown, exact Markdown and signature downloads, SHA-256, signer identity, accurate timestamp state, and independent verification commands.
3. The published manifest series is signed, consecutive, hash-linked, immutable by edition, and cumulative over every revision.
4. Build-time verification rejects a broken link, bad signature, altered or omitted historical item, duplicate item, mismatched digest, or a latest edition that differs from the current Log set.
5. The initial manifest edition covers the current signed Log set; publishing without a revision-set change does not add a redundant edition.
6. `/pgp` displays the signed ownership statement and canonical account links; account-side posts and Gists are not required. Existing individual URL proof pages continue to work.
7. Documentation explains the protocol and accurately states that a chain alone cannot prevent rollback for a verifier without an external checkpoint.
8. The canonical Markdown format and existing signed revision bytes remain unchanged.

## Non-goals

- A Merkle tree, external transparency log, witness network, TUF client, DID, or Keyoxide integration.
- Cryptographic proof that a platform independently endorses the account relationship.
- A hard guarantee against an attacker who can replace the complete site and all checkpoints before a verifier has retained any edition.
- Changes to RSS signatures, social embeds, hosting, Tor/I2P operations, or payment behavior.
