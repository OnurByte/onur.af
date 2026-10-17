import type { APIRoute } from 'astro';
import { getLogEntryById, logProofUrl } from '../../../portfolio/log';

export const GET: APIRoute = ({ params, url }) => {
  const entry = getLogEntryById(params['id']);
  if (!entry) return new Response(null, { status: 404 });
  return Response.redirect(
    new URL(`${logProofUrl(entry)}${url.search}`, url),
    301,
  );
};
