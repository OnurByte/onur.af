import { expect, test } from 'bun:test';
import { vitalPage, vitalSchema } from '../src/portfolio/vitals';
test('optional performance payloads contain no identifiers, query or payment paths', () => {
  expect(vitalPage('/contribute/private-id')).toBeUndefined();
  expect(vitalPage('/work/signed-publication')).toBeUndefined();
  expect(vitalPage('/log/cryptic-watchtower-watches')).toBe('log');
  expect(
    vitalSchema.safeParse({
      name: 'LCP',
      value: 100,
      page: 'home',
      url: '/?secret=1',
    }).success,
  ).toBe(false);
  expect(
    vitalSchema.safeParse({ name: 'INP', value: Infinity, page: 'home' })
      .success,
  ).toBe(false);
  expect(
    vitalSchema.parse({ name: 'TTFB', value: 42, page: 'log' }).value,
  ).toBe(42);
});
