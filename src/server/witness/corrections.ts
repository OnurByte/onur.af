import { randomUUID, type KeyObject } from 'node:crypto';
import type { Pool } from 'pg';
import { advisoryLock, inTransaction } from '../transaction';
import {
  signCorrection,
  correctionHash,
  type Correction,
} from '../../portfolio/witness/correction';
export async function appendCorrection(
  pool: Pool,
  eventId: string,
  suppressed: boolean,
  reason: string,
  key: KeyObject,
): Promise<Correction> {
  return inTransaction(pool, async (client) => {
    await advisoryLock(client, 'witness:corrections');
    const previous = await client.query<{ record: Correction['record'] }>(
      'SELECT record FROM witness_corrections ORDER BY sequence DESC LIMIT 1',
    );
    const correction = signCorrection(
      {
        id: randomUUID(),
        eventId,
        suppressed,
        reason,
        createdAt: new Date().toISOString(),
        previous: previous.rows[0]
          ? correctionHash(previous.rows[0].record)
          : null,
      },
      key,
    );
    await client.query(
      'INSERT INTO witness_corrections(id,event_id,reason,suppressed,record,signature) VALUES($1,$2,$3,$4,$5,$6)',
      [
        correction.record.id,
        eventId,
        reason,
        suppressed,
        JSON.stringify(correction.record),
        correction.signature,
      ],
    );
    return correction;
  });
}
