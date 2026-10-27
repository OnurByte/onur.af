import { afterAll, expect, test } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import { Pool } from 'pg';
import { WitnessStore } from '../../src/server/witness/store';
import { appendCorrection } from '../../src/server/witness/corrections';
import { required } from '../../src/portfolio/required';
const url = process.env['WITNESS_TEST_DATABASE_URL'];
const pool = new Pool({ connectionString: url });
afterAll(async () => {
  await pool.end();
});
test.skipIf(!url)(
  'suppression adjusts public totals while retaining recorded events',
  async () => {
    const store = new WitnessStore(pool, 's'.repeat(32));
    await store.migrate();
    const logId = `correction-${crypto.randomUUID()}`;
    const accepted = await store.accept({
      logId,
      revision: 1,
      visitorId: 'visitor',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
    });
    const keys = generateKeyPairSync('ed25519');
    await appendCorrection(
      pool,
      required(accepted.eventId),
      true,
      'Fixture suppression',
      keys.privateKey,
    );
    const stats = await store.stats(logId, null);
    expect(stats.allTime).toBe(0);
    expect(stats.recorded).toBe(1);
    expect(stats.sources).toHaveLength(0);
    await appendCorrection(
      pool,
      required(accepted.eventId),
      false,
      'Fixture restoration',
      keys.privateKey,
    );
    expect((await store.stats(logId, null)).allTime).toBe(1);
  },
);
