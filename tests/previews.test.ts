import { expect, test } from 'bun:test';
import {
  mottos,
  nextMottoIndex,
  publicPreview,
  publicPreviewByKey,
} from '../src/portfolio/previews';
import { publicPaths, siteDescription } from '../src/portfolio/seo';
import pages from '../src/content/public-pages.json';
import { publicPageSchema } from '../src/content/schema';

test('public pages have distinct previews and utility descriptions', () => {
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
    'Follow new writing via RSS.',
  );
  expect(publicPreview('/contribute')!.description).toBe(
    'Support my work with Monero.',
  );
  expect(publicPreview('/pgp')!.description).toBe(
    'Accounts and signatures verified by PGP.',
  );
});

test('private checkout and unknown paths have no public preview', () => {
  for (const path of [
    '/donate/private',
    '/identity',
    '/oembed.json',
    '/unknown',
    '/search',
    '/projects',
    '/notes',
    '/reading',
    '/feeds.opml',
    '/rss.xml',
  ]) {
    expect(publicPreview(path)).toBeUndefined();
  }
});

test('public page collection matches the published routes and validates metadata', () => {
  expect(pages.map((page) => page.id)).toEqual([...publicPaths]);
  for (const page of pages) {
    expect(publicPageSchema.safeParse(page).success).toBe(true);
  }
  expect(publicPreview('/')!.description).toBe(siteDescription);
  expect(siteDescription.trim().length).toBeGreaterThan(0);
  expect(publicPreviewByKey('home')!.description).toBe(siteDescription);
  expect(pages.find((page) => page.id === '/')!.description).toBe(
    siteDescription,
  );
  expect(
    publicPageSchema.safeParse({ ...pages[1], description: '' }).success,
  ).toBe(false);
  expect(
    publicPageSchema.safeParse({ ...pages[0], id: '/donate/private' }).success,
  ).toBe(false);
  expect(
    publicPageSchema.safeParse({ ...pages[1], description: ' ' }).success,
  ).toBe(false);
  expect(
    publicPageSchema.safeParse({ ...pages[0], description: 'x'.repeat(160) })
      .success,
  ).toBe(false);
});

test('identity proof previews have account-specific metadata and image keys', () => {
  for (const [account, name] of [
    ['x', 'X'],
    ['github', 'GitHub'],
  ]) {
    const preview = publicPreview(`/pgp/${account}`);
    expect(preview?.description).toBe(`${name} verified by PGP.`);
    expect(publicPreviewByKey(`pgp-${account}`)).toEqual(preview);
  }
});

test('motto selection excludes the previous motto and keeps both alternatives reachable', () => {
  for (let previous = 0; previous < mottos.length; previous++) {
    const seen = new Set<number>();
    for (const random of [0, 0.1, 0.49, 0.5, 0.9, 0.999999]) {
      const next = nextMottoIndex(previous, random);
      expect(next).not.toBe(previous);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(mottos.length);
      seen.add(next);
    }
    expect(seen.size).toBe(mottos.length - 1);
  }
  for (const previous of [undefined, -1, 100, Number.NaN])
    expect(nextMottoIndex(previous, 0)).toBe(0);
});
