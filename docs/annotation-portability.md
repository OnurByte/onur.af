# Annotation identity and portability

The selection editor's **Annotation identity** disclosure downloads an encrypted
backup or restores one on another device. Use a recovery passphrase of at least
12 characters. Keep the file and passphrase separately: losing either prevents
recovery. Neither the passphrase nor the private key is sent to the annotation
API. The browser's existing local annotation key remains in local storage so it
can sign future edits; this is not protection against scripts already executing
on the site's origin.

The `onur-annotation-encrypted-backup-v1` JSON envelope fixes PBKDF2-HMAC-SHA256
at 600,000 iterations with a random 16-byte salt, and AES-256-GCM with a random
12-byte IV. The envelope's version is authenticated as additional data. Imports
accept only this bounded envelope in the UI, reject wrong passphrases and modified
ciphertext, and prove that the restored Ed25519 private key matches its public
key by signing and verifying a fresh local challenge. Old plaintext management
helpers remain for compatibility with local storage and existing callers; they
are not exposed as a download or file-import action.

Backups include all owned annotation management records across Logs and
revisions. Restoration merges records by annotation ID and monotonic action
sequence and rejects equal-sequence conflicts before writing. It replaces the
current device's signing identity, so download that identity's backup first if
you need to retain it. A restored record does not move to another revision or
become a newly published annotation. The server still verifies the signed
payload and exact revision hash for every action. Restoring local metadata is
not proof that an annotation was accepted by the server.

Annotation JSON-LD downloads retain standard `TextQuoteSelector` and
`TextPositionSelector` fields. Internal coordinates remain UTF-16; W3C position
selectors count Unicode code points. Where a captured historical representation
is available, the export adds a `TimeState` with its actual capture timestamp
and immutable Memento URL, plus namespaced revision/projection hashes and
projection version. A reconstructed publication date is never substituted for
the capture timestamp. Existing three-argument `webAnnotation()` callers remain
compatible and omit unavailable temporal evidence.

Supplying a PGP public key remains a declaration. The browser Ed25519 identity
proves control of that browser key; it does not prove possession of the supplied
PGP private key. No PGP Verified label is added by backup, import, or export.

Local verification:

```sh
bun test tests/annotations/management.test.ts tests/annotations/web-annotation.test.ts
bun run build
bunx playwright test tests/browser/annotation-backup.pw.ts
```

The browser test downloads an encrypted backup in one browser context, checks
that the private key is absent from the download, rejects a wrong passphrase
without changing local identity, and restores the same identity in a fresh
context. The unit test also restores owned revision metadata and rejects
mismatched key pairs and altered ciphertext.
