import { expect, test } from 'bun:test';
import { searchPages } from '../src/portfolio/search';
import { publicPreview } from '../src/portfolio/previews';
import pages from '../src/content/public-pages.json';

test('search indexes exactly four public descriptions, never checkout data', () => {
  expect(searchPages.map((page) => page.url)).toEqual([
    '/',
    '/donate',
    '/rss',
    '/pgp',
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
