import { expect, test } from 'bun:test';
import { mottos, publicPreview } from '../src/portfolio/previews';
import { publicPaths } from '../src/portfolio/seo';

test('every public page has descriptive, distinct preview content', () => {
  const keys = new Set<string>();
  for (const path of publicPaths) {
    const preview = publicPreview(path);
    expect(preview).toBeDefined();
    expect(preview!.description.length).toBeGreaterThanOrEqual(50);
    expect(preview!.description.length).toBeLessThan(160);
    expect(preview!.title.length).toBeGreaterThan(0);
    expect(keys.has(preview!.key)).toBe(false);
    keys.add(preview!.key);
  }
  expect(mottos).toHaveLength(3);
});

test('private checkout and unknown paths have no public preview', () => {
  for (const path of [
    '/donate/private',
    '/oembed.json',
    '/unknown',
    '/rss.xml',
  ]) {
    expect(publicPreview(path)).toBeUndefined();
  }
});
