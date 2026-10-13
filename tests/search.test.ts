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
    expect(page.meta.description).toBeTruthy();
    expect(page.meta.title).toBe(preview.title);
    expect(page.language).toBe('en');
  }
});

test('search menu uses concise descriptions', () => {
  expect(searchPages.map(({ meta }) => meta.description)).toEqual([
    'Back to the homepage.',
    'Support my work with Monero.',
    'Follow new writing.',
    'Public key for encrypted messages and signatures.',
  ]);
});
