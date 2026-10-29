import type { APIRoute } from 'astro';
import { logQuote } from '../../../../portfolio/log-quote';
import { renderSocialImage } from '../../../../portfolio/social-image';
export const prerender = false;
export const GET: APIRoute = async ({ params }) => {
  const quote = logQuote(params['id'], params['selection']);
  if (!quote) return new Response('Not found', { status: 404 });
  const image = await renderSocialImage(
    {
      id: `/log/${quote.entry.id}`,
      key: `log-${quote.entry.id}`,
      title: quote.metadata.title,
      description: quote.description,
    },
    0,
    true,
  );
  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
};
