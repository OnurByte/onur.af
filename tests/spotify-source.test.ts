import { expect, test } from 'bun:test';
import { createSpotifySource } from '../src/portfolio/spotify-source';
import { loadEmbeds } from '../src/portfolio/embed-sources';

const data = {
  discord_user: { id: '1434953668959932426' },
  listening_to_spotify: true,
  spotify: {
    track_id: '3kdlVcMVsSkbsUy8eQcBjI',
    song: 'Let Go',
    artist: 'Ark Patrol; Veronika Redd',
    album: 'Let Go',
  },
};

test('Spotify normalizes Lanyard presence with the existing Discord ID', async () => {
  const source = createSpotifySource(async (url, init) => {
    expect(url).toBe('https://api.lanyard.rest/v1/users/1434953668959932426');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    return Response.json({ success: true, data });
  });
  const result = (await loadEmbeds([source]))[0]!;
  expect(result.href).toBe('https://open.spotify.com');
  expect(result.items[0]).toMatchObject({
    kind: 'track',
    title: 'Let Go',
    detail: 'Ark Patrol; Veronika Redd',
    href: 'https://open.spotify.com/track/3kdlVcMVsSkbsUy8eQcBjI',
  });
});

test('not listening clears the song rather than displaying a stale current track', async () => {
  let now = 0;
  let listening = true;
  const source = createSpotifySource(
    async () =>
      Response.json({
        success: true,
        data: {
          ...data,
          listening_to_spotify: listening,
          spotify: listening ? data.spotify : null,
        },
      }),
    () => now,
  );
  expect((await loadEmbeds([source]))[0]?.status).toBe('ready');
  listening = false;
  now = 30_000;
  expect((await loadEmbeds([source]))[0]).toMatchObject({
    status: 'ready',
    items: [],
    recentTracks: [
      {
        kind: 'track',
        title: 'Let Go',
        detail: 'Ark Patrol; Veronika Redd',
        href: 'https://open.spotify.com/track/3kdlVcMVsSkbsUy8eQcBjI',
      },
    ],
  });
});

test('unmonitored accounts and mismatched Discord users never claim to be playing', async () => {
  for (const response of [
    { success: false, error: { code: 'user_not_monitored' } },
    {
      success: true,
      data: { ...data, discord_user: { id: 'another-account' } },
    },
  ]) {
    const source = createSpotifySource(async () => Response.json(response));
    expect((await loadEmbeds([source]))[0]).toMatchObject({
      status: 'unavailable',
      items: [],
    });
  }
});

test('Spotify exposes validated playback timing for the native progress display', async () => {
  const source = createSpotifySource(async () =>
    Response.json({
      success: true,
      data: {
        ...data,
        spotify: { ...data.spotify, timestamps: { start: 1000, end: 181000 } },
      },
    }),
  );
  expect((await loadEmbeds([source]))[0]?.items[0]).toMatchObject({
    playback: { startedAt: 1000, endsAt: 181000 },
  });
});

test('Spotify refreshes an idle presence within five seconds when playback starts', async () => {
  let now = 0;
  let listening = false;
  const source = createSpotifySource(
    async () =>
      Response.json({
        success: true,
        data: {
          ...data,
          listening_to_spotify: listening,
          spotify: listening ? data.spotify : null,
        },
      }),
    () => now,
  );
  expect((await loadEmbeds([source]))[0]).toMatchObject({
    playbackState: 'idle',
  });
  listening = true;
  now = 5000;
  expect((await loadEmbeds([source]))[0]).toMatchObject({
    playbackState: 'playing',
    items: [{ title: 'Let Go' }],
  });
});
