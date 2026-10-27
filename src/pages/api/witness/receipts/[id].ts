import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../../server/http';
import { witnessStore } from '../../../../server/witness/service';
export const GET: APIRoute = async ({ params, request }) => {
  const id = params['id'];
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (
    !id ||
    !/^[a-f0-9-]{36}$/.test(id) ||
    !token ||
    !/^[a-f0-9]{64}$/.test(token)
  )
    return jsonResponse({ error: 'Receipt unavailable' }, 404);
  try {
    const store = witnessStore();
    const receipt = await store.receipt(id, token);
    if (receipt?.batch_id) {
      const result = await store.pool.query<{
        manifest: unknown;
        signature: string;
        receipt: Buffer | null;
        status: string;
      }>(
        'SELECT manifest,signature,receipt,status FROM witness_batches WHERE id=$1',
        [receipt.batch_id],
      );
      const batch = result.rows[0];
      if (!batch) return jsonResponse({ error: 'Evidence unavailable' }, 503);
      return jsonResponse({
        ...receipt,
        batch: {
          manifest: batch.manifest,
          signature: batch.signature,
          proof: batch.receipt?.toString('base64') ?? null,
          status: batch.status,
        },
      });
    }
    return receipt
      ? jsonResponse(receipt)
      : jsonResponse({ error: 'Receipt unavailable' }, 404);
  } catch {
    return jsonResponse({ error: 'Receipt unavailable' }, 503);
  }
};
