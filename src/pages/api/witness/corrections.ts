import type { APIRoute } from 'astro';
import { witnessStore } from '../../../server/witness/service';
import { jsonResponse } from '../../../server/http';
import type { Correction } from '../../../portfolio/witness/correction';
export const GET: APIRoute = async () => {
  try {
    const result = await witnessStore().pool.query<Correction>(
      'SELECT record,signature FROM witness_corrections ORDER BY sequence',
    );
    return jsonResponse({ corrections: result.rows }, 200, true);
  } catch {
    return jsonResponse({ error: 'Evidence unavailable' }, 503);
  }
};
