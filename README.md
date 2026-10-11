# Onur's portfolio

Astro SSR portfolio with a TypeScript `donations` module using xmr-pay watch mode. This project is distinct from the existing private `safestpayment` repository.

The shared footer always links to `/donate`. Set `PORTFOLIO_TOR_URL`, `PORTFOLIO_I2P_URL`, and `PORTFOLIO_PGP_URL` in `.env` to enable their destinations. TOR must use an HTTP(S) `.onion` URL, I2P an HTTP(S) `.i2p` URL, and PGP an HTTPS URL or a site-local path. All four footer labels remain visible; blank or invalid destinations render as unlinked text.

## Local development

Use Bun and Node 22.12+ to install dependencies, then copy `.env.example` to `.env` and configure the server variables locally. Do not commit credentials. Bun reads the local `.env` for gateway/agent commands; `bun run start` loads it for the built site. Restart the relevant process after editing. Runtime environment values take precedence over build-time checkout settings. The public site needs the gateway URL/token; the gateway needs PostgreSQL and the authenticated local xmr-pay agent.

```sh
bun install
bun run gateway
bun run dev
```

Run the gateway and site in separate terminals. xmr-pay's watch agent is a separate view-only process with durable wallet/order storage. Its documented runtime is Node 20+. No real-money readiness is claimed by this checkout code.

```sh
bun test
bun run check
bun run build
```

To include real database checks, set `TEST_DATABASE_URL` to an isolated PostgreSQL test database. After building, set `TEST_CHECKOUT=1` to run the built SSR checkout test. That test uses a local fake gateway and checks form submission, custom amounts, QR/payment URI and server token isolation; it does not simulate blockchain evidence.

See [donation behavior and deployment gates](docs/donations.md). The supplied SVG is integrated next to each visible Onur name. Styling uses neutral dark colors, system sans-serif fonts, a white footer and a randomized icon gradient. Read-only recovery retains an already allocated address after a lost agent response. A crash before allocation still requires operator recovery; settled payments are rechecked against fresh scanner data. Live crash/restart and reorg proof remain unfinished.
