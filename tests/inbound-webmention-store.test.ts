import { required } from '../src/portfolio/required';
import { afterAll, expect, test } from 'bun:test';
import { Pool } from 'pg';
import { WebmentionStore } from '../src/server/webmentions/store';
const url = process.env['WEBMENTIONS_TEST_DATABASE_URL'];
const pool = new Pool({ connectionString: url, max: 5 });
afterAll(async () => {
  await pool.end();
});
test.skipIf(!url)(
  'durable mention queue deduplicates, fences leases, moderates, revalidates and blocks sources',
  async () => {
    const store = new WebmentionStore(pool);
    await store.migrate();
    await pool.query(
      'TRUNCATE webmentions,webmention_blocked_sources,webmention_limits',
    );
    const target = {
      url: 'https://onur.af/log/one-two-three',
      logId: 'one-two-three',
      kind: 'article' as const,
    };
    const source = 'https://source.example/post';
    const ids = await Promise.all(
      Array.from({ length: 5 }, () => store.enqueue(source, target)),
    );
    expect(new Set(ids).size).toBe(1);
    const claims = await Promise.all(
      Array.from({ length: 5 }, () => store.claim()),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    const job = required(claims.find(Boolean));
    expect(await store.visible(target.logId)).toEqual([]);
    await store.finish(
      { ...job, lease: crypto.randomUUID() },
      { status: 'validated', title: 'stale' },
    );
    expect(
      (await pool.query<{ status: string }>('SELECT status FROM webmentions'))
        .rows[0]?.status,
    ).toBe('fetching');
    await store.finish(job, { status: 'validated', title: 'Actual' });
    expect(await store.visible(target.logId)).toEqual([]);
    await store.moderate(required(ids[0]), 'visible');
    expect((await store.visible(target.logId))[0]?.title).toBe('Actual');
    await store.revalidate();
    const next = await store.claim();
    expect(next).not.toBeNull();
    await store.finish(required(next), { status: 'removed' });
    expect(await store.visible(target.logId)).toEqual([]);
    await store.block('https://source.example');
    expect(
      await store.enqueue('https://source.example/new', target).then(
        () => false,
        () => true,
      ),
    ).toBe(true);
    expect(
      await store.enqueue(source, target).then(
        () => false,
        () => true,
      ),
    ).toBe(true);
  },
);
test.skipIf(!url)(
  'expired leases recover and unreachable jobs stop after five attempts',
  async () => {
    const store = new WebmentionStore(pool);
    await store.migrate();
    await pool.query(
      'TRUNCATE webmentions,webmention_blocked_sources,webmention_limits',
    );
    await store.enqueue('https://retry.example/post', {
      url: 'https://onur.af/log/one-two-three',
      logId: 'one-two-three',
      kind: 'article',
    });
    const abandoned = await store.claim();
    expect(abandoned).not.toBeNull();
    await pool.query(
      "UPDATE webmentions SET leased_until=now()-interval '1 minute'",
    );
    const recovered = await store.claim();
    expect(recovered?.attempts).toBe(2);
    await store.finish(required(abandoned), { status: 'validated' });
    await store.finish(required(recovered), { status: 'unreachable' });
    for (let i = 3; i <= 5; i++) {
      await pool.query(
        "UPDATE webmentions SET next_attempt=now()-interval '1 minute'",
      );
      const job = await store.claim();
      expect(job?.attempts).toBe(i);
      await store.finish(required(job), { status: 'unreachable' });
    }
    await pool.query(
      "UPDATE webmentions SET next_attempt=now()-interval '1 minute'",
    );
    expect(await store.claim()).toBeNull();
  },
);
