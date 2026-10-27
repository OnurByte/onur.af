# Witness Protocol v1

This document freezes serialization for `onur-witness-event-v1`, `onur-witness-batch-v1` and `onur-witness-correction-v1`. Changing byte rules requires a new format identifier. Counters estimate participating browsers, not humans or completeness of collection.

## Event commitments

UTF-8 encode the JSON array below, without indentation, followed by exactly one LF byte. Strings use JSON escaping; event IDs are lowercase UUIDs, Log IDs use lowercase ASCII letters, digits and hyphens, revision is a positive safe integer, day is a valid `YYYY-MM-DD` UTC date, and nonce is 32 random bytes encoded as 64 lowercase hexadecimal characters.

```
["onur-witness-event-v1",eventId,logId,revision,day,nonce]
```

The event commitment is SHA-256 of those exact bytes. Public exports use named fields for readability; their object property order has no bearing on the commitment. Additional event fields are rejected. Fingerprint, HMAC, network address, full User-Agent and referral details do not belong in this record.

## Deduplication and retries

HMAC-SHA256 uses the dedicated server secret over UTF-8 JSON of `["onur-witness-subject-v1",logId,generation,visitorId]`, with no trailing LF. The alias primary key is `(log_id,fingerprint_generation,witness_hmac)`. A random subject UUID separates alias maintenance from immutable event records. Referrals store hostname only.

Acceptance takes a transaction-scoped request-capability lock and a Log-scoped lock, checks the retry record, checks aliases, and inserts subject, alias, event and request capability in one PostgreSQL transaction. The event timestamp is never refreshed by duplicate visits. Retry capabilities expire after 24 hours for acceptance retries; they remain useful for private receipt retrieval until explicit retention/deletion.

A 256-bit browser-generated request token is stored as SHA-256 server-side. The same token with a different acceptance payload is rejected. Knowledge of a fingerprint alone never returns an earlier event ID or receipt. Personal receipt responses and mutations use `no-store`; tokens travel in authorization headers, never URLs. Browser receipt capabilities are stored per Log locally to allow later proof retrieval and deletion without another fingerprint operation.

## Merkle trees

Sort events by lowercase event UUID lexicographically. For each event commitment `C` (32 raw bytes), the leaf is `SHA256(0x00 || C)`. A parent is `SHA256(0x01 || left || right)`. An unpaired node is promoted unchanged. An empty batch is invalid. Inclusion steps identify the sibling hash and side. Hashes are serialized as lowercase hexadecimal. Repeated event IDs, malformed hashes and excessive proof depth are rejected.

## Batch manifests

Canonical manifest bytes are UTF-8 JSON of this array, followed by LF:

```
["onur-witness-batch-v1",id,previous,createdAt,count,root,keyId]
```

`previous` is SHA-256 of the preceding canonical manifest, or null for the first. `createdAt` is an ISO UTC timestamp, `count` is the event count, and `keyId` is SHA-256 of the Ed25519 SPKI DER public key. The signature is detached Ed25519 over canonical manifest bytes, encoded in base64. This is a separate authority from Log publication PGP signatures.

Sealing selects up to 10,000 unsealed events under one transaction-scoped worker lock. It persists the manifest, signature and every membership path atomically. A subsequent invocation selects only remaining events. OTS service calls happen after this durable boundary. A daily scheduler may invoke sealing repeatedly to drain more than one full batch.

OTS treats the 32 raw root bytes as its file input; its file digest is therefore SHA-256 of those bytes. The worker checks that digest before accepting any receipt. Stamp, upgrade and Bitcoin verification are separate explicit operations. A Bitcoin attestation's presence alone is not verification. The worker grants `bitcoin-verified` only after the OpenTimestamps verifier successfully validates a Bitcoin result with positive integer height and timestamp. Pending receipts do not trigger Bitcoin verification and never receive that status.

## Corrections and audit

Corrections append a separate signed chain, retaining every original event and batch. Their canonical array is `["onur-witness-correction-v1",id,eventId,suppressed,reason,createdAt,previous,keyId]` followed by LF. The signature and key ID rules match batch manifests. The previous hash references the preceding correction's canonical record. Latest suppression state adjusts current totals; raw Recorded, Sealed and Bitcoin verified coverage still describes original accepted events.

An independent audit verifies manifest signatures using an independently selected key or key-history file, event commitments, ordering, all Merkle roots, counts, uniqueness across batches and chain continuity. Optional correction evidence must reference known events and pass signature and chain checks before totals are adjusted. The audit reports explicitly whether corrections were included. Offline recount does not establish Bitcoin confirmation or an externally trusted final checkpoint; compare the final hash to a checkpoint saved through an independent channel and verify `.ots` receipts separately.

## Annotation actions

`onur-text-v1` uses the rendered signed revision's DOM text, with no Unicode or whitespace normalization and UTF-16 offsets. Generated UI button/template text is excluded. Quote context contains up to 32 code units before and after the exact quote. Position and context must agree; ambiguous or changed targets are never moved automatically.

The canonical annotation array is `["onur-annotation-v1",id,logId,revision,revisionHash,normalization,start,end,exact,prefix,suffix,body,action,sequence,publicKey]` followed by LF. `revisionHash` binds the signed Markdown; `publicKey` is the browser Ed25519 SPKI key in base64. Notes are plain text, at most 2,000 code units, without reply threads or votes.

Creating, editing, withdrawing and reporting use a browser Ed25519 signature over the exact canonical action. Creating and editing publish immediately after validation; no PGP approval, manual moderation queue or moderator availability is required. Editing/withdrawal require the original author key and the next sequence. Reports are signed and rate-limited, and do not grant editing rights or automatically hide a note. Withdrawal prevents further changes.

New annotations include a pasted ASCII-armored PGP public key, checked for public-key block format and included in the browser-signed payload. This format check does not establish control of the corresponding PGP private key. The browser still signs mutations automatically; existing payload bytes without the optional PGP field remain unchanged. The editor contains only the quote, note, pasted public key and publish/cancel controls; key-file import/export and management menus are absent.
