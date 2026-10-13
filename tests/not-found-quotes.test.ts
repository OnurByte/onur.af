import { expect, test } from 'bun:test';
import { notFoundQuotes, encodeQuote } from '../src/portfolio/not-found-quotes';
import { mottos } from '../src/portfolio/previews';

test('404 philosopher quotes are separate from homepage mottos and round-trip in both encodings', () => {
  for (const quote of notFoundQuotes) {
    expect(mottos as readonly string[]).not.toContain(quote.text);
    expect(new URL(quote.source).hostname).toMatch(/(?:^|\.)aynrand\.org$/);
    expect(
      Buffer.from(encodeQuote(quote.text, 'base64'), 'base64').toString('utf8'),
    ).toBe(quote.text);
    const binary = encodeQuote(quote.text, 'binary');
    expect(binary).toMatch(/^[01]{8}( [01]{8})*$/);
    expect(
      Buffer.from(binary.split(' ').map((byte) => parseInt(byte, 2))).toString(
        'utf8',
      ),
    ).toBe(quote.text);
  }
});
