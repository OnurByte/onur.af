import { required } from '../../src/portfolio/required';
import { afterAll, expect, test } from 'bun:test';
import { Pool } from 'pg';
import { WitnessStore } from '../../src/server/witness/store';
const url = process.env['WITNESS_TEST_DATABASE_URL'];
const pool = new Pool({ connectionString: url });
afterAll(async () => {
  await pool.end();
});
test.skipIf(!url)(
  'PostgreSQL accepts 100 concurrent visits exactly once and protects receipts',
  async () => {
    const store = new WitnessStore(pool, 's'.repeat(32));
    await store.migrate();
    const logId = `test-${crypto.randomUUID()}`;
    const input = {
      logId,
      revision: 1,
      visitorId: 'visitor',
      generation: 'v1',
      requestToken:
        crypto.randomUUID().replaceAll('-', '') +
        crypto.randomUUID().replaceAll('-', ''),
    };
    const results = await Promise.all(
      Array.from({ length: 100 }, () => store.accept(input)),
    );
    expect(results.filter((r) => r.accepted)).toHaveLength(100);
    expect((await store.stats(logId, 30)).allTime).toBe(1);
    const duplicate = await store.accept({
      ...input,
      requestToken: 'b'.repeat(64),
      revision: 2,
    });
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.eventId).toBeUndefined();
    const receipt = await store.receipt(
      required(required(results[0]).eventId),
      input.requestToken,
    );
    expect(receipt?.record.logId).toBe(logId);
    expect(
      await store.receipt(
        required(required(results[0]).eventId),
        'c'.repeat(64),
      ),
    ).toBeNull();
    expect((await store.stats(logId, 30)).allTime).toBe(1);
  },
);
test.skipIf(!url)(
  'a request capability cannot be replayed for a different Log',
  async () => {
    const store = new WitnessStore(pool, 's'.repeat(32));
    await store.migrate();
    const input = {
      logId: `cap-${crypto.randomUUID()}`,
      revision: 1,
      visitorId: 'browser',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
    };
    const first = await store.accept(input);
    const result = await store
      .accept({ ...input, logId: `other-${crypto.randomUUID()}` })
      .then(
        () => false,
        () => true,
      );
    expect(result).toBe(true);
    expect(first.eventId).toBeTruthy();
  },
);
test.skipIf(!url)(
  'trusted version aliases preserve first revision and first-seen time',
  async () => {
    const store = new WitnessStore(pool, 's'.repeat(32));
    await store.migrate();
    const logId = `alias-${crypto.randomUUID()}`;
    const first = {
      logId,
      revision: 1,
      visitorId: 'old-browser',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
    };
    await store.accept(first);
    await store.linkAlias(
      logId,
      { generation: 'v1', visitorId: 'old-browser' },
      { generation: 'v2', visitorId: 'new-browser' },
    );
    const duplicate = await store.accept({
      ...first,
      revision: 2,
      generation: 'v2',
      visitorId: 'new-browser',
      requestToken: crypto.randomUUID(),
    });
    expect(duplicate.accepted).toBe(false);
    const stats = await store.stats(logId, null);
    expect(stats.allTime).toBe(1);
    expect(stats.revisions).toEqual([{ revision: 1, count: 1 }]);
  },
);
test.skipIf(!url)(
  'UTC period filters use first acceptance for every traffic breakdown',
  async () => {
    const store = new WitnessStore(pool, 's'.repeat(32));
    await store.migrate();
    const logId = `period-${crypto.randomUUID()}`;
    await store.accept({
      logId,
      revision: 1,
      visitorId: 'earlier',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
      referrer: 'https://old.example/private?secret=never-stored',
    });
    await pool.query(
      "UPDATE witness_subjects SET first_seen_at='2020-01-01T23:59:59Z' WHERE log_id=$1",
      [logId],
    );
    await store.accept({
      logId,
      revision: 2,
      visitorId: 'today',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
    });
    const stats = await store.stats(logId, 7);
    expect(stats.allTime).toBe(2);
    expect(stats.unique).toBe(1);
    expect(stats.sources).toEqual([{ source: 'Direct / unknown', count: 1 }]);
    expect(stats.revisions).toEqual([{ revision: 2, count: 1 }]);
    const custom = await store.stats(logId, null, {
      from: '2020-01-01',
      to: '2020-01-01',
    });
    expect(custom.unique).toBe(1);
    expect(custom.sources).toEqual([{ source: 'old.example', count: 1 }]);
  },
);
test.skipIf(!url)(
  'HMAC secret rotation can link an existing subject without rewriting its event',
  async () => {
    const oldStore = new WitnessStore(pool, 'o'.repeat(32));
    const next = new WitnessStore(pool, 'n'.repeat(32));
    await oldStore.migrate();
    const logId = `rotation-${crypto.randomUUID()}`;
    const visit = {
      logId,
      revision: 1,
      visitorId: 'stable-browser',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
    };
    await oldStore.accept(visit);
    await next.linkAlias(
      logId,
      { generation: 'v1', visitorId: 'stable-browser', secret: 'o'.repeat(32) },
      { generation: 'v1', visitorId: 'stable-browser' },
    );
    expect(
      (await next.accept({ ...visit, requestToken: crypto.randomUUID() }))
        .accepted,
    ).toBe(false);
    expect((await next.stats(logId, null)).allTime).toBe(1);
  },
);
test.skipIf(!url)(
  'receipt capability can erase matching identifiers without rewriting events',
  async () => {
    const store = new WitnessStore(pool, 's'.repeat(32));
    await store.migrate();
    const visit = {
      logId: `forget-${crypto.randomUUID()}`,
      revision: 1,
      visitorId: 'fixture',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
    };
    const accepted = await store.accept(visit);
    expect(await store.forget(required(accepted.eventId), 'wrong-token')).toBe(
      false,
    );
    expect(
      await store.forget(required(accepted.eventId), visit.requestToken),
    ).toBe(true);
    expect(
      await store.receipt(required(accepted.eventId), visit.requestToken),
    ).toBeNull();
    expect((await store.stats(visit.logId, null)).recorded).toBe(1);
    expect(
      (await store.accept({ ...visit, requestToken: crypto.randomUUID() }))
        .accepted,
    ).toBe(true);
  },
);
