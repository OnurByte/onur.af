import type { APIRoute } from 'astro';
import { siteOrigin, sitemapXml } from '../portfolio/seo';

export const GET: APIRoute = ({ site }) =>
  new Response(sitemapXml(siteOrigin(site)), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
