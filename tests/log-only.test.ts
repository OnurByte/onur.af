import { expect, test } from 'bun:test';
import { searchEntries } from '../src/portfolio/search';
import { publicPreview } from '../src/portfolio/previews';
import { canonicalUrl, sitemapXml } from '../src/portfolio/seo';
import { logEntries, parseLog } from '../src/portfolio/log';
import drafts from '../src/content/log-drafts.json';

test('discovery exposes only published Logs, without a separate Work catalog', () => {
  expect(
    searchEntries.filter((entry) => entry.url.startsWith('/work')),
  ).toEqual([]);
  expect(publicPreview('/work')).toBeUndefined();
  expect(publicPreview('/work/signed-publication')).toBeUndefined();
  expect(canonicalUrl('https://example.com', '/work')).toBeUndefined();
  expect(sitemapXml('https://example.com')).not.toContain('/work');
});

test('prepared Log drafts remain valid but never become published through catalog removal', () => {
  const prepared = parseLog(drafts);
  expect(prepared).toHaveLength(2);
  for (const entry of prepared) {
    expect(logEntries.some((published) => published.id === entry.id)).toBe(
      false,
    );
    expect(
      searchEntries.some((result) => result.url === `/log/${entry.id}`),
    ).toBe(false);
  }
});
