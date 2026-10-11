# Delivery evidence

This checklist covers the pasted brief and the later naming correction. An empty GitHub repository was verified and cloned from `OnurByte/portfolio`. The application/module is `onur-portfolio` / `donations`; the old private `safestpayment` repository has not been modified.

| Requirement | Current evidence | Remaining work |
| --- | --- | --- |
| TypeScript and Bun without PHP/Laravel | Gateway and donation domain are TS/Bun; Astro SSR uses Node adapter | Offline Bun WASM wallet lifecycle passed; scanner connectivity/runtime deployment pending |
| xmr-pay | Fixed upstream commit; core URI/QR exercised; authenticated agent client | Real scanner and agent integration |
| Each donation gets its own permanent subaddress | DB unique address and UUID, fake-agent creation test | Real wallet allocations/restart; no address reuse after recovery |
| Same request/page retains address | PostgreSQL and gateway retry tests | Read-only recovery of an already allocated address tested; actual crash/restart and pre-allocation recovery pending |
| QR/address and amount copy/monero URI | SSR integration test; local copy script with fallback | 244px QR independently decoded to exact wallet URI; browser clipboard and camera scan pending |
| Custom XMR amount | Streaming body bounds and strict piconero parser; SSR POST test | None for local request validation |
| Scanner safety | Actual pinned scanner exercised with an injected wallet: duplicate rows, double-spend, locked/mempool, exact sums, sync outage, birthday-height boundary | Live wallet transfers; distinct outputs within one transaction |
| Automatic detection/partial payment/confirmation | Agent status client; SSR display verified with fake gateway | Real stagenet partial/full/late payment |
| Paid health/reorg correctness | Fresh scanner rechecks at startup, polling and status reads; reversal and refresh-failure tests | Live stagenet reorg proof |
| Anonymous SSR without required JS or analytics | Native forms, manually refreshed status, local optional clipboard JS; actual browser custom-amount/outage retry and shared footer checked | Payment checkout clipboard/camera and live-wallet browser QA |
| Durable PostgreSQL + recovery | Real PostgreSQL reservations, concurrency and reopen tests; startup wallet primary/subaddress identity guard tested, including an actual offline view-only wallet | Offline stopped-wallet + isolated-schema backup/restore passed separately; live service consistency and production restore pending |
| View-only/secret boundaries | Loopback authenticated clients, no token in tested HTML | Runtime view-only wallet proof and production ACLs |
| Creation abuse limits | Single in-flight allocation + PostgreSQL global cap 30/minute; no IP data | Production load/outage proof |
| Tor/I2P fail-closed | No network isolation is claimed | Actual deployment addresses, firewall and outage proof |
| Bleed typography/colors/icons and braided SVG | No authoritative source available | Source required; current CSS is provisional |
| Footer TOR/I2P/PGP/DONATE | Shared footer; TOR/I2P/PGP optional targets editable in .env; validation and built SSR tests | Actual verified destinations and required brand/design |
| Optional receipt/notification | Agent receipt client available | Not added to first UI; no external notification authorized |
| Build/check/tests | 37 tests / 163 assertions, real isolated PG + built SSR; separate opt-in real wallet + pg_dump/restore test passed; build/check pass | Live-provider acceptance gates above |

A successful build or fake-agent test does not prove live Monero settlement. The implementation is delivered on `feature/1-portfolio-donations`; no mainnet deployment has occurred. The initially empty repository has no separate base branch for a pull request yet.
