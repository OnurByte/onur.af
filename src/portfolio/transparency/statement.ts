import { createHash } from 'node:crypto';
import { readKey } from 'openpgp';
import { z } from 'astro/zod';
import { verifyBytes } from '../proofs';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const fingerprint = z.string().regex(/^(?:[A-F0-9]{40}|[A-F0-9]{64})$/);
const statementSchema = z.strictObject({
  format: z.literal('onur.transparency.v1'),
  origin: z.literal('https://onur.af'),
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  manifestSha256: hash,
  rootFingerprint: fingerprint,
  previousManifestSha256: hash.nullable(),
});
type TransparencyStatement = z.infer<typeof statementSchema>;
export const transparencyDigest = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
export function canonicalStatement(input: unknown): string {
  const p = statementSchema.parse(input);
  return `${JSON.stringify({ format: p.format, origin: p.origin, sequence: p.sequence, manifestSha256: p.manifestSha256, rootFingerprint: p.rootFingerprint, previousManifestSha256: p.previousManifestSha256 }, null, 2)}\n`;
}
export function parseStatement(bytes: string): TransparencyStatement {
  const value = statementSchema.parse(JSON.parse(bytes) as unknown);
  if (canonicalStatement(value) !== bytes)
    throw new Error('Noncanonical transparency statement');
  return value;
}
/** Derived evidence only; the exact signed manifest remains authoritative. */
export function statementForManifest(
  bytes: string,
  rootFingerprint: string,
): TransparencyStatement {
  const manifest = z
    .object({
      sequence: statementSchema.shape.sequence,
      previousSha256: hash.nullable(),
    })
    .parse(JSON.parse(bytes) as unknown);
  return statementSchema.parse({
    format: 'onur.transparency.v1',
    origin: 'https://onur.af',
    sequence: manifest.sequence,
    manifestSha256: transparencyDigest(bytes),
    rootFingerprint,
    previousManifestSha256: manifest.previousSha256,
  });
}
/** Default sigsum-submit hashes the input into message; Sigsum hashes message again. */
export function sigsumChecksum(statement: string): string {
  return transparencyDigest(Buffer.from(transparencyDigest(statement), 'hex'));
}
const authoritySchema = z.strictObject({
  format: z.literal('onur.sigsum-authority.v1'),
  origin: z.literal('https://onur.af'),
  rootFingerprint: fingerprint,
  submitterPublicKey: z
    .string()
    .regex(/^ssh-ed25519 [A-Za-z0-9+/]+={0,2}$/)
    .max(256),
  validFromSequence: statementSchema.shape.sequence,
  validThroughSequence: statementSchema.shape.sequence.nullable(),
});
export function canonicalAuthority(input: unknown): string {
  const a = authoritySchema.parse(input);
  if (
    a.validThroughSequence !== null &&
    a.validThroughSequence < a.validFromSequence
  )
    throw new Error('Invalid authority sequence interval');
  return `${JSON.stringify({ format: a.format, origin: a.origin, rootFingerprint: a.rootFingerprint, submitterPublicKey: a.submitterPublicKey, validFromSequence: a.validFromSequence, validThroughSequence: a.validThroughSequence }, null, 2)}\n`;
}
export async function verifyAuthority(
  bytes: string,
  signature: string,
  root: string,
  trustedFingerprint: string,
  sequence: number,
) {
  const a = authoritySchema.parse(JSON.parse(bytes) as unknown);
  if (canonicalAuthority(a) !== bytes)
    throw new Error('Noncanonical key authority');
  const actual = (await readKey({ armoredKey: root }))
    .getFingerprint()
    .toUpperCase();
  if (
    actual !== trustedFingerprint.toUpperCase() ||
    a.rootFingerprint !== actual
  )
    throw new Error(
      'Authority root differs from independently trusted fingerprint',
    );
  if (
    !Number.isSafeInteger(sequence) ||
    sequence < a.validFromSequence ||
    (a.validThroughSequence !== null && sequence > a.validThroughSequence)
  )
    throw new Error('Submitter authority does not cover publication');
  await verifyBytes(bytes, signature, root);
  return a;
}
