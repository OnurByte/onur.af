# Onur's portfolio

Astro SSR portfolio with a TypeScript `donations` module using xmr-pay watch mode. This project is distinct from the existing private `safestpayment` repository.

## Local development

Use Bun to install dependencies, then copy `.env.example` to `.env` and configure the server variables locally. Do not commit credentials. The public site needs the gateway URL/token; the gateway needs PostgreSQL and the authenticated local xmr-pay agent.

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

See [donation behavior and deployment gates](docs/donations.md). Bleed styling and the owner's SVG still need their authoritative source. Read-only recovery retains an already allocated address after a lost agent response. A crash before allocation still requires operator recovery; live crash/restart proof and settled-payment reorg reconciliation remain unfinished.
