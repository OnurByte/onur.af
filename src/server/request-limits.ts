import { required } from '../portfolio/required';
import { createHmac } from 'node:crypto';
import type { Pool } from 'pg';
/** Request addresses are never stored. Rotation bounds this abuse-control identifier to one hour. */
export function requestLimitKey(secret: string, address: string): string {
  return createHmac('sha256', secret)
    .update(
      JSON.stringify([
        'witness-rate-v1',
        Math.floor(Date.now() / 3600000),
        address,
      ]),
    )
    .digest('hex');
}
export async function takeRateLimit(
  pool: Pool,
  key: string,
  maximum = 60,
  table: 'witness_limits' | 'annotation_request_limits' = 'witness_limits',
): Promise<boolean> {
  if (!['witness_limits', 'annotation_request_limits'].includes(table))
    throw new Error('Invalid rate limit table');
  const result = await pool.query<{
    count: number;
  }>(
    `INSERT INTO ${table} VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN ${table}.window_start<now()-interval '1 hour' THEN 1 ELSE ${table}.count+1 END,window_start=CASE WHEN ${table}.window_start<now()-interval '1 hour' THEN now() ELSE ${table}.window_start END RETURNING count`,
    [key],
  );
  return required(result.rows[0]).count <= maximum;
}
