import type { APIRoute } from 'astro';
import { getLogEntryById } from '../../../portfolio/log';
import { snapshotsFor, timeMap } from '../../../portfolio/memento';
export const prerender = false;
export const GET: APIRoute = ({ params, request, url }) => {
  const entry = getLogEntryById(params['id']);
  if (!entry) return new Response(null, { status: 404 });
  return new Response(
    request.method === 'HEAD'
      ? null
      : timeMap(entry.id, snapshotsFor(entry.id), url.origin),
    {
      headers: {
        'Content-Type': 'application/link-format; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    },
  );
};
export const HEAD = GET;
