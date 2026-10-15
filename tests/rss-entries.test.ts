import { expect, test } from 'bun:test';
import { parseRssEntries } from '../src/portfolio/rss-entries';
import { rssXml } from '../src/portfolio/feeds';

const entry = {
  id: 'first',
  title: 'A & B',
  url: '/writing/first',
  summary: '<hello>',
  publishedAt: '2026-10-14T12:00:00Z',
};
test('entries sort newest first without mutating input', () => {
  const values = [
    entry,
    {
      ...entry,
      id: 'second',
      url: '/writing/second',
      publishedAt: '2026-10-15T12:00:00Z',
    },
  ];
  expect(parseRssEntries(values).map((item) => item.id)).toEqual([
    'second',
    'first',
  ]);
  expect(values[0]?.id).toBe('first');
});
test('rejects duplicate GUIDs, executable URLs, invalid dates and unknown fields', () => {
  expect(() => parseRssEntries([entry, entry])).toThrow();
  for (const url of [
    'javascript:alert(1)',
    '//evil.test',
    '/\\evil.test',
    '/a/../b',
    'https://user:pass@evil.test',
  ]) {
    expect(() => parseRssEntries([{ ...entry, url }])).toThrow();
  }
  expect(() =>
    parseRssEntries([{ ...entry, publishedAt: 'yesterday' }]),
  ).toThrow();
  expect(() => parseRssEntries([{ ...entry, draft: true }])).toThrow();
});
test('XML includes exactly the validated entries shown by the HTML list', () => {
  const entries = parseRssEntries([entry]);
  const xml = rssXml('https://example.com', entries);
  expect(xml).toContain('<item>');
  expect(xml).toContain('<title>A &amp; B</title>');
  expect(xml).toContain('<description>&lt;hello&gt;</description>');
  expect(xml).toContain('<link>https://example.com/writing/first</link>');
  expect(xml).toContain('<guid isPermaLink="false">urn:onur:post:first</guid>');
  expect(xml).toContain('<pubDate>Wed, 14 Oct 2026 12:00:00 GMT</pubDate>');
});
