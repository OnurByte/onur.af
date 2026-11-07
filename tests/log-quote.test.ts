import { expect, test } from 'bun:test';
import {
  quotePath,
  parseQuoteRange,
  parseLogPagePath,
} from '../src/portfolio/quote-link';
import { logQuote, renderedQuoteText } from '../src/portfolio/log-quote';
import { logEntries } from '../src/portfolio/log';

test('quote links bind a revision and a UTF-16 text range', () => {
  expect(quotePath('one-two-three', 3, 12, 45)).toBe(
    '/log/one-two-three/quote/v3-12-45',
  );
  expect(parseQuoteRange('v3-12-45')).toEqual({
    revision: 3,
    start: 12,
    end: 45,
  });
  for (const value of [
    'v0-0-2',
    'v1-2-2',
    'v1-4-2',
    'v1--1-3',
    'v1-0-9007199254740992',
    'v01-0-3',
  ])
    expect(parseQuoteRange(value)).toBeNull();
});

test('server offsets follow rendered DOM text, including markup and entities', () => {
  expect(
    renderedQuoteText(
      '<p>A &amp; <em>B</em>😀</p>\n<p>C<button>Copy</button></p>',
    ),
  ).toBe('A & B😀\nC');
});

test('quote metadata is derived from the requested revision and rejects invalid ranges', () => {
  const entry = logEntries[0];
  if (!entry) throw new Error('Expected a published Log fixture');
  const quote = logQuote(entry.id, 'v1-0-10');
  expect(quote?.text).toHaveLength(10);
  expect(quote?.revision.version).toBe(1);
  expect(logQuote(entry.id, 'v999-0-10')).toBeNull();
  expect(logQuote(entry.id, 'v1-0-9999999')).toBeNull();
  expect(logQuote('missing', 'v1-0-10')).toBeNull();
});

test('Log page paths share one grammar for articles and quote links', () => {
  expect(parseLogPagePath('/log/one-two-three')).toEqual({
    id: 'one-two-three',
    quote: undefined,
  });
  expect(parseLogPagePath('/log/one-two-three/quote/v2-0-5')).toEqual({
    id: 'one-two-three',
    quote: 'v2-0-5',
  });
  for (const path of [
    '/log/one-two-three/',
    '/log/one-two-three/quote/v0-0-5',
    '/log/one-two-three/quote/v1-01-5',
    '/log/one-two-three/quote/anything',
    '/log/one-two-three/verified',
  ])
    expect(parseLogPagePath(path)).toBeNull();
});
