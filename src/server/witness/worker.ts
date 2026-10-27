import { required } from '../../portfolio/required';
import { randomUUID, type KeyObject } from 'node:crypto';
import type { Pool } from 'pg';
import {
  buildBatch,
  manifestHash,
  type BatchManifest,
  type BatchEvidence,
} from '../../portfolio/witness/batch';
import {
  eventHash,
  merkleTree,
  type WitnessEvent,
} from '../../portfolio/witness/protocol';
export async function sealBatch(
  pool: Pool,
  key: KeyObject,
): Promise<BatchEvidence | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('witness:batch-worker',0))",
    );
    const rows = await client.query<{
      record: WitnessEvent;
    }>(
      'SELECT record FROM witness_events WHERE batch_id IS NULL ORDER BY id LIMIT 10000 FOR UPDATE',
    );
    if (!rows.rowCount) {
      await client.query('COMMIT');
      return null;
    }
    const previous = await client.query<{
      manifest: BatchManifest;
    }>('SELECT manifest FROM witness_batches ORDER BY sequence DESC LIMIT 1');
    const evidence = buildBatch(
      rows.rows.map((row) => row.record),
      {
        id: randomUUID(),
        previous: previous.rows[0]
          ? manifestHash(previous.rows[0].manifest)
          : null,
        createdAt: new Date().toISOString(),
      },
      key,
    );
    const tree = merkleTree(evidence.events.map(eventHash));
    await client.query(
      "INSERT INTO witness_batches(id,manifest,signature,status) VALUES($1,$2,$3,'sealed')",
      [
        evidence.manifest.id,
        JSON.stringify(evidence.manifest),
        evidence.signature,
      ],
    );
    for (let i = 0; i < evidence.events.length; i++)
      await client.query(
        'UPDATE witness_events SET batch_id=$1,inclusion=$2 WHERE id=$3 AND batch_id IS NULL',
        [
          evidence.manifest.id,
          JSON.stringify(tree.paths[i]),
          required(evidence.events[i]).eventId,
        ],
      );
    await client.query('COMMIT');
    return evidence;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function readBatch(
  pool: Pool,
  id: string,
): Promise<BatchEvidence | null> {
  const batch = await pool.query<{
    manifest: BatchManifest;
    signature: string;
  }>('SELECT manifest,signature FROM witness_batches WHERE id=$1', [id]);
  if (!batch.rows[0]) return null;
  const events = await pool.query<{
    record: WitnessEvent;
  }>('SELECT record FROM witness_events WHERE batch_id=$1 ORDER BY id', [id]);
  return { ...batch.rows[0], events: events.rows.map((row) => row.record) };
}
