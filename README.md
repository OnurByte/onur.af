# Onur

My work, in my own words.

[portfolio-seven-plum-73.vercel.app](https://portfolio-seven-plum-73.vercel.app/)

Built with Astro, TypeScript and Tailwind. Black or white, following the system theme.

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

Database tests require an isolated PostgreSQL database through `TEST_DATABASE_URL`. After building, `TEST_CHECKOUT=1 bun test tests/checkout.test.ts` checks checkout against a fake gateway. These checks do not prove live Monero settlement.

[Design](docs/design.md) · [Link previews](docs/link-previews.md) · [Donations](docs/donations.md)
