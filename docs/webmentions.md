# Incoming Webmentions

The receiver is optional and disabled unless `WEBMENTIONS_ENABLED=1`. It does not alter `log:distribute`, signed publications, RSS, or Quote links. Incoming notifications are queued in PostgreSQL; the HTTP request does not fetch the source.

Configure a separate `WEBMENTIONS_DATABASE_URL`, a random `WEBMENTIONS_RATE_SECRET` of at least 32 characters, and canonical `SITE_URL`. Initialize with `bun scripts/webmentions.ts migrate`. Publish discovery only while enabled: an HTTP `Link: <https://onur.af/api/webmention>; rel="webmention"` or equivalent HTML link on listed public Log and Quote pages.

Only exact canonical listed article and valid Quote URLs are accepted. Queries, fragments, encoded aliases, unknown revisions, and out-of-range passages are rejected. Sources use the existing bounded, DNS-checked, socket-pinned HTTPS fetcher, including redirect checks. Only bounded HTML is parsed. Titles are plain text; source HTML is never rendered.

Run `bun scripts/webmentions.ts work` from a scheduler outside the request lifecycle. Each invocation processes at most 100 jobs; claims use `FOR UPDATE SKIP LOCKED` and expiring leases. A stale worker cannot overwrite a newer lease. Temporary network/HTTP failures become `unreachable` and retry with exponential delay, up to five attempts. Successful HTML without the link, or 404/410, becomes `removed`. Other unsupported responses are `rejected`. Repeated source-target notifications share one record and have a one-minute coalescing window.

All records start hidden. Inspect `bun scripts/webmentions.ts list`, then use `moderate ID visible`, `moderate ID hidden`, or `moderate ID blocked`. `block https://source.example` blocks an entire source origin and hides its existing records. `revalidate` queues nonblocked records again and resets their bounded retry budget; run it periodically to detect removed links. Listing must use `WebmentionStore.visible(logId)` and escape the returned text in Astro; never inject external HTML. The UI must also check the current Log remains listed before presenting references.

Disabling the receiver preserves stored records. No migration, worker, live endpoint, or Webmention Rocks remote test is run automatically by build or publication. Local parser and database tests do not establish deployment compliance; run Webmention Rocks against an explicitly authorized deployment before enabling public discovery.
