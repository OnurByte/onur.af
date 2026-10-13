import { expect, test } from 'bun:test';
import { searchPages } from '../src/portfolio/search';
import { publicPreview } from '../src/portfolio/previews';
import * as pagefind from 'pagefind';

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

test('Pagefind builds a searchable bundle from only the approved public records', async () => {
  try {
    const { index, errors } = await pagefind.createIndex();
    expect(errors).toEqual([]);
    expect(index).toBeDefined();
    if (!index) throw new Error('Pagefind index unavailable');
    const indexedUrls = [];
    for (const page of searchPages) {
      const result = await index.addCustomRecord(page);
      expect(result.errors).toEqual([]);
      expect(result.file?.meta).toMatchObject(page.meta);
      indexedUrls.push(result.file?.url);
    }
    expect(indexedUrls).toEqual(['/', '/donate', '/rss', '/pgp']);
    const result = await index.getFiles();
    expect(result.errors).toEqual([]);
    expect(result.files?.some((file) => file.path === 'pagefind.js')).toBe(
      true,
    );
    expect(
      result.files?.filter((file) => file.path.endsWith('.pf_fragment')),
    ).toHaveLength(4);
  } finally {
    await pagefind.close();
  }
});
