import { beforeAll, expect, test } from 'bun:test';
import {
  createMessage,
  createCleartextMessage,
  generateKey,
  readKey,
  readPrivateKey,
  sign,
} from 'openpgp';
import {
  canonicalKeyTransition,
  resolveTrustedCertificate,
  validateKeyHistory,
  type KeyTransition,
} from '../src/portfolio/key-history';
import { verifyBytes } from '../src/portfolio/proofs';
import {
  canonicalIdentityStatement,
  verifyIdentitySignature,
  verifyIdentityStatement,
} from '../src/portfolio/proofs';
import { identityStatementText } from '../src/portfolio/identity-accounts';
import {
  canonicalRssAuthorization,
  rssDigest,
  verifyRssSignature,
} from '../src/portfolio/rss-signatures';

let root: string;
let rootPrivate: string;
let next: string;
let nextPrivate: string;
let nextFingerprint: string;
beforeAll(async () => {
  const rootPair = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Root test' }],
    format: 'armored',
  });
  const nextPair = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Next test' }],
    format: 'armored',
  });
  root = rootPair.publicKey;
  rootPrivate = rootPair.privateKey;
  next = nextPair.publicKey;
  nextPrivate = nextPair.privateKey;
  nextFingerprint = (await readKey({ armoredKey: next }))
    .getFingerprint()
    .toUpperCase();
});

async function signature(bytes: string, privateKey: string) {
  return await sign({
    message: await createMessage({ binary: new TextEncoder().encode(bytes) }),
    signingKeys: await readPrivateKey({ armoredKey: privateKey }),
    detached: true,
    format: 'armored',
  });
}

async function clearSignature(text: string, privateKey: string) {
  return await sign({
    message: await createCleartextMessage({ text }),
    signingKeys: await readPrivateKey({ armoredKey: privateKey }),
    format: 'armored',
  });
}

async function transition(): Promise<KeyTransition> {
  const fromFingerprint = (await readKey({ armoredKey: root }))
    .getFingerprint()
    .toUpperCase();
  const body = {
    domain: 'onurbyte-log-key-transition-v1' as const,
    format: 1 as const,
    sequence: 1,
    previousSha256: null,
    fromFingerprint,
    toFingerprint: nextFingerprint,
    effectivePublication: 3,
    certificate: next,
  };
  const bytes = canonicalKeyTransition(body);
  return {
    ...body,
    fromSignature: await signature(bytes, rootPrivate),
    toSignature: await signature(bytes, nextPrivate),
  };
}

test('accepts a root-pinned dual-signed monotonic transition and authorizes only its publication range', async () => {
  const item = await transition();
  expect(
    (await validateKeyHistory(root, { transitions: [item] })).transitions,
  ).toHaveLength(1);
  const before = await resolveTrustedCertificate({
    root,
    history: { transitions: [item] },
    sequence: 2,
  });
  const after = await resolveTrustedCertificate({
    root,
    history: { transitions: [item] },
    sequence: 3,
  });
  expect(before.fingerprint).not.toBe(nextFingerprint);
  expect(after.fingerprint).toBe(nextFingerprint);
  const bytes = 'authorized at publication 3';
  const signatureAtThree = await signature(bytes, nextPrivate);
  expect(
    await verifyBytes(bytes, signatureAtThree, {
      root,
      history: { transitions: [item] },
      sequence: 3,
    }),
  ).toBe(nextFingerprint);
  expect(
    verifyBytes(bytes, signatureAtThree, {
      root,
      history: { transitions: [item] },
      sequence: 2,
    }),
  ).rejects.toThrow();
  expect(
    resolveTrustedCertificate({ root, history: { transitions: [item] } }),
  ).rejects.toThrow(/sequence is required/);
});

test('rejects missing history, forged old signatures, broken links, and rollback sequences', async () => {
  const item = await transition();
  const bytes = 'authorized at publication 3';
  const signedByNext = await signature(bytes, nextPrivate);
  await expect(verifyBytes(bytes, signedByNext, { root })).rejects.toThrow();
  await expect(
    validateKeyHistory(next, { transitions: [item] }),
  ).rejects.toThrow();
  await expect(
    validateKeyHistory(root, { transitions: [{ ...item, sequence: 2 }] }),
  ).rejects.toThrow(/Nonmonotonic/);
  await expect(
    validateKeyHistory(root, {
      transitions: [{ ...item, previousSha256: 'a'.repeat(64) }],
    }),
  ).rejects.toThrow(/Nonmonotonic/);
  const forged = {
    ...item,
    fromSignature: await signature(canonicalKeyTransition(item), nextPrivate),
  };
  await expect(
    validateKeyHistory(root, { transitions: [forged] }),
  ).rejects.toThrow();
});

test('versioned RSS and identity statements remain authorized after rotation through signed sequence bindings', async () => {
  const item = await transition();
  const trust = { root, history: { transitions: [item] } };
  const rootFingerprint = (await readKey({ armoredKey: root }))
    .getFingerprint()
    .toUpperCase();
  const legacyXml = '<rss>legacy</rss>';
  const legacyRss = {
    version: 1,
    origin: 'https://example.com',
    sha256: rssDigest(legacyXml),
    signature: await signature(legacyXml, rootPrivate),
  };
  const legacyRssVerified = await verifyRssSignature(
    legacyXml,
    legacyRss,
    trust,
  );
  expect(legacyRssVerified.status).toBe('signed');
  if (legacyRssVerified.status !== 'signed')
    throw new Error('Expected signed RSS');
  expect(legacyRssVerified.fingerprint).toBe(rootFingerprint);
  const legacyIdentity = {
    publishedAt: '2026-10-18T12:00:00Z',
    signedMessage: await clearSignature(identityStatementText, rootPrivate),
  };
  expect(
    (await verifyIdentityStatement(legacyIdentity, trust)).fingerprint,
  ).toBe(rootFingerprint);
  const xml = '<rss>portable</rss>';
  const rssSignature = await signature(xml, nextPrivate);
  const authorization = {
    domain: 'onurbyte-rss-signature-authorization-v1' as const,
    publicationSequence: 3,
    fingerprint: nextFingerprint,
    xmlSha256: rssDigest(xml),
    signatureSha256: rssDigest(rssSignature),
  };
  const authorizationSignature = await signature(
    canonicalRssAuthorization(authorization),
    nextPrivate,
  );
  const rssArtifact = {
    version: 2,
    origin: 'https://example.com',
    sha256: rssDigest(xml),
    signature: rssSignature,
    authorization: { ...authorization, signature: authorizationSignature },
  };
  expect((await verifyRssSignature(xml, rssArtifact, trust)).status).toBe(
    'signed',
  );
  await expect(
    verifyRssSignature(
      xml,
      {
        ...rssArtifact,
        authorization: { ...rssArtifact.authorization, publicationSequence: 2 },
      },
      trust,
    ),
  ).rejects.toThrow();

  const identityText = canonicalIdentityStatement(3, nextFingerprint);
  const statement = {
    publishedAt: '2026-10-18T12:00:00Z',
    signedMessage: await clearSignature(identityText, nextPrivate),
  };
  expect((await verifyIdentityStatement(statement, trust)).fingerprint).toBe(
    nextFingerprint,
  );
  expect(
    (
      await verifyIdentityStatement(
        {
          ...statement,
          signedMessage: statement.signedMessage.replace(/\n/g, '\r\n'),
        },
        trust,
      )
    ).fingerprint,
  ).toBe(nextFingerprint);
  expect(
    (
      await verifyIdentityStatement(
        {
          ...statement,
          signedMessage: await clearSignature(
            identityText.replace(/\n$/, ''),
            nextPrivate,
          ),
        },
        trust,
      )
    ).fingerprint,
  ).toBe(nextFingerprint);
  const profile = 'https://github.com/onurbyte';
  const identityProofText = `onurbyte-identity-proof-v2\npublication-sequence:3\nsigner:${nextFingerprint}\naccount:${profile}\n`;
  const identityProof = {
    id: 'github',
    profile,
    publishedAt: '2026-10-18T12:00:00Z',
    publicationSequence: 3,
    signerFingerprint: nextFingerprint,
    signedMessage: await clearSignature(identityProofText, nextPrivate),
  };
  expect(
    (await verifyIdentitySignature(identityProof, trust)).fingerprint,
  ).toBe(nextFingerprint);
  await expect(
    verifyIdentitySignature(
      { ...identityProof, publicationSequence: 2 },
      trust,
    ),
  ).rejects.toThrow();
});
