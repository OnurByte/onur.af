import { z } from 'astro/zod';
import type { EmbedSource } from './embed-sources';
import type { EmbedCache } from './embed-cache';
import { embedSnapshotSchema, trackItemSchema } from './embeds';

const discordId = '1434953668959932426';
const presenceSchema = z.object({
  success: z.literal(true),
  data: z.object({
    discord_user: z.object({ id: z.literal(discordId) }),
    listening_to_spotify: z.boolean(),
    spotify: z
      .object({
        track_id: z.string().regex(/^[a-zA-Z0-9]{22}$/),
        song: z.string().trim().min(1),
        artist: z.string().trim().min(1),
        timestamps: z
          .object({
            start: z.number().int().nonnegative(),
            end: z.number().int().nonnegative(),
          })
          .refine((value) => value.end > value.start)
          .optional(),
      })
      .nullable(),
  }),
});
const historySchema = z.object({
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  current: trackItemSchema.optional(),
  recent: z.array(trackItemSchema).max(5),
});
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
type Track = z.infer<typeof trackItemSchema>;

export function createSpotifySource(
  request: Fetcher = (url, init) => fetch(url, init),
  now: () => number = Date.now,
  { cache }: { cache?: EmbedCache } = {},
): EmbedSource {
  let history: z.infer<typeof historySchema> = { recent: [] };
  let restored: Promise<void> | undefined;
  let cached:
    | { snapshot: z.infer<typeof embedSnapshotSchema>; fetchedAt: number }
    | undefined;
  let pending: Promise<unknown> | undefined;
  function previousTracks(current?: Track) {
    const candidates = [
      ...(history.current ? [history.current] : []),
      ...history.recent,
    ];
    const seen = new Set(current ? [current.href] : []);
    return candidates
      .filter((track) => {
        if (seen.has(track.href)) return false;
        seen.add(track.href);
        return true;
      })
      .slice(0, 5);
  }
  return {
    id: 'spotify',
    title: 'Listening',
    source: 'Spotify',
    href: 'https://open.spotify.com',
    async load(signal) {
      if (!restored)
        restored = (async () => {
          try {
            const parsed = historySchema.safeParse(
              await cache?.read('spotify'),
            );
            if (
              parsed.success &&
              (!parsed.data.updatedAt ||
                Date.parse(parsed.data.updatedAt) <= now())
            )
              history = parsed.data;
          } catch {
            /* An unavailable history store must not block live presence. */
          }
        })();
      await restored;
      if (cached && now() - cached.fetchedAt < 5000) return cached.snapshot;
      if (pending) return pending;
      pending = (async () => {
        let current: Track | undefined;
        try {
          const response = await request(
            `https://api.lanyard.rest/v1/users/${discordId}`,
            {
              signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
              headers: { Accept: 'application/json' },
            },
          );
          if (!response.ok) throw new Error('Lanyard unavailable');
          const { data } = presenceSchema.parse(await response.json());
          const track = data.listening_to_spotify ? data.spotify : null;
          if (track)
            current = trackItemSchema.parse({
              kind: 'track',
              title: track.song.slice(0, 160),
              detail: track.artist.slice(0, 240),
              href: `https://open.spotify.com/track/${track.track_id}`,
              ...(track.timestamps
                ? {
                    playback: {
                      startedAt: track.timestamps.start,
                      endsAt: track.timestamps.end,
                    },
                  }
                : {}),
            });
        } catch (error) {
          const recentTracks = previousTracks();
          if (!recentTracks.length) throw error;
          const snapshot = embedSnapshotSchema.parse({
            status: 'stale',
            updatedAt: history.updatedAt,
            playbackState: 'unknown',
            items: [],
            recentTracks,
          });
          cached = { snapshot, fetchedAt: now() };
          return snapshot;
        }
        const recentTracks = previousTracks(current);
        const updatedAt = new Date(now()).toISOString();
        const nextHistory = {
          updatedAt,
          ...(current ? { current } : {}),
          recent: recentTracks,
        };
        if (JSON.stringify(nextHistory) !== JSON.stringify(history)) {
          history = nextHistory;
          try {
            await cache?.write('spotify', history);
          } catch {
            /* Keep history in memory if disk is unavailable. */
          }
        }
        const snapshot = embedSnapshotSchema.parse({
          status: current || recentTracks.length ? 'ready' : 'empty',
          updatedAt,
          playbackState: current ? 'playing' : 'idle',
          items: current ? [current] : [],
          recentTracks,
        });
        cached = { snapshot, fetchedAt: now() };
        return snapshot;
      })();
      try {
        return await pending;
      } finally {
        pending = undefined;
      }
    },
  };
}
