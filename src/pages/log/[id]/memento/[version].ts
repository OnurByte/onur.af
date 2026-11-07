import type { APIRoute } from 'astro';
import { getLogEntryById } from '../../../../portfolio/log';
import { snapshotsFor, mementoResponse } from '../../../../portfolio/memento';
export const prerender = false;
export const GET: APIRoute = ({ params, request, url }) => {
  const entry = getLogEntryById(params['id']);
  if (!entry || !/^v[1-9][0-9]*$/.test(params['version'] ?? ''))
    return new Response(null, { status: 404 });
  const snapshot = snapshotsFor(entry.id).find(
    (s) => `v${String(s.version)}` === params['version'],
  );
  if (!snapshot) return new Response(null, { status: 404 });
  return mementoResponse(request, snapshot, url.origin);
};
export const HEAD = GET;
