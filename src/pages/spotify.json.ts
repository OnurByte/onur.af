import type { APIRoute } from 'astro';
import { spotifySource } from '../content/home-embeds';
import { loadEmbeds } from '../portfolio/embed-sources';

export const GET: APIRoute = async () => {
  const [embed] = await loadEmbeds([spotifySource], { timeoutMs: 6000 });
  return Response.json(embed, { headers: { 'Cache-Control': 'no-store' } });
};
