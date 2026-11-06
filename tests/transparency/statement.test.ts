import { rejects } from 'node:assert/strict';
import { expect, test } from 'bun:test';
import {
  canonicalStatement,
  parseStatement,
  statementForManifest,
  sigsumChecksum,
  canonicalAuthority,
  verifyAuthority,
} from '../../src/portfolio/transparency/statement';
import { createMessage, generateKey, readPrivateKey, sign } from 'openpgp';

const manifest =
  '{"format":2,"sequence":3,"previousSha256":"' +
  'a'.repeat(64) +
  '","entries":[]}\n';
const root = 'A'.repeat(40);
test('statement binds exact manifest bytes, origin, root and previous edition', () => {
  const s = statementForManifest(manifest, root);
  expect(s.sequence).toBe(3);
  expect(s.previousManifestSha256).toBe('a'.repeat(64));
  expect(s.origin).toBe('https://onur.af');
  expect(parseStatement(canonicalStatement(s))).toEqual(s);
  expect(statementForManifest(manifest + ' ', root).manifestSha256).not.toBe(
    s.manifestSha256,
  );
  expect(() => parseStatement(JSON.stringify(s))).toThrow('canonical');
  expect(sigsumChecksum(canonicalStatement(s))).not.toBe(s.manifestSha256);
});
test('rejects invalid fingerprints and unexpected statement fields', () => {
  expect(() => statementForManifest(manifest, 'abc')).toThrow();
  expect(() =>
    canonicalStatement({ ...statementForManifest(manifest, root), extra: 1 }),
  ).toThrow();
});
test('submitter authority needs PGP signature matching independently trusted root', async () => {
  const keys = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Local transparency test' }],
    format: 'armored',
  });
  const key = await readPrivateKey({ armoredKey: keys.privateKey });
  const fingerprint = key.getFingerprint().toUpperCase();
  const authority = canonicalAuthority({
    format: 'onur.sigsum-authority.v1',
    origin: 'https://onur.af',
    rootFingerprint: fingerprint,
    submitterPublicKey:
      'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    validFromSequence: 3,
    validThroughSequence: null,
  });
  const signature = String(
    await sign({
      message: await createMessage({
        binary: new TextEncoder().encode(authority),
      }),
      signingKeys: key,
      detached: true,
      format: 'armored',
    }),
  );
  const verified = await verifyAuthority(
    authority,
    signature,
    keys.publicKey,
    fingerprint,
    3,
  );
  expect(verified.validFromSequence).toBe(3);
  await rejects(
    verifyAuthority(authority, signature, keys.publicKey, fingerprint, 2),
  );
  await rejects(verifyAuthority(authority, signature, keys.publicKey, root, 3));
  await rejects(
    verifyAuthority(authority + ' ', signature, keys.publicKey, fingerprint, 3),
  );
});
