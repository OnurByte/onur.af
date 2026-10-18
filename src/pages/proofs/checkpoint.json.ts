import type { APIRoute } from 'astro';
import { getLogPublications } from '../../portfolio/verified-proofs';
import { publicationCheckpoint } from '../../portfolio/publication-checkpoints';
export const GET: APIRoute = async () => {
  const chain = await getLogPublications();
  if (!chain.latest) return new Response(null, { status: 404 });
  return new Response(
    JSON.stringify(publicationCheckpoint(chain), null, 2) + '\n',
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="checkpoint.json"',
        'Cache-Control': 'no-cache, no-transform',
      },
    },
  );
};
