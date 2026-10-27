import type { APIRoute } from 'astro';
import { witnessStore } from '../../../../../server/witness/service';
import { jsonResponse } from '../../../../../server/http';
export const GET: APIRoute = async ({ params }) => {
  const id = params['id'];
  if (!id || !/^[a-f0-9-]{36}$/.test(id))
    return jsonResponse({ error: 'Unknown batch' }, 404);
  try {
    const result = await witnessStore().pool.query<{ receipt: Buffer | null }>(
      'SELECT receipt FROM witness_batches WHERE id=$1',
      [id],
    );
    const receipt = result.rows[0]?.receipt;
    return receipt
      ? new Response(new Uint8Array(receipt), {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'public, max-age=60',
            'Content-Disposition': `attachment; filename="${id}.ots"`,
          },
        })
      : jsonResponse({ error: 'Timestamp pending' }, 404);
  } catch {
    return jsonResponse({ error: 'Evidence unavailable' }, 503);
  }
};
