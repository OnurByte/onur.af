import type { APIRoute } from 'astro';
import { oembedResponse } from '../portfolio/oembed';
import { siteOrigin } from '../portfolio/seo';

export const GET: APIRoute = ({ url }) => oembedResponse(siteOrigin(), url);
