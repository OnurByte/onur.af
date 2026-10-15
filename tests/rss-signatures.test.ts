import { beforeAll, expect, test } from 'bun:test';
import { createMessage, generateKey, readPrivateKey, sign } from 'openpgp';
import { createHash } from 'node:crypto';
import { verifyRssSignature } from '../src/portfolio/rss-signatures';

const xml =
  '<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title></channel></rss>';
const origin = 'https://example.com';
let publicKey: string;
let signature: string;
let otherKey: string;
let textSignature: string;
beforeAll(async () => {
  const keys = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'RSS Test' }],
    format: 'armored',
  });
  publicKey = keys.publicKey;
  signature = await sign({
    message: await createMessage({ binary: new TextEncoder().encode(xml) }),
    signingKeys: await readPrivateKey({ armoredKey: keys.privateKey }),
    detached: true,
    format: 'armored',
  });
  textSignature = await sign({
    message: await createMessage({ text: xml }),
    signingKeys: await readPrivateKey({ armoredKey: keys.privateKey }),
    detached: true,
    format: 'armored',
  });
  otherKey = (
    await generateKey({
      type: 'ecc',
      curve: 'curve25519Legacy',
      userIDs: [{ name: 'Wrong Test Key' }],
      format: 'armored',
    })
  ).publicKey;
});
const artifact = () => ({
  version: 1,
  origin,
  sha256: createHash('sha256').update(xml).digest('hex'),
  signature,
});
test('absence is explicitly unsigned', async () => {
  expect(await verifyRssSignature(xml, null, publicKey)).toEqual({
    status: 'unsigned',
  });
});
test('verifies a detached signature of the exact XML using the published key', async () => {
  const result = await verifyRssSignature(xml, artifact(), publicKey);
  expect(result.status).toBe('signed');
  if (result.status === 'signed') {
    expect(result.signature).toBe(signature);
    expect(result.origin).toBe(origin);
    expect(result.fingerprint).toMatch(/^[A-F0-9]{40,64}$/);
  }
});
test('rejects stale XML, changed digests, malformed artifacts and the wrong signer', async () => {
  expect(
    verifyRssSignature(`${xml}\n`, artifact(), publicKey),
  ).rejects.toThrow();
  expect(
    verifyRssSignature(
      xml,
      { ...artifact(), sha256: 'a'.repeat(64) },
      publicKey,
    ),
  ).rejects.toThrow();
  expect(
    verifyRssSignature(xml, { ...artifact(), extra: true }, publicKey),
  ).rejects.toThrow();
  await expect(verifyRssSignature(xml, artifact(), otherKey)).rejects.toThrow();
});
test('a matching attacker-controlled hash cannot bypass cryptographic verification', async () => {
  const changed = xml.replace('Feed', 'Forged');
  await expect(
    verifyRssSignature(
      changed,
      {
        ...artifact(),
        sha256: createHash('sha256').update(changed).digest('hex'),
      },
      publicKey,
    ),
  ).rejects.toThrow();
});

test('rejects text-mode signatures that normalize the signed bytes', async () => {
  await expect(
    verifyRssSignature(
      xml,
      { ...artifact(), signature: textSignature },
      publicKey,
    ),
  ).rejects.toThrow();
});
