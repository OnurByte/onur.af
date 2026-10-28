import { expect, test } from 'bun:test';
import { parseSpotifyRefresh } from '../src/portfolio/spotify-refresh';
const track = {
  kind: 'track' as const,
  title: 'Song',
  href: 'https://open.spotify.com/track/example',
  detail: 'Artist',
  playback: { startedAt: 100, endsAt: 200 },
};
test('the lightweight refresh decoder retains consumed fields and rejects unsafe payloads', () => {
  const snapshot = {
    status: 'ready',
    items: [track],
    recentTracks: [],
    playbackState: 'playing',
  };
  expect(parseSpotifyRefresh(snapshot).items[0]).toEqual(track);
  for (const href of [
    'javascript:alert(1)',
    'https://user:password@example.com/',
  ]) {
    expect(() =>
      parseSpotifyRefresh({ ...snapshot, items: [{ ...track, href }] }),
    ).toThrow();
  }
  expect(() =>
    parseSpotifyRefresh({ ...snapshot, items: Array(6).fill(track) }),
  ).toThrow();
  expect(() =>
    parseSpotifyRefresh({
      ...snapshot,
      items: [{ ...track, playback: { startedAt: 200, endsAt: 100 } }],
    }),
  ).toThrow();
  expect(() => parseSpotifyRefresh(null)).toThrow();
});
