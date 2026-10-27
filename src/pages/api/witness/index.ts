import { required } from '../../../portfolio/required';
import { requestLimitKey, takeRateLimit } from '../../../server/request-limits';
import type { APIRoute } from 'astro';
import { getLogEntryById } from '../../../portfolio/log';
import { parseVisit } from '../../../server/witness/http';
import { jsonResponse } from '../../../server/http';
import {
  witnessEnabled,
  witnessMeasurementReady,
  witnessStore,
} from '../../../server/witness/service';
export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!witnessEnabled())
    return jsonResponse({ error: 'Measurement disabled' }, 503);
  if (!witnessMeasurementReady())
    return jsonResponse({ error: 'Measurement policy not configured' }, 503);
  if (
    request.headers.get('origin') !== url.origin ||
    !request.headers.get('content-type')?.startsWith('application/json')
  )
    return jsonResponse({ error: 'Invalid request' }, 403);
  if (Number(request.headers.get('content-length') ?? 0) > 4096)
    return jsonResponse({ error: 'Request too large' }, 413);
  let input;
  try {
    const reader = request.body?.getReader();
    if (!reader) return jsonResponse({ error: 'Invalid request' }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 4096) {
        await reader.cancel();
        return jsonResponse({ error: 'Request too large' }, 413);
      }
      chunks.push(part.value);
    }
    input = parseVisit(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch {
    return jsonResponse({ error: 'Invalid visit' }, 400);
  }
  const entry = getLogEntryById(input.logId);
  if (!entry?.revisions.some((r) => r.version === input.revision))
    return jsonResponse({ error: 'Unknown Log revision' }, 404);
  if (
    /bot|crawler|spider|preview/i.test(request.headers.get('user-agent') ?? '')
  )
    return jsonResponse({ error: 'Automated measurement declined' }, 403);
  try {
    const store = witnessStore();
    if (
      !(await takeRateLimit(
        store.pool,
        requestLimitKey(
          required(process.env['WITNESS_HMAC_SECRET']),
          clientAddress,
        ),
      ))
    )
      return jsonResponse({ error: 'Measurement rate limit' }, 429);
    return jsonResponse(await store.accept(input));
  } catch {
    return jsonResponse({ error: 'Statistics unavailable' }, 503);
  }
};
