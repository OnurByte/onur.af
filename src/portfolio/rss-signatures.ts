import { createHash } from 'node:crypto';
import { createMessage, enums, readKey, readSignature, verify } from 'openpgp';
import { z } from 'astro/zod';
import { validSiteUrl } from './seo';
import {
  resolveLegacyRootCertificate,
  resolveTrustedCertificate,
  type KeyTrust,
} from './key-history';
import { verifyBytes } from './proofs';

const legacyRssSignatureSchema = z
  .object({
    version: z.literal(1),
    origin: z
      .string()
      .refine(
        (value) => validSiteUrl(value) === value,
        'Use a canonical public origin',
      ),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    signature: z
      .string()
      .max(32768)
      .startsWith('-----BEGIN PGP SIGNATURE-----'),
  })
  .strict();
const rssAuthorizationBodySchema = z
  .object({
    domain: z.literal('onurbyte-rss-signature-authorization-v1'),
    publicationSequence: z.number().int().positive(),
    fingerprint: z.string().regex(/^[A-F0-9]{40,64}$/),
    xmlSha256: z.string().regex(/^[a-f0-9]{64}$/),
    signatureSha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const versionedRssSignatureSchema = z
  .object({
    version: z.literal(2),
    origin: z
      .string()
      .refine(
        (value) => validSiteUrl(value) === value,
        'Use a canonical public origin',
      ),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    signature: z
      .string()
      .max(32768)
      .startsWith('-----BEGIN PGP SIGNATURE-----'),
    authorization: rssAuthorizationBodySchema
      .extend({
        signature: z
          .string()
          .max(32768)
          .startsWith('-----BEGIN PGP SIGNATURE-----'),
      })
      .strict(),
  })
  .strict();
export const rssSignatureSchema = z.union([
  legacyRssSignatureSchema,
  versionedRssSignatureSchema,
]);
export function canonicalRssAuthorization(input: unknown): string {
  const candidate = input as Record<string, unknown>;
  const { signature: _signature, ...payload } = candidate;
  const body = rssAuthorizationBodySchema.parse(payload);
  return `${JSON.stringify(body, null, 2)}\n`;
}
export type VerifiedRssSignature =
  | { status: 'unsigned' }
  | {
      status: 'signed';
      signature: string;
      fingerprint: string;
      origin: string;
      publicationSequence?: number;
    };
export const rssDigest = (xml: string): string =>
  createHash('sha256').update(xml, 'utf8').digest('hex');

export async function verifyRssSignature(
  xml: string,
  input: unknown,
  publicKey: string | KeyTrust,
): Promise<VerifiedRssSignature> {
  if (input === null) return { status: 'unsigned' };
  const artifact = rssSignatureSchema.parse(input);
  if (rssDigest(xml) !== artifact.sha256)
    throw new Error('RSS changed since signing; sign it again');
  let certificate: string;
  let publicationSequence: number | undefined;
  if (artifact.version === 2) {
    const authorization = artifact.authorization;
    if (
      authorization.xmlSha256 !== artifact.sha256 ||
      authorization.signatureSha256 !== rssDigest(artifact.signature)
    )
      throw new Error(
        'RSS authorization does not bind its exact signature bytes',
      );
    const body = canonicalRssAuthorization(authorization);
    const fingerprint = await verifyBytes(
      body,
      authorization.signature,
      typeof publicKey === 'string'
        ? publicKey
        : { ...publicKey, sequence: authorization.publicationSequence },
    );
    if (fingerprint !== authorization.fingerprint)
      throw new Error('RSS authorization signer fingerprint mismatch');
    publicationSequence = authorization.publicationSequence;
    certificate =
      typeof publicKey === 'string'
        ? publicKey
        : (
            await resolveTrustedCertificate({
              ...publicKey,
              sequence: publicationSequence,
            })
          ).certificate;
  } else {
    certificate = await resolveLegacyRootCertificate(publicKey);
  }
  const key = await readKey({
    armoredKey: certificate,
  });
  const detached = await readSignature({
    armoredSignature: artifact.signature,
  });
  if (
    detached.packets.length !== 1 ||
    detached.packets.some(
      (packet) => packet.signatureType !== enums.signature.binary,
    )
  ) {
    throw new Error(
      'RSS requires one binary-data signature over its exact bytes',
    );
  }
  const result = await verify({
    message: await createMessage({ binary: new TextEncoder().encode(xml) }),
    signature: detached,
    verificationKeys: key,
    format: 'binary',
  });
  if (result.signatures.length !== 1)
    throw new Error('Expected one detached RSS signature');
  for (const signature of result.signatures) await signature.verified;
  return {
    status: 'signed',
    signature: artifact.signature,
    fingerprint: key.getFingerprint().toUpperCase(),
    origin: artifact.origin,
    ...(publicationSequence === undefined ? {} : { publicationSequence }),
  };
}
