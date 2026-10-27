import { required } from '../../portfolio/required';
import type { Pool } from 'pg';
import { verifyAnnotation } from './signature';
import {
  annotationBytes,
  type AnnotationPayload,
} from '../../portfolio/annotations/protocol';
type AnnotationStatus = 'published' | 'withdrawn';
export class AnnotationStore {
  constructor(readonly pool: Pool) {}
  async migrate(): Promise<void> {
    await this.pool.query(`
 CREATE TABLE IF NOT EXISTS annotations (
 id uuid PRIMARY KEY, log_id text NOT NULL, revision integer NOT NULL,
 revision_hash text NOT NULL, public_key text NOT NULL, sequence integer NOT NULL,
 payload jsonb NOT NULL, signature text NOT NULL, status text NOT NULL CHECK(status IN ('published','withdrawn')),
 updated_at timestamptz NOT NULL DEFAULT now());
 DO $$ BEGIN IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='annotations' AND column_name='pgp_fingerprint') THEN ALTER TABLE annotations ALTER COLUMN pgp_fingerprint DROP NOT NULL; END IF; END $$;
 CREATE TABLE IF NOT EXISTS annotation_history (
 id uuid NOT NULL REFERENCES annotations(id), sequence integer NOT NULL,
 payload jsonb NOT NULL, signature text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id,sequence));
 CREATE TABLE IF NOT EXISTS annotation_reports (
 id uuid PRIMARY KEY, annotation_id uuid NOT NULL REFERENCES annotations(id), reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
 ALTER TABLE annotation_reports ADD COLUMN IF NOT EXISTS payload jsonb;
 ALTER TABLE annotation_reports ADD COLUMN IF NOT EXISTS signature text UNIQUE;
 CREATE TABLE IF NOT EXISTS annotation_request_limits (key text PRIMARY KEY,window_start timestamptz NOT NULL,count integer NOT NULL);
 CREATE TABLE IF NOT EXISTS annotation_limits (
 public_key text PRIMARY KEY, window_start timestamptz NOT NULL,count integer NOT NULL);
 `);
  }
  async submit(payload: AnnotationPayload, signature: string): Promise<void> {
    if (!verifyAnnotation(payload, signature))
      throw new Error('Invalid annotation signature');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
        [`annotation:${payload.id}`],
      );
      const rows = await client.query<{
        public_key: string;
        sequence: number;
        payload: AnnotationPayload;
        status: AnnotationStatus;
      }>(
        'SELECT public_key,sequence,payload,status FROM annotations WHERE id=$1 FOR UPDATE',
        [payload.id],
      );
      const previous = rows.rows[0];
      const limit = await client.query<{
        count: number;
      }>(
        `INSERT INTO annotation_limits VALUES($1,now(),1) ON CONFLICT(public_key) DO UPDATE SET count=CASE WHEN annotation_limits.window_start<now()-interval '1 hour' THEN 1 ELSE annotation_limits.count+1 END,window_start=CASE WHEN annotation_limits.window_start<now()-interval '1 hour' THEN now() ELSE annotation_limits.window_start END RETURNING count`,
        [payload.publicKey],
      );
      if (required(limit.rows[0]).count > 20)
        throw new Error('Annotation rate limit');
      if (payload.action === 'report') {
        if (
          previous?.payload.logId !== payload.logId ||
          previous.payload.revision !== payload.revision ||
          previous.payload.revisionHash !== payload.revisionHash
        )
          throw new Error('Unknown reported annotation');
        await client.query(
          'INSERT INTO annotation_reports(id,annotation_id,reason,payload,signature) VALUES($1,$2,$3,$4,$5) ON CONFLICT(signature) DO NOTHING',
          [
            crypto.randomUUID(),
            payload.id,
            payload.body,
            JSON.stringify(payload),
            signature,
          ],
        );
        await client.query('COMMIT');
        return;
      }
      if (previous) {
        if (
          previous.public_key !== payload.publicKey ||
          previous.sequence + 1 !== payload.sequence ||
          payload.action === 'create' ||
          previous.status === 'withdrawn'
        )
          throw new Error('Unauthorized annotation update');
        const p = previous.payload;
        if (
          p.logId !== payload.logId ||
          p.revision !== payload.revision ||
          p.revisionHash !== payload.revisionHash ||
          annotationBytes({
            ...p,
            body: payload.body,
            action: payload.action,
            sequence: payload.sequence,
          }) !== annotationBytes(payload)
        )
          throw new Error('Annotation target is immutable');
      } else if (payload.action !== 'create' || payload.sequence !== 1)
        throw new Error('Missing annotation');
      await client.query(
        `INSERT INTO annotations(id,log_id,revision,revision_hash,public_key,sequence,payload,signature,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET sequence=excluded.sequence,payload=excluded.payload,signature=excluded.signature,status=excluded.status,updated_at=now()`,
        [
          payload.id,
          payload.logId,
          payload.revision,
          payload.revisionHash,
          payload.publicKey,
          payload.sequence,
          JSON.stringify(payload),
          signature,
          payload.action === 'withdraw' ? 'withdrawn' : 'published',
        ],
      );
      await client.query(
        'INSERT INTO annotation_history(id,sequence,payload,signature) VALUES($1,$2,$3,$4)',
        [payload.id, payload.sequence, JSON.stringify(payload), signature],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async visible(logId: string, revision: number): Promise<AnnotationPayload[]> {
    const rows = await this.pool.query<{
      payload: AnnotationPayload;
    }>(
      "SELECT payload FROM annotations WHERE log_id=$1 AND revision=$2 AND status='published' ORDER BY updated_at LIMIT 200",
      [logId, revision],
    );
    return rows.rows.map((row) => row.payload);
  }
}
