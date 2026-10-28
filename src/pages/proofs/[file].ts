import checkpointReceipts from '../../content/publication-checkpoints.json';
import { validateCheckpointReceipts } from '../../portfolio/publication-checkpoints';
import type { APIRoute } from 'astro';
import { getLogEntryById, revisionMarkdown } from '../../portfolio/log';
import {
  getLogSignatures,
  getLogPublications,
} from '../../portfolio/verified-signatures';
import {
  getLogTimestampProofs,
  getLogProofs,
} from '../../portfolio/verified-proofs';
export const GET: APIRoute = async ({ params }) => {
  const file = params['file'] ?? '';
  let body: string | Uint8Array | undefined;
  const match = file.match(
    /^([a-z]+-[a-z]+-[a-z]+)-v([1-9][0-9]*)\.md(\.asc|\.ots)?$/,
  );
  if (match) {
    const entry = getLogEntryById(match[1]);
    const version = Number(match[2]);
    if (entry?.revisions.some((revision) => revision.version === version)) {
      const key = `${entry.id}-v${version}`;
      body =
        match[3] === '.ots'
          ? (await getLogTimestampProofs())[key]?.proofBytes
          : match[3] === '.asc'
            ? (await getLogSignatures())[key]?.signature
            : revisionMarkdown(entry, version);
    }
  }
  const proofMatch = file.match(
    /^([a-z]+-[a-z]+-[a-z]+)-v([1-9][0-9]*)\.proof\.json(\.asc(?:\.ots)?)?$/,
  );
  if (proofMatch) {
    const artifact = (await getLogProofs())[
      `${proofMatch[1]}-v${proofMatch[2]}`
    ];
    if (artifact)
      body =
        proofMatch[3] === '.asc.ots'
          ? artifact.timestamp
            ? Buffer.from(artifact.timestamp, 'base64')
            : undefined
          : proofMatch[3] === '.asc'
            ? artifact.signature
            : artifact.statement;
  }
  const publicationMatch = file.match(
    /^log-publication-v([1-9][0-9]*)\.json(\.asc(?:\.ots)?|\.ots)?$/,
  );
  if (publicationMatch) {
    const publication = (await getLogPublications()).editions.find(
      (edition) => edition.manifest.sequence === Number(publicationMatch[1]),
    );
    if (
      ['.ots', '.asc.ots'].includes(publicationMatch[2] ?? '') &&
      publication
    ) {
      const store = validateCheckpointReceipts(
        await getLogPublications(),
        checkpointReceipts,
      );
      const receipt = store[String(publication.manifest.sequence)];
      const proof =
        publicationMatch[2] === '.asc.ots'
          ? receipt?.signatureProof
          : receipt?.proof;
      body = proof ? Buffer.from(proof, 'base64') : undefined;
    } else
      body = publicationMatch[2] ? publication?.signature : publication?.bytes;
  }
  if (body === undefined) return new Response(null, { status: 404 });
  return new Response(typeof body === 'string' ? body : Buffer.from(body), {
    headers: {
      'Content-Type': file.endsWith('.ots')
        ? 'application/octet-stream'
        : file.endsWith('.asc')
          ? 'application/pgp-signature'
          : publicationMatch || proofMatch
            ? 'application/json; charset=utf-8'
            : 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file}"`,
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
