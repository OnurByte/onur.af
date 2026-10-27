import { Pool } from 'pg';
import { WitnessStore, type Stats, type DateRange } from './store';
let store: WitnessStore | undefined;
export function witnessEnabled(): boolean {
  return process.env['WITNESS_ENABLED'] === '1';
}
export function witnessMeasurementReady(): boolean {
  const days = Number(process.env['WITNESS_RETENTION_DAYS']);
  return (
    witnessEnabled() &&
    process.env['WITNESS_POLICY_REVIEWED'] === '1' &&
    Number.isSafeInteger(days) &&
    days > 0 &&
    days <= 36500
  );
}
export function witnessStore(): WitnessStore {
  if (!witnessEnabled()) throw new Error('Witness disabled');
  const url = process.env['WITNESS_DATABASE_URL'];
  const secret = process.env['WITNESS_HMAC_SECRET'];
  if (!url || !secret || Buffer.byteLength(secret) < 32)
    throw new Error('Witness unavailable');
  return (store ??= new WitnessStore(
    new Pool({
      connectionString: url,
      max: 5,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
    }),
    secret,
  ));
}
export type StatsState =
  | { status: 'disabled' }
  | { status: 'unavailable' }
  | { status: 'available'; stats: Stats };
export async function witnessStats(
  logId: string,
  days: number | null,
  range?: DateRange,
): Promise<StatsState> {
  if (!witnessEnabled()) return { status: 'disabled' };
  try {
    return {
      status: 'available',
      stats: await witnessStore().stats(logId, days, range),
    };
  } catch {
    return { status: 'unavailable' };
  }
}
