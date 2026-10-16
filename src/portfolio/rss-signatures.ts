import { createHash } from 'node:crypto';
import { createMessage, enums, readKey, readSignature, verify } from 'openpgp';
import { z } from 'astro/zod';
import { validSiteUrl } from './seo';

export const rssSignatureSchema = z
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
export type VerifiedRssSignature =
  | { status: 'unsigned' }
  | {
      status: 'signed';
      signature: string;
      fingerprint: string;
      origin: string;
    };
export const rssDigest = (xml: string): string =>
  createHash('sha256').update(xml, 'utf8').digest('hex');

export async function verifyRssSignature(
  xml: string,
  input: unknown,
  publicKey: string,
): Promise<VerifiedRssSignature> {
  if (input === null) return { status: 'unsigned' };
  const artifact = rssSignatureSchema.parse(input);
  if (rssDigest(xml) !== artifact.sha256)
    throw new Error('RSS changed since signing; sign it again');
  const key = await readKey({ armoredKey: publicKey });
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
  };
}
