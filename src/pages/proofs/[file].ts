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

type Body = string | Uint8Array | undefined;
interface Resolved {
  body: Body;
  structured: boolean;
}

const base64 = (value: string | undefined): Uint8Array | undefined =>
  value ? Buffer.from(value, 'base64') : undefined;

/** `<id>-v<n>.md`, its detached `.asc` signature, or its `.ots` receipt. */
async function revisionFile(file: string): Promise<Resolved | undefined> {
  const match =
    /^([a-z]+-[a-z]+-[a-z]+)-v([1-9][0-9]*)\.md(\.asc|\.ots)?$/.exec(file);
  if (!match) return undefined;
  const entry = getLogEntryById(match[1]);
  const version = Number(match[2]);
  if (!entry?.revisions.some((revision) => revision.version === version))
    return { body: undefined, structured: false };
  const key = `${entry.id}-v${version}`;
  const body =
    match[3] === '.ots'
      ? (await getLogTimestampProofs())[key]?.proofBytes
      : match[3] === '.asc'
        ? (await getLogSignatures())[key]?.signature
        : revisionMarkdown(entry, version);
  return { body, structured: false };
}

/** `<id>-v<n>.proof.json`, its `.asc` signature, or the `.asc.ots` receipt. */
async function portableProofFile(file: string): Promise<Resolved | undefined> {
  const match =
    /^([a-z]+-[a-z]+-[a-z]+)-v([1-9][0-9]*)\.proof\.json(\.asc(?:\.ots)?)?$/.exec(
      file,
    );
  if (!match) return undefined;
  const artifact = (await getLogProofs())[`${match[1]}-v${match[2]}`];
  if (!artifact) return { body: undefined, structured: true };
  const body =
    match[3] === '.asc.ots'
      ? base64(artifact.timestamp)
      : match[3] === '.asc'
        ? artifact.signature
        : artifact.statement;
  return { body, structured: true };
}

/** `log-publication-v<n>.json`, its signature, or one of its OpenTimestamps receipts. */
async function publicationFile(file: string): Promise<Resolved | undefined> {
  const match =
    /^log-publication-v([1-9][0-9]*)\.json(\.asc(?:\.ots)?|\.ots)?$/.exec(file);
  if (!match) return undefined;
  const publications = await getLogPublications();
  const publication = publications.editions.find(
    (edition) => edition.manifest.sequence === Number(match[1]),
  );
  const suffix = match[2];
  if (publication && (suffix === '.ots' || suffix === '.asc.ots')) {
    const receipt = validateCheckpointReceipts(
      publications,
      checkpointReceipts,
    )[String(publication.manifest.sequence)];
    return {
      body: base64(
        suffix === '.asc.ots' ? receipt?.signatureProof : receipt?.proof,
      ),
      structured: true,
    };
  }
  return {
    body: suffix ? publication?.signature : publication?.bytes,
    structured: true,
  };
}

function contentType(file: string, structured: boolean): string {
  if (file.endsWith('.ots')) return 'application/octet-stream';
  if (file.endsWith('.asc')) return 'application/pgp-signature';
  return structured
    ? 'application/json; charset=utf-8'
    : 'text/plain; charset=utf-8';
}

export const GET: APIRoute = async ({ params }) => {
  const file = params['file'] ?? '';
  const resolved =
    (await revisionFile(file)) ??
    (await portableProofFile(file)) ??
    (await publicationFile(file));
  if (resolved?.body === undefined) return new Response(null, { status: 404 });
  const { body, structured } = resolved;
  return new Response(typeof body === 'string' ? body : Buffer.from(body), {
    headers: {
      'Content-Type': contentType(file, structured),
      'Content-Disposition': `attachment; filename="${file}"`,
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
