import { expect, test } from 'bun:test';
import { parseEmbeds, type EmbedItem } from '../src/portfolio/embeds';

const base = {
  id: 'music',
  title: 'Listening',
  source: 'Music',
  href: 'https://music.example/',
  status: 'empty',
};
test('empty configuration stays empty', () =>
  expect(parseEmbeds([])).toEqual([]));
test('rejects executable URLs, credentials and unknown fields', () => {
  for (const href of [
    'javascript:alert(1)',
    '//evil.test',
    'https://user:pass@music.example',
  ]) {
    expect(() => parseEmbeds([{ ...base, href, items: [] }])).toThrow();
  }
  expect(() =>
    parseEmbeds([{ ...base, items: [], html: '<script>' }]),
  ).toThrow();
});
test('rejects duplicate section identifiers and more than five items', () => {
  const section = { ...base, items: [] };
  expect(() => parseEmbeds([section, section])).toThrow();
  expect(() =>
    parseEmbeds([
      {
        ...section,
        status: 'ready',
        items: Array.from({ length: 6 }, () => ({
          kind: 'track',
          title: 'Track',
          href: base.href,
        })),
      },
    ]),
  ).toThrow();
});
test('rejects external players and HTML even when supplied by a source', () => {
  expect(() =>
    parseEmbeds([
      {
        ...base,
        kind: 'frame',
        src: 'https://player.example/embed/1',
        height: 352,
      },
    ]),
  ).toThrow();
});
test('accepts native content with an explicit update timestamp', () => {
  expect(
    parseEmbeds([
      {
        ...base,
        status: 'stale',
        updatedAt: '2026-10-15T10:00:00Z',
        items: [
          { kind: 'track', title: 'Track', detail: 'Artist', href: base.href },
        ],
      },
    ]),
  ).toHaveLength(1);
});

test('accepts provider-independent native post, repository and link data', () => {
  const items: EmbedItem[] = [
    { kind: 'post', title: 'Onur', text: '<b>Plain text</b>', href: base.href },
    {
      kind: 'repository',
      title: 'portfolio',
      detail: 'My site',
      language: 'TypeScript',
      stars: 0,
      href: base.href,
    },
    { kind: 'link', title: 'Reading', href: base.href },
  ];
  expect(parseEmbeds([{ ...base, status: 'ready', items }])[0]?.items).toEqual(
    items,
  );
  expect(() =>
    parseEmbeds([
      { ...base, status: 'ready', items: [{ ...items[0], html: '<script>' }] },
    ]),
  ).toThrow();
});
test('rejects inconsistent states and invalid dates or counts', () => {
  expect(() =>
    parseEmbeds([{ ...base, status: 'ready', items: [] }]),
  ).toThrow();
  expect(() =>
    parseEmbeds([{ ...base, items: [], updatedAt: 'yesterday' }]),
  ).toThrow();
  expect(() =>
    parseEmbeds([
      {
        ...base,
        status: 'ready',
        items: [
          { kind: 'repository', title: 'Repo', href: base.href, stars: -1 },
        ],
      },
    ]),
  ).toThrow();
});

test('recent tracks allow history-only sections while retaining strict limits and safe URLs', () => {
  const track = {
    kind: 'track',
    title: 'Song',
    href: 'https://open.spotify.com/track/0000000000000000000001',
  };
  expect(
    parseEmbeds([
      { ...base, status: 'ready', items: [], recentTracks: [track] },
    ])[0]?.recentTracks,
  ).toHaveLength(1);
  expect(() =>
    parseEmbeds([
      {
        ...base,
        status: 'ready',
        items: [],
        recentTracks: Array(6).fill(track),
      },
    ]),
  ).toThrow();
  expect(() =>
    parseEmbeds([
      {
        ...base,
        status: 'ready',
        items: [],
        recentTracks: [{ ...track, href: 'javascript:alert(1)' }],
      },
    ]),
  ).toThrow();
  expect(() =>
    parseEmbeds([
      { ...base, status: 'empty', items: [], recentTracks: [track] },
    ]),
  ).toThrow();
});
