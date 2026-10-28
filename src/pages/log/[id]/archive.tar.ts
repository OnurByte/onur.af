import type { APIRoute } from 'astro';
import { resolve } from 'node:path';
import publicKey from '../../../../public/pgp.asc?raw';
import { getLogEntryById, logEntries } from '../../../portfolio/log';
import { buildLogBundle } from '../../../portfolio/log-bundle';
import { getLogSignatures } from '../../../portfolio/verified-signatures';
import { getLogProofs } from '../../../portfolio/verified-proofs';
import { readLogTimestampStore } from '../../../portfolio/log-timestamps';
import { configuredKeyHistory } from '../../../portfolio/key-history';
import publications from '../../../content/log-publications.json';
import checkpoints from '../../../content/publication-checkpoints.json';
import { assertPublicationReadable } from '../../../portfolio/publication-transaction';
export const prerender = true;
export function getStaticPaths() {
  return logEntries.map((entry) => ({ params: { id: entry.id } }));
}
export const GET: APIRoute = async ({ params }) => {
  const entry = getLogEntryById(params['id']);
  if (!entry) return new Response(null, { status: 404 });
  await assertPublicationReadable(process.cwd());
  const bytes = await buildLogBundle({
    entry,
    signatures: await getLogSignatures(),
    proofs: await getLogProofs(),
    publications,
    checkpoints,
    timestamps: (await readLogTimestampStore()) as Record<
      string,
      { proof: string }
    >,
    root: publicKey,
    history: configuredKeyHistory,
    publicDirectory: resolve('public'),
  });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/x-tar',
      'Content-Disposition': `attachment; filename="${entry.id}.tar"`,
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
