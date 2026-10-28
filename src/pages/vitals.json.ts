import { readRequestBody, RequestBodyTooLarge } from '../server/request-body';
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
  try {
    const body = await readRequestBody(request, 1024);
    if (body === null) return new Response(null, { status: 400, headers });
    const metric = vitalSchema.parse(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)),
    );
    console.info(JSON.stringify({ kind: 'portfolio-vital', ...metric }));
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge)
      return new Response(null, { status: 413, headers });
    return new Response(null, { status: 400, headers });
  }
};
