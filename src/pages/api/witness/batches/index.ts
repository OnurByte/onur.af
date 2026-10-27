import { readBatch } from '../../../../server/witness/worker';
import type { APIRoute } from 'astro';
import { witnessStore } from '../../../../server/witness/service';
import { jsonResponse } from '../../../../server/http';
import type { BatchManifest } from '../../../../portfolio/witness/batch';
export const GET: APIRoute = async ({ url }) => {
  try {
    const rows = await witnessStore().pool.query<{
      manifest: BatchManifest;
      signature: string;
      status: string;
    }>(
      'SELECT manifest,signature,status FROM witness_batches ORDER BY sequence',
    );
    if (url.searchParams.get('format') === 'evidence') {
      const evidence = [];
      for (const row of rows.rows) {
        const batch = await readBatch(witnessStore().pool, row.manifest.id);
        if (!batch) return jsonResponse({ error: 'Incomplete evidence' }, 503);
        evidence.push(batch);
      }
      return jsonResponse(evidence, 200, true);
    }
    return jsonResponse({ checkpoints: rows.rows }, 200, true);
  } catch {
    return jsonResponse({ error: 'Evidence unavailable' }, 503);
  }
};
