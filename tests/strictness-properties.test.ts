import { expect, test } from 'bun:test';
import fc from 'fast-check';
import {
  formatXmrAmount,
  parseXmrAmount,
  parseXmrAmountOrZero,
} from '../src/donations/money';
import {
  canonicalLogProof,
  parseLogProof,
  proofDigest,
  validProofMediaPath,
} from '../src/portfolio/log-proof';
import { validatePublicUrl } from '../src/portfolio/public-request';

const options = { seed: 20261021, numRuns: 200 };
test('every valid piconero amount round trips without precision loss', () => {
  fc.assert(
    fc.property(fc.bigInt({ min: 1n, max: 100_000_000_000_000n }), (picos) => {
      expect(parseXmrAmount(formatXmrAmount(picos))).toBe(picos);
      expect(parseXmrAmountOrZero(formatXmrAmount(picos))).toBe(picos);
    }),
    options,
  );
});
test('out of range and sub-piconero amounts fail closed', () => {
  fc.assert(
    fc.property(
      fc.bigInt({ min: 100_000_000_000_001n, max: 10n ** 30n }),
      (picos) => {
        expect(() => parseXmrAmount(formatXmrAmount(picos))).toThrow();
        expect(() =>
          parseXmrAmount(`0.${'0'.repeat(12)}${picos.toString()}`),
        ).toThrow();
      },
    ),
    options,
  );
});
test('proof serialization round trips and rejects whitespace mutations', () => {
  fc.assert(
    fc.property(
      fc.uint8Array({ maxLength: 2048 }),
      fc.integer({ min: 1, max: 1_000_000 }),
      (bytes, version) => {
        const digest = { sha256: proofDigest(bytes), size: bytes.length };
        const statement = {
          format: 'onur.log.proof.v2' as const,
          id: 'veiled-compass-turns',
          version,
          publicationSequence: version,
          signer: 'A'.repeat(40),
          markdown: digest,
          markdownSignature: digest,
          media: [],
          externalMedia: [],
        };
        const canonical = canonicalLogProof(statement);
        expect(parseLogProof(canonical)).toEqual(statement);
        expect(() => parseLogProof(`${canonical}\n`)).toThrow();
        expect(() => parseLogProof(canonical.trimEnd())).toThrow();
      },
    ),
    options,
  );
});
test('proof paths reject traversal, encoded separators and URL delimiters', () => {
  fc.assert(
    fc.property(
      fc.stringMatching(/^[a-z]{1,20}$/),
      fc.constantFrom('..', '.', '%2f', '%5c', '%25', '?x', '#x', '\\'),
      (segment, attack) => {
        expect(
          validProofMediaPath(`/media/${segment}/${attack}/file.png`),
        ).toBe(false);
        expect(validProofMediaPath(`/media/${segment}/file.png`)).toBe(true);
      },
    ),
    options,
  );
});
test('public fetch URLs reject generated loopback addresses and credentials', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.stringMatching(/^[a-z]{1,20}$/),
      (a, b, username) => {
        expect(() =>
          validatePublicUrl(`https://127.${a.toString()}.${b.toString()}.1/`),
        ).toThrow();
        expect(() =>
          validatePublicUrl(`https://${username}:secret@example.com/`),
        ).toThrow();
        expect(() =>
          validatePublicUrl(`http://${username}.example.com/`),
        ).toThrow();
      },
    ),
    options,
  );
});
