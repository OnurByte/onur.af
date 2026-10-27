import type { APIRoute } from 'astro';
import { readBatch } from '../../../../../server/witness/worker';
import { witnessStore } from '../../../../../server/witness/service';
import { jsonResponse } from '../../../../../server/http';
export const GET: APIRoute = async ({ params }) => {
  const id = params['id'];
  if (!id || !/^[a-f0-9-]{36}$/.test(id))
    return jsonResponse({ error: 'Unknown batch' }, 404);
  try {
    const batch = await readBatch(witnessStore().pool, id);
    return batch
      ? jsonResponse(batch, 200, true)
      : jsonResponse({ error: 'Unknown batch' }, 404);
  } catch {
    return jsonResponse({ error: 'Evidence unavailable' }, 503);
  }
};
