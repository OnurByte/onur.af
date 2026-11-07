import type { Pool } from 'pg';
import { inTransaction } from '../transaction';
import { randomUUID } from 'node:crypto';
import type {
  MentionTarget,
  MentionValidation,
} from '../../portfolio/inbound-webmention';
export interface MentionJob {
  id: string;
  source: string;
  target: string;
  attempts: number;
  lease: string;
}
export interface VisibleMention {
  source: string;
  target: string;
  kind: MentionTarget['kind'];
  title: string | null;
}
export class WebmentionStore {
  constructor(readonly pool: Pool) {}
  async migrate(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS webmentions (
      id uuid PRIMARY KEY, source text NOT NULL, target text NOT NULL, log_id text NOT NULL,
      kind text NOT NULL CHECK(kind IN ('article','passage')), status text NOT NULL DEFAULT 'queued'
      CHECK(status IN ('queued','fetching','validated','rejected','unreachable','removed')),
      moderation text NOT NULL DEFAULT 'hidden' CHECK(moderation IN ('hidden','visible','blocked')),
      final_url text, title text, attempts integer NOT NULL DEFAULT 0, generation integer NOT NULL DEFAULT 1,
      lease uuid, leased_until timestamptz, next_attempt timestamptz NOT NULL DEFAULT now(),
      checked_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source,target));
      CREATE INDEX IF NOT EXISTS webmentions_queue ON webmentions(next_attempt) WHERE status IN ('queued','unreachable','fetching');
      CREATE INDEX IF NOT EXISTS webmentions_visible ON webmentions(log_id) WHERE status='validated' AND moderation='visible';
      CREATE TABLE IF NOT EXISTS webmention_limits(key text PRIMARY KEY,window_start timestamptz NOT NULL,count integer NOT NULL);
      CREATE TABLE IF NOT EXISTS webmention_blocked_sources(origin text PRIMARY KEY);`);
  }
  async limit(key: string): Promise<boolean> {
    const result = await this.pool.query<{ count: number }>(
      `INSERT INTO webmention_limits VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN webmention_limits.window_start<now()-interval '1 hour' THEN 1 ELSE webmention_limits.count+1 END,window_start=CASE WHEN webmention_limits.window_start<now()-interval '1 hour' THEN now() ELSE webmention_limits.window_start END RETURNING count`,
      [key],
    );
    return (result.rows[0]?.count ?? 61) <= 60;
  }
  async enqueue(source: string, target: MentionTarget): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO webmentions(id,source,target,log_id,kind) SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS(SELECT 1 FROM webmention_blocked_sources WHERE origin=$6)
      ON CONFLICT(source,target) DO UPDATE SET status='queued',attempts=0,generation=webmentions.generation+1,lease=NULL,leased_until=NULL,next_attempt=now(),updated_at=now() WHERE webmentions.moderation!='blocked' AND webmentions.updated_at<now()-interval '1 minute' RETURNING id`,
      [
        randomUUID(),
        source,
        target.url,
        target.logId,
        target.kind,
        new URL(source).origin,
      ],
    );
    // Duplicate notifications within a minute remain successful and do not reset an active lease.
    if (result.rows[0]) return result.rows[0].id;
    const previous = await this.pool.query<{ id: string }>(
      "SELECT id FROM webmentions WHERE source=$1 AND target=$2 AND moderation!='blocked'",
      [source, target.url],
    );
    if (!previous.rows[0]) throw new Error('Source is blocked');
    return previous.rows[0].id;
  }
  async claim(): Promise<MentionJob | null> {
    // A worker that died on the final attempt must not leave the row fetching forever.
    await this.pool.query(
      "UPDATE webmentions SET status='unreachable',lease=NULL,leased_until=NULL,updated_at=now() WHERE status='fetching' AND leased_until<now() AND attempts>=5",
    );
    const lease = randomUUID();
    const result = await this.pool.query<{
      id: string;
      source: string;
      target: string;
      attempts: number;
    }>(
      `UPDATE webmentions SET status='fetching',lease=$1,leased_until=now()+interval '2 minutes',attempts=attempts+1 WHERE id=(SELECT id FROM webmentions WHERE moderation!='blocked' AND attempts<5 AND next_attempt<=now() AND (status IN ('queued','unreachable') OR (status='fetching' AND leased_until<now())) ORDER BY next_attempt FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id,source,target,attempts`,
      [lease],
    );
    return result.rows[0] ? { ...result.rows[0], lease } : null;
  }
  async finish(job: MentionJob, result: MentionValidation): Promise<void> {
    await this.pool.query(
      `UPDATE webmentions SET status=$3,final_url=$4,title=$5,checked_at=now(),updated_at=now(),lease=NULL,leased_until=NULL,next_attempt=now()+($6*interval '1 minute') WHERE id=$1 AND lease=$2`,
      [
        job.id,
        job.lease,
        result.status,
        result.finalUrl ?? null,
        result.title ?? null,
        2 ** job.attempts,
      ],
    );
  }
  async revalidate(): Promise<void> {
    await this.pool.query(
      "UPDATE webmentions SET status='queued',attempts=0,lease=NULL,leased_until=NULL,next_attempt=now() WHERE moderation!='blocked' AND status!='fetching'",
    );
  }
  async moderate(
    id: string,
    visibility: 'hidden' | 'visible' | 'blocked',
  ): Promise<void> {
    await this.pool.query('UPDATE webmentions SET moderation=$2 WHERE id=$1', [
      id,
      visibility,
    ]);
  }
  async block(origin: string): Promise<void> {
    await inTransaction(this.pool, async (client) => {
      await client.query(
        'INSERT INTO webmention_blocked_sources VALUES($1) ON CONFLICT DO NOTHING',
        [origin],
      );
      await client.query(
        "UPDATE webmentions SET moderation='blocked' WHERE source=$1 OR left(source,length($1)+1)=$2",
        [origin, `${origin}/`],
      );
    });
  }
  async visible(logId: string): Promise<VisibleMention[]> {
    const result = await this.pool.query<VisibleMention>(
      "SELECT source,target,kind,title FROM webmentions WHERE log_id=$1 AND status='validated' AND moderation='visible' ORDER BY checked_at DESC LIMIT 100",
      [logId],
    );
    return result.rows;
  }
}
