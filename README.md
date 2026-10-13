# Onur

My work, in my own words.

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

Database tests require an isolated PostgreSQL database through `TEST_DATABASE_URL`. After building, `TEST_CHECKOUT=1 bun test tests/checkout.test.ts` checks checkout against a fake gateway. These checks do not prove live Monero settlement.

[Brand](brand.md) · [StyleX](docs/stylex.md) · [Design](docs/design.md) · [Link previews](docs/link-previews.md) · [Donations](docs/donations.md)
