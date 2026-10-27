import { eventHash } from '../src/portfolio/witness/protocol';
import { expirePrivateIdentifiers } from '../src/server/witness/retention';
import { appendCorrection } from '../src/server/witness/corrections';
import {
  auditCorrections,
  correctionSchema,
} from '../src/portfolio/witness/correction';
import { readFile, writeFile } from 'node:fs/promises';
import {
  aggregateSnapshotSchema,
  auditAggregate,
} from '../src/portfolio/witness/aggregate';
import { parseWitnessTrust } from '../src/portfolio/witness/keys';
import {
  createPrivateKey,
  createPublicKey,
  createHash,
  type KeyObject,
} from 'node:crypto';
import { Pool } from 'pg';
import { WitnessStore } from '../src/server/witness/store';
import { sealBatch, readBatch } from '../src/server/witness/worker';
import { processTimestamps } from '../src/server/witness/timestamp';
import { z } from 'astro/zod';
import {
  auditBatch,
  batchEvidenceSchema,
  type BatchEvidence,
} from '../src/portfolio/witness/batch';

async function signingKey(): Promise<KeyObject> {
  const privatePath = process.env['WITNESS_SIGNING_KEY_FILE'];
  const historyPath = process.env['WITNESS_PUBLIC_KEY_HISTORY_FILE'];
  if (!privatePath || !historyPath)
    throw new Error(
      'Separate witness signing key and public key history required',
    );
  const key = createPrivateKey(await readFile(privatePath, 'utf8'));
  const id = createHash('sha256')
    .update(createPublicKey(key).export({ type: 'spki', format: 'der' }))
    .digest('hex');
  parseWitnessTrust(await readFile(historyPath, 'utf8'))(
    id,
    new Date().toISOString(),
  );
  return key;
}

const [command, arg, output, ...rest] = process.argv.slice(2);
if (command === 'audit') {
  if (!arg || !output)
    throw new Error('Usage: witness audit evidence.json public-key.pem');
  const records = z
    .array(batchEvidenceSchema)
    .parse(JSON.parse(await readFile(arg, 'utf8')));
  const key = parseWitnessTrust(await readFile(output, 'utf8'));
  let previous: string | null = null;
  let total = 0;
  const ids = new Set<string>();
  for (const record of records) {
    const result = auditBatch(
      record,
      key(record.manifest.keyId, record.manifest.createdAt),
      previous,
    );
    for (const event of record.events) {
      if (ids.has(event.eventId))
        throw new Error('Event repeated across batches');
      ids.add(event.eventId);
    }
    previous = result.hash;
    total += result.total;
  }
  const corrections = rest[0]
    ? z
        .object({ corrections: z.array(correctionSchema) })
        .parse(JSON.parse(await readFile(rest[0], 'utf8'))).corrections
    : [];
  const corrected = auditCorrections(corrections, key, ids);
  const aggregate = rest[1]
    ? auditAggregate(
        records.flatMap((record) => record.events),
        corrected.suppressed,
        aggregateSnapshotSchema.parse(
          JSON.parse(await readFile(rest[1], 'utf8')),
        ),
      )
    : null;
  console.log(
    JSON.stringify({
      batches: records.length,
      events: total,
      adjustedEvents: total - corrected.suppressed.size,
      correctionsIncluded: Boolean(rest[0]),
      correctionCheckpoint: corrected.checkpoint,
      checkpoint: previous,
      bitcoinVerified: false,
      aggregate,
    }),
  );
} else {
  const url = process.env['WITNESS_DATABASE_URL'];
  if (!url) throw new Error('WITNESS_DATABASE_URL required');
  const pool = new Pool({ connectionString: url, max: 2 });
  try {
    if (command === 'migrate') {
      await new WitnessStore(
        pool,
        'unused-migration-secret'.padEnd(32, '-'),
      ).migrate();
    } else if (command === 'seal') {
      const evidence = await sealBatch(pool, await signingKey());
      console.log(
        evidence
          ? JSON.stringify({
              batch: evidence.manifest.id,
              count: evidence.manifest.count,
            })
          : 'No pending events',
      );
    } else if (
      command === 'stamp' ||
      command === 'upgrade' ||
      command === 'verify'
    ) {
      const result = await processTimestamps(
        pool,
        command,
        (process.env['WITNESS_OTS_CALENDARS'] ?? '').split(',').filter(Boolean),
      );
      console.log(JSON.stringify(result));
      if (result.failed) process.exitCode = 1;
    } else if (command === 'retain') {
      console.log(
        JSON.stringify(
          await expirePrivateIdentifiers(
            pool,
            Number(arg ?? process.env['WITNESS_RETENTION_DAYS']),
          ),
        ),
      );
    } else if (command === 'correct') {
      if (
        !arg ||
        !['suppress', 'restore'].includes(output ?? '') ||
        !rest.length
      )
        throw new Error('Usage: correct EVENT_ID suppress|restore REASON');
      const correction = await appendCorrection(
        pool,
        arg,
        output === 'suppress',
        rest.join(' '),
        await signingKey(),
      );
      console.log(JSON.stringify({ correction: correction.record.id }));
    } else if (command === 'export') {
      if (!arg) throw new Error('Export destination required');
      const rows = await pool.query<{ id: string }>(
        'SELECT id FROM witness_batches ORDER BY sequence',
      );
      const batches: BatchEvidence[] = [];
      for (const row of rows.rows) {
        const evidence = await readBatch(pool, row.id);
        if (!evidence) throw new Error('Missing batch');
        batches.push(evidence);
      }
      const csv =
        'event_id,log_id,revision,day,nonce,commitment,batch_id\n' +
        batches
          .flatMap((batch) =>
            batch.events.map((event) =>
              [
                event.eventId,
                event.logId,
                String(event.revision),
                event.day,
                event.nonce,
                eventHash(event),
                batch.manifest.id,
              ].join(','),
            ),
          )
          .join('\n') +
        '\n';
      await writeFile(
        arg,
        arg.endsWith('.csv') ? csv : JSON.stringify(batches, null, 2) + '\n',
        { flag: 'wx' },
      );
    } else
      throw new Error(
        'Commands: migrate, seal, stamp, upgrade, verify, export, audit',
      );
  } finally {
    await pool.end();
  }
}
