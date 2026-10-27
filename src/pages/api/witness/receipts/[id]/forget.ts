import type { APIRoute } from 'astro';
import { witnessStore } from '../../../../../server/witness/service';
import { jsonResponse } from '../../../../../server/http';
export const POST: APIRoute = async ({ params, request, url }) => {
  const id = params['id'];
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (request.headers.get('origin') !== url.origin)
    return jsonResponse({ error: 'Invalid request' }, 403);
  if (
    !id ||
    !/^[a-f0-9-]{36}$/.test(id) ||
    !token ||
    !/^[a-f0-9]{64}$/.test(token)
  )
    return jsonResponse({ error: 'Receipt unavailable' }, 404);
  try {
    return (await witnessStore().forget(id, token))
      ? jsonResponse({
          matchingDataDeleted: true,
          publicEvidenceRetained: true,
        })
      : jsonResponse({ error: 'Receipt unavailable' }, 404);
  } catch {
    return jsonResponse({ error: 'Deletion unavailable' }, 503);
  }
};
