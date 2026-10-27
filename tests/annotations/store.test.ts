import { afterAll, expect, test } from 'bun:test';
import { Pool } from 'pg';
import { generateKeyPairSync, sign } from 'node:crypto';
import { AnnotationStore } from '../../src/server/annotations/store';
import {
  anchorSelection,
  annotationBytes,
  type AnnotationPayload,
} from '../../src/portfolio/annotations/protocol';
const url = process.env['WITNESS_TEST_DATABASE_URL'];
const pool = new Pool({ connectionString: url });
afterAll(async () => {
  await pool.end();
});
test.skipIf(!url)(
  'annotations publish automatically and only their owner can edit or withdraw',
  async () => {
    const store = new AnnotationStore(pool);
    await store.migrate();
    const keys = generateKeyPairSync('ed25519');
    const p: AnnotationPayload = {
      format: 'onur-annotation-v1',
      id: crypto.randomUUID(),
      logId: `annotation-${crypto.randomUUID()}`,
      revision: 1,
      revisionHash: 'ab'.repeat(32),
      target: anchorSelection('hello world', 0, 5),
      body: 'Note',
      action: 'create',
      sequence: 1,
      publicKey: keys.publicKey
        .export({ type: 'spki', format: 'der' })
        .toString('base64'),
    };
    const signed = (payload: AnnotationPayload) =>
      sign(
        null,
        Buffer.from(annotationBytes(payload)),
        keys.privateKey,
      ).toString('base64');
    await store.submit(p, signed(p));
    expect(await store.visible(p.logId, 1)).toHaveLength(1);
    const edit = { ...p, body: 'Edited', action: 'edit' as const, sequence: 2 };
    expect(
      await store.submit(edit, 'bad').then(
        () => false,
        () => true,
      ),
    ).toBe(true);
    await store.submit(edit, signed(edit));
    expect((await store.visible(p.logId, 1))[0]?.body).toBe('Edited');
    const report = {
      ...p,
      action: 'report' as const,
      body: 'Fixture report',
      sequence: 3,
    };
    await store.submit(report, signed(report));
    await store.submit(report, signed(report));
    const reports = await pool.query<{ count: number }>(
      'SELECT count(*)::integer count FROM annotation_reports WHERE annotation_id=$1',
      [p.id],
    );
    expect(reports.rows[0]?.count).toBe(1);
    expect(await store.visible(p.logId, 1)).toHaveLength(1);
    const withdraw = { ...edit, action: 'withdraw' as const, sequence: 3 };
    await store.submit(withdraw, signed(withdraw));
    expect(await store.visible(p.logId, 1)).toHaveLength(0);
  },
);
