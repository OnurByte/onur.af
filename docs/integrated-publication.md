# Integrated Log publication

Log revisions are the canonical content. Signed Markdown, signatures and manifest editions stay immutable. Search documents, backlinks, repository references, sigils and social previews are derived from those revisions. Delivery receipts and source archive mappings are separate mutable records.

## Local publication

Set `SITE_URL` to the canonical public HTTPS origin and keep the PGP secret key in your local GPG keyring. Run:

```sh
bun run log:publish cryptic-watchtower-watches
bun run verify
```

The publisher signs each revision, stores revision timestamp receipts, verifies their bindings, appends the signed publication manifest, stamps new manifests with OpenTimestamps, signs the exact RSS bytes, validates the derived search index, sigils and social images, then verifies proofs, manifest, RSS and checkpoint receipts. Any mandatory failure stops the command. Re-running preserves existing timestamp receipts and manifest editions. The command prepares files; deployment is a separate step. Neither CI nor the web server needs the secret key.

An OTS receipt may be pending. Offline verification establishes the digest binding; it does not establish Bitcoin confirmation. Upgrade manifest receipts with `bun run checkpoints upgrade` and independently verify a downloaded receipt with an OpenTimestamps client.

## Search and code relationships

`content-index.ts` resolves current Markdown links and structured sources against each canonical Log URL. It extracts GitHub repository names and preserves full commit SHA references. Find filters server-rendered navigation entries locally, including offline. On focus, pointer intent or opening, it loads the optional MiniSearch ranking engine; failed ranking loads retain substring filtering. It never fetches `/search-index.json`. The JSON endpoint remains available for derived-content verification and other consumers. If the client module fails to load, Find retains its native page-link dialog with the search input disabled. No checkout or payment information is indexed.

Repository cards show links to actual Log references. Log pages expose referenced repositories and pinned commits; branch references remain branch references. The system does not pretend an unpinned URL was pinned at publication time.

## Outbound Webmention

After deployment, preview targets:

```sh
bun run log:distribute cryptic-watchtower-watches
```

Send only when ready:

```sh
bun run log:distribute cryptic-watchtower-watches --send
```

The sender first fetches the exact revision Markdown and checks the live article revision marker. Each target must appear on the live page. It discovers Webmention endpoints from HTTP Link headers or HTML links, then sends a form-encoded source/target pair. Only public HTTPS targets on port 443 are supported. DNS answers are checked and pinned to sockets; redirects are checked again, response sizes and durations are bounded, and POST redirects are refused.

Each completed target is saved before proceeding to the next. A store lock prevents concurrent senders from losing receipts. Failed targets are recorded and retried on the next invocation. Accepted deliveries for the same source, target and revision digest are not resent. Receipts are stored in ignored `.local/log-distribution.json`; configure `PORTFOLIO_DISTRIBUTION_STORE` to retain them elsewhere. A delivery failure never edits or invalidates the signed publication. If a process is forcibly killed, its `.lock` directory remains: confirm that no sender is active before removing that directory and retrying. Remote acceptance and local persistence cannot be one atomic transaction, so a crash between those two events may still cause a retry.

No inbound Webmention receiver or moderation service is enabled. No external account or bridge is enrolled automatically. Bridgy Fed remains opt-in: establish and verify the bridge account first, then use its documented feed mode or add its Webmention target to a new signed revision. Do not switch feed/Webmention modes casually. The sender requires that any bridge target actually occurs on the live source page.

## Independently retained checkpoints

Download `/proofs/checkpoint.json`, the referenced `/proofs/log-publication-vN.json`, its `.asc` signature and `.ots` timestamp receipt. The Log proof page links these files. Verify the signature with `public/pgp.asc` and the timestamp with an independent OTS client.

Export and retain a checkpoint outside this repository:

```sh
bun run checkpoints export > /path/outside/repository/checkpoint.json
bun run checkpoints compare /path/outside/repository/checkpoint.json
```

Comparison first verifies the entire signed publication chain, then requires the retained sequence and hash to appear unchanged. A missing edition or different hash fails. A second copy inside this repository is not an independent witness. This implementation supplies export/comparison and manifest timestamping; an independent third party must actually retain a checkpoint to supply independent observation. No external witness is claimed to exist.

## Sources and archival relationships

`bun run sources export` emits unique external URLs from every published revision, plus configured archive URLs. CI checks that output with Lychee alongside documentation links.

Add selected archive captures to `src/content/source-archives.json`, keyed by the original source URL:

```json
{
  "https://example.com/paper": {
    "url": "https://archive.example/captures/123",
    "capturedAt": "2026-10-17T00:00:00Z"
  }
}
```

Only URLs referenced by published revisions are accepted. Source lists show the separate Archive link. The original URL and signed Markdown never change. No automatic bulk ArchiveBox crawl is enabled; submit selected sources to your chosen archive and store actual capture URLs.

## Identity

Public pages expose the configured GitHub/X profiles through `rel=me`. Full Log articles contain canonical `u-url`, revision metadata and a named author `h-card`. These describe identity relationships; they do not turn a self-signed ownership statement into a verified reciprocal platform proof. Add an actual GitHub Gist or X proof URL through the existing identity proof workflow when that proof has been published. No fabricated proof URL or extra Verified status is added.
