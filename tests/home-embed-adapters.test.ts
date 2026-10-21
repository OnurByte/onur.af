import { expect, test } from 'bun:test';
import { createHomeEmbedSources } from '../src/portfolio/home-embed-adapters';
import { loadEmbeds } from '../src/portfolio/embed-sources';

test('normalizes X posts with dates and caps the timeline at five', async () => {
  const sources = createHomeEmbedSources(async () =>
    Response.json({
      code: 200,
      results: Array.from({ length: 8 }, (_, i) => ({
        type: 'status',
        id: String(i),
        text: 'Hello',
        created_timestamp: 1729000000,
      })),
    }),
  );
  const result = await loadEmbeds([sources[0]!]);
  expect(result[0]?.status).toBe('ready');
  expect(result[0]?.items).toHaveLength(5);
  expect(result[0]?.items[0]).toMatchObject({
    kind: 'post',
    title: '@onurstirner',
    text: 'Hello',
    href: 'https://x.com/onurstirner/status/0',
    publishedAt: new Date(1729000000000).toISOString(),
  });
});
test('X drops empty posts and duplicate ids before the five-post cap', async () => {
  const sources = createHomeEmbedSources(async () =>
    Response.json({
      code: 200,
      results: [
        { type: 'status', id: '1', text: 'One', created_timestamp: 1729000000 },
        { type: 'status', id: '2', text: '  ', created_timestamp: 1729000001 },
        {
          type: 'status',
          id: '1',
          text: 'One repeated',
          created_timestamp: 1729000002,
        },
        { type: 'status', id: '2', text: 'Two', created_timestamp: 1729000003 },
        {
          type: 'status',
          id: '3',
          text: 'Three',
          created_timestamp: 1729000004,
        },
        {
          type: 'status',
          id: '4',
          text: 'Four',
          created_timestamp: 1729000005,
        },
        {
          type: 'status',
          id: '5',
          text: 'Five',
          created_timestamp: 1729000006,
        },
        { type: 'status', id: '6', text: 'Six', created_timestamp: 1729000007 },
      ],
    }),
  );
  const result = await loadEmbeds([sources[0]!]);
  expect(result[0]?.status).toBe('ready');
  expect(
    result[0]?.items.map((item) =>
      item.kind === 'post' ? item.text : item.kind,
    ),
  ).toEqual(['One', 'Two', 'Three', 'Four', 'Five']);
});

test('X provider errors are unavailable, even with HTTP 200 and empty results', async () => {
  const sources = createHomeEmbedSources(async () =>
    Response.json({ code: 404, results: [] }),
  );
  expect((await loadEmbeds([sources[0]!]))[0]?.status).toBe('unavailable');
});
test('empty timelines remain empty and HTTP errors remain unavailable', async () => {
  const empty = createHomeEmbedSources(async () =>
    Response.json({ code: 200, results: [] }),
  );
  expect((await loadEmbeds([empty[0]!]))[0]?.status).toBe('empty');
  const failed = createHomeEmbedSources(
    async () => new Response('', { status: 429 }),
  );
  expect((await loadEmbeds(failed)).map((x) => x.status)).toEqual([
    'unavailable',
    'unavailable',
  ]);
});

test('X retries a transient provider error', async () => {
  let calls = 0;
  const sources = createHomeEmbedSources(async () =>
    Response.json(
      ++calls === 1
        ? { code: 404, results: [] }
        : {
            code: 200,
            results: [
              {
                type: 'status',
                id: '1',
                text: 'Recovered',
                created_timestamp: 1729000000,
              },
            ],
          },
    ),
  );
  expect((await loadEmbeds([sources[0]!]))[0]?.items[0]).toMatchObject({
    text: 'Recovered',
  });
});

test('X retains the last successful timeline after refresh fails', async () => {
  let now = 0;
  let failing = false;
  const sources = createHomeEmbedSources(
    async () =>
      Response.json(
        failing
          ? { code: 404, results: [] }
          : {
              code: 200,
              results: [
                {
                  type: 'status',
                  id: '1',
                  text: 'Saved post',
                  created_timestamp: 1729000000,
                },
              ],
            },
      ),
    () => now,
  );
  expect((await loadEmbeds([sources[0]!]))[0]?.status).toBe('ready');
  failing = true;
  now = 1_800_000;
  const refreshed = (await loadEmbeds([sources[0]!]))[0]!;
  expect(refreshed.status).toBe('stale');
  expect(refreshed.items[0]).toMatchObject({ text: 'Saved post' });
  expect(refreshed.updatedAt).toBe(new Date(0).toISOString());
});

test('X keeps the cached posts for 30 minutes and refreshes at expiry', async () => {
  let now = 0;
  let revision = 1;
  const sources = createHomeEmbedSources(
    async () =>
      Response.json({
        code: 200,
        results: [
          {
            type: 'status',
            id: String(revision),
            text: `Post ${revision}`,
            created_timestamp: 1729000000,
          },
        ],
      }),
    () => now,
  );
  const first = (await loadEmbeds([sources[0]!]))[0]!;
  expect(first.items[0]).toMatchObject({ text: 'Post 1' });
  revision = 2;
  now = 1_799_999;
  expect((await loadEmbeds([sources[0]!]))[0]?.items).toEqual(first.items);
  now = 1_800_000;
  expect((await loadEmbeds([sources[0]!]))[0]?.items[0]).toMatchObject({
    text: 'Post 2',
  });
});

const gitshowProfile = (name = 'portfolio') =>
  `<script>self.__next_f.push(${JSON.stringify([1, `12:${JSON.stringify(['$', 'div', null, { categories: [{ repos: [{ name, html_url: `https://github.com/onurbyte/${name}`, description: 'My site', language: 'TypeScript', pushed_at: '2026-10-15T00:00:00Z' }] }] }])}\n`])})</script>`;
const gitshowActivity = Array.from(
  { length: 12 },
  (_, i) => `<div title="Week ${i + 1}: ${i} commits"></div>`,
).join('');

test('GitHub uses only GitShow and normalizes its repository and 12-week commit data', async () => {
  const sources = createHomeEmbedSources(async (url) => {
    expect(url.startsWith('https://gitshow.dev/onurbyte')).toBe(true);
    return new Response(
      url.endsWith('/portfolio') ? gitshowActivity : gitshowProfile(),
    );
  });
  const result = (await loadEmbeds([sources[1]!]))[0]!;
  expect(result.status).toBe('ready');
  expect(result.items[0]).toMatchObject({
    title: 'portfolio',
    language: 'TypeScript',
    commits: 66,
    commitWeeks: 12,
  });
});

test('GitShow snapshots remain cached for 30 minutes', async () => {
  let now = 0;
  let name = 'portfolio';
  const sources = createHomeEmbedSources(
    async (url) =>
      new Response(
        url === 'https://gitshow.dev/onurbyte'
          ? gitshowProfile(name)
          : gitshowActivity,
      ),
    () => now,
  );
  const first = (await loadEmbeds([sources[1]!]))[0]!;
  name = 'newrepo';
  now = 1_799_999;
  expect((await loadEmbeds([sources[1]!]))[0]?.items).toEqual(first.items);
  now = 1_800_000;
  expect((await loadEmbeds([sources[1]!]))[0]?.items[0]).toMatchObject({
    title: 'newrepo',
  });
});

test('GitShow failures preserve the last successful snapshot without fabricating counts', async () => {
  let now = 0;
  let failing = false;
  const sources = createHomeEmbedSources(
    async (url) =>
      failing
        ? new Response('', { status: 503 })
        : new Response(
            url === 'https://gitshow.dev/onurbyte'
              ? gitshowProfile()
              : '<html>No activity available</html>',
          ),
    () => now,
  );
  const first = (await loadEmbeds([sources[1]!]))[0]!;
  expect(first.items[0]).not.toHaveProperty('commits');
  now = 1_800_000;
  failing = true;
  expect((await loadEmbeds([sources[1]!]))[0]).toMatchObject({
    status: 'stale',
    items: first.items,
  });
});

test('GitShow shares concurrent refreshes and rejects changed profile markup', async () => {
  let calls = 0;
  const sources = createHomeEmbedSources(async (url) => {
    if (url !== 'https://gitshow.dev/onurbyte')
      return new Response(gitshowActivity);
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(gitshowProfile());
  });
  const results = await Promise.all(
    Array.from({ length: 4 }, () => loadEmbeds([sources[1]!])),
  );
  expect(results.every((result) => result[0]?.status === 'ready')).toBe(true);
  expect(calls).toBe(1);
  const broken = createHomeEmbedSources(
    async () => new Response('<html>Changed markup</html>'),
  );
  expect((await loadEmbeds([broken[1]!]))[0]?.status).toBe('unavailable');
});

test('slow X responses and commit pages are not discarded after one second', async () => {
  const sources = createHomeEmbedSources(async (url, init) => {
    if (url === 'https://gitshow.dev/onurbyte')
      return new Response(gitshowProfile());
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 1300);
      init.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new Error('Timed out'));
        },
        { once: true },
      );
    });
    if (url.startsWith('https://gitshow.dev/'))
      return new Response(gitshowActivity);
    return Response.json({
      code: 200,
      results: [
        {
          type: 'status',
          id: '1',
          text: 'Slow response',
          created_timestamp: 1729000000,
        },
      ],
    });
  });
  const result = await loadEmbeds(sources, { timeoutMs: 15_000 });
  expect(result[0]?.status).toBe('ready');
  expect(result[1]?.items[0]).toMatchObject({ commits: 66 });
});

test('both sources restore their 30-minute snapshots after recreating the adapters', async () => {
  const records = new Map<string, unknown>();
  const cache = {
    read: async (id: string) => records.get(id),
    write: async (id: string, value: unknown) => {
      records.set(id, value);
    },
  };
  const sources = createHomeEmbedSources(
    async (url) =>
      url.startsWith('https://gitshow.dev/')
        ? new Response(
            url === 'https://gitshow.dev/onurbyte'
              ? gitshowProfile()
              : gitshowActivity,
          )
        : Response.json({
            code: 200,
            results: [
              {
                type: 'status',
                id: '1',
                text: 'Saved post',
                created_timestamp: 1729000000,
              },
            ],
          }),
    () => 0,
    { cache },
  );
  await loadEmbeds(sources);
  const restarted = createHomeEmbedSources(
    async () => {
      throw new Error('Offline');
    },
    () => 1000,
    { cache },
  );
  const result = await loadEmbeds(restarted);
  expect(result[0]).toMatchObject({
    status: 'ready',
    items: [{ text: 'Saved post' }],
  });
  expect(result[1]).toMatchObject({
    status: 'ready',
    items: [{ commits: 66 }],
  });
});

test('partial GitShow refreshes preserve previously loaded commit counts', async () => {
  let now = 0;
  let missingActivity = false;
  const sources = createHomeEmbedSources(
    async (url) =>
      new Response(
        url === 'https://gitshow.dev/onurbyte'
          ? gitshowProfile()
          : missingActivity
            ? '<html>Temporary activity outage</html>'
            : gitshowActivity,
      ),
    () => now,
  );
  await loadEmbeds([sources[1]!]);
  now = 1_800_000;
  missingActivity = true;
  expect((await loadEmbeds([sources[1]!]))[0]?.items[0]).toMatchObject({
    commits: 66,
  });
});

test('X keeps real like and repost counts, including zero', async () => {
  const sources = createHomeEmbedSources(async () =>
    Response.json({
      code: 200,
      results: [
        {
          type: 'status',
          id: '1',
          text: 'Post',
          created_timestamp: 1729000000,
          likes: 0,
          reposts: 17,
        },
      ],
    }),
  );
  expect((await loadEmbeds([sources[0]!]))[0]?.items[0]).toMatchObject({
    likes: 0,
    reposts: 17,
  });
});
