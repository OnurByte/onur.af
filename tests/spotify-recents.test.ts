import { expect, test } from 'bun:test';
import { createSpotifySource } from '../src/portfolio/spotify-source';
import { loadEmbeds } from '../src/portfolio/embed-sources';
import type { EmbedCache } from '../src/portfolio/embed-cache';

const presence = (n: number | null) => ({
  success: true,
  data: {
    discord_user: { id: '1434953668959932426' },
    listening_to_spotify: n !== null,
    spotify:
      n === null
        ? null
        : {
            track_id: String(n).padStart(22, '0'),
            song: `Track ${n}`,
            artist: 'Artist',
          },
  },
});
test('Spotify keeps the last five distinct tracks separately from the current song', async () => {
  let now = 0;
  let track: number | null = 1;
  const source = createSpotifySource(
    async () => Response.json(presence(track)),
    () => now,
  );
  for (track = 1; track <= 7; track++) {
    now += 30_000;
    await loadEmbeds([source]);
  }
  track = 7;
  const result = (await loadEmbeds([source]))[0]!;
  expect(result.items[0]?.title).toBe('Track 7');
  expect(result.recentTracks?.map((item) => item.title)).toEqual([
    'Track 6',
    'Track 5',
    'Track 4',
    'Track 3',
    'Track 2',
  ]);
  track = null;
  now += 30_000;
  const stopped = (await loadEmbeds([source]))[0]!;
  expect(stopped.items).toEqual([]);
  expect(stopped.recentTracks?.map((item) => item.title)).toEqual([
    'Track 7',
    'Track 6',
    'Track 5',
    'Track 4',
    'Track 3',
  ]);
});
test('Spotify history survives restart and refresh errors without claiming a song is playing', async () => {
  const saved = new Map<string, unknown>();
  const cache: EmbedCache = {
    read: async (id) => saved.get(id),
    write: async (id, value) => {
      saved.set(id, value);
    },
  };
  let now = 0;
  let n = 1;
  const source = createSpotifySource(
    async () => Response.json(presence(n)),
    () => now,
    { cache },
  );
  await loadEmbeds([source]);
  n = 2;
  now = 30_000;
  await loadEmbeds([source]);
  const restarted = createSpotifySource(
    async () => {
      throw new Error('Offline');
    },
    () => 60_000,
    { cache },
  );
  const result = (await loadEmbeds([restarted]))[0]!;
  expect(result.status).toBe('stale');
  expect(result.updatedAt).toBe(new Date(30_000).toISOString());
  expect(result.items).toEqual([]);
  expect(result.recentTracks?.map((item) => item.title)).toEqual([
    'Track 2',
    'Track 1',
  ]);
});

test('Spotify rejects corrupt and future history during cold-start outages', async () => {
  for (const record of [
    {
      recent: [
        { kind: 'track', title: 'Invalid', href: 'javascript:alert(1)' },
      ],
    },
    {
      updatedAt: new Date(1001).toISOString(),
      recent: [
        {
          kind: 'track',
          title: 'Future',
          href: 'https://open.spotify.com/track/0000000000000000000001',
        },
      ],
    },
  ]) {
    const source = createSpotifySource(
      () => Promise.reject(new Error('Offline')),
      () => 1000,
      {
        cache: {
          read: () => Promise.resolve(record),
          write: () => Promise.resolve(),
        },
      },
    );
    expect((await loadEmbeds([source]))[0]?.status).toBe('unavailable');
  }
});

test('unchanged Spotify polls refresh observation time without rewriting history', async () => {
  let now = 0;
  let track: number | null = 1;
  let offline = false;
  const writes: unknown[] = [];
  const source = createSpotifySource(
    () => {
      if (offline) return Promise.reject(new Error('Offline'));
      return Promise.resolve(Response.json(presence(track)));
    },
    () => now,
    {
      cache: {
        read: () => Promise.resolve(undefined),
        write: (_id, value) => {
          writes.push(structuredClone(value));
          return Promise.resolve();
        },
      },
    },
  );
  await loadEmbeds([source]);
  expect(writes).toHaveLength(1);

  now = 6000;
  const unchanged = (await loadEmbeds([source]))[0];
  expect(unchanged?.updatedAt).toBe('1970-01-01T00:00:06.000Z');
  expect(writes).toHaveLength(1);

  track = null;
  now = 12000;
  await loadEmbeds([source]);
  expect(writes).toHaveLength(2);

  now = 18000;
  await loadEmbeds([source]);
  expect(writes).toHaveLength(2);

  offline = true;
  now = 24000;
  const stale = (await loadEmbeds([source]))[0];
  expect(stale?.status).toBe('stale');
  expect(stale?.updatedAt).toBe('1970-01-01T00:00:18.000Z');
  expect(stale?.recentTracks?.map((item) => item.title)).toEqual(['Track 1']);
  expect(writes).toHaveLength(2);
});
