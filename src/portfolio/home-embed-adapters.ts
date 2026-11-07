import { z } from 'astro/zod';
import { embedSnapshotSchema } from './embeds';
import type { EmbedSource } from './embed-sources';
import type { EmbedCache } from './embed-cache';
import {
  parseGitShowRepositories,
  parseGitShowCommitActivity,
} from './gitshow';

const timelineSchema = z.object({
  code: z.literal(200),
  results: z.array(
    z.object({
      type: z.literal('status'),
      likes: z.number().int().nonnegative().optional(),
      reposts: z.number().int().nonnegative().optional(),
      id: z.string().regex(/^\d+$/),
      text: z.string(),
      created_timestamp: z.number(),
    }),
  ),
});
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Fetch only JSON on the server; provider scripts and HTML never reach the page. */
export function createHomeEmbedSources(
  request: Fetcher = (url, init) => fetch(url, init),
  now: () => number = Date.now,
  { cache }: { cache?: EmbedCache } = {},
): readonly EmbedSource[] {
  const cacheVersion = 3;
  const freshMs = 1_800_000;
  const cacheSchema = z.object({
    snapshot: embedSnapshotSchema,
    fetchedAt: z.number().nonnegative(),
    version: z.number().optional(),
  });
  const restored = new Map<
    string,
    Promise<z.infer<typeof cacheSchema> | undefined>
  >();
  function restore(id: 'x' | 'github') {
    if (!restored.has(id))
      restored.set(
        id,
        (async () => {
          try {
            const parsed = cacheSchema.safeParse(await cache?.read(id));
            if (
              !parsed.success ||
              parsed.data.fetchedAt > now() ||
              (parsed.data.snapshot.updatedAt &&
                Date.parse(parsed.data.snapshot.updatedAt) > now())
            )
              return undefined;
            if (id === 'x' && parsed.data.version !== cacheVersion)
              return { ...parsed.data, fetchedAt: now() - freshMs };
            return {
              ...parsed.data,
              snapshot: {
                ...parsed.data.snapshot,
                updatedAt: new Date(parsed.data.fetchedAt).toISOString(),
              },
            };
          } catch {
            return undefined;
          }
        })(),
      );
    return restored.get(id)!;
  }
  async function persist(
    id: 'x' | 'github',
    value: z.infer<typeof cacheSchema>,
  ) {
    try {
      await cache?.write(id, { ...value, version: cacheVersion });
    } catch {
      /* Read-only storage must not discard valid upstream data. */
    }
  }
  type Snapshot = z.infer<typeof embedSnapshotSchema>;
  type Items = Snapshot['items'];
  /**
   * Serves a fresh snapshot from memory or the cache, coalesces concurrent
   * refreshes, and falls back to the last good items (marked stale) on failure.
   */
  function cachedLoader(
    id: 'x' | 'github',
    refresh: (signal: AbortSignal, previous?: Snapshot) => Promise<Items>,
  ) {
    let last: { snapshot: Snapshot; fetchedAt: number } | undefined;
    let inflight: Promise<Snapshot> | undefined;
    return async (signal: AbortSignal): Promise<Snapshot> => {
      last ??= await restore(id);
      if (last && now() - last.fetchedAt < freshMs) return last.snapshot;
      if (inflight) return inflight;
      inflight = (async () => {
        try {
          const items = await refresh(signal, last?.snapshot);
          const fetchedAt = now();
          const snapshot = embedSnapshotSchema.parse({
            status: items.length ? 'ready' : 'empty',
            items,
            updatedAt: new Date(fetchedAt).toISOString(),
          });
          last = { snapshot, fetchedAt };
          await persist(id, last);
          return snapshot;
        } catch (error) {
          if (last?.snapshot.items.length)
            return { ...last.snapshot, status: 'stale' as const };
          throw error;
        }
      })();
      try {
        return await inflight;
      } finally {
        inflight = undefined;
      }
    };
  }
  async function gitshowPage(path: string, signal: AbortSignal) {
    const response = await request(`https://gitshow.dev/onurbyte${path}`, {
      signal,
      headers: { Accept: 'text/html', 'User-Agent': 'onurbyte-portfolio' },
    });
    if (!response.ok) throw new Error('GitShow unavailable');
    return response.text();
  }
  async function commitCount(name: string, signal: AbortSignal) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const count = parseGitShowCommitActivity(
          await gitshowPage(
            `/${encodeURIComponent(name)}`,
            AbortSignal.any([signal, AbortSignal.timeout(4000)]),
          ),
        );
        if (count !== undefined) return count;
      } catch {
        /* Retry a slow or failed repository page once. */
      }
      if (signal.aborted) break;
    }
    return undefined;
  }
  async function xTimeline(signal: AbortSignal) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return timelineSchema.parse(
          await json(
            'https://api.fxtwitter.com/2/profile/onurstirner/statuses?count=5',
            AbortSignal.any([signal, AbortSignal.timeout(5000)]),
          ),
        );
      } catch (error) {
        if (signal.aborted || attempt === 1) throw error;
      }
    }
    throw new Error('X timeline unavailable');
  }
  function uniquePosts(
    timeline: z.infer<typeof timelineSchema>,
  ): z.infer<typeof timelineSchema>['results'] {
    const seen = new Set<string>();
    const posts: z.infer<typeof timelineSchema>['results'] = [];
    for (const post of timeline.results) {
      if (!post.text.trim() || seen.has(post.id)) continue;
      seen.add(post.id);
      posts.push(post);
      if (posts.length === 5) break;
    }
    return posts;
  }
  async function json(url: string, signal: AbortSignal) {
    const response = await request(url, {
      signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'onurbyte-portfolio',
      },
    });
    if (!response.ok) throw new Error('Embed provider unavailable');
    return response.json();
  }
  return [
    {
      id: 'x',
      title: 'Tweets',
      source: '𝕏 ⁜ @onurstirner',
      href: 'https://x.com/onurstirner',
      load: cachedLoader('x', async (signal) =>
        uniquePosts(await xTimeline(signal)).map((post) => ({
          kind: 'post' as const,
          title: '@onurstirner',
          href: `https://x.com/onurstirner/status/${post.id}`,
          text: post.text.trim().slice(0, 5000),
          ...(post.likes !== undefined ? { likes: post.likes } : {}),
          ...(post.reposts !== undefined ? { reposts: post.reposts } : {}),
          publishedAt: new Date(post.created_timestamp * 1000).toISOString(),
        })),
      ),
    },
    {
      id: 'github',
      title: 'Repositories',
      source: 'GitHub ⁜ onurbyte',
      href: 'https://github.com/onurbyte',
      load: cachedLoader('github', async (signal, previousSnapshot) => {
        const repositories = parseGitShowRepositories(
          await gitshowPage(
            '',
            AbortSignal.any([signal, AbortSignal.timeout(5000)]),
          ),
        );
        return Promise.all(
          repositories.slice(0, 5).map(async (repo) => {
            const previous = previousSnapshot?.items.find(
              (item) =>
                item.kind === 'repository' &&
                item.href.toLowerCase() === repo.html_url.toLowerCase(),
            );
            const commits =
              (await commitCount(repo.name, signal)) ??
              (previous?.kind === 'repository' ? previous.commits : undefined);
            return {
              kind: 'repository' as const,
              title: repo.name.slice(0, 160),
              href: repo.html_url,
              ...(repo.description?.trim()
                ? { detail: repo.description.trim().slice(0, 240) }
                : {}),
              ...(repo.language
                ? { language: repo.language.slice(0, 80) }
                : {}),
              ...(commits !== undefined ? { commits, commitWeeks: 12 } : {}),
            };
          }),
        );
      }),
    },
  ];
}
