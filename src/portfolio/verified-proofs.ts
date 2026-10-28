import { getLogTimestamps } from './log-timestamps';
import { siteKeyTrust as keyTrust } from './site-key-trust';
import { getLogSignatures, getLogPublications } from './verified-signatures';
import {
  identityProofs,
  identityStatement,
  verifyIdentitySignature,
  verifyIdentityStatement,
} from './proofs';

let signedIdentityCache:
  Promise<Awaited<ReturnType<typeof verifyIdentitySignature>>[]> | undefined;
export function getSignedIdentities() {
  return (signedIdentityCache ??= keyTrust.then((trust) =>
    Promise.all(
      identityProofs.map((proof) => verifyIdentitySignature(proof, trust)),
    ),
  ));
}

let identityStatementCache:
  ReturnType<typeof verifyIdentityStatement> | undefined;
export function getSignedIdentityStatement() {
  return (identityStatementCache ??= keyTrust.then((trust) =>
    verifyIdentityStatement(identityStatement, trust),
  ));
}

let timestampCache:
  { expires: number; result: ReturnType<typeof getLogTimestamps> } | undefined;
export function getLogTimestampProofs() {
  if (!timestampCache || timestampCache.expires < Date.now())
    timestampCache = {
      expires: Date.now() + 300000,
      result: keyTrust.then((trust) => getLogTimestamps(trust)),
    };
  return timestampCache.result;
}

import logProofArtifacts from '../content/log-proofs.json' with { type: 'json' };
import {
  logProofStoreSchema,
  parseLogProof,
  proofDigest,
  validateProofTimestamp,
} from './log-proof';
import { verifyBytes } from './proofs';
import { assertPublicationReadable } from './publication-transaction';
let logProofCache: ReturnType<typeof verifyLogProofs> | undefined;
/** Build verifies original media; runtime additionally verifies signed statement/publication bindings. */
export async function getLogProofs() {
  // Publication state can change even when the bundled proof data cannot.
  await assertPublicationReadable(process.cwd());
  return (logProofCache ??= verifyLogProofs().catch((error) => {
    logProofCache = undefined;
    throw error;
  }));
}

async function verifyLogProofs() {
  const store = logProofStoreSchema.parse(logProofArtifacts);
  const [trust, publications, signatures] = await Promise.all([
    keyTrust,
    getLogPublications(),
    getLogSignatures(),
  ]);
  for (const [id, artifact] of Object.entries(store)) {
    const statement = parseLogProof(artifact.statement);
    const original = publications.editions.find((edition) =>
      edition.manifest.entries.some(
        (item) => `${item.id}-v${item.version}` === id,
      ),
    );
    if (
      original &&
      statement.publicationSequence !== original.manifest.sequence
    )
      throw new Error('Proof publication authorization mismatch');
    if (
      id !== `${statement.id}-v${statement.version}` ||
      signatures[id]?.sha256 !== statement.markdown.sha256 ||
      proofDigest(signatures[id]!.signature) !==
        statement.markdownSignature.sha256
    )
      throw new Error('Proof revision binding mismatch');
    const fingerprint = await verifyBytes(
      artifact.statement,
      artifact.signature,
      { ...trust, sequence: statement.publicationSequence },
    );
    if (fingerprint !== statement.signer)
      throw new Error('Proof signer mismatch');
    if (artifact.timestamp)
      validateProofTimestamp(artifact.signature, artifact.timestamp);
  }
  for (const item of publications.latest?.manifest.entries ?? [])
    if (
      item.proofSha256 &&
      proofDigest(store[`${item.id}-v${item.version}`]?.statement ?? '') !==
        item.proofSha256
    )
      throw new Error('Publication-bound proof missing');
  return store;
}
