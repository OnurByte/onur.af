# Onur

I am. I think. I will.

[Portfolio](https://portfolio-seven-plum-73.vercel.app/) ⁜ [Logs](src/content/log.json) ⁜ [Architecture and operations](docs/development.md)

A personal portfolio built with Astro, TypeScript and StyleX. The interface follows the system's black or white theme. I keep writing, source references and the limits of the evidence visible.

## Develop

Use the Node version in `.node-version` (at least 26.4.0) and Bun 1.4.0 or newer compatible 1.4.x.

```sh
bun install --frozen-lockfile
bun run dev
```

Copy `.env.example` to a local `.env` only when configuring optional services. Keep secrets local. The portfolio can render without a wallet or payment gateway; those operations display unavailable states until configured.

## Verify

```sh
bun run verify
bun run test:browser
```

`verify` checks dead code, formatting, lint, type coverage, architectural boundaries, types, build artifacts and unit tests. Lint and type coverage generate Astro types before inspecting a fresh checkout. Browser tests require a current `bun run build` and Playwright browsers. They start a local synthetic payment gateway, never a real wallet.

Database/wallet integration checks are opt-in. See [donations](docs/donations.md) and [acceptance gates](docs/acceptance.md); unit fixtures do not prove blockchain settlement.

## Systems

- **Signed publication:** immutable Log revisions, portable proof archives, explicit key history and recoverable local publication transactions. See [portable proofs](docs/portable-log-proofs.md) and [publication](docs/integrated-publication.md).
- **Contributions:** the Astro site talks to an authenticated loopback gateway, backed by PostgreSQL and a view-only wallet agent. See [donations](docs/donations.md).
- **Activity:** schema-validated X/GitHub/Spotify adapters and persisted snapshots. Provider failures do not define the project content. See [native embeds](docs/home-embeds.md).
- **Interface:** shared StyleX modules, progressive dialogs and native navigation. See [brand](brand.md), [design](docs/design.md) and [styles](docs/stylex.md).

## Deploy and trust

`bun run build` selects the Node standalone adapter locally and the Vercel adapter when `VERCEL` is set. For Node, use `bun run start` after building and configure the canonical `SITE_URL`. Production contribution origins and operational payment gates need deliberate configuration before deployment.

The web server and CI do not need PGP private keys. Publishing, signing, wallet operations and deployment are separate owner actions. Signatures establish bytes and signing-key relationships, not software safety or truth. No visitor analytics is enabled by default.

## A Cypherpunk's Manifesto

_Eric Hughes ⁜ 9 March 1993_

> Privacy is necessary for an open society in the electronic age. Privacy is not secrecy.

Read [the complete manifesto](https://github.com/NakamotoInstitute/nakamotoinstitute.org/blob/35fca1136a24262b4a36e4a32417c712837da304/server/content/library/cypherpunk-manifesto.en.md).
