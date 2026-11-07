import type { Pool } from 'pg';
import { inTransaction } from '../transaction';
export async function expirePrivateIdentifiers(
  pool: Pool,
  days: number,
): Promise<{ aliases: number; capabilities: number }> {
  if (!Number.isSafeInteger(days) || days < 1 || days > 36500)
    throw new Error('An explicit retention period in days is required');
  return inTransaction(pool, async (client) => {
    const aliases = await client.query(
      "DELETE FROM witness_aliases a USING witness_subjects s WHERE a.subject_id=s.id AND s.first_seen_at<now()-($1::integer*interval '1 day')",
      [days],
    );
    await client.query(
      "UPDATE witness_subjects SET referrer_hostname=NULL,source_category='direct-unknown' WHERE first_seen_at<now()-($1::integer*interval '1 day')",
      [days],
    );
    const capabilities = await client.query(
      "DELETE FROM witness_requests WHERE expires_at<now()-(($1::integer-1)*interval '1 day')",
      [days],
    );
    await client.query(
      "DELETE FROM witness_limits WHERE window_start<now()-interval '2 hours'",
    );
    return {
      aliases: aliases.rowCount ?? 0,
      capabilities: capabilities.rowCount ?? 0,
    };
  });
}
