import type { Pool, PoolClient } from 'pg';

/** Runs `work` in one transaction on a dedicated connection; throwing rolls back. */
export async function inTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
  begin = 'BEGIN',
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(begin);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Takes a transaction-scoped advisory lock named by `key`. */
export const advisoryLock = (client: PoolClient, key: string) =>
  client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key]);
