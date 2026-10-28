import type { Embed } from './embeds';
type Track = NonNullable<Embed['recentTracks']>[number];
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const record = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error('Invalid Spotify response');
  return value;
};
function text(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    throw new Error('Invalid Spotify text');
  return value.trim();
}
function tracks(value: unknown): Track[] {
  if (!Array.isArray(value) || value.length > 5)
    throw new Error('Invalid Spotify tracks');
  return value.map((item: unknown): Track => {
    const track = record(item);
    if (track['kind'] !== 'track') throw new Error('Invalid Spotify track');
    const title = text(track['title'], 160);
    const href = text(track['href'], 2048);
    const url = new URL(href);
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('Invalid track URL');
    let playback: Track['playback'];
    if (track['playback'] !== undefined) {
      const time = record(track['playback']);
      const startedAt = time['startedAt'],
        endsAt = time['endsAt'];
      if (
        typeof startedAt !== 'number' ||
        typeof endsAt !== 'number' ||
        !Number.isSafeInteger(startedAt) ||
        !Number.isSafeInteger(endsAt) ||
        startedAt < 0 ||
        endsAt <= startedAt
      )
        throw new Error('Invalid playback time');
      playback = { startedAt, endsAt };
    }
    return {
      kind: 'track',
      title,
      href,
      ...(track['detail'] === undefined
        ? {}
        : { detail: text(track['detail'], 240) }),
      ...(playback ? { playback } : {}),
    };
  });
}
/** Validate only consumed refresh fields, without shipping the server's general schema runtime. */
export function parseSpotifyRefresh(value: unknown) {
  const data = record(value);
  const status = data['status'];
  if (
    status !== 'ready' &&
    status !== 'empty' &&
    status !== 'unavailable' &&
    status !== 'stale'
  )
    throw new Error('Invalid Spotify status');
  const playbackState = data['playbackState'];
  if (
    playbackState !== undefined &&
    playbackState !== 'playing' &&
    playbackState !== 'idle' &&
    playbackState !== 'unknown'
  )
    throw new Error('Invalid Spotify playback state');
  return {
    status,
    playbackState,
    items: tracks(data['items']),
    recentTracks: tracks(data['recentTracks'] ?? []),
  };
}
