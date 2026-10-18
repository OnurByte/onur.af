import { createHash } from 'node:crypto';
import { createMessage, enums, readKey, readSignature, verify } from 'openpgp';
import { z } from 'astro/zod';
import configuredHistory from '../content/key-history.json' with { type: 'json' };

const fingerprintSchema = z.string().regex(/^[A-F0-9]{40,64}$/);
const transitionBodySchema = z
  .object({
    domain: z.literal('onurbyte-log-key-transition-v1'),
    format: z.literal(1),
    sequence: z.number().int().positive(),
    previousSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    fromFingerprint: fingerprintSchema,
    toFingerprint: fingerprintSchema,
    effectivePublication: z.number().int().positive(),
    certificate: z
      .string()
      .max(65536)
      .startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'),
  })
  .strict();
const transitionSchema = transitionBodySchema
  .extend({
    fromSignature: z
      .string()
      .max(32768)
      .startsWith('-----BEGIN PGP SIGNATURE-----'),
    toSignature: z
      .string()
      .max(32768)
      .startsWith('-----BEGIN PGP SIGNATURE-----'),
  })
  .strict();
const historySchema = z
  .object({ transitions: z.array(transitionSchema).max(1000) })
  .strict();

export type KeyTrust = {
  /** The reader-pinned root certificate. It is never sourced from history. */
  root: string;
  /** Transition history supplied separately and validated from the pinned root. */
  history?: unknown;
  /** Publication sequence whose signer is being checked. Omit only for root-only use. */
  sequence?: number;
};
export type KeyHistory = z.infer<typeof historySchema>;
export type KeyTransition = z.infer<typeof transitionSchema>;
export const configuredKeyHistory: KeyHistory =
  historySchema.parse(configuredHistory);

const sha256 = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex');
const fp = async (armored: string) =>
  (await readKey({ armoredKey: armored })).getFingerprint().toUpperCase();

/** The one byte representation covered by both signatures in a transition. */
export function canonicalKeyTransition(input: unknown): string {
  const candidate = input as Record<string, unknown>;
  const {
    fromSignature: _fromSignature,
    toSignature: _toSignature,
    ...payload
  } = candidate;
  const value = transitionBodySchema.parse(payload);
  return `${JSON.stringify(value, null, 2)}\n`;
}

function transitionDigest(input: unknown): string {
  const value = transitionSchema.parse(input);
  return sha256(`${JSON.stringify(value, null, 2)}\n`);
}

async function verifyTransitionSignature(
  bytes: string,
  signature: string,
  certificate: string,
): Promise<void> {
  const key = await readKey({ armoredKey: certificate });
  const detached = await readSignature({ armoredSignature: signature });
  if (
    detached.packets.length !== 1 ||
    detached.packets.some(
      (packet) => packet.signatureType !== enums.signature.binary,
    )
  )
    throw new Error('Key transition requires one binary detached signature');
  const result = await verify({
    message: await createMessage({ binary: new TextEncoder().encode(bytes) }),
    signature: detached,
    verificationKeys: key,
    format: 'binary',
  });
  if (result.signatures.length !== 1)
    throw new Error('Expected one transition signature');
  await result.signatures[0]!.verified;
}

/** Validate a complete dual-signed chain rooted in a reader-pinned certificate. */
export async function validateKeyHistory(
  root: string,
  input: unknown,
): Promise<KeyHistory> {
  const history = historySchema.parse(input);
  const rootFingerprint = await fp(root);
  let priorFingerprint = rootFingerprint;
  let priorCertificate = root;
  let priorDigest: string | null = null;
  let previousEffective = 0;
  for (const [index, transition] of history.transitions.entries()) {
    const { fromSignature, toSignature, ...payload } = transition;
    const body = transitionBodySchema.parse(payload);
    const id = `key transition ${index + 1}`;
    if (
      body.sequence !== index + 1 ||
      body.previousSha256 !== priorDigest ||
      body.fromFingerprint !== priorFingerprint ||
      body.effectivePublication <= previousEffective
    )
      throw new Error(`Nonmonotonic ${id}`);
    const nextFingerprint = await fp(body.certificate);
    if (
      body.toFingerprint !== nextFingerprint ||
      body.toFingerprint === priorFingerprint
    )
      throw new Error(`Certificate mismatch in ${id}`);
    const bytes = canonicalKeyTransition(body);
    await verifyTransitionSignature(bytes, fromSignature, priorCertificate);
    await verifyTransitionSignature(bytes, toSignature, body.certificate);
    priorDigest = transitionDigest(transition);
    priorFingerprint = nextFingerprint;
    priorCertificate = body.certificate;
    previousEffective = body.effectivePublication;
  }
  return history;
}

/** Resolve a certificate only when the supplied sequence falls in its authorized interval. */
export async function resolveTrustedCertificate(
  trust: KeyTrust,
): Promise<{ certificate: string; fingerprint: string }> {
  const rootFingerprint = await fp(trust.root);
  if (
    trust.sequence !== undefined &&
    (!Number.isSafeInteger(trust.sequence) || trust.sequence < 1)
  )
    throw new Error(
      'Key authorization requires a positive publication sequence',
    );
  const history = await validateKeyHistory(
    trust.root,
    trust.history ?? { transitions: [] },
  );
  if (!history.transitions.length) {
    if (trust.sequence !== undefined)
      return { certificate: trust.root, fingerprint: rootFingerprint };
    return { certificate: trust.root, fingerprint: rootFingerprint };
  }
  if (trust.sequence === undefined)
    throw new Error(
      'Publication sequence is required when key history contains transitions',
    );
  let certificate = trust.root;
  let fingerprint = rootFingerprint;
  for (const transition of history.transitions) {
    if (trust.sequence < transition.effectivePublication) break;
    certificate = transition.certificate;
    fingerprint = transition.toFingerprint;
  }
  return { certificate, fingerprint };
}

/** Validate configured history, then explicitly select the pinned root for unversioned legacy artifacts. */
export async function resolveLegacyRootCertificate(
  trust: string | KeyTrust,
): Promise<string> {
  if (typeof trust === 'string') return trust;
  await validateKeyHistory(trust.root, trust.history ?? { transitions: [] });
  return trust.root;
}

/** Default site history is an empty chain: the pinned public certificate remains the sole key. */
export async function loadConfiguredKeyTrust(
  root: string,
  history: unknown,
): Promise<KeyTrust> {
  const validated = await validateKeyHistory(root, history);
  return { root, history: validated };
}
