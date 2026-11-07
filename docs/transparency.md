# Publication transparency

Sigsum evidence is an optional, additive layer over the existing signed publication chain. It never replaces PGP, original Markdown, media proofs or OTS receipts. A failed submission does not invalidate a local publication. No production submission, production key generation, deployment or independent monitoring service was performed while implementing this layer.

## Statement and authority

`onur.transparency.v1` binds the exact manifest bytes by SHA-256, publication sequence, previous manifest SHA-256, site origin and independently trusted PGP root fingerprint. Its canonical JSON order and final newline are part of the format. Old manifests are never rewritten. Default `sigsum-submit` hashes this statement to a 32-byte message; Sigsum's leaf checksum hashes that message again. The monitor therefore compares `SHA256(SHA256(statement))`, not the manifest hash.

A separate `onur.sigsum-authority.v1` document delegates an inclusive publication-sequence interval to one Ed25519 OpenSSH public key. It needs a binary detached signature by the trusted PGP root. Merely including that key or signature in a package establishes no trust. The verifier checks the root fingerprint supplied independently, the signature, sequence interval, and exact submitter key. The Sigsum submitter, rate-limit key, PGP root and Witness Stats key have separate authority; never reuse them.

## Pinned tools and policy

The adapter targets `sigsum-go v0.14.1`. Install the official executables in an operator-managed location:

```sh
go install sigsum.org/sigsum-go/cmd/sigsum-key@v0.14.1
go install sigsum.org/sigsum-go/cmd/sigsum-submit@v0.14.1
go install sigsum.org/sigsum-go/cmd/sigsum-verify@v0.14.1
```

`src/portfolio/transparency/production-policy.sigsum-policy` retains the exact `sigsum-generic-2025-1` builtin policy bytes from that release. This is a versioned starting point for operator evaluation, not a claim that its members remain appropriate forever. Retain each policy version with its checksum and record adoption/retirement decisions independently; never replace a policy in an old evidence package. An old valid proof remains a proof under its original policy, without establishing present freshness. Verification requires a policy hash provided by the operator, rather than trusting a hash supplied by the package itself.

Upstream references: [getting started](https://www.sigsum.org/getting-started/), [proof format](https://github.com/sigsum/sigsum-go/blob/v0.14.1/doc/sigsum-proof.md), [policy format](https://github.com/sigsum/sigsum-go/blob/v0.14.1/doc/policy.md), and [monitor implementation](https://github.com/sigsum/sigsum-go/blob/v0.14.1/pkg/monitor/monitor.go).

## Local preparation

Generate a dedicated submitter key only when you intentionally begin an experiment. The following commands are operator examples, not build steps:

```sh
sigsum-key generate -o /secure/offline/submitter
bun scripts/transparency.ts prepare /evidence/publication-vN \
  --sequence N --fingerprint YOUR_TRUSTED_ROOT_FINGERPRINT \
  --submitter /secure/offline/submitter.pub \
  --policy src/portfolio/transparency/production-policy.sigsum-policy
```

Preparation verifies the existing signed publication chain and writes derived public material into a new directory. It neither signs nor contacts a log. Review the generated `key-authority.json`, sign it with the offline PGP root as a binary detached armored signature, and place the result at `key-authority.asc`. Keep private keys outside the repository and web server.

Record the policy checksum separately using `sha256sum`. Submission is an explicit external side effect:

```sh
bun scripts/transparency.ts submit /evidence/publication-vN \
  --fingerprint YOUR_TRUSTED_ROOT_FINGERPRINT \
  --policy-sha256 YOUR_PINNED_POLICY_SHA256 \
  --key /secure/offline/submitter --allow-network
```

The official submitter handles rate-limit authentication and log protocol. Configure its authorization according to the selected log's policy; this wrapper does not create DNS records or reuse any site key. A retained proof is never overwritten. If submission times out, state remains `submission-pending`; an HTTP acceptance or pending state never becomes `logged` without offline verification of inclusion and the pinned policy's witness quorum. The adapter deliberately returns `externallyObserved: false` even after verification.

For externally obtained proof files, place `publication.sigsum` beside the other files and run `pack` with the same fingerprint/policy arguments. Packing creates the inventory only after real verification. `verify` repeats all checks offline. `submission.json` is operational state, outside the immutable evidence inventory.

## Evidence and archives

The package has seven files: `publication.statement`, `publication.sigsum`, `policy`, `key-authority.json`, `key-authority.asc`, `submitter.pub`, and `evidence.json`. The inventory detects accidental changes; it does not authenticate itself. `verifyTransparencyEvidence` enforces authority, exact manifest binding, independently pinned policy bytes, and official `sigsum-verify` success.

`transparencyArchiveFiles` maps these files into `transparency/publication-vN/` for additive Log archives. Retain all existing evidence when adding later proof packages. Never label an archive externally verified from its inventory hashes alone. A machine without `sigsum-verify` can still read and verify existing PGP/OTS layers; strict transparency verification must fail closed or explicitly report that it was not executed.

## Persistent independent monitor

The upstream `sigsum-monitor` command in this pinned release does not persist state or verify witness quorum. The standalone adapter at `src/portfolio/transparency/monitor` uses its official library for log-signature, inclusion, consistency and submitter-signature checks, retains signed tree heads and next-leaf cursors atomically, resumes after restart, and refuses state from a different policy or submitter. A process lock prevents two writers. Unexpected checksums and protocol errors go to a durable, fsynced JSONL event stream before cursors advance; crash recovery can duplicate an event but cannot skip it silently.

Export known statement checksums, merge the arrays when tracking multiple editions, and run the monitor on a separately operated Linux host:

```sh
bun scripts/transparency.ts expected /evidence/publication-vN \
  --fingerprint YOUR_TRUSTED_ROOT_FINGERPRINT > /monitor/expected.json
cd src/portfolio/transparency/monitor
go build -o /monitor/onur-transparency-monitor .
/monitor/onur-transparency-monitor \
  -policy /monitor/policy -policy-sha256 YOUR_PINNED_POLICY_SHA256 \
  -submitter /monitor/submitter.pub -expected /monitor/expected.json \
  -state /monitor/state.json -events /monitor/events.jsonl
```

Forward alerts through an independently managed supervisor/channel, monitor process liveness and checkpoint age, and back up checkpoints outside the website's account. Unknown key use stays an alert even if the website is down. Restart when updating expected statements. Changing the submitter or policy requires a separate state and full rescan; never silently drop unseen history.

This adapter does not claim witness quorum for its monitor events, fresh observation while stopped, operator independence, or complete split-view prevention. A `checkedAt` value is a local observation timestamp, not a signed independent attestation. There is no automatic `Externally observed` UI state. To enable such a claim later requires an actually independent operator, authenticated observations, durable checkpoint retention, supervised alerts, freshness bounds, and a tested outage/unexpected-leaf response. These are deployment acceptance gates, not properties unit tests can prove.

## Local verification

```sh
bun test tests/transparency
cd src/portfolio/transparency/monitor && go test ./...
```

The TypeScript tests cover exact-byte/edition binding, policy substitution, inventory damage and real PGP authority signatures. Go tests use local generated log, submitter and witness keys with the official Sigsum verification library; they reject changed messages, missing witnesses, wrong policies and changed tree roots, and test monitor cursor persistence and policy/key mismatch. Local witnesses establish protocol behavior only, never independent observation or real production-log inclusion.
