# Onur

I am. I think. I will.

[portfolio-seven-plum-73.vercel.app](https://portfolio-seven-plum-73.vercel.app/)

Built with Astro, TypeScript and StyleX. Black or white, following the system theme.

## Run

Use Bun 1.4.0 and the Node version in `.node-version`.

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Keep `.env` and wallet data out of Git. The site runs without payment services; donation creation needs the PostgreSQL ledger, gateway and wallet agent described in [Donations](docs/donations.md).

For a standalone production build:

```sh
bun run build
bun run start
```

Set `SITE_URL` to the public HTTP(S) origin before building and at runtime. Without a valid origin, pages use `noindex` and the sitemap is empty. Vercel builds select the Vercel adapter automatically. A Vercel deployment cannot reach the local donation gateway; publishing the site does not make payments operational.

## Check

```sh
bun run format:check
bun run check
bun run build
bun test
```

TypeScript uses `astro/tsconfigs/strictest` across Astro templates, source, scripts and tests. `bun run check` runs both Astro diagnostics and TypeScript without emitting files. Keep optional values explicit and validate external data before use; do not suppress errors with `any` or `@ts-ignore`. Prettier covers Astro, TypeScript, CSS, JSON, Markdown and CI YAML; run `bun run format` before checking formatting.

Prettier checks all supported files in the repository, including root configs and GitHub workflows. Formatting uses two spaces, LF line endings, semicolons, single quotes and trailing commas. Generated assets, reports and private wallet/environment files are excluded. `bun run verify` stops on the first formatting, type, build or test failure.

## Public content and search

Astro Content Collections validates the public page metadata in `src/content/public-pages.json`. The collection describes existing utility pages; there are no projects or notes pages. The RSS feed stays empty until there is actual published writing.

The header search opens a native dialog with Ctrl+K or ⌘K and immediately filters the titles and descriptions already rendered for Home, Donate, RSS, PGP, TOR and I2P. It makes no search requests or downloads. Arrow keys select results and Escape closes the dialog. TOR/I2P destinations use validated server configuration, or disabled entries when unpublished. There is no separate search page or footer search link. Checkout URLs, donation IDs, payment addresses and the PGP key body are never searched.

## Browser and link checks

```sh
bunx playwright install chromium
bun run build
bun run test:browser
HOST=127.0.0.1 PORT=14324 SITE_URL=http://portfolio.example:14324 bun run test:lighthouse
```

Set `CHROME_PATH` to an installed Chromium executable to use it for browser tests and Lighthouse; otherwise Playwright uses its downloaded browser.

Browser tests run the built server with a synthetic gateway. They check axe accessibility, keyboard focus, both system themes, small screens, clipboard content, local resource requests, search and payment display states. Lighthouse CI measures the four public pages against local fixture URLs and keeps reports locally; it does not upload them. The local HTTP fixture excludes HTTPS and HTTP-to-HTTPS redirect audits; production TLS needs a separate live check. The quality workflow also uses Lychee to check public documentation links, excluding private network, checkout and local-development links. Live external link failures are separate from local browser/build evidence.

Database tests require an isolated PostgreSQL database through `TEST_DATABASE_URL`. After building, `TEST_CHECKOUT=1 bun test tests/checkout.test.ts` checks checkout against a fake gateway. These checks do not prove live Monero settlement.

[Brand](brand.md) · [StyleX](docs/stylex.md) · [Design](docs/design.md) · [Link previews](docs/link-previews.md) · [Donations](docs/donations.md)
