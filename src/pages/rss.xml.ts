import type { APIRoute } from 'astro';
import { getRssPublication } from '../portfolio/rss';

export const GET: APIRoute = async ({ url }) =>
  (await getRssPublication(url)).response;
