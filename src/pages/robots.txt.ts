import type { APIRoute } from 'astro';
import { siteOrigin } from '../portfolio/seo';

export const GET: APIRoute = ({ site }) => {
  const origin = siteOrigin(site);
  // Crawlers must reach checkout HTML to see its noindex directive.
  const body = `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
};
