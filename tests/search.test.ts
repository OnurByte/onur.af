import { expect, test } from 'bun:test';
import { searchPages } from '../src/portfolio/search';
import { publicPreview } from '../src/portfolio/previews';
import pages from '../src/content/public-pages.json';

test('search indexes public descriptions, never checkout data', () => {
  expect(searchPages.map((page) => page.url)).toEqual([
    '/',
    '/donate',
    '/rss',
    '/pgp',
    '/log',
  ]);
  for (const page of searchPages) {
    const preview = publicPreview(page.url)!;
    expect(page.meta.description).toBe(preview.description);
    expect(page.meta.title).toBe(preview.title);
  }
});

test('search menu uses canonical public page descriptions', () => {
  expect(searchPages.map(({ meta }) => meta.description)).toEqual(
    pages.map(({ description }) => description),
  );
});

test('Log entries are searchable by title, summary and the latest published body', async () => {
  const { logSearchEntries } = await import('../src/portfolio/search');
  const entries = logSearchEntries([
    {
      id: 'a-note',
      title: 'My note',
      summary: 'A summary',
      revisions: [
        {
          version: 1,
          publishedAt: '2026-10-14T09:00:00Z',
          body: 'Outdated sentence',
        },
        {
          version: 2,
          publishedAt: '2026-10-15T09:00:00Z',
          body: 'Unique searchable sentence',
        },
      ],
    },
  ]);
  expect(entries[0]!.url).toBe('/log/a-note');
  expect(entries[0]!.searchText).toContain('My note');
  expect(entries[0]!.searchText).toContain('A summary');
  expect(entries[0]!.searchText).toContain('Unique searchable sentence');
  expect(entries[0]!.searchText).not.toContain('Outdated');
});
