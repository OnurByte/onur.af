import { required } from '../../../../portfolio/required';
import type { APIRoute } from 'astro';
import { getLogEntryById } from '../../../../portfolio/log';
import { periodDays, parseDateRange } from '../../../../server/witness/http';
import { jsonResponse } from '../../../../server/http';
import { witnessStats } from '../../../../server/witness/service';
export const GET: APIRoute = async ({ params, url }) => {
  const id = params['logId'];
  if (!getLogEntryById(id)) return jsonResponse({ error: 'Unknown Log' }, 404);
  let range;
  try {
    range = parseDateRange(url.searchParams);
  } catch {
    return jsonResponse({ error: 'Invalid date range' }, 400);
  }
  const state = await witnessStats(
    required(id),
    periodDays(url.searchParams.get('period')),
    range,
  );
  return jsonResponse(
    {
      ...state,
      logId: id,
      period: {
        days: periodDays(url.searchParams.get('period')),
        range: range ?? null,
      },
    },
    state.status === 'available' ? 200 : 503,
    state.status === 'available',
  );
};
