import type { APIRoute } from 'astro';
import { getLogEntryById, revisionMarkdown } from '../../portfolio/log';
import {
  getLogSignatures,
  getLogTimestampProofs,
} from '../../portfolio/verified-proofs';
export const GET: APIRoute = async ({ params }) => {
  const file = params.file ?? '';
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
  if (body === undefined) return new Response(null, { status: 404 });
  return new Response(typeof body === 'string' ? body : Buffer.from(body), {
    headers: {
      'Content-Type': file.endsWith('.ots')
        ? 'application/octet-stream'
        : file.endsWith('.asc')
          ? 'application/pgp-signature'
          : 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file}"`,
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
