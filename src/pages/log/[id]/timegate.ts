import type { APIRoute } from 'astro';
import { getLogEntryById } from '../../../portfolio/log';
import { snapshotsFor, timegateResponse } from '../../../portfolio/memento';
export const prerender = false;
export const GET: APIRoute = ({ params, request }) => {
  const entry = getLogEntryById(params['id']);
  if (!entry) return new Response(null, { status: 404 });
  return timegateResponse(request, entry.id, snapshotsFor(entry.id));
};
export const HEAD = GET;
