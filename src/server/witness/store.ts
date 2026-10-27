import { required } from '../../portfolio/required';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import {
  eventHash,
  witnessHmac,
  type WitnessEvent,
} from '../../portfolio/witness/protocol';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export interface Visit {
  logId: string;
  revision: number;
  visitorId: string;
  generation: string;
  requestToken: string;
  referrer?: string;
}
export interface DateRange {
  from: string;
  to: string;
}
export interface Stats {
  allTime: number;
  unique: number;
  recorded: number;
  sealed: number;
  verified: number;
  days: {
    day: string;
    count: number;
  }[];
  sources: {
    source: string;
    count: number;
  }[];
  revisions: {
    revision: number;
    count: number;
  }[];
  asOf: string;
  checkpoint: { id: string; createdAt: string; status: string } | null;
}
export class WitnessStore {
  constructor(
    readonly pool: Pool,
    private readonly secret: string,
  ) {}
  async migrate(): Promise<void> {
    await this.pool.query(
      await readFile(new URL('./migrations/001.sql', import.meta.url), 'utf8'),
    );
  }
  async accept(input: Visit): Promise<{
    accepted: boolean;
    eventId?: string;
  }> {
    const alias = witnessHmac(
      this.secret,
      input.logId,
      input.generation,
      input.visitorId,
    );
    const requestHash = hash(input.requestToken);
    const payloadHash = hash(
      JSON.stringify([input.logId, input.revision, input.generation, alias]),
    );
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
        [`witness-request:${requestHash}`],
      );
      // A Log-scoped lock serializes alias changes, acceptance and retries together.
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
        [`witness:${input.logId}`],
      );
      const retry = await client.query<{
        event_id: string;
        payload_hash: string;
      }>(
        'SELECT event_id,payload_hash FROM witness_requests WHERE request_hash=$1 AND expires_at>now()',
        [requestHash],
      );
      if (retry.rows[0]) {
        if (retry.rows[0].payload_hash !== payloadHash)
          throw new Error('Conflicting witness retry');
        await client.query('COMMIT');
        return { accepted: true, eventId: retry.rows[0].event_id };
      }
      const existing = await client.query(
        'SELECT subject_id FROM witness_aliases WHERE log_id=$1 AND fingerprint_generation=$2 AND witness_hmac=$3',
        [input.logId, input.generation, alias],
      );
      if (existing.rowCount) {
        await client.query('COMMIT');
        return { accepted: false };
      }
      const now = new Date();
      const event: WitnessEvent = {
        format: 'onur-witness-event-v1',
        eventId: randomUUID(),
        logId: input.logId,
        revision: input.revision,
        day: now.toISOString().slice(0, 10),
        nonce: randomBytes(32).toString('hex'),
      };
      const commitment = eventHash(event);
      let hostname: string | null = null;
      if (input.referrer) {
        try {
          const url = new URL(input.referrer);
          if (['http:', 'https:'].includes(url.protocol))
            hostname = url.hostname.slice(0, 253);
        } catch {
          /* Unknown stays unknown. */
        }
      }
      const subject = randomUUID();
      await client.query(
        'INSERT INTO witness_subjects(id,log_id,first_seen_at,first_revision,event_id,source_category,referrer_hostname) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          subject,
          input.logId,
          now,
          input.revision,
          event.eventId,
          hostname ? 'referral' : 'direct-unknown',
          hostname,
        ],
      );
      await client.query('INSERT INTO witness_aliases VALUES($1,$2,$3,$4)', [
        input.logId,
        subject,
        input.generation,
        alias,
      ]);
      await client.query(
        'INSERT INTO witness_events(id,record,commitment) VALUES($1,$2,$3)',
        [event.eventId, JSON.stringify(event), commitment],
      );
      await client.query(
        "INSERT INTO witness_requests VALUES($1,$2,$3,now()+interval '24 hours') ON CONFLICT(request_hash) DO UPDATE SET payload_hash=excluded.payload_hash,event_id=excluded.event_id,expires_at=excluded.expires_at WHERE witness_requests.expires_at<=now()",
        [requestHash, payloadHash, event.eventId],
      );
      await client.query('COMMIT');
      return { accepted: true, eventId: event.eventId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  /** Trusted migration only: never expose alias linking as an unauthenticated endpoint. */
  async linkAlias(
    logId: string,
    from: { generation: string; visitorId: string; secret?: string },
    to: { generation: string; visitorId: string },
  ): Promise<void> {
    const oldHash = witnessHmac(
      from.secret ?? this.secret,
      logId,
      from.generation,
      from.visitorId,
    );
    const newHash = witnessHmac(
      this.secret,
      logId,
      to.generation,
      to.visitorId,
    );
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
        [`witness:${logId}`],
      );
      const result = await client.query<{ subject_id: string }>(
        'SELECT subject_id FROM witness_aliases WHERE log_id=$1 AND fingerprint_generation=$2 AND witness_hmac=$3',
        [logId, from.generation, oldHash],
      );
      const source = result.rows[0];
      if (!source) throw new Error('Unknown source alias');
      const target = await client.query<{ subject_id: string }>(
        'SELECT subject_id FROM witness_aliases WHERE log_id=$1 AND fingerprint_generation=$2 AND witness_hmac=$3',
        [logId, to.generation, newHash],
      );
      if (target.rows[0] && target.rows[0].subject_id !== source.subject_id)
        throw new Error(
          'Alias already belongs to another subject; append a correction instead',
        );
      await client.query(
        'INSERT INTO witness_aliases VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [logId, source.subject_id, to.generation, newHash],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async forget(eventId: string, token: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{ id: string; log_id: string }>(
        'SELECT s.id,s.log_id FROM witness_subjects s JOIN witness_requests r ON r.event_id=s.event_id WHERE s.event_id=$1 AND r.request_hash=$2',
        [eventId, hash(token)],
      );
      const subject = result.rows[0];
      if (!subject) {
        await client.query('COMMIT');
        return false;
      }
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
        [`witness:${subject.log_id}`],
      );
      await client.query('DELETE FROM witness_aliases WHERE subject_id=$1', [
        subject.id,
      ]);
      await client.query(
        "UPDATE witness_subjects SET referrer_hostname=NULL,source_category='direct-unknown' WHERE id=$1",
        [subject.id],
      );
      await client.query('DELETE FROM witness_requests WHERE event_id=$1', [
        eventId,
      ]);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async receipt(
    id: string,
    token: string,
  ): Promise<{
    record: WitnessEvent;
    commitment: string;
    batch_id: string | null;
    inclusion: unknown;
  } | null> {
    const result = await this.pool.query<{
      record: WitnessEvent;
      commitment: string;
      batch_id: string | null;
      inclusion: unknown;
    }>(
      'SELECT e.record,e.commitment,e.batch_id,e.inclusion FROM witness_events e JOIN witness_requests r ON r.event_id=e.id WHERE e.id=$1 AND r.request_hash=$2',
      [id, hash(token)],
    );
    return result.rows[0] ?? null;
  }
  async stats(
    logId: string,
    days: number | null,
    range?: DateRange,
  ): Promise<Stats> {
    const today = new Date().toISOString().slice(0, 10);
    const from =
      range?.from ??
      (days === null
        ? null
        : new Date(Date.parse(today) - (days - 1) * 86400000)
            .toISOString()
            .slice(0, 10));
    const to = range?.to ?? today;
    const values = [logId, from, to];
    const effective =
      'NOT coalesce((SELECT c.suppressed FROM witness_corrections c WHERE c.event_id=witness_subjects.event_id ORDER BY c.sequence DESC LIMIT 1),false)';
    const filter =
      "($2::date IS NULL OR first_seen_at >= ($2::date::timestamp AT TIME ZONE 'UTC')) AND first_seen_at < (($3::date+1)::timestamp AT TIME ZONE 'UTC')";
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const result = await client.query<{
        all_time: string;
        recorded: string;
        unique_count: string;
        sealed: string;
        verified: string;
      }>(
        `SELECT count(*) FILTER(WHERE ${effective.replaceAll('witness_subjects.event_id', 's.event_id')}) all_time, count(*) recorded,
       count(*) FILTER(WHERE ${filter.replaceAll('first_seen_at', 's.first_seen_at')} AND ${effective.replaceAll('witness_subjects.event_id', 's.event_id')}) unique_count,
       count(*) FILTER(WHERE e.batch_id IS NOT NULL) sealed,
       count(*) FILTER(WHERE b.status='bitcoin-verified') verified
       FROM witness_subjects s JOIN witness_events e ON e.id=s.event_id LEFT JOIN witness_batches b ON b.id=e.batch_id WHERE s.log_id=$1`,
        values,
      );
      const daily = await client.query<{
        day: string;
        count: number;
      }>(
        `SELECT to_char(first_seen_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS "day",count(*)::integer count FROM witness_subjects WHERE log_id=$1 AND ${filter} AND ${effective} GROUP BY 1 ORDER BY 1`,
        values,
      );
      const sources = await client.query<{
        source: string;
        count: number;
      }>(
        `SELECT coalesce(referrer_hostname,'Direct / unknown') source,count(*)::integer count FROM witness_subjects WHERE log_id=$1 AND ${filter} AND ${effective} GROUP BY 1 ORDER BY count DESC,source`,
        values,
      );
      const revisions = await client.query<{
        revision: number;
        count: number;
      }>(
        `SELECT first_revision revision,count(*)::integer count FROM witness_subjects WHERE log_id=$1 AND ${filter} AND ${effective} GROUP BY 1 ORDER BY 1`,
        values,
      );
      const latest = await client.query<{
        id: string;
        createdAt: string;
        status: string;
      }>(
        `SELECT b.id,b.manifest->>'createdAt' AS "createdAt",b.status FROM witness_batches b WHERE EXISTS(SELECT 1 FROM witness_events e JOIN witness_subjects s ON s.event_id=e.id WHERE e.batch_id=b.id AND s.log_id=$1) ORDER BY b.sequence DESC LIMIT 1`,
        [logId],
      );
      await client.query('COMMIT');
      const row = required(result.rows[0]);
      return {
        allTime: Number(row.all_time),
        unique: Number(row.unique_count),
        recorded: Number(row.recorded),
        sealed: Number(row.sealed),
        verified: Number(row.verified),
        days: daily.rows,
        sources: sources.rows,
        revisions: revisions.rows,
        asOf: new Date().toISOString(),
        checkpoint: latest.rows[0] ?? null,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
