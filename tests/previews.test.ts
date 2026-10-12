import { expect, test } from 'bun:test';
import { mottos, publicPreview } from '../src/portfolio/previews';
import { publicPaths } from '../src/portfolio/seo';

test('every public page has descriptive, distinct preview content', () => {
  const keys = new Set<string>();
  for (const path of publicPaths) {
    const preview = publicPreview(path);
    expect(preview).toBeDefined();
    expect(preview!.description.trim().length).toBeGreaterThan(0);
    expect(preview!.description.length).toBeLessThan(160);
    expect(preview!.title.length).toBeGreaterThan(0);
    expect(keys.has(preview!.key)).toBe(false);
    keys.add(preview!.key);
  }
  expect(mottos).toHaveLength(3);
});

test('preview descriptions use the published page intros', () => {
  expect(publicPreview('/rss')!.description).toBe(
    'RSS brings new writing to your feed reader. Add this address to subscribe.',
  );
  expect(publicPreview('/donate')!.description).toBe(
    'Support my work with Monero.',
  );
  expect(publicPreview('/pgp')!.description).toBe(
    'My public key for encrypted messages and signature verification.',
  );
});

test('private checkout and unknown paths have no public preview', () => {
  for (const path of [
    '/donate/private',
    '/oembed.json',
    '/unknown',
    '/projects',
    '/notes',
    '/reading',
    '/feeds.opml',
    '/rss.xml',
  ]) {
    expect(publicPreview(path)).toBeUndefined();
  }
});
