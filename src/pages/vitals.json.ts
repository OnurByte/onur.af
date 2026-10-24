import type { APIRoute } from 'astro';
import { vitalSchema } from '../portfolio/vitals';
export const POST: APIRoute = async ({ request, url }) => {
  const headers = { 'Cache-Control': 'no-store' };
  if (process.env['PORTFOLIO_VITALS_ENABLED'] !== '1')
    return new Response(null, { status: 404, headers });
  if (
    request.headers.get('origin') !== url.origin ||
    !request.headers.get('content-type')?.startsWith('application/json')
  )
    return new Response(null, { status: 403, headers });
  if (Number(request.headers.get('content-length')) > 1024)
    return new Response(null, { status: 413, headers });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400, headers });
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 1024) {
        await reader.cancel();
        return new Response(null, { status: 413, headers });
      }
      chunks.push(part.value);
    }
    const body = Buffer.concat(chunks);
    const metric = vitalSchema.parse(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)),
    );
    console.info(JSON.stringify({ kind: 'portfolio-vital', ...metric }));
    return new Response(null, { status: 204, headers });
  } catch {
    return new Response(null, { status: 400, headers });
  }
};
