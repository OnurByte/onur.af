import { beforeAll, expect, test } from 'bun:test';
import { generateKey, readPrivateKey, createMessage, sign } from 'openpgp';
import { parseLog, revisionMarkdown } from '../src/portfolio/log';
import {
  digest,
  verifyLogSignatures,
  assertAllLogRevisionsSigned,
} from '../src/portfolio/log-signatures';
let publicKey: string;
let signature: string;
const entries = parseLog([
  {
    id: 'silent-lantern-glows',
    title: 'A note',
    summary: 'Summary',
    revisions: [
      {
        version: 1,
        publishedAt: '2026-10-15T09:00:00Z',
        body: 'Original body.',
      },
    ],
  },
]);
const body = revisionMarkdown(entries[0]!, 1);
beforeAll(async () => {
  const keys = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Log Test' }],
    format: 'armored',
  });
  publicKey = keys.publicKey;
  signature = await sign({
    message: await createMessage({ binary: new TextEncoder().encode(body) }),
    signingKeys: await readPrivateKey({ armoredKey: keys.privateKey }),
    detached: true,
    format: 'armored',
  });
});
test('only advertises exact signed Log revision bytes', async () => {
  const artifacts = { 'silent-lantern-glows-v1': { sha256: digest(body), signature } };
  const verified = await verifyLogSignatures(entries, artifacts, publicKey);
  expect(verified['silent-lantern-glows-v1']?.signature).toBe(signature);
  const renamedId = parseLog([{ ...entries[0]!, id: 'veiled-compass-turns' }]);
  expect(verifyLogSignatures(renamedId, artifacts, publicKey)).rejects.toThrow();
  expect(await verifyLogSignatures(entries, {}, publicKey)).toEqual({});
  const changed = parseLog([{ ...entries[0]!, title: 'A forged title' }]);
  expect(verifyLogSignatures(changed, artifacts, publicKey)).rejects.toThrow();
  const forged = {
    'silent-lantern-glows-v1': { sha256: digest(revisionMarkdown(changed[0]!, 1)), signature },
  };
  expect(verifyLogSignatures(changed, forged, publicKey)).rejects.toThrow();
  expect(
    verifyLogSignatures(
      entries,
      { 'silent-lantern-glows-v2': artifacts['silent-lantern-glows-v1'] },
      publicKey,
    ),
  ).rejects.toThrow();
});

test('publication requires an individual signature for every revision of every Log entry', () => {
  expect(() => assertAllLogRevisionsSigned(entries, {})).toThrow('silent-lantern-glows-v1');
  expect(() =>
    assertAllLogRevisionsSigned(entries, { 'silent-lantern-glows-v1': {} }),
  ).not.toThrow();
});
