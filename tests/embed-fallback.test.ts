import { expect, test } from 'bun:test';
import { readEmbedFallback } from '../src/portfolio/embed-fallback';
const source = {
  id: 'x',
  title: 'Tweets',
  source: 'X',
  href: 'https://x.com/onurstirner',
};

test('a stalled snapshot read cannot hold the initial document open', async () => {
  const result = await readEmbedFallback(
    source,
    () => new Promise<unknown>(() => undefined),
    5,
  );
  expect(result).toMatchObject({ id: 'x', status: 'unavailable', items: [] });
});

test('a saved provider snapshot is explicitly stale and retains its items', async () => {
  const items = [
    {
      kind: 'post',
      title: 'Onur',
      href: 'https://x.com/onurstirner/status/1',
      text: 'Saved content',
      publishedAt: '2026-10-15T10:00:00Z',
    },
  ];
  const result = await readEmbedFallback(
    source,
    () => Promise.resolve({ snapshot: { status: 'ready', items } }),
    50,
  );
  expect(result.status).toBe('stale');
  expect(result.items).toHaveLength(1);
});

test('saved Spotify history never presents old playback as currently playing', async () => {
  const result = await readEmbedFallback(
    { ...source, id: 'spotify' },
    () =>
      Promise.resolve({
        current: {
          kind: 'track',
          title: 'Old song',
          href: 'https://open.spotify.com/track/123',
        },
        recent: [],
      }),
    50,
  );
  expect(result.items).toEqual([]);
  expect(result.playbackState).toBe('unknown');
});
