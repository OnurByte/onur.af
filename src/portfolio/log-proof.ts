import { createHash } from 'node:crypto';
import ots from 'opentimestamps';
import { z } from 'astro/zod';
import { verifyBytes } from './proofs';
import type { KeyTrust } from './key-history';

export const proofDigest = (bytes: string | Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const size = z
  .number()
  .int()
  .nonnegative()
  .max(512 * 1024 * 1024);
const digestSchema = z.object({ sha256: hash, size }).strict();
export function validProofMediaPath(path: string): boolean {
  try {
    const decoded = decodeURIComponent(path);
    return (
      !/%(?:2f|5c|25)/i.test(path) &&
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !/[\\\u0000-\u0020\u007f?#]/.test(decoded) &&
      !decoded
        .slice(1)
        .split('/')
        .some((part) => !part || part === '.' || part === '..') &&
      new URL(path, 'https://proof.invalid').pathname === path
    );
  } catch {
    return false;
  }
}
const statementSchema = z
  .object({
    format: z.literal('onur.log.proof.v2'),
    id: z.string().regex(/^[a-z]+-[a-z]+-[a-z]+$/),
    version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    publicationSequence: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER),
    signer: z.string().regex(/^(?:[A-F0-9]{40}|[A-F0-9]{64})$/),
    markdown: digestSchema,
    markdownSignature: digestSchema,
    media: z
      .array(
        z
          .object({
            path: z.string().max(4096).refine(validProofMediaPath),
            sha256: hash,
            size,
          })
          .strict(),
      )
      .max(1000),
    externalMedia: z
      .array(
        z
          .url()
          .max(4096)
          .refine((value) => {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password;
          }),
      )
      .max(1000),
  })
  .strict()
  .superRefine((statement, context) => {
    for (const items of [
      statement.media.map((item) => item.path),
      statement.externalMedia,
    ])
      for (let i = 1; i < items.length; i++)
        if (items[i - 1]! >= items[i]!)
          context.addIssue({
            code: 'custom',
            message: 'Media must be unique and sorted by path',
          });
  });
export type LogProofStatement = z.infer<typeof statementSchema>;
const logProofArtifactSchema = z
  .object({
    statement: z.string().min(1).max(2_000_000),
    signature: z
      .string()
      .max(32768)
      .startsWith('-----BEGIN PGP SIGNATURE-----'),
    timestamp: z.string().min(4).max(1_400_000).optional(),
  })
  .strict();
export type LogProofArtifact = z.infer<typeof logProofArtifactSchema>;
export const logProofStoreSchema = z.record(
  z.string().regex(/^[a-z]+-[a-z]+-[a-z]+-v[1-9][0-9]*$/),
  logProofArtifactSchema,
);

/** Frozen v2 serialization: schema field order, two spaces, one final LF; no Unicode normalization. */
export function canonicalLogProof(input: LogProofStatement): string {
  return `${JSON.stringify(statementSchema.parse(input), null, 2)}\n`;
}
export function parseLogProof(bytes: string): LogProofStatement {
  const parsed = statementSchema.parse(JSON.parse(bytes) as unknown);
  if (canonicalLogProof(parsed) !== bytes)
    throw new Error('Noncanonical Log proof statement');
  return parsed;
}
export function proofSignatureTimestamp(signature: string) {
  return ots.DetachedTimestampFile.fromBytes(
    new ots.Ops.OpSHA256(),
    Buffer.from(signature, 'utf8'),
  );
}
export function validateProofTimestamp(
  signature: string,
  proof: string,
): 'pending' | 'unverified' {
  const bytes = Buffer.from(proof, 'base64');
  if (bytes.toString('base64') !== proof)
    throw new Error('Timestamp encoding is not canonical base64');
  const detached = ots.DetachedTimestampFile.deserialize(bytes);
  if (
    detached.fileHashOp._HASHLIB_NAME() !== 'sha256' ||
    Buffer.from(detached.fileDigest()).toString('hex') !==
      proofDigest(signature)
  )
    throw new Error('Timestamp must bind exact proof signature bytes');
  const attestations = [...detached.timestamp.allAttestations().values()];
  if (!attestations.length) throw new Error('Timestamp has no attestations');
  return attestations.every(
    (item) => item instanceof ots.Notary.PendingAttestation,
  )
    ? 'pending'
    : 'unverified';
}
export type LogProofFiles = {
  markdown: Uint8Array;
  markdownSignature: string;
  media: ReadonlyMap<string, Uint8Array>;
};
export async function verifyLogProof(
  input: unknown,
  files: LogProofFiles,
  trust: string | KeyTrust,
  subject?: { id: string; version: number },
) {
  const artifact = logProofArtifactSchema.parse(input);
  const statement = parseLogProof(artifact.statement);
  if (
    subject &&
    (subject.id !== statement.id || subject.version !== statement.version)
  )
    throw new Error('Log proof subject mismatch');
  if (
    proofDigest(files.markdown) !== statement.markdown.sha256 ||
    files.markdown.length !== statement.markdown.size
  )
    throw new Error('Markdown digest or length mismatch');
  if (
    proofDigest(files.markdownSignature) !==
      statement.markdownSignature.sha256 ||
    Buffer.byteLength(files.markdownSignature) !==
      statement.markdownSignature.size
  )
    throw new Error('Markdown signature digest or length mismatch');
  const scopedTrust =
    typeof trust === 'string'
      ? trust
      : { ...trust, sequence: statement.publicationSequence };
  const fingerprint = await verifyBytes(
    artifact.statement,
    artifact.signature,
    scopedTrust,
  );
  if (fingerprint !== statement.signer)
    throw new Error('Proof signer fingerprint mismatch');
  if (
    (await verifyBytes(
      new TextDecoder('utf-8', { fatal: true }).decode(files.markdown),
      files.markdownSignature,
      scopedTrust,
    )) !== fingerprint
  )
    throw new Error('Markdown and proof signers differ');
  if (
    files.media.size !==
    new Set(statement.media.map((item) => item.sha256)).size
  )
    throw new Error('Unexpected original media objects');
  for (const item of statement.media) {
    const bytes = files.media.get(item.sha256);
    if (
      !bytes ||
      bytes.length !== item.size ||
      proofDigest(bytes) !== item.sha256
    )
      throw new Error(`Original media digest mismatch: ${item.path}`);
  }
  return {
    statement,
    fingerprint,
    mediaCount: statement.media.length,
    externalMedia: statement.externalMedia,
    timestamp: artifact.timestamp
      ? validateProofTimestamp(artifact.signature, artifact.timestamp)
      : ('absent' as const),
  };
}
