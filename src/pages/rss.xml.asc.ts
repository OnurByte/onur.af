import type { APIRoute } from 'astro';
import { getRssPublication } from '../portfolio/rss';

export const GET: APIRoute = async ({ url }) => {
  const { verification } = await getRssPublication(url);
  const signed = verification.status === 'signed';
  return new Response(
    signed
      ? verification.signature
      : 'No verified signature is available for this feed.',
    {
      status: signed ? 200 : verification.status === 'invalid' ? 503 : 404,
      headers: {
        'Content-Type': signed
          ? 'application/pgp-signature; charset=utf-8'
          : 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline; filename="rss.xml.asc"',
        'Cache-Control': 'no-cache, no-transform',
        'X-Robots-Tag': 'noindex',
      },
    },
  );
};
