import type { APIRoute } from 'astro';
import { rssResponse } from '../portfolio/feeds';
import { siteOrigin } from '../portfolio/seo';

export const GET: APIRoute = ({ url }) => rssResponse(siteOrigin(), url);
