# Onur's portfolio

Astro SSR portfolio with a TypeScript `donations` module using xmr-pay watch mode.

The shared footer always links to `/donate`. Set `PORTFOLIO_TOR_URL`, `PORTFOLIO_I2P_URL`, and `PORTFOLIO_PGP_URL` in `.env` to enable their destinations. TOR must use an HTTP(S) `.onion` URL, I2P an HTTP(S) `.i2p` URL, and PGP an HTTPS URL or a site-local path. All four footer labels remain visible; blank or invalid destinations render as unlinked text.

## Local development

Set `SITE_URL=https://your-public-domain.example` to the real public HTTP(S) origin, without credentials, a path, query or fragment. Localhost and loopback origins are rejected. Set it before building and in the production runtime; rebuild and restart when changing the domain. Canonicals never use the incoming Host header. Without a valid origin all HTML uses `noindex` and the sitemap stays empty, so a local checkout cannot publish localhost SEO URLs.

The shared layout supplies page titles, descriptions, canonical links, Open Graph and Twitter metadata. The home page declares the visible Onur identity using `WebSite` and `Person` JSON-LD. `/sitemap.xml` lists only `/` and `/donate`; private donation checkout pages are always `noindex, nofollow` and have no canonical or schema. `/robots.txt` permits fetching HTML so crawlers can read noindex and advertises the sitemap only when configured. These directives are crawler guidance, not access control. After deployment, submit the sitemap to Google Search Console and inspect the home and donation URLs. Metadata and schema do not guarantee rankings or a particular search appearance.

Use Bun 1.4.0 and Node 26.4.0 (recorded in `.node-version`) to install dependencies, then copy `.env.example` to `.env` and configure the server variables locally. Do not commit credentials. Bun reads the local `.env` for gateway/agent commands; `bun run start` loads it for the built site. Restart the relevant process after editing. Runtime environment values take precedence over build-time checkout settings. The public site needs the gateway URL/token; the gateway needs PostgreSQL and the authenticated local xmr-pay agent.

```sh
bun install --frozen-lockfile
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

See [donation behavior and deployment gates](docs/donations.md). The supplied SVG accompanies the visible Onur name. Styling uses Helvetica Neue with sans-serif fallbacks, a static monochrome brand and pure white or black colors following the system theme. Read-only recovery retains an already allocated address after a lost agent response. A crash before allocation still requires operator recovery; settled payments are rechecked against fresh scanner data. Live crash/restart and reorg proof remain unfinished.

## Vercel deployment

Vercel builds select `@astrojs/vercel` through the platform's `VERCEL` environment variable. Local builds retain the standalone Node adapter and `bun run start`. Use `bun install --frozen-lockfile` and `bun run build` on Vercel, and configure a valid `SITE_URL` for the intended public origin before building and at runtime. Do not derive canonical or feed origins from request headers or preview hostnames.

The portfolio pages can run on Vercel, but the current donation gateway accepts only loopback connections and requires a separate wallet agent. A Vercel Function cannot reach the gateway on your computer. Donation payment creation therefore remains unavailable there without a separately reviewed deployment of the existing payment services; deploying the pages does not establish payment readiness.

## Code checks

Run `bun run format` to apply the shared Prettier and Astro formatting rules, or `bun run format:check` to verify without editing. Generated output, environment files and wallet data are excluded.

GitHub Actions runs formatting, Astro checks, a production build and the test suite on pushes and pull requests. Tests use a disposable PostgreSQL service and a local fake payment gateway; production credentials and real wallet access are not required. The offline wallet backup test remains opt-in. CI actions are pinned to commit hashes, Node is read from `.node-version`, and Bun is pinned to 1.4.0.

## Publishing infrastructure

The home page remains empty. Typed empty content arrays in `src/portfolio/content.ts` support projects, notes and reading entries without seeded personal text. `/projects`, `/notes`, `/reading` and `/identity` provide the corresponding page structure. Adding entries creates project/note detail routes on the next build. Editorial public routes share the canonical/sitemap allowlist; donation checkout URLs remain private.

`/rss` is the single visible subscription address: browser requests preferring HTML receive the shared page with an explanation, copy and `feed:` actions, and published notes; RSS/XML requests receive the full-text feed. Both responses use `Vary: Accept`. `/rss.xml` remains an unconditional XML address for reader autodiscovery and compatibility. Local development uses the current localhost address, so no domain is needed. Public hosting requires a valid `SITE_URL` for published links; an unconfigured public host returns 503. `/feeds.opml` exports only reading entries with a feed URL; it starts empty. Unit fixtures test populated XML without placing sample content on the site. Existing PGP/Tor/I2P settings populate the identity page. The public PGP key and fingerprint are published; the private key remains outside the repository. No signed statement or subscriptions are generated.

Project and note detail pages are prerendered: rebuild after content, origin or footer destination changes. Lists, identity and feed endpoints use server rendering. No new dependency or CMS is needed.
