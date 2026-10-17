import type { APIRoute } from 'astro';
import publicKey from '../../../public/pgp.asc?raw';
import { logEntries, logProofUrl, logRevisionUrl } from '../../portfolio/log';
import {
  getLogSignatures,
  getLogProofs,
  getLogTimestampProofs,
  getSignedIdentityStatement,
} from '../../portfolio/verified-proofs';
import { readKey } from 'openpgp';
import { configuredKeyHistory } from '../../portfolio/key-history';

export const GET: APIRoute = async () => {
  const [identity, signatures, timestamps, portableProofs] = await Promise.all([
    getSignedIdentityStatement(),
    getLogSignatures(),
    getLogTimestampProofs(),
    getLogProofs(),
  ]);
  const key = await readKey({ armoredKey: publicKey });
  const logProofs = logEntries.flatMap((entry) =>
    entry.revisions.flatMap((revision) => {
      const id = `${entry.id}-v${revision.version}`;
      const signature = signatures[id];
      if (!signature) return [];
      const markdownUrl = logRevisionUrl(entry, revision.version);
      const proofUrl = `/proofs/${id}.proof.json`;
      const portableProof = portableProofs[id];
      return [
        {
          id: entry.id,
          revision: revision.version,
          url: logProofUrl(entry, revision.version),
          markdown: markdownUrl,
          signature: `${markdownUrl}.asc`,
          timestamp: timestamps[id] ? `${markdownUrl}.ots` : null,
          portableProof: portableProof
            ? {
                statement: proofUrl,
                signature: `${proofUrl}.asc`,
                timestamp: portableProof.timestamp
                  ? `${proofUrl}.asc.ots`
                  : null,
              }
            : null,
          archive: `/log/${entry.id}/archive.tar`,
        },
      ];
    }),
  );
  return new Response(
    JSON.stringify(
      {
        identity: {
          statementUrl: '/pgp/identity.asc',
          statement: identity.signedMessage,
          signerFingerprint: identity.fingerprint,
          publishedAt: identity.publishedAt,
        },
        key: {
          url: '/pgp.asc',
          fingerprint: key.getFingerprint().toUpperCase(),
        },
        keyHistory: configuredKeyHistory,
        verifier: '/proof-verifier.mjs',
        logProofs,
      },
      null,
      2,
    ),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
};
