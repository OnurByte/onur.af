import type { APIRoute } from 'astro';
import { opmlXml } from '../portfolio/feeds';

export const GET: APIRoute = () =>
  new Response(opmlXml(), {
    headers: {
      'Content-Type': 'text/x-opml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="feeds.opml"',
      'X-Robots-Tag': 'noindex',
    },
  });
