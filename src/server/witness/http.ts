function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
import type { Visit } from './store';
export function parseVisit(value: unknown): Visit {
  if (!isRecord(value)) throw new Error('Invalid visit');
  const v = value;
  if (
    v['consent'] !== true ||
    typeof v['logId'] !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{0,127}$/.test(v['logId']) ||
    typeof v['revision'] !== 'number' ||
    !Number.isSafeInteger(v['revision']) ||
    v['revision'] < 1 ||
    typeof v['visitorId'] !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,256}$/.test(v['visitorId']) ||
    v['generation'] !== 'fpjs-5.3.0' ||
    typeof v['requestToken'] !== 'string' ||
    !/^[a-f0-9]{64}$/.test(v['requestToken'])
  )
    throw new Error('Invalid visit');
  return {
    logId: v['logId'],
    revision: v['revision'],
    visitorId: v['visitorId'],
    generation: v['generation'],
    requestToken: v['requestToken'],
    ...(typeof v['referrer'] === 'string' && v['referrer'].length <= 2048
      ? { referrer: v['referrer'] }
      : {}),
  };
}
export function periodDays(value: string | null): number | null {
  return value === 'all'
    ? null
    : ['7', '30', '90'].includes(value ?? '')
      ? Number(value)
      : 30;
}
export function parseDateRange(
  params: URLSearchParams,
): { from: string; to: string } | undefined {
  const from = params.get('from');
  const to = params.get('to');
  if (!from && !to) return undefined;
  if (
    !from ||
    !to ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    new Date(from).toISOString().slice(0, 10) !== from ||
    new Date(to).toISOString().slice(0, 10) !== to ||
    from > to ||
    Date.parse(to) - Date.parse(from) > 3660 * 86400000
  )
    throw new Error('Invalid UTC date range');
  return { from, to };
}
