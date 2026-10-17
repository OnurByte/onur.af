# Portable Log proofs

Log evidence is available at `/log/{id}/verified`, with `?v=N` for an exact revision. Old `/pgp/log/{id}` links redirect and retain the query. `/pgp/identity.json` exposes signed identity statements, the pinned root key, key history and proof download URLs. These are the owner's claims and evidence, not an independent endorsement by the website.

## Owner publication

Keep `public/pgp.asc` as the pinned root certificate. Do not replace it with an unrelated primary key. See [key history](key-history.md) for dual-signed transitions. Signing-subkey updates retain the primary fingerprint; retain the public subkeys needed to verify historical signatures. Private key material remains in the local GPG agent, outside the website and CI.

With a canonical public `SITE_URL`, run:

```sh
bun run log:publish cryptic-watchtower-watches
bun run verify
```

The publisher locks the publication stores, prepares a copied checkout, signs new revision evidence, timestamps exact proof-signature bytes, appends a signed manifest, signs RSS and runs all mandatory gates. Only successful preparation is activated. Activation journals recover interrupted directory swaps. Live readers hold leases; activation waits for them, and new readers receive a temporary retry response while a publisher is active. A dead publisher's journal is recovered by the next publish invocation. Never remove a live publisher's lock to force another run.

This implementation does not sign existing content merely because it was installed. Historical revision Markdown, PGP signatures and OTS receipts retain their exact bytes. Re-running publication can create a supplemental v2 statement when the original signing key is available. It does not rewrite the old signature or backdate new evidence. A legacy revision without a v2 statement remains explicitly text-only evidence.

## Signed v2 statement

`onur.log.proof.v2` binds:

- Stable log ID and revision.
- Original publication sequence and primary signing fingerprint.
- Exact canonical Markdown SHA-256 and byte count.
- Original Markdown detached-signature SHA-256 and byte count.
- Sorted, unique original local media paths, SHA-256 values and byte counts.
- External HTTPS media URLs explicitly outside original-file integrity coverage.

The serialization is a frozen project format: schema field order, two-space JSON indentation and one final LF, encoded as UTF-8 without Unicode normalization. This is not a claim of RFC 8785 compliance. Parsers reject a statement whose bytes differ from that serialization, including duplicate JSON members, unknown fields and reordered representations.

Original local images, including covers, are frozen under `public/proof-media/{sha256}`. Original media hashes cover the actual file bytes. Generated WebP variants are presentation outputs and are not claimed as signed originals. Symlinks, path traversal and encoded separator ambiguity are rejected. The current revision's live original files must still match the frozen statement during the build check; historical media is read from the immutable vault.

The owner signs the statement with a binary detached OpenPGP signature. OpenTimestamps commits the exact UTF-8 armored detached-signature file, including its line endings. The receipt is outside its own preimage. This binds the signature, its statement and referenced file digests transitively. A changed armor representation requires a new receipt even if its decoded PGP packet is equivalent.

Publication manifest format 2 can bind each revision's proof-statement SHA-256. Once a proof binding appears in a signed edition it cannot disappear or change in a later edition. Format 1 editions remain unchanged and readable. Supplemental statements can exist before a new edition is signed; independent packages report the available scope rather than inventing a publication binding.

## Reader verification

Download the Log's `archive.tar` and `/proof-verifier.mjs`. The archive also includes `verify.mjs` when built by the normal build pipeline. Verify the verifier through a channel you trust: running software downloaded from the same compromised site would otherwise undermine independent verification.

No installed application dependencies or running site are required for the generated verifier; use Node.js 22.12 or later:

```sh
node proof-verifier.mjs archive.tar --fingerprint YOUR_PREVIOUSLY_TRUSTED_FINGERPRINT
node proof-verifier.mjs archive.tar --fingerprint YOUR_PREVIOUSLY_TRUSTED_FINGERPRINT --save-checkpoint checkpoint.json
node proof-verifier.mjs archive.tar --fingerprint YOUR_PREVIOUSLY_TRUSTED_FINGERPRINT --checkpoint checkpoint.json
```

The included key never becomes trusted just because it is inside the archive. The supplied fingerprint pins the root. Planned primary-key transitions must form a contiguous, monotonic, dual-signed chain. Revisions and publication signatures are checked at their authorized publication sequences, not a date asserted by a signature packet. The verifier requires every revision listed by the included signed publication history for the selected Log. It rejects missing publication-bound proof statements and changed media/signatures.

Saved checkpoints bind the root fingerprint, publication sequence/hash and retained key-history prefix. Save happens only after verification succeeds. Retain checkpoints outside the repository. A first-time reader with no saved checkpoint cannot detect an otherwise valid older head, or know that a newer head exists. This implementation does not claim external witnessing or global freshness.

Offline receipt validation establishes digest binding only. A pending calendar receipt is not Bitcoin confirmation; an embedded Bitcoin height is also not confirmation by itself. To request Bitcoin verification for available v2 attestations:

```sh
node proof-verifier.mjs archive.tar --fingerprint YOUR_PREVIOUSLY_TRUSTED_FINGERPRINT --bitcoin
```

That explicit mode can use network/Bitcoin-node facilities of the OpenTimestamps client. It does not upgrade pending receipts or fetch arbitrary calendar URLs from the bundle. Pending receipts remain pending. Bitcoin verification is separate from authorship, media integrity and checkpoint continuity.

## Local maintenance

```sh
bun run log-proofs:verify
bun scripts/log-proofs.ts prepare LOG_ID
bun scripts/log-proofs.ts upgrade LOG_ID
bun run log:archive export LOG_ID archive.tar
bun run log:archive export LOG_ID readable-directory --directory
bun run log:archive verify archive.tar --fingerprint TRUSTED_FINGERPRINT
bun run proofs:verify
bun scripts/proofs.ts --check-remote
```

`prepare` is an explicit owner signing operation; `upgrade` contacts timestamp calendars. Use the staged `log:publish` command for an all-or-nothing publication preparation. Standalone maintenance commands do not promise multi-store transactionality. Local build verification does not require GitHub/X availability; reciprocal platform checks are an explicit separate operation.

Archives use a narrow deterministic ustar profile with regular files only, bounded input sizes, validated checksums and unique safe paths. They include readable Markdown, raw signatures, legacy receipts, v2 statements/receipts where available, original media, root certificate, complete key transitions and signed publication editions. `bundle.json` inventory hashes detect damage; they are not themselves an authorship proof. The signed artifacts carry that authority.

Key loss or compromise cannot automatically prove a recovery key belongs to the same person. Expiry, revocation and trusted-time policies are not disabled or bypassed by trusting attacker-supplied dates. An unverifiable historical artifact fails rather than silently receiving current authorization.
