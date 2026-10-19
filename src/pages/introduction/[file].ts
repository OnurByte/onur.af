import type { APIRoute } from 'astro';
import { introductionEntry } from '../../portfolio/introduction';
import { logRevisionUrl } from '../../portfolio/log';

export const GET: APIRoute = ({ params, redirect }) => {
  const file = params['file'];
  if (file !== 'statement.txt' && file !== 'statement.txt.asc')
    return new Response('Not found', { status: 404 });
  const version = introductionEntry.revisions.at(-1)!.version;
  return redirect(
    logRevisionUrl(introductionEntry, version) +
      (file.endsWith('.asc') ? '.asc' : ''),
    308,
  );
};
