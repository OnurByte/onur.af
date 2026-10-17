import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readProofMediaFile } from './log-proof-media';
import { readKey } from 'openpgp';
import { z } from 'astro/zod';
import { revisionMarkdown, type LogEntry } from './log';
import { verifyBytes } from './proofs';
import { verifyLogPublicationChain } from './log-publications';
import {
  compareCheckpoint,
  validateCheckpointReceipts,
} from './publication-checkpoints';
import {
  proofDigest,
  logProofStoreSchema,
  parseLogProof,
  verifyLogProof,
  validateProofTimestamp,
} from './log-proof';
import { encodeProofArchive, decodeProofArchive } from './proof-archive';
import { validateKeyHistory, type KeyTrust } from './key-history';

const indexSchema = z
  .object({
    format: z.literal('onur.log.bundle.v1'),
    id: z.string().regex(/^[a-z]+-[a-z]+-[a-z]+$/),
    versions: z.array(z.number().int().positive()).min(1).max(10000),
    files: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  })
  .strict();
export type BundleSources = {
  entry: LogEntry;
  signatures: Record<string, { signature: string }>;
  proofs: unknown;
  publications: unknown;
  checkpoints: unknown;
  timestamps: Record<string, { proof: string }>;
  root: string;
  history: unknown;
  publicDirectory: string;
};
export async function buildLogBundle(input: BundleSources): Promise<Buffer> {
  const files = new Map<string, Uint8Array>();
  const put = (name: string, bytes: string | Uint8Array) =>
    files.set(
      name,
      typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : bytes,
    );
  const proofs = logProofStoreSchema.parse(input.proofs);
  put('keys/root.asc', input.root);
  put('keys/history.json', `${JSON.stringify(input.history, null, 2)}\n`);
  put('publications.json', `${JSON.stringify(input.publications, null, 2)}\n`);
  put('checkpoints.json', `${JSON.stringify(input.checkpoints, null, 2)}\n`);
  for (const revision of input.entry.revisions) {
    const key = `${input.entry.id}-v${revision.version}`;
    const signature = input.signatures[key]?.signature;
    if (!signature) throw new Error(`Missing revision signature: ${key}`);
    put(`revisions/${key}.md`, revisionMarkdown(input.entry, revision.version));
    put(`revisions/${key}.md.asc`, signature);
    if (input.timestamps[key])
      put(
        `revisions/${key}.md.ots`,
        Buffer.from(input.timestamps[key]!.proof, 'base64'),
      );
    const artifact = proofs[key];
    if (artifact) {
      put(`proofs/${key}.json`, artifact.statement);
      put(`proofs/${key}.json.asc`, artifact.signature);
      if (artifact.timestamp)
        put(
          `proofs/${key}.json.asc.ots`,
          Buffer.from(artifact.timestamp, 'base64'),
        );
      for (const item of parseLogProof(artifact.statement).media)
        put(
          `media/${item.sha256}`,
          await readProofMediaFile(
            input.publicDirectory,
            `proof-media/${item.sha256}`,
          ),
        );
    }
  }
  try {
    put(
      'verify.mjs',
      await readFile(join(input.publicDirectory, 'proof-verifier.mjs')),
    );
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error;
  }
  put(
    'README.txt',
    'Portable Log evidence\n\nSupply a fingerprint you already trust to the independent verifier:\n  node verify.mjs archive.tar --fingerprint YOUR_TRUSTED_FINGERPRINT\n\nThis bundle does not establish who owns its included key. Its index hashes detect damage, not authorship. PGP signatures and the signed publication chain authenticate revisions. Legacy revisions may lack signed media coverage. Read each signed proof statement for original media path/hash mappings. WebP variants and external URLs are outside original-media byte coverage.\n\nFor manual inspection, extract only after checking archive paths. Verify Markdown: gpg --verify revisions/ID-vN.md.asc revisions/ID-vN.md\nVerify a v2 statement: gpg --verify proofs/ID-vN.json.asc proofs/ID-vN.json\nOTS for v2 binds the .json.asc file: ots verify proofs/ID-vN.json.asc.ots\nAn offline receipt binding is not Bitcoin confirmation. Old .md.ots receipts cover Markdown only.\n',
  );
  const index = {
    format: 'onur.log.bundle.v1' as const,
    id: input.entry.id,
    versions: input.entry.revisions.map((item) => item.version),
    files: Object.fromEntries(
      [...files].map(([name, bytes]) => [name, proofDigest(bytes)]),
    ),
  };
  put('bundle.json', `${JSON.stringify(index, null, 2)}\n`);
  const bytes = encodeProofArchive(files);
  const fingerprint = (await readKey({ armoredKey: input.root }))
    .getFingerprint()
    .toUpperCase();
  await verifyLogBundle(bytes, fingerprint);
  return bytes;
}
export async function verifyLogBundle(
  bytes: Uint8Array,
  trustedFingerprint: string,
  savedCheckpoint?: unknown,
) {
  if (!/^(?:[A-Fa-f0-9]{40}|[A-Fa-f0-9]{64})$/.test(trustedFingerprint))
    throw new Error('Supply a full independently trusted fingerprint');
  const files = decodeProofArchive(bytes);
  const get = (path: string) => {
    const value = files.get(path);
    if (!value) throw new Error(`Missing bundle file: ${path}`);
    return value;
  };
  const text = (path: string) =>
    new TextDecoder('utf-8', { fatal: true }).decode(get(path));
  const index = indexSchema.parse(JSON.parse(text('bundle.json')) as unknown);
  if (files.size !== Object.keys(index.files).length + 1)
    throw new Error('Unexpected bundle files');
  for (const [path, digest] of Object.entries(index.files))
    if (path === 'bundle.json' || proofDigest(get(path)) !== digest)
      throw new Error('Bundle inventory digest mismatch');
  const root = text('keys/root.asc');
  const fingerprint = (await readKey({ armoredKey: root }))
    .getFingerprint()
    .toUpperCase();
  if (fingerprint !== trustedFingerprint.toUpperCase())
    throw new Error('Bundle root does not match trusted fingerprint');
  const history = await validateKeyHistory(
    root,
    JSON.parse(text('keys/history.json')) as unknown,
  );
  const trust: KeyTrust = { root, history };
  const publications = await verifyLogPublicationChain(
    JSON.parse(text('publications.json')) as unknown,
    trust,
  );
  validateCheckpointReceipts(
    publications,
    JSON.parse(text('checkpoints.json')) as unknown,
  );
  if (savedCheckpoint) {
    const checkpoint = z
      .object({
        format: z.literal(1),
        sequence: z.number().int().positive(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        publisher: z.string().optional(),
        keyHistory: z
          .object({
            sequence: z.number().int().nonnegative(),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict()
          .optional(),
      })
      .strict()
      .parse(savedCheckpoint);
    if (checkpoint.publisher && checkpoint.publisher !== fingerprint)
      throw new Error('Checkpoint publisher mismatch');
    if (checkpoint.keyHistory) {
      const retained = checkpoint.keyHistory;
      const previous = history.transitions[retained.sequence - 1];
      if (
        retained.sequence > history.transitions.length ||
        retained.sha256 !==
          proofDigest(
            retained.sequence === 0 ? fingerprint : JSON.stringify(previous),
          )
      )
        throw new Error('Saved key history checkpoint differs');
    }
    compareCheckpoint(publications, {
      format: 1,
      sequence: checkpoint.sequence,
      sha256: checkpoint.sha256,
    });
  }
  const published =
    publications.latest?.manifest.entries.filter(
      (item) => item.id === index.id,
    ) ?? [];
  if (
    !published.length ||
    published.length !== index.versions.length ||
    index.versions.some(
      (version, i) =>
        version !== i + 1 ||
        !published.some((item) => item.version === version),
    )
  )
    throw new Error('Bundle revisions do not match signed publication history');
  const results = [];
  for (const version of index.versions) {
    const key = `${index.id}-v${version}`;
    const markdown = get(`revisions/${key}.md`),
      signature = text(`revisions/${key}.md.asc`);
    const entry = published.find((item) => item.version === version)!;
    if (proofDigest(markdown) !== entry.sha256)
      throw new Error('Revision differs from signed publication');
    const first = publications.editions.find((edition) =>
      edition.manifest.entries.some(
        (item) =>
          item.id === index.id &&
          item.version === version &&
          item.sha256 === entry.sha256,
      ),
    );
    if (!first) throw new Error('Missing original publication');
    await verifyBytes(
      new TextDecoder('utf-8', { fatal: true }).decode(markdown),
      signature,
      { ...trust, sequence: first.manifest.sequence },
    );
    const bound = (entry as typeof entry & { proofSha256?: string })
      .proofSha256;
    const statementPath = `proofs/${key}.json`;
    if (
      bound &&
      (!files.has(statementPath) || proofDigest(get(statementPath)) !== bound)
    )
      throw new Error('Publication-bound proof missing or changed');
    if (files.has(statementPath)) {
      const statement = text(statementPath);
      const timestamp = files.get(`${statementPath}.asc.ots`);
      const parsed = parseLogProof(statement);
      if (parsed.publicationSequence !== first.manifest.sequence)
        throw new Error('Proof publication authorization mismatch');
      const media = new Map(
        parsed.media.map((item) => [item.sha256, get(`media/${item.sha256}`)]),
      );
      const result = await verifyLogProof(
        {
          statement,
          signature: text(`${statementPath}.asc`),
          ...(timestamp ? { timestamp: timestamp.toString('base64') } : {}),
        },
        { markdown, markdownSignature: signature, media },
        trust,
        { id: index.id, version },
      );
      results.push({
        version,
        coverage: 'text-and-original-media',
        timestamp: result.timestamp,
        externalMedia: result.externalMedia.length,
      });
    } else {
      const receipt = files.get(`revisions/${key}.md.ots`);
      if (receipt)
        validateProofTimestamp(
          new TextDecoder('utf-8', { fatal: true }).decode(markdown),
          receipt.toString('base64'),
        );
      results.push({
        version,
        coverage: 'legacy-text-only',
        timestamp: receipt ? 'legacy-content-only' : 'absent',
        externalMedia: null,
      });
    }
  }
  const latest = publications.latest!;
  return {
    fingerprint,
    id: index.id,
    revisions: results,
    checkpoint: {
      format: 1 as const,
      sequence: latest.manifest.sequence,
      sha256: latest.sha256,
      publisher: fingerprint,
      keyHistory: {
        sequence: history.transitions.length,
        sha256: proofDigest(
          history.transitions.length
            ? JSON.stringify(history.transitions.at(-1))
            : fingerprint,
        ),
      },
    },
    checkpointCompared: !!savedCheckpoint,
    bitcoinConfirmed: false,
  };
}
