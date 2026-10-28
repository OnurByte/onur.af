import { z } from 'astro/zod';
import {
  createMessage,
  enums,
  readKey,
  readSignature,
  readCleartextMessage,
  verify,
} from 'openpgp';
import rawProofs from '../content/identity-proofs.json' with { type: 'json' };
import rawIdentityStatement from '../content/identity-statement.json' with { type: 'json' };
import {
  resolveLegacyRootCertificate,
  resolveTrustedCertificate,
  type KeyTrust,
} from './key-history';

import { identityAccounts, identityStatementText } from './identity-accounts';

function matchesCleartext(actual: string, expected: string) {
  const normalized = actual.replace(/\r\n/g, '\n');
  return normalized === expected || normalized === expected.replace(/\n$/, '');
}
export function canonicalIdentityStatement(
  sequence: number,
  fingerprint: string,
) {
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw new Error('Identity statement publication sequence must be positive');
  if (!/^[A-F0-9]{40,64}$/.test(fingerprint))
    throw new Error('Identity statement fingerprint is invalid');
  return `onurbyte-identity-statement-v2\npublication-sequence:${sequence}\nsigner:${fingerprint}\n\n${identityStatementText}`;
}

function trustCertificateAt(publicKey: string | KeyTrust, sequence: number) {
  return typeof publicKey === 'string'
    ? Promise.resolve(publicKey)
    : resolveTrustedCertificate({ ...publicKey, sequence }).then(
        (result) => result.certificate,
      );
}

const identityStatementSchema = z
  .object({
    publishedAt: z.iso.datetime({ offset: true }),
    signedMessage: z
      .string()
      .max(32768)
      .startsWith('-----BEGIN PGP SIGNED MESSAGE-----'),
  })
  .strict();
export type VerifiedIdentityStatement = z.infer<
  typeof identityStatementSchema
> & { fingerprint: string; statement: string };
export const identityStatement =
  identityStatementSchema.parse(rawIdentityStatement);

export async function verifyIdentityStatement(
  input: unknown,
  publicKey: string | KeyTrust,
): Promise<VerifiedIdentityStatement> {
  const statement = identityStatementSchema.parse(input);
  if (
    !/^-----BEGIN PGP SIGNED MESSAGE-----\r?\n(?:Hash: [A-Za-z0-9, -]+\r?\n)*\r?\n/.test(
      statement.signedMessage,
    ) ||
    !/-----END PGP SIGNATURE-----\r?\n?$/.test(statement.signedMessage)
  )
    throw new Error('Unexpected unsigned text or armor headers');
  const message = await readCleartextMessage({
    cleartextMessage: statement.signedMessage,
  });
  const signedText = message.getText().replace(/\r\n/g, '\n');
  const v2 = signedText.match(
    /^onurbyte-identity-statement-v2\npublication-sequence:([1-9][0-9]*)\nsigner:([A-F0-9]{40,64})\n\n([\s\S]*)$/,
  );
  const isLegacy = matchesCleartext(signedText, identityStatementText);
  if (!isLegacy && (!v2 || !matchesCleartext(v2[3]!, identityStatementText)))
    throw new Error('Identity statement must use a canonical signed format');
  const sequence = v2 ? Number(v2[1]) : undefined;
  if (sequence !== undefined && !Number.isSafeInteger(sequence))
    throw new Error('Identity statement sequence is invalid');
  const certificate = isLegacy
    ? await resolveLegacyRootCertificate(publicKey)
    : await trustCertificateAt(publicKey, sequence!);
  const key = await readKey({ armoredKey: certificate });
  const fingerprint = key.getFingerprint().toUpperCase();
  if (v2 && v2[2] !== fingerprint)
    throw new Error('Identity statement signer fingerprint mismatch');
  const result = await verify({ message, verificationKeys: key });
  if (result.signatures.length !== 1)
    throw new Error('Expected one cleartext signature');
  await result.signatures[0]!.verified;
  return {
    ...statement,
    fingerprint,
    statement: signedText,
  };
}

const claimSchema = z.object({
  id: z.enum(['x', 'github']),
  profile: z.url(),
  proofUrl: z.url().optional(),
  publishedAt: z.iso.datetime({ offset: true }),
});
const identityProofSchema = claimSchema
  .extend({
    signedMessage: z
      .string()
      .max(32768)
      .startsWith('-----BEGIN PGP SIGNED MESSAGE-----'),
    publicationSequence: z.number().int().positive().optional(),
    signerFingerprint: z
      .string()
      .regex(/^[A-F0-9]{40,64}$/)
      .optional(),
  })
  .strict();
export type IdentityClaim = z.infer<typeof claimSchema>;
type IdentityProof = z.infer<typeof identityProofSchema>;
export type VerifiedIdentity = IdentityProof & {
  fingerprint: string;
  statement: string;
};
export const identityProofs = z.array(identityProofSchema).parse(rawProofs);
if (
  new Set(identityProofs.map((proof) => proof.id)).size !==
  identityProofs.length
)
  throw new Error('Duplicate identity proofs');

/** Clear-sign only the canonical account URL; metadata is not part of the signed text. */
export async function verifyIdentitySignature(
  input: unknown,
  publicKey: string | KeyTrust,
): Promise<VerifiedIdentity> {
  const proof = identityProofSchema.parse(input);
  if (
    proof.profile !== identityAccounts[proof.id].profile ||
    (proof.proofUrl && !accountLocation(proof))
  )
    throw new Error('Invalid account or counterpart URL');
  if (
    !/^-----BEGIN PGP SIGNED MESSAGE-----\r?\n(?:Hash: [A-Za-z0-9, -]+\r?\n)*\r?\n/.test(
      proof.signedMessage,
    ) ||
    !/-----END PGP SIGNATURE-----\r?\n?$/.test(proof.signedMessage)
  )
    throw new Error('Unexpected unsigned text or armor headers');
  const message = await readCleartextMessage({
    cleartextMessage: proof.signedMessage,
  });
  const signedText = message.getText().replace(/\r\n/g, '\n');
  const legacy = proof.publicationSequence === undefined;
  if (legacy) {
    if (
      proof.signerFingerprint !== undefined ||
      !matchesCleartext(signedText, proof.profile)
    )
      throw new Error(
        'Legacy identity proof must sign exactly the account URL',
      );
  } else {
    if (!proof.signerFingerprint)
      throw new Error(
        'Versioned identity proof requires its signer fingerprint',
      );
    const expected = `onurbyte-identity-proof-v2\npublication-sequence:${proof.publicationSequence}\nsigner:${proof.signerFingerprint}\naccount:${proof.profile}\n`;
    if (!matchesCleartext(signedText, expected))
      throw new Error(
        'Signed identity proof must use its canonical versioned statement',
      );
  }
  const certificate = legacy
    ? await resolveLegacyRootCertificate(publicKey)
    : await trustCertificateAt(publicKey, proof.publicationSequence!);
  const key = await readKey({ armoredKey: certificate });
  const fingerprint = key.getFingerprint().toUpperCase();
  if (!legacy && proof.signerFingerprint !== fingerprint)
    throw new Error('Identity proof signer fingerprint mismatch');
  const result = await verify({ message, verificationKeys: key });
  if (result.signatures.length !== 1)
    throw new Error('Expected one cleartext signature');
  await result.signatures[0]!.verified;
  return {
    ...proof,
    fingerprint,
    statement: signedText,
  };
}
export async function verifyBytes(
  body: string,
  signature: string,
  publicKey: string | KeyTrust,
): Promise<string> {
  const certificate =
    typeof publicKey === 'string'
      ? publicKey
      : (await resolveTrustedCertificate(publicKey)).certificate;
  const key = await readKey({ armoredKey: certificate });
  const detached = await readSignature({ armoredSignature: signature });
  if (
    detached.packets.length !== 1 ||
    detached.packets.some(
      (packet) => packet.signatureType !== enums.signature.binary,
    )
  )
    throw new Error('Expected one binary detached signature');
  const result = await verify({
    message: await createMessage({ binary: new TextEncoder().encode(body) }),
    signature: detached,
    verificationKeys: key,
    format: 'binary',
  });
  if (result.signatures.length !== 1) throw new Error('Expected one signature');
  await result.signatures[0]!.verified;
  return key.getFingerprint().toUpperCase();
}
function accountLocation(
  claim: IdentityClaim,
): { username: string; id: string; api: string } | undefined {
  if (
    !claim.proofUrl ||
    !URL.canParse(claim.profile) ||
    !URL.canParse(claim.proofUrl)
  )
    return undefined;
  const profile = new URL(claim.profile);
  const proof = new URL(claim.proofUrl);
  if (
    [profile, proof].some(
      (url) =>
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.port,
    )
  )
    return;
  const username = profile.pathname.slice(1);
  if (!/^[A-Za-z0-9_-]+$/.test(username)) return;
  if (
    claim.id === 'github' &&
    profile.hostname === 'github.com' &&
    proof.hostname === 'gist.github.com'
  ) {
    const match = proof.pathname.match(/^\/([^/]+)\/([a-f0-9]{8,64})$/);
    if (match && match[1]!.toLowerCase() === username.toLowerCase())
      return {
        username,
        id: match[2]!,
        api: `https://api.github.com/gists/${match[2]}`,
      };
  }
  if (
    claim.id === 'x' &&
    profile.hostname === 'x.com' &&
    proof.hostname === 'x.com'
  ) {
    const match = proof.pathname.match(/^\/([^/]+)\/status\/(\d+)$/);
    if (match && match[1]!.toLowerCase() === username.toLowerCase())
      return {
        username,
        id: match[2]!,
        api: `https://api.fxtwitter.com/${username}/status/${match[2]}`,
      };
  }
  return undefined;
}
const gistEvidenceSchema = z.object({
  owner: z.object({ login: z.string() }),
  files: z.record(
    z.string(),
    z.object({
      content: z.string().optional(),
      truncated: z.boolean().optional(),
    }),
  ),
});
const xEvidenceSchema = z.object({
  tweet: z.object({
    id: z.union([z.string(), z.number()]),
    author: z.object({ screen_name: z.string() }),
    text: z.string(),
  }),
});
export function accountEvidence(
  claim: IdentityClaim,
  fingerprint: string,
  evidence: unknown,
): boolean {
  const location = accountLocation(claim);
  if (!location || !/^[A-Fa-f0-9]{40,64}$/.test(fingerprint)) return false;
  const marker = new RegExp(
    `(?:^|[^a-z0-9])openpgp4fpr:${fingerprint}(?![a-f0-9])`,
    'i',
  );
  if (claim.id === 'github') {
    const result = gistEvidenceSchema.safeParse(evidence);
    return (
      result.success &&
      result.data.owner.login.toLowerCase() ===
        location.username.toLowerCase() &&
      Object.values(result.data.files).some(
        (file) =>
          !file.truncated &&
          typeof file.content === 'string' &&
          marker.test(file.content),
      )
    );
  }
  const result = xEvidenceSchema.safeParse(evidence);
  return (
    result.success &&
    String(result.data.tweet.id) === location.id &&
    result.data.tweet.author.screen_name.toLowerCase() ===
      location.username.toLowerCase() &&
    marker.test(result.data.tweet.text)
  );
}
export async function checkAccountProof(
  claim: IdentityClaim,
  fingerprint: string,
): Promise<boolean> {
  const location = accountLocation(claim);
  if (!location) return false;
  const response = await fetch(location.api, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Onur-portfolio-identity',
    },
    signal: AbortSignal.timeout(5000),
    redirect: 'error',
  });
  if (!response.ok) return false;
  return accountEvidence(claim, fingerprint, await response.json());
}
export async function verifyProofs(
  input: readonly unknown[],
  publicKey: string | KeyTrust,
  check = checkAccountProof,
): Promise<VerifiedIdentity[]> {
  const proofs = await Promise.all(
    input.map(async (input) => {
      try {
        const proof = await verifyIdentitySignature(input, publicKey);
        if (proof.proofUrl && !(await check(proof, proof.fingerprint))) return;
        return proof;
      } catch {
        return;
      }
    }),
  );
  return proofs.filter(
    (proof): proof is VerifiedIdentity => proof !== undefined,
  );
}
