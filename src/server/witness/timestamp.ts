import { createHash } from 'node:crypto';
import ots from 'opentimestamps';
import type { Pool } from 'pg';
import type { BatchManifest } from '../../portfolio/witness/batch';
/** OTS timestamps the 32 raw root bytes, so its digest is SHA256(root bytes). */
export function validateWitnessTimestamp(
  bytes: Uint8Array,
  root: string,
): 'pending' | 'unverified' {
  if (bytes.length > 1024 * 1024 || !/^[a-f0-9]{64}$/.test(root))
    throw new Error('Invalid witness timestamp');
  const detached = ots.DetachedTimestampFile.deserialize(bytes);
  if (
    detached.fileHashOp._HASHLIB_NAME() !== 'sha256' ||
    Buffer.from(detached.fileDigest()).toString('hex') !==
      createHash('sha256').update(Buffer.from(root, 'hex')).digest('hex')
  )
    throw new Error('Witness timestamp digest mismatch');
  const attestations = [...detached.timestamp.allAttestations().values()];
  if (!attestations.length)
    throw new Error('Witness timestamp has no attestations');
  return attestations.every((a) => a instanceof ots.Notary.PendingAttestation)
    ? 'pending'
    : 'unverified';
}
async function bounded<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Witness timestamp timeout'));
        }, 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
/** Network operations are explicit worker commands and never run in acceptance requests. */
export async function processTimestamps(
  pool: Pool,
  command: 'stamp' | 'upgrade' | 'verify',
  calendars: string[],
): Promise<{ processed: number; failed: number }> {
  const client = await pool.connect();
  let processed = 0;
  let failed = 0;
  try {
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtextextended('witness:timestamp-worker',0)) locked",
    );
    if (!lock.rows[0]?.locked)
      throw new Error('Timestamp worker already running');
    const rows = await client.query<{
      id: string;
      manifest: BatchManifest;
      receipt: Buffer | null;
      status: string;
    }>(
      "SELECT id,manifest,receipt,status FROM witness_batches WHERE status<>'bitcoin-verified' ORDER BY sequence",
    );
    for (const row of rows.rows) {
      try {
        if (command === 'stamp' && row.receipt) continue;
        if (command !== 'stamp' && !row.receipt) continue;
        if (row.receipt)
          validateWitnessTimestamp(row.receipt, row.manifest.root);
        const detached = row.receipt
          ? ots.DetachedTimestampFile.deserialize(row.receipt)
          : ots.DetachedTimestampFile.fromBytes(
              new ots.Ops.OpSHA256(),
              Buffer.from(row.manifest.root, 'hex'),
            );
        if (command === 'stamp') {
          if (
            !calendars.length ||
            calendars.some((url) => new URL(url).protocol !== 'https:')
          )
            throw new Error('HTTPS calendars required');
          await bounded(
            ots.stamp(detached, {
              calendars,
              m: Math.min(2, calendars.length),
            }),
          );
        } else if (command === 'upgrade') await bounded(ots.upgrade(detached));
        const receipt = Buffer.from(detached.serializeToBytes());
        const status = validateWitnessTimestamp(receipt, row.manifest.root);
        // Save upgraded proof even when independent Bitcoin verification cannot complete.
        await client.query(
          "UPDATE witness_batches SET receipt=$2,status='pending' WHERE id=$1 AND status<>'bitcoin-verified'",
          [row.id, receipt],
        );
        if (command === 'verify' && status === 'unverified') {
          const result = await bounded(
            ots.verifyTimestamp(detached.timestamp, {
              ignoreBitcoinNode: true,
              timeout: 5000,
            }),
          );
          if (
            !result.bitcoin ||
            !Number.isSafeInteger(result.bitcoin.height) ||
            result.bitcoin.height < 1 ||
            !Number.isSafeInteger(result.bitcoin.timestamp) ||
            result.bitcoin.timestamp < 1
          )
            throw new Error('No verified Bitcoin attestation');
          await client.query(
            "UPDATE witness_batches SET status='bitcoin-verified' WHERE id=$1",
            [row.id],
          );
        }
        processed++;
      } catch {
        failed++;
      }
    }
    return { processed, failed };
  } finally {
    await client.query(
      "SELECT pg_advisory_unlock(hashtextextended('witness:timestamp-worker',0))",
    );
    client.release();
  }
}
