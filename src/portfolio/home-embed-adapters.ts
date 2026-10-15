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
  let lastX:
    | { snapshot: z.infer<typeof embedSnapshotSchema>; fetchedAt: number }
    | undefined;
  let lastGithub:
    | { snapshot: z.infer<typeof embedSnapshotSchema>; fetchedAt: number }
    | undefined;
  let xRefresh: Promise<unknown> | undefined;
  let githubRefresh: Promise<unknown> | undefined;
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
            if (!parsed.success || parsed.data.fetchedAt > now())
              return undefined;
            if (id === 'x' && parsed.data.version !== 2)
              return { ...parsed.data, fetchedAt: now() - 1_800_000 };
            return parsed.data;
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
      await cache?.write(id, { ...value, version: 2 });
    } catch {
      /* Read-only storage must not discard valid upstream data. */
    }
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
      title: 'Posts',
      source: '𝕏 · @onurstirner',
      href: 'https://x.com/onurstirner',
      async load(signal) {
        if (!lastX) lastX = await restore('x');
        if (lastX && now() - lastX.fetchedAt < 1_800_000) return lastX.snapshot;
        if (xRefresh) return xRefresh;
        xRefresh = (async () => {
          try {
            const timeline = await xTimeline(signal);
            const items = timeline.results
              .filter((post) => post.text.trim())
              .slice(0, 5)
              .map((post) => ({
                kind: 'post' as const,
                title: '@onurstirner',
                href: `https://x.com/onurstirner/status/${post.id}`,
                text: post.text.trim().slice(0, 5000),
                ...(post.likes !== undefined ? { likes: post.likes } : {}),
                ...(post.reposts !== undefined
                  ? { reposts: post.reposts }
                  : {}),
                publishedAt: new Date(
                  post.created_timestamp * 1000,
                ).toISOString(),
              }));
            const fetchedAt = now();
            const snapshot = embedSnapshotSchema.parse({
              status: items.length ? 'ready' : 'empty',
              items,
              updatedAt: new Date(fetchedAt).toISOString(),
            });
            lastX = { snapshot, fetchedAt };
            await persist('x', lastX);
            return snapshot;
          } catch (error) {
            if (lastX?.snapshot.items.length)
              return { ...lastX.snapshot, status: 'stale' };
            throw error;
          }
        })();
        try {
          return await xRefresh;
        } finally {
          xRefresh = undefined;
        }
      },
    },
    {
      id: 'github',
      title: 'Repositories',
      source: 'GitHub · onurbyte',
      href: 'https://github.com/onurbyte',
      async load(signal) {
        if (!lastGithub) lastGithub = await restore('github');
        if (lastGithub && now() - lastGithub.fetchedAt < 1_800_000)
          return lastGithub.snapshot;
        if (githubRefresh) return githubRefresh;
        githubRefresh = (async () => {
          try {
            const repositories = parseGitShowRepositories(
              await gitshowPage(
                '',
                AbortSignal.any([signal, AbortSignal.timeout(5000)]),
              ),
            );
            const items = await Promise.all(
              repositories.slice(0, 5).map(async (repo) => {
                const previous = lastGithub?.snapshot.items.find(
                  (item) =>
                    item.kind === 'repository' &&
                    item.href.toLowerCase() === repo.html_url.toLowerCase(),
                );
                const commits =
                  (await commitCount(repo.name, signal)) ??
                  (previous?.kind === 'repository'
                    ? previous.commits
                    : undefined);
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
                  ...(commits !== undefined
                    ? { commits, commitWeeks: 12 }
                    : {}),
                };
              }),
            );
            const fetchedAt = now();
            const snapshot = embedSnapshotSchema.parse({
              status: items.length ? 'ready' : 'empty',
              items,
            });
            lastGithub = { snapshot, fetchedAt };
            await persist('github', lastGithub);
            return snapshot;
          } catch (error) {
            if (lastGithub?.snapshot.items.length)
              return { ...lastGithub.snapshot, status: 'stale' };
            throw error;
          }
        })();
        try {
          return await githubRefresh;
        } finally {
          githubRefresh = undefined;
        }
      },
    },
  ];
}
