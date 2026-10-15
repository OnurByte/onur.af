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
  expect(result.items).toEqual([]);
  expect(result.recentTracks?.map((item) => item.title)).toEqual([
    'Track 2',
    'Track 1',
  ]);
});
