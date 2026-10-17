import { revisionMarkdown, logMetadata, type LogEntry } from './log';
import { renderLogContent } from './log-markdown';
import {
  canonicalLogProof,
  logProofStoreSchema,
  parseLogProof,
  proofDigest,
  verifyLogProof,
  type LogProofArtifact,
} from './log-proof';
import {
  freezeProofMedia,
  normalizeProofMediaSource,
  readOriginalMedia,
  readProofMediaFile,
} from './log-proof-media';
import type { KeyTrust } from './key-history';

export async function createLogProofStatement(
  entry: LogEntry,
  version: number,
  signature: string,
  fingerprint: string,
  publicationSequence: number,
  publicDirectory: string,
) {
  const revision = entry.revisions.find((item) => item.version === version);
  if (!revision) throw new Error('Unknown Log revision');
  const cover = logMetadata(entry, version).cover;
  const media = await freezeProofMedia(
    [...renderLogContent(revision.body).images, ...(cover ? [cover.src] : [])],
    publicDirectory,
  );
  const markdown = revisionMarkdown(entry, version);
  return canonicalLogProof({
    format: 'onur.log.proof.v2',
    id: entry.id,
    version,
    publicationSequence,
    signer: fingerprint,
    markdown: {
      sha256: proofDigest(markdown),
      size: Buffer.byteLength(markdown),
    },
    markdownSignature: {
      sha256: proofDigest(signature),
      size: Buffer.byteLength(signature),
    },
    ...media,
  });
}
export async function proofFiles(
  entry: LogEntry,
  version: number,
  artifact: LogProofArtifact,
  signature: string,
  publicDirectory: string,
) {
  const statement = parseLogProof(artifact.statement);
  const media = new Map<string, Uint8Array>();
  for (const item of statement.media)
    media.set(
      item.sha256,
      await readProofMediaFile(publicDirectory, `proof-media/${item.sha256}`),
    );
  return {
    markdown: Buffer.from(revisionMarkdown(entry, version), 'utf8'),
    markdownSignature: signature,
    media,
  };
}
export async function verifyLogProofStore(
  entries: readonly LogEntry[],
  input: unknown,
  signatures: Readonly<Record<string, { signature: string }>>,
  trust: string | KeyTrust,
  publicDirectory: string,
  checkLive = false,
  publicationSequences: Readonly<Record<string, number>> = {},
) {
  const store = logProofStoreSchema.parse(input);
  for (const [id, artifact] of Object.entries(store)) {
    const statement = parseLogProof(artifact.statement);
    if (
      publicationSequences[id] !== undefined &&
      statement.publicationSequence !== publicationSequences[id]
    )
      throw new Error('Proof publication authorization mismatch');
    const entry = entries.find((item) => item.id === statement.id);
    if (
      id !== `${statement.id}-v${statement.version}` ||
      !entry ||
      !signatures[id]
    )
      throw new Error(`Unknown proof subject: ${id}`);
    const revision = entry.revisions.find(
      (item) => item.version === statement.version,
    );
    if (!revision) throw new Error('Unknown proof revision');
    await verifyLogProof(
      artifact,
      await proofFiles(
        entry,
        statement.version,
        artifact,
        signatures[id]!.signature,
        publicDirectory,
      ),
      trust,
      { id: entry.id, version: statement.version },
    );
    const cover = logMetadata(entry, statement.version).cover;
    const sources = [
      ...new Set(
        [
          ...renderLogContent(revision.body).images,
          ...(cover ? [cover.src] : []),
        ].map(normalizeProofMediaSource),
      ),
    ].sort();
    if (
      JSON.stringify(sources.filter((path) => path.startsWith('/'))) !==
        JSON.stringify(statement.media.map((item) => item.path)) ||
      JSON.stringify(sources.filter((path) => !path.startsWith('/'))) !==
        JSON.stringify(statement.externalMedia)
    )
      throw new Error('Proof media scope does not match authored revision');
    if (checkLive && entry.revisions.at(-1)?.version === statement.version)
      for (const item of statement.media)
        if (
          proofDigest(await readOriginalMedia(publicDirectory, item.path)) !==
          item.sha256
        )
          throw new Error(
            `Current original media changed since signing: ${item.path}`,
          );
  }
  return store;
}
