import { beforeAll, expect, test } from 'bun:test';
import {
  generateKey,
  readPrivateKey,
  readKey,
  createCleartextMessage,
  sign,
} from 'openpgp';
import {
  verifyIdentitySignature,
  verifyProofs,
  accountEvidence,
} from '../src/portfolio/proofs';
let publicKey: string;
let fingerprint: string;
let privateKey: string;
beforeAll(async () => {
  const key = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Test' }],
    format: 'armored',
  });
  publicKey = key.publicKey;
  privateKey = key.privateKey;
  fingerprint = (await readKey({ armoredKey: publicKey }))
    .getFingerprint()
    .toUpperCase();
});
const claim = () => ({
  id: 'github' as const,
  profile: 'https://github.com/onurbyte',
  proofUrl: 'https://gist.github.com/onurbyte/abcdef0123456789',
  publishedAt: '2026-10-15T09:00:00Z',
});
const signed = async () => {
  return {
    ...claim(),
    signedMessage: await sign({
      message: await createCleartextMessage({ text: claim().profile }),
      signingKeys: await readPrivateKey({ armoredKey: privateKey }),
      format: 'armored',
    }),
  };
};
test('identity verification requires both a real signature and a matching public account proof', async () => {
  const artifact = await signed();
  expect(
    await verifyProofs([artifact], publicKey, async () => true),
  ).toHaveLength(1);
  expect(
    await verifyProofs([artifact], publicKey, async () => false),
  ).toHaveLength(0);
  expect(
    await verifyProofs(
      [{ ...artifact, profile: 'https://github.com/attacker' }],
      publicKey,
      async () => true,
    ),
  ).toHaveLength(0);
  expect(await verifyProofs([], publicKey, async () => true)).toEqual([]);
});
test('Gist counterpart must belong to the claimed account and contain the exact fingerprint', () => {
  const evidence = {
    owner: { login: 'onurbyte' },
    files: { 'proof.md': { content: `openpgp4fpr:${fingerprint}` } },
  };
  expect(accountEvidence(claim(), fingerprint, evidence)).toBe(true);
  expect(
    accountEvidence(claim(), fingerprint, {
      ...evidence,
      owner: { login: 'attacker' },
    }),
  ).toBe(false);
  expect(accountEvidence(claim(), 'A'.repeat(40), evidence)).toBe(false);
  expect(
    accountEvidence(
      { ...claim(), proofUrl: 'https://evil.example/proof' },
      fingerprint,
      evidence,
    ),
  ).toBe(false);
});
test('X counterpart must match both author and status ID', () => {
  const x = {
    ...claim(),
    id: 'x' as const,
    profile: 'https://x.com/onurstirner',
    proofUrl: 'https://x.com/onurstirner/status/12345',
  };
  const evidence = {
    tweet: {
      id: '12345',
      author: { screen_name: 'onurstirner' },
      text: `openpgp4fpr:${fingerprint}`,
    },
  };
  expect(accountEvidence(x, fingerprint, evidence)).toBe(true);
  expect(
    accountEvidence(x, fingerprint, { tweet: { ...evidence.tweet, id: '9' } }),
  ).toBe(false);
});

test('clear-signed account proof signs the URL itself and rejects changed URLs or unsigned surrounding text', async () => {
  const artifact = await signed();
  const verified = await verifyIdentitySignature(artifact, publicKey);
  expect(verified.statement).toBe(claim().profile);
  expect(verified.signedMessage).toStartWith(
    '-----BEGIN PGP SIGNED MESSAGE-----',
  );
  expect(
    verifyIdentitySignature(
      {
        ...artifact,
        signedMessage: artifact.signedMessage.replace('onurbyte', 'attacker'),
      },
      publicKey,
    ),
  ).rejects.toThrow();
  expect(
    verifyIdentitySignature(
      { ...artifact, signedMessage: `unsigned\n${artifact.signedMessage}` },
      publicKey,
    ),
  ).rejects.toThrow();
  expect(
    verifyIdentitySignature(
      { ...artifact, signedMessage: `${artifact.signedMessage}unsigned` },
      publicKey,
    ),
  ).rejects.toThrow();
});

test('a signed URL can be published without inventing a platform counterpart', async () => {
  const { proofUrl: _proofUrl, ...artifact } = await signed();
  const verified = await verifyProofs([artifact], publicKey, async () => {
    throw new Error('No remote counterpart configured');
  });
  expect(verified).toHaveLength(1);
  expect(verified[0]!.statement).toBe(claim().profile);
});
