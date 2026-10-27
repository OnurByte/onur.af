# Witness and annotation operations

Both modules are disabled by default. Do not enable them merely because a local build passes.

## Configuration and trust boundaries

- `WITNESS_ENABLED=1` enables optional measurement; otherwise no fingerprint collection UI or acceptance is active.
- `WITNESS_DATABASE_URL` must use a dedicated database/role, never payment credentials.
- `WITNESS_HMAC_SECRET` must contain at least 32 random bytes, provided only to the witness application.
- `WITNESS_SIGNING_KEY_FILE` points to a separate Ed25519 worker key. Never use the Log publication PGP private key.
- `WITNESS_OTS_CALENDARS` is a comma-separated HTTPS calendar list, used only by explicit worker commands.
- `ANNOTATIONS_ENABLED=1` and `ANNOTATIONS_DATABASE_URL` configure independent annotation storage. No witness identifier is stored in annotation tables.
- Annotations publish automatically after schema, revision and ownership checks. Browser keys authorize mutations. No PGP approval or continuously staffed moderation is required.

Before activation, approve and document consent basis, private identifier retention, public-event retention and deletion/contact procedure. No indefinite-retention policy is silently selected by the software. Fingerprints are estimates and client input is forgeable.

## Commands

Run migrations against an isolated local database first:

```
bun scripts/witness.ts migrate
bun scripts/annotations.ts migrate
```

The separate worker lifecycle is daily `seal`, followed by `stamp`; run `upgrade` and `verify` to complete Bitcoin evidence. These commands perform external operations only when explicitly invoked; they do not run from requests or the existing Log timestamp workflow.

```
bun scripts/witness.ts seal
bun scripts/witness.ts stamp
bun scripts/witness.ts upgrade
bun scripts/witness.ts verify
bun scripts/witness.ts export /path/to/new-evidence.json
bun scripts/witness.ts audit /path/to/evidence.json /path/to/witness-public.pem
```

Export files contain public events only. The audit command never confers Bitcoin confirmation. OTS receipts hash the raw root bytes using SHA-256. Batch events and inclusion paths commit atomically before any calendar call. A failure leaves events unsealed or a durable batch needing a receipt; rerunning does not increment views. Pending receipts remain pending on verification failures.

Use fixture keys only in tests. Never log request bodies, authorization headers, raw fingerprints, private keys or receipt tokens.

## Backup, restoration and retention

Back up each dedicated database using PostgreSQL's custom-format dump and encrypted storage managed outside this repository. Receipt bytes, signatures, batch manifests and event membership are stored in PostgreSQL and must be restored together. Restore into a new isolated database; export evidence, audit the full chain and compare the final manifest hash to an independently saved checkpoint before enabling service. Never test restoration by overwriting the live database.

The retention command removes matching aliases, referral hostnames and receipt capabilities according to the explicit configured duration, and expires old hourly rate identifiers. The 24-hour acceptance retry window does not by itself remove receipt access. Deleting matching aliases permits future recounting; historical public events remain intact.

HMAC rotation uses a controlled alias migration; blindly replacing the secret recounts existing browsers. Keep the previous secret available only during the reviewed overlap period. Witness signing-key rotation needs an independently authenticated public key history before use; never silently replace an audit trust key.

Corrections append a signed history rather than edit sealed batches. Suppression, explicit retention and backup/restore have local fixture coverage; production activation still requires the operational review described below.

## Local acceptance

`WITNESS_TEST_DATABASE_URL` must point to a disposable local PostgreSQL database. Run `bun test tests/witness tests/annotations`, then the full check/build/test/browser suite. A skipped database test is not acceptance evidence. No local mock proves real Bitcoin confirmation, production concurrency or legal compliance.

## Activation requirements and scheduling

`WITNESS_POLICY_REVIEWED=1` and an explicit integer `WITNESS_RETENTION_DAYS` (1–36,500) are required before the measurement button becomes usable. The measurement disclosure shows that configured duration. Document how public event records differ from private identifiers and how suppression/deletion requests are handled before setting this flag. The private matching-data deletion button uses the visitor's receipt capability and leaves public commitments intact; it also removes that capability. Browser receipt capabilities remain locally until deleted by the visitor or their browser. DNT/GPC decline measurement while retaining access to existing receipt/deletion controls.

`ANNOTATIONS_RATE_SECRET` is an independent secret of at least 32 characters. It scopes hourly abuse-control identifiers to the annotation module. Annotations have no approval queue. Ed25519 browser signatures and schema/revision checks authorize automatic publication, editing and withdrawal. Reports are recorded and rate-limited; `bun scripts/annotations.ts reports` optionally lists reports for later inspection, but publication does not wait for an operator.

Set `WITNESS_PUBLIC_KEY_HISTORY_FILE` to a public JSON history with version 1, scope `Witness statistics only`, and a `keys` array. Each entry has `id` (SHA-256 of SPKI DER), `publicKey` (SPKI PEM), `validFrom` (ISO UTC) and `retiredAt` (ISO UTC or null). Keep retired keys in the history. The signing CLI requires the configured key to be authorized at the current time. Authenticate this history independently; obtaining a key from the site does not prove its authority. The public keys endpoint exposes only validated public history, never private key files.

Configure an external daily worker job to invoke `seal` until it reports no pending events, then `stamp`, `upgrade`, `verify` and `retain`. `retain` uses `WITNESS_RETENTION_DAYS` unless an explicit duration is supplied. Schedule repeated `upgrade`/`verify` runs independently while receipts are pending. The existing Log timestamp workflow is unchanged. No scheduler or live worker has been activated by this implementation.

## Public audit and corrections

`/api/witness/batches?format=evidence` exports public batch records; `/api/witness/corrections` exports signed corrections. The stats API includes Log and period scope. Save those responses as local JSON and run:

```
bun scripts/witness.ts audit evidence.json witness-key-history.json corrections.json aggregate.json
```

The command validates the full batch and correction chains, duplicate events, signatures and Merkle roots. When a supplied aggregate snapshot has no unsealed events, it also verifies corrected per-Log unique totals and UTC daily distributions. Otherwise it reports incomplete coverage and the outstanding unsealed count, without claiming the live total was proved. Independently verify `.ots` receipts and compare the last checkpoint to a separately saved value.

`bun scripts/witness.ts export new-evidence.csv` produces a public event CSV; JSON exports retain full signed batch evidence. Existing output files are never overwritten. `bun scripts/witness.ts correct EVENT_ID suppress 'Reason'` (or `restore`) appends a signed correction using the separate authorized witness key; it never rewrites original batches.

Before upgrading FingerprintJS, compare old/new versions in an isolated fixture, decide an overlap window and evaluate stability. `WitnessStore.linkAlias` is a trusted migration primitive, not a public endpoint: it can bind the new generation/secret alias to an existing subject without changing first-seen time, revision or event. Conflicting subjects require an explicit correction. If migration is impossible, record the accuracy discontinuity in the protocol documentation rather than silently claiming continuity.
