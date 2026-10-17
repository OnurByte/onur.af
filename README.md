# Onur

I am. I think. I will.

[portfolio-seven-plum-73.vercel.app](https://portfolio-seven-plum-73.vercel.app/)

Built with Astro, TypeScript and StyleX. Black or white, following the system theme.

## A Cypherpunk's Manifesto

_Eric Hughes · 9 March 1993_

> Privacy is necessary for an open society in the electronic age. Privacy is not secrecy.

Hughes argues that privacy means choosing what to reveal, and that digital systems should disclose only what a transaction requires. Cryptography, anonymous communication, digital signatures and electronic money give people practical tools to defend that choice. Cypherpunks build and publish those tools in code, then work together to make private systems usable across society.

Read [the complete manifesto](https://github.com/NakamotoInstitute/nakamotoinstitute.org/blob/35fca1136a24262b4a36e4a32417c712837da304/server/content/library/cypherpunk-manifesto.en.md).

See [Integrated Log publication](docs/integrated-publication.md) for shared search/code relationships, local publishing, outbound Webmention, source archives and independent checkpoints.

## Development checks

Run `bun run verify` before committing: it checks unused namespace exports, formatting, Astro and TypeScript types, signed publication artifacts, the production build and unit tests. Run `bun run test:browser` after changes to rendered pages or browser behavior. Database tests require a dedicated `TEST_DATABASE_URL`; checkout and wallet recovery tests additionally use `TEST_CHECKOUT=1` and `TEST_WALLET_RECOVERY=1`.

TypeScript extends Astro's `strictest` preset and rejects unchecked side-effect imports and undeclared dot-property access on index signatures. Keep decoded JSON as `unknown` until a domain schema validates it. Use `src/server/json-file.ts` for JSON snapshots, and share payment rules in `src/donations/protocol.ts` rather than copying validators between services.

See [portable Log proofs](docs/portable-log-proofs.md) for independent archives, reader-pinned verification, signed media and key history.
