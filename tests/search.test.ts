import { expect, test } from 'bun:test';
import { searchPages } from '../src/portfolio/search';
import { publicPreview } from '../src/portfolio/previews';

test('search indexes exactly four public descriptions, never checkout data', () => {
  expect(searchPages.map((page) => page.url)).toEqual([
    '/',
    '/donate',
    '/rss',
    '/pgp',
  ]);
  for (const page of searchPages) {
    const preview = publicPreview(page.url)!;
    expect(page.content).toBe(`${preview.title}. ${preview.description}`);
    expect(page.meta.description).toBe(preview.description);
    expect(page.language).toBe('en');
  }
});
