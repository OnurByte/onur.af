import { getLogTimestamps } from './log-timestamps';
import publicKey from '../../public/pgp.asc?raw';
import { configuredKeyHistory, loadConfiguredKeyTrust } from './key-history';
import {
  identityProofs,
  identityStatement,
  verifyIdentitySignature,
  verifyIdentityStatement,
} from './proofs';
import artifacts from '../content/log-signatures.json';
import {
  verifyLogSignatures,
  assertAllLogRevisionsSigned,
  revisionPublicationSequences,
} from './log-signatures';
import {
  verifyLogPublications,
  verifyLogPublicationChain,
  type VerifiedLogPublications,
} from './log-publications';
import publicationArtifacts from '../content/log-publications.json' with { type: 'json' };
import { logEntries } from './log';
const keyTrust = loadConfiguredKeyTrust(publicKey, configuredKeyHistory);
let logCache: ReturnType<typeof verifyLogSignatures> | undefined;
export function getLogSignatures() {
  return (logCache ??= keyTrust.then(async (trust) => {
    const publications = await verifyLogPublicationChain(
      publicationArtifacts,
      trust,
    );
    const sequences = revisionPublicationSequences(publications, logEntries);
    const signatures = await verifyLogSignatures(
      logEntries,
      artifacts,
      trust,
      sequences,
    );
    assertAllLogRevisionsSigned(logEntries, signatures);
    return signatures;
  }));
}

let logPublicationCache: Promise<VerifiedLogPublications> | undefined;
export function getLogPublications() {
  return (logPublicationCache ??= Promise.all([
    getLogSignatures(),
    keyTrust,
  ]).then(([signatures, trust]) =>
    verifyLogPublications(logEntries, signatures, publicationArtifacts, trust),
  ));
}

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
/** Build verifies original media; runtime additionally verifies signed statement/publication bindings. */
export async function getLogProofs() {
  await assertPublicationReadable(process.cwd());
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
