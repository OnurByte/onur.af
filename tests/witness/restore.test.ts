import ots from 'opentimestamps';
import { validateWitnessTimestamp } from '../../src/server/witness/timestamp';
import { expect, test } from 'bun:test';
import { Pool } from 'pg';
import { generateKeyPairSync } from 'node:crypto';
import { WitnessStore } from '../../src/server/witness/store';
import { sealBatch, readBatch } from '../../src/server/witness/worker';
import { auditBatch } from '../../src/portfolio/witness/batch';
import { required } from '../../src/portfolio/required';
const url = process.env['WITNESS_TEST_DATABASE_URL'];
test.skipIf(!url)(
  'isolated PostgreSQL backup restores event membership and auditable signatures',
  async () => {
    const base = new URL(required(url));
    if (!['127.0.0.1', 'localhost'].includes(base.hostname))
      throw new Error('Restore fixture requires local PostgreSQL');
    const suffix = crypto.randomUUID().replaceAll('-', '');
    const names = [`witness_src_${suffix}`, `witness_dst_${suffix}`];
    const admin = new Pool({ connectionString: url });
    const pools: Pool[] = [];
    try {
      for (const name of names) {
        await admin.query(`CREATE DATABASE "${name}"`);
        const u = new URL(base);
        u.pathname = `/${name}`;
        pools.push(new Pool({ connectionString: u.href }));
      }
      const source = required(pools[0]);
      const restored = required(pools[1]);
      const store = new WitnessStore(source, 's'.repeat(32));
      await store.migrate();
      await store.accept({
        logId: 'restore-fixture',
        revision: 1,
        visitorId: 'fixture',
        generation: 'v1',
        requestToken: crypto.randomUUID(),
      });
      const keys = generateKeyPairSync('ed25519');
      const sealed = required(await sealBatch(source, keys.privateKey));
      const detached = ots.DetachedTimestampFile.fromBytes(
        new ots.Ops.OpSHA256(),
        Buffer.from(sealed.manifest.root, 'hex'),
      );
      detached.timestamp.attestations.push(
        new ots.Notary.PendingAttestation('https://calendar.fixture'),
      );
      const receipt = Buffer.from(detached.serializeToBytes());
      await source.query(
        "UPDATE witness_batches SET receipt=$2,status='pending' WHERE id=$1",
        [sealed.manifest.id, receipt],
      );
      const pgEnv = {
        ...process.env,
        PGHOST: base.hostname,
        PGPORT: base.port || '5432',
        PGUSER: decodeURIComponent(base.username),
        PGPASSWORD: decodeURIComponent(base.password),
      };
      const dump = Bun.spawn(['pg_dump', '--format=custom', '--no-owner'], {
        env: { ...pgEnv, PGDATABASE: required(names[0]) },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const bytes = await new Response(dump.stdout).arrayBuffer();
      expect(await dump.exited).toBe(0);
      const restore = Bun.spawn(
        [
          'pg_restore',
          '--no-owner',
          '--exit-on-error',
          '--dbname',
          required(names[1]),
        ],
        {
          env: pgEnv,
          stdin: new Blob([bytes]),
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );
      expect(await restore.exited).toBe(0);
      const evidence = required(await readBatch(restored, sealed.manifest.id));
      expect(auditBatch(evidence, keys.publicKey, null).total).toBe(1);
      expect(evidence).toEqual(sealed);
      const restoredReceipt = await restored.query<{
        receipt: Buffer;
        status: string;
      }>('SELECT receipt,status FROM witness_batches WHERE id=$1', [
        sealed.manifest.id,
      ]);
      expect(restoredReceipt.rows[0]?.status).toBe('pending');
      expect(
        validateWitnessTimestamp(
          required(restoredReceipt.rows[0]).receipt,
          sealed.manifest.root,
        ),
      ).toBe('pending');
      expect(
        (
          await new WitnessStore(restored, 's'.repeat(32)).stats(
            'restore-fixture',
            null,
          )
        ).recorded,
      ).toBe(1);
    } finally {
      await Promise.all(pools.map((p) => p.end()));
      for (const name of names)
        await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
      await admin.end();
    }
  },
  30000,
);
