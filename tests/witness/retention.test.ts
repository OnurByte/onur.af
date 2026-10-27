import { afterAll, expect, test } from 'bun:test';
import { Pool } from 'pg';
import { WitnessStore } from '../../src/server/witness/store';
import { expirePrivateIdentifiers } from '../../src/server/witness/retention';
const url = process.env['WITNESS_TEST_DATABASE_URL'];
const pool = new Pool({ connectionString: url });
afterAll(async () => {
  await pool.end();
});
test.skipIf(!url)(
  'explicit retention removes private matching data while preserving public events',
  async () => {
    const store = new WitnessStore(pool, 's'.repeat(32));
    await store.migrate();
    const logId = `retention-${crypto.randomUUID()}`;
    await store.accept({
      logId,
      revision: 1,
      visitorId: 'fixture',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
      referrer: 'https://example.org/private',
    });
    await pool.query(
      "UPDATE witness_subjects SET first_seen_at=now()-interval '400 days' WHERE log_id=$1",
      [logId],
    );
    await expirePrivateIdentifiers(pool, 365);
    const rows = await pool.query<{ count: number }>(
      'SELECT count(*)::integer count FROM witness_aliases WHERE log_id=$1',
      [logId],
    );
    expect(rows.rows[0]?.count).toBe(0);
    expect((await store.stats(logId, null)).recorded).toBe(1);
  },
);
