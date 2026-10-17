import type { APIRoute } from 'astro';
import { searchLogEntries } from '../portfolio/search';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(searchLogEntries), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
