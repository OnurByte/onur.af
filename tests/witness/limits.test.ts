import { afterAll, expect, test } from 'bun:test';
import { Pool } from 'pg';
import { WitnessStore } from '../../src/server/witness/store';
import { takeRateLimit } from '../../src/server/request-limits';
const url = process.env['WITNESS_TEST_DATABASE_URL'];
const pool = new Pool({ connectionString: url });
afterAll(async () => {
  await pool.end();
});
test.skipIf(!url)(
  'rate limits are atomic across simultaneous requests',
  async () => {
    await new WitnessStore(pool, 's'.repeat(32)).migrate();
    const key = crypto.randomUUID();
    const results = await Promise.all(
      Array.from({ length: 20 }, () => takeRateLimit(pool, key, 5)),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
  },
);
