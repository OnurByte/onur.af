import { required } from '../../src/portfolio/required';
import { afterAll, expect, test } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import { Pool } from 'pg';
import { WitnessStore } from '../../src/server/witness/store';
import { sealBatch, readBatch } from '../../src/server/witness/worker';
import { auditBatch } from '../../src/portfolio/witness/batch';
const url = process.env['WITNESS_TEST_DATABASE_URL'];
const pool = new Pool({ connectionString: url });
afterAll(async () => {
  await pool.end();
});
test.skipIf(!url)(
  'sealing is atomic, repeatable and independently recountable',
  async () => {
    const store = new WitnessStore(pool, 's'.repeat(32));
    await store.migrate();
    const keys = generateKeyPairSync('ed25519');
    await store.accept({
      logId: `seal-${crypto.randomUUID()}`,
      revision: 1,
      visitorId: 'worker',
      generation: 'v1',
      requestToken: crypto.randomUUID(),
    });
    const batch = await sealBatch(pool, keys.privateKey);
    expect(batch).not.toBeNull();
    const evidence = await readBatch(pool, required(batch).manifest.id);
    expect(evidence).not.toBeNull();
    expect(
      auditBatch(
        required(evidence),
        keys.publicKey,
        required(evidence).manifest.previous,
      ).total,
    ).toBe(required(evidence).events.length);
    expect(await sealBatch(pool, keys.privateKey)).toBeNull();
    const orphan = await pool.query<{ count: number }>(
      'SELECT count(*)::integer count FROM witness_events WHERE batch_id IS NULL',
    );
    expect(required(orphan.rows[0]).count).toBe(0);
  },
);
