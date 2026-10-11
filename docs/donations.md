# Donations

The TypeScript module is named `donations`. `OnurByte/safestpayment` is a separate existing private repository; it is not this application's name.

The Astro site renders the amount form and individual checkout. Its server calls a loopback Bun gateway. The gateway persists donation IDs, canonical XMR amounts and unique addresses in PostgreSQL, and calls an authenticated xmr-pay watch agent. Agent keys never enter browser HTML. Amount arithmetic uses integer piconero; upstream numeric received amounts are display data only.

xmr-pay is pinned to commit `26d25eea800b831c6a90d180c698a4ac6426502c`, an unreleased upstream revision. QR generation has been exercised with Bun. An offline Bun WASM wallet lifecycle probe passed: view-only opening, subaddress creation and persisted reopen. Scanner node connectivity and payment detection have not been proved. Run the upstream agent with its documented Node 20+ runtime until a real Bun scanner experiment passes.

Start the gateway with `bun run gateway`, and the Astro site with `bun run dev`. Configure the server-only variables from `.env.example` locally. Generate distinct random gateway and agent tokens; the gateway requires at least 32 characters. Use a view-only wallet, a persisted wallet path, an explicit restore height, 10 confirmations, zero tolerance, and disabled expiry/paid retention. Keep agent storage outside the web root. Never place a spend key or seed on the server.

A new UUID is reserved before upstream allocation. Once an address is stored, repeated submission and page refresh retain the same address. The bundled TypeScript host uses xmr-pay's public agent/scanner exports and extends authenticated status with the durable address. If creation replies are lost, the gateway performs a read-only ID/amount-bound recovery and attaches that same address. The stock HTTP agent omits this address and still requires operator recovery. A crash before any agent allocation remains an explicit operator-recovery case; no replacement allocation is attempted by the gateway. Full crash/restart recovery still requires live wallet/ledger tests.

Deployment remains blocked on verified scanner persistence and restart, real stagenet partial/full/late payment, live reorg verification, backup/restore and Tor/I2P fail-closed network configuration. Upstream paid orders do not automatically reverse after a reorg. The bundled host independently rechecks settled orders using fresh scanner snapshots at startup, during polling and before returning their status. Lost settlement is reversed and saved through the wallet-before-ledger barrier; sync or reconciliation failures stop successful responses. Live reorg behavior still needs a stagenet experiment.

The visual styling is provisional. Exact Bleed tokens, components and the user's braided SVG must be supplied and integrated before calling the design complete. No fabricated Tor/I2P or PGP links are published.

Run `bun test` and `bun run check`. PostgreSQL tests require `TEST_DATABASE_URL` pointing at an isolated test database; they remove only their generated donation IDs. Run `bun run build` to verify Astro SSR output. Fake-agent tests do not prove blockchain payment detection.

For the built-site form/checkout integration check, run `TEST_CHECKOUT=1 bun test tests/checkout.test.ts` after `bun run build`. It starts a loopback Astro process and a fake gateway. The test verifies CSRF rejection, accepted same-origin custom amount submission, the QR/wallet URI, partial status rendering and absence of the server token in HTML.

The checkout prioritizes unavailable/syncing health over a cached paid status. It avoids presenting a paid claim while current chain status is uncertain. Local production builds currently allow only loopback HTTP origins; production HTTPS/onion/I2P domains must be explicitly configured in Astro's allowed domains before deployment.

Run the bundled host with `bun run agent`. It requires the primary address, private view key, persisted wallet path, explicit restore height and configured nodes from `.env.example`. Its PostgreSQL advisory lock enforces a single agent writer. `bun run test:wallet` exercises an offline generated view-only stagenet wallet lifecycle and removes its temporary cache; it does not contact a node or prove payment detection.

The optional native QR test (`bun test tests/qr.test.ts`) uses rsvg-convert and zbarimg when installed. It rasterizes the checkout QR on white at 244px and independently decodes it back to the exact payment URI. This is decoding evidence, not a physical camera/clipboard check.

New donation creation is capped globally at 30 per minute in PostgreSQL, protected by a transaction advisory lock. Existing donation IDs remain retryable. No IP profiles are collected. Capacity responses use HTTP 429. The agent writer lock has a permanent failure guard: a lost PostgreSQL session stops scanner work and prevents further successful responses until operator restart. The isolated database test terminates only its own lock-owning backend and proves the guard does not reconnect/reacquire.

Dependencies were upgraded to Astro 7.3.8 and Node adapter 11.1.7 after auditing the initial versions. Bun audit reported no findings across 384 locked packages. Wallet compatibility was reproduced with the installed project dependencies; actual node connectivity/payment remains separate.
