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
    id: 'note',
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
  const artifacts = { 'note-v1': { sha256: digest(body), signature } };
  const verified = await verifyLogSignatures(entries, artifacts, publicKey);
  expect(verified['note-v1']?.signature).toBe(signature);
  expect(await verifyLogSignatures(entries, {}, publicKey)).toEqual({});
  const changed = parseLog([{ ...entries[0]!, title: 'A forged title' }]);
  expect(verifyLogSignatures(changed, artifacts, publicKey)).rejects.toThrow();
  const forged = {
    'note-v1': { sha256: digest(revisionMarkdown(changed[0]!, 1)), signature },
  };
  expect(verifyLogSignatures(changed, forged, publicKey)).rejects.toThrow();
  expect(
    verifyLogSignatures(
      entries,
      { 'note-v2': artifacts['note-v1'] },
      publicKey,
    ),
  ).rejects.toThrow();
});

test('publication requires an individual signature for every revision of every Log entry', () => {
  expect(() => assertAllLogRevisionsSigned(entries, {})).toThrow('note-v1');
  expect(() =>
    assertAllLogRevisionsSigned(entries, { 'note-v1': {} }),
  ).not.toThrow();
});
